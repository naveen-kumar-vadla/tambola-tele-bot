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

const confirmPlayer = async (id) => {
  let game = await db.find();
  const player = game.registeredPlayers.find(p => p.id === id);
  game.players.push(player);
  return db.update(game);
};
// Private
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

module.exports = {createGame, signup, getRegisteredPlayers, confirmPlayer};
