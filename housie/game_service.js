const db = require("./db");
const fs = require("fs");
const shortId = require('shortid');
const tambola = require('tambola-generator');

const createGame = async (newGame) => {
  let game = await db.find();
  if(game) {
    console.log("There is already a game. Please delete and create new one.");
    return;
  }
  return await db.insert(newGame);
};

const signup = async (details) => {
  let game = await db.find();
  game.registeredPlayers.push(generatePlayer(details));
  return db.update(game);
};

const getRegisteredPlayers = async () => {
  let game = await db.find();
  return game.registeredPlayers.map((player, index) => {
    return `${index+1}. ${player.id} - ${player.name}`;
  }).join("\n");
};

const getConfirmedPlayers = async () => {
  let game = await db.find();
  return game.players.map((player, index) => {
    return `${index+1}. ${player.id} - ${player.name}`;
  }).join("\n");
};

const confirmPlayer = async (id) => {
  let game = await db.find();
  const player = game.registeredPlayers.find(p => p.id === id);
  game.players.push(player);
  return db.update(game);
};

const revealNumber = async () => {
  let game = await db.find();
  const number = game.sequence.pop();
  game.revealed.push(number);
  await db.update(game);
  return number;
};

const mark = async (details) => {
  let game = await db.find();
  if(!game.revealed.includes(details.number)) {
    return false;
  }
  const ticket = findTicket(game, details.playerId, details.ticketId);
  const marked = markCell(ticket.cells, details.number);
  await db.update(game);
  return marked;
};

const processClaim = async (details) => {
  let game = await db.find();
  if(game.winners[details.claim]) {
    return "CLAIMED";
  }
  const claimed = claimValidations[details.claim](findTicket(game, details.playerId, details.ticketId));
  updateWinner(game, details.claim, details.playerId);
  db.update(game);
  return claimed ? "SUCCESS" : "FAILED";
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
  return ticket.cells[line - 1].every(cell => cell.marked);
};

const findPlayer = (game, playerId) => {
  return game.players.find((p => p.id === playerId));
};

const findTicket = (game, playerId, ticketId) => {
  const player = findPlayer(game, playerId);
  return player.tickets.find(t => t.id = ticketId);
};

const markCell = (rows, number) => {
  let marked = false;
  rows.forEach(row => {
    row.forEach(cell => {
      if(cell.number === number) {
        marked = true;
        cell.marked = true;
      }
    });
  });
  return marked;
};

const generatePlayer = (details) => {
  return {
    id: details.id,
    chatId: details.chatId,
    name: details.name,
    tickets: generateTickets(details.numberOfTickets)
  }
};

const generateTickets = (numberOfTickets) => {
  return new Array(numberOfTickets).fill(null).map(() => {
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

module.exports = {createGame, signup, getRegisteredPlayers, confirmPlayer, revealNumber, mark, processClaim, getWinners, getConfirmedPlayers, deleteGame};
