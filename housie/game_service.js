const db = require("./db");
const fs = require("fs");
const shortId = require('shortid');
const tambola = require('tambola-generator');
const newGame = require("./newGame");

const createGame = async () => {
  let game = await db.find();
  if(game) {
    return {result: "There is already a game. Please delete and create new one."};
  }
  newGame.sequence = tambola.getDrawSequence();
  return db.insert(newGame);
};

const getGame = () => {
  return db.find();
};

const signup = async (details) => {
  let game = await db.find();
  if(findRegisteredPlayer(game, details.id)) {
    return {error: "Already signed up."}
  }
  game.registeredPlayers.push(generatePlayer(details));
  return db.update(game);
};

const getRegisteredPlayers = async () => {
  let game = await db.find();
  return game.registeredPlayers;
};

const getConfirmedPlayers = async () => {
  let game = await db.find();
  return game.players;
};

const confirmPlayer = async (id) => {
  let game = await db.find();
  if(findPlayer(game, id)) {
    return {error: "Already confirmed"};
  }
  const player = findRegisteredPlayer(game, id);
  if(!player) {
    return {error: "Invalid player id"};
  }
  game.players.push(player);
  await db.update(game);
  return {chatId: player.chatId}
};

const revealNumber = async () => {
  let game = await db.find();
  const number = game.sequence.pop();
  if(!number) {
    return {error: "All numbers are done!!!"};
  }
  game.revealed.push(number);
  await db.update(game);
  return {
    number,
    chatIds: game.players.map(player => player.chatId)
  };
};

const mark = async (details) => {
  let game = await db.find();
  if(!game.revealed.includes(details.number)) {
    let player = findPlayer(game, details.playerId);
    player.invalidAttempts = player.invalidAttempts + 1;
    if(player.invalidAttempts >= 10) {
      db.blockUser(player.chatId);
    }
    db.update(game);
    return {error: `Shhhh!!!! Invalid attempt`, invalidAttempts: player.invalidAttempts};
  }
  const ticket = findTicket(game, details.playerId, details.ticketId);
  markCell(ticket.cells, details.number);
  return await db.update(game);
};

const processClaim = async (details) => {
  let game = await db.find();
  if(game.winners[details.claim]) {
    return "CLAIMED";
  }
  const claimed = claimValidations[details.claim](findTicket(game, details.playerId, details.ticketId));
  if(claimed) {
    updateWinner(game, details.claim, details.playerId);
    db.update(game);
    return "SUCCESS";
  }
  return "FAILED";
};

const getWinners = async () => {
  let game = await db.find();
  const winners = game.winners;
  return `First line: ${winners.firstLine ? winners.firstLine.name : '-'}\n` +
        `Second line: ${winners.secondLine ? winners.secondLine.name : '-'}\n` +
        `Third line: ${winners.thirdLine ? winners.thirdLine.name : '-'}\n` +
        `Full housie: ${winners.fullHousie ? winners.fullHousie.name : '-'}`;
};

const deleteGame = async () => {
  return await db.remove();
};

const startGameAndGetChatIds = async () => {
  let game = await db.find();
  if(game.status === "STARTED") {
    return {error: "Already started"};
  }
  game.status = "STARTED";
  await db.update(game);
  return game.players.map(player => player.chatId);
};

const getAllChatIds = async () => {
  let game = await db.find();
  return game.players.map(player => player.chatId);
};

const getRegisteredChatIds = async () => {
  return await getRegisteredPlayers().map(player => player.chatId);
};

const getTickets = async (playerId) => {
  let game = await db.find();
  if(game.status === "DRAFTED") {
    return {error: "Game not started yet!!!"}
  }
  const player = findPlayer(game, playerId);
  if(!player) {
    return {error: "No tickets available for you"};
  }
  return player.tickets;
};

const getTicket = async (playerId, ticketId) => {
  const tickets = await getTickets(playerId);
  return tickets.find(ticket => ticket.id == ticketId);
};

const getBlockedChatIds = async () => {
  const blocked = await db.getBlockedUser();
  return blocked.ids;
};

// Private
const claimValidations = {
  firstLine: (ticket) => isValidLineClaim(ticket, 1),
  secondLine: (ticket) => isValidLineClaim(ticket, 2),
  thirdLine: (ticket) => isValidLineClaim(ticket, 3),
  fullHousie: (ticket) => {
    return isValidLineClaim(ticket, 1) && isValidLineClaim(ticket, 2) && isValidLineClaim(ticket, 3);
  }
};

const updateWinner = (game, claim, playerId) => {
  game.winners[claim] = {
    playerId: playerId,
    name: findPlayer(game, playerId).name
  };
};

const isValidLineClaim = (ticket, line) => {
  return ticket.cells[line - 1].every(cell => cell.marked || (cell.number == "0"));
};

const findPlayer = (game, playerId) => {
  return game.players.find((p => p.id == playerId));
};

const findRegisteredPlayer = (game, playerId) => {
  return game.registeredPlayers.find((p => p.id == playerId));
};

const findTicket = (game, playerId, ticketId) => {
  const player = findPlayer(game, playerId);
  return player.tickets.find(t => t.id == ticketId);
};

const markCell = (rows, number) => {
  rows.forEach(row => {
    row.forEach(cell => {
      if(cell.number == number) {
        cell.marked = true;
      }
    });
  });
};

const generatePlayer = (details) => {
  return {
    id: details.id,
    chatId: details.chatId,
    name: details.name,
    invalidAttempts: 0,
    tickets: generateTickets(details.numberOfTickets)
  }
};

const generateTickets = (numberOfTickets) => {
  let array = new Array(parseInt(numberOfTickets));
  return array.fill(0).map((zero) => {
    return generateTicket();
  });
};

const generateTicketNumbers = () => {
  return tambola.getTickets(1)[0];
};

const convertToCells = (rows) => {
  return rows.map((row) => {
    return row.map((number) => {
      return {number, marked: false};
    });
  });
};

const generateTicket = () => {
  return {
    id: shortId.generate(),
    cells: convertToCells(generateTicketNumbers())
  }
};

module.exports = {createGame, getBlockedChatIds, getTicket, getGame, startGameAndGetChatIds, getAllChatIds, signup, getRegisteredPlayers, getRegisteredChatIds, confirmPlayer, revealNumber, mark, getTickets, processClaim, getWinners, getConfirmedPlayers, deleteGame};
