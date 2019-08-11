const {createGame, getAllChatIds, startGameAndGetChatIds, getGame, deleteGame, signup, getRegisteredPlayers, getConfirmedPlayers, revealNumber, confirmPlayer, mark} = require("./housie/game_service");
const {admins} = require("./config");
const numbers = require("./numbers");

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const fs = require("fs");


const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);

bot.use(session());
bot.use((context, next) => {
  const {from, message} = context;
  const log = `${new Date().toString()} ${from.id}-${from.first_name} : ${message.text}`;
  console.log(log);
  return next();
});
bot.start((ctx) => ctx.reply('Welcome!'));

//Player
bot.command("hi", (context) => {
  return context.reply("Hello");
});

bot.command("signup", async (context) => {
  const regEx = new RegExp("^(/signup) ([123])\$");
  const {from, chat, message} = context;
  const matchs = regEx.exec(message.text);
  if(!matchs) {
    return context.reply("Please specify the number of tickets(1 or 2 or 3). Ex: /signup 1");
  }
  const signedUp = await signup({
    id: from.id,
    chatId: chat.id,
    name: `${from.first_name} ${from.last_name}`,
    numberOfTickets: matchs[2]
  }).catch((err) => onError(context, err));
  if(signedUp.error) {
    return context.reply(signedUp.error);
  }
  return context.reply(`Signed up successfully. Please contact admin and pay money`);
});

//Admin
bot.use((context, next) => {
  if(!admins.includes(context.from.id)) {
    return;
  }
  return next();
});

bot.command("registered", async (context) => {
  const players = await getRegisteredPlayers();
  return context.reply(convertPlayersToMessage(players) || "Empty");
});

bot.command("players", async (context) => {
  const players = await getConfirmedPlayers();
  return context.reply(convertPlayersToMessage(players) || "Empty");
});

bot.command("confirm", async (context) => {
  const regEx = new RegExp("^(/confirm) (\\d+)\$");
  const matchs = regEx.exec(context.message.text);
  if(!matchs) {
    return context.reply("Player id is missing.");
  }
  const playerId = matchs[2];
  const result = await confirmPlayer(playerId).catch((err) => onError(context, err));
  if(result.error) {
    return context.reply(result.error);
  }
  return context.reply(`Confirmed player: ${playerId}`);
});

bot.command('create', async (context) => {
  const created = await createGame().catch((err) => onError(context, err));
  return context.reply(created.result);
});
bot.command('delete', async (context) => {
  const deleted = await deleteGame().catch((err) => onError(context, err));
  return context.reply(deleted.result)
});

bot.command('game', async (context) => {
  const game = Buffer.from(JSON.stringify(await getGame()));
  return context.replyWithDocument({source: game, filename: "game.json"});
});

bot.command("startGame", async (context) => {
  const players = await startGameAndGetChatIds();
  if(players.error) {
    return context.reply(players.error);
  }
  informEveryone(players, "Game started now. Get ready for the numbers in the middle of messages.");
  return context.reply("Informed all players.");
});

bot.command("reveal", async (context) => {
  const result = await revealNumber();
  if(result.error) {
    return context.reply(result.error);
  }
  informEveryone(result.chatIds, numbers[result.number], {parse_mode: "HTML"});
  return context.reply("Informed all players.");
});

bot.catch((err) => {
  console.log('ERROR =>', err)
});

bot.launch();

// Private

const informEveryone = (chatIds, message, options) => {
  chatIds.forEach((chatId) => {
    telegram.sendMessage(chatId, message, options);
  });
};

const convertPlayersToMessage = (players) => {
  return players.map((player, index) => {
    return `${index+1}. ${player.id} - ${player.name} - ${player.tickets.length}`;
  }).join("\n");
};

const onError = (context, err) => {
  context.reply("Ooops!!! There is an error. Please contact admin.");
  console.log("Error handled gracefully", err);
};


// (async () => {
//  var result = await signup({
//     id: "12345",
//     chatId: "1234",
//     name: "Mahesh Kumar Kolla",
//     numberOfTickets: 2
//   });
//   console.log(result);
//
//   var result = await getRegisteredPlayers();
//   console.log(result);
//
//   await confirmPlayer("12345");
//
//   await revealNumber();
//
//   var result = await mark( {
//     playerId: "12345",
//     ticketId: "uq2ryK_xaC",
//     number: 80
//   });
//   console.log(result);
// })();
