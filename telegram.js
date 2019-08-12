const {createGame, getTicket, getTickets, getWinners, processClaim, getAllChatIds, startGameAndGetChatIds, getGame, deleteGame, signup, getRegisteredPlayers, getConfirmedPlayers, revealNumber, confirmPlayer, mark} = require("./housie/game_service");
const {admins} = require("./config");
const numbers = require("./numbers");

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const fs = require("fs");

const bot = new Telegraf(process.env.BOT_TOKEN);
const telegram = new Telegram(process.env.BOT_TOKEN);



// Private
const informEveryone = (chatIds, message, options) => {
  return chatIds.forEach((chatId) => {
    telegram.sendMessage(chatId, message, options);
  });
};

const isMarkAction = (data) => {
  return data.indexOf("mark") === 0;
};

const isClaimAction = (data) => {
  return data.indexOf("claim") === 0;
};

const transpose = a => a[0].map((_, c) => a.map(r => r[c]));

const convertToTicket = (ticket) => {
  const cells = transpose(ticket.cells);
  return Markup.inlineKeyboard([
      ...cells.map(row => {
        return row.map(cell => {
          return Markup.callbackButton(getNumber(cell), getAction(cell, ticket))
        })
      }),
      [
          Markup.callbackButton("Claim column 🔝", `claim ${JSON.stringify({ticketId: ticket.id, claim: "firstLine"})}`),
          Markup.callbackButton("Claim️ column 🔝", `claim ${JSON.stringify({ticketId: ticket.id, claim: "secondLine"})}`),
          Markup.callbackButton("Claim️ column 🔝", `claim ${JSON.stringify({ticketId: ticket.id, claim: "thirdLine"})}`)
      ],
      [
        Markup.callbackButton("Claim full housie", `claim ${JSON.stringify({ticketId: ticket.id, claim: "fullHousie"})}`)
      ]
  ]).extra();
};

const getAction = (cell, ticket) => {
  if(cell.number == 0 || cell.marked) {
    return "cellMarked";
  }
  return `mark ${JSON.stringify({ticketId: ticket.id, number: cell.number})}`;
};

const getNumber = (cell) => {
  if(cell.number == "0") {
    return "✖️";
  }
  return cell.marked ? "✔️" : cell.number;
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

const claimActions = {
    CLAIMED: (details, context) => context.answerCbQuery("Already someone claimed it. Look winners using /winners command"),
    SUCCESS: async (details, context) => {
      const {from, answerCbQuery} = context;
      answerCbQuery("Congratulations");
      const chatIds = await getAllChatIds();
      const claims = {firstLine: "First Column", secondLine: "Second Column",  thirdLine: "Third Column", fullHousie: "Full Housie"};
      return informEveryone(chatIds, `Congratulations ${from.first_name} ${from.last_name} for winning the ${claims[details.claim]}`);
    },
    FAILED: (details, context) => context.answerCbQuery("Not done yet!!! Check carefully.")
};

// Private done.


bot.use(session());
bot.use((context, next) => {
  const {from, message, callbackQuery} = context;
  const text = message ? message.text : callbackQuery.data;
  const log = `${new Date().toString()} ${from.id}-${from.first_name} : ${text}`;
  console.log(log);
  return next();
});
bot.start((context) => {
  return context.replyWithHTML(fs.readFileSync("./help.html", "utf-8"));
});
bot.help((context) => {
  return context.replyWithHTML(fs.readFileSync("./help.html", "utf-8"));
});

//Player
bot.command("example", (context) => {
  return context.replyWithPhoto({
    source: "./transposed-ticket.jpg"
  })
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

bot.command("tickets", async (context) => {
  const tickets = await getTickets(context.from.id);
  if(tickets.error) {
    return context.reply(tickets.error);
  }
  context.reply("Here your ticket(s) are...");
  return tickets.forEach((ticket, index) => {
    telegram.sendMessage(context.chat.id, `Ticket ${index+1}`, convertToTicket(ticket));
  });
});

bot.command("winners", async (context) => {
  const winners = await getWinners();
  context.reply(winners);
});

bot.action(isMarkAction, async ({reply, editMessageText, from, callbackQuery, answerCbQuery}) => {
  const data = JSON.parse(callbackQuery.data.split("mark ")[1]);
  const result = await mark({...data, playerId: from.id});
  if(result.error) {
    return answerCbQuery(result.error);
  }
  answerCbQuery("Done!");
  const ticket = await getTicket(from.id, data.ticketId);
  return editMessageText(callbackQuery.message.text , convertToTicket(ticket));
});

bot.action(isClaimAction, async (context) => {
  const {callbackQuery, from} = context;
  const data = JSON.parse(callbackQuery.data.split("claim ")[1]);
  const details = {...data, playerId: from.id};
  const result = await processClaim(details);
  claimActions[result](details, context);
});

bot.action("cellMarked", async ({answerCbQuery}) => {
  return answerCbQuery("Shhh!");
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
