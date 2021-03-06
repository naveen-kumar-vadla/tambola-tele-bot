const {createGame, getBlockedChatIds, getTicket, getTickets, getWinners, processClaim, getAllRevealedNumbers, getAllChatIds, getRegisteredNotConfirmedPlayers, startGameAndGetChatIds, getGame, deleteGame, signup, getRegisteredPlayers, getConfirmedPlayers, revealNumber, confirmPlayer, mark} = require("./housie/game_service");
const https = require('https');
const {push} = require("./telegram_queue");
const {admins} = require("./config");
const numbers = require("./numbers");

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const fs = require("fs");

let BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const telegram = new Telegram(BOT_TOKEN);

const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://telegames.herokuapp.com/';
const INTERVAL = (+process.env.INTERVAL) || 300000;

const TITLE = "ThoughtWorks Hyderabad Tambola 2022";
const COST_PER_TICKET = "30";

bot.telegram.setWebhook(`${URL}/bot${BOT_TOKEN}`);
bot.startWebhook(`/bot${BOT_TOKEN}`, null, PORT);
let blockedChatIds = [];

setTimeout(async () => {
  blockedChatIds = await getBlockedChatIds();
}, 5000);

const pingServer = () => {
  console.log(`${new Date().toString()} Ping Server`);
  https.get(URL, (res) => {
    console.log(`${new Date().toString()} Ping status: ${res.statusCode}`);
    startPing();
  });
};

const startPing = () => setTimeout(pingServer, INTERVAL);

// Private
const informEveryone = (chatIds, message, options) => {
  return chatIds.forEach((chatId) => {
    push(() => {
      telegram.sendMessage(chatId, message, options);
    });
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
          Markup.callbackButton("Claim column ????", `claim ${JSON.stringify({ticketId: ticket.id, claim: "firstLine"})}`),
          Markup.callbackButton("Claim??? column ????", `claim ${JSON.stringify({ticketId: ticket.id, claim: "secondLine"})}`),
          Markup.callbackButton("Claim??? column ????", `claim ${JSON.stringify({ticketId: ticket.id, claim: "thirdLine"})}`)
      ],
      [
        Markup.callbackButton("Claim first five", `claim ${JSON.stringify({ticketId: ticket.id, claim: "firstFive"})}`)
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
    return "??????";
  }
  return cell.marked ? "??????" : cell.number;
};

const convertPlayersToMessage = (players) => {
  return players.map((player, index) => {
    return `${index+1}. ${player.id} - ${player.name} - ${player.tickets.length}`;
  }).join("\n");
};

const onError = (context, err) => {
  push(() => {
    context.reply("Ooops!!! There is an error. Please contact admin.");
  });
  console.log("Error handled gracefully", err);
};

const claimActions = {
    CLAIMED: (details, context) => push(() => {
      context.answerCbQuery("Already someone claimed it. Use /winners command to see the winners.");
    }),
    SUCCESS: async (details, context) => {
      const {from, answerCbQuery} = context;
      push(() => answerCbQuery("Congratulations"));
      const chatIds = await getAllChatIds();
      const claims = {firstLine: "First Column", secondLine: "Second Column",  thirdLine: "Third Column", fullHousie: "Full Housie", firstFive: "First Five"};
      return informEveryone(chatIds, `Congratulations ${from.first_name} ${from.last_name || ''} for winning the ${claims[details.claim]}`);
    },
    FAILED: (details, context) => push(() => context.answerCbQuery("Not done yet!!! Check carefully."))
};

const actionOnInvalidAttempt = (invalidAttempts, chatId) => {
  const actions = {
    1: "Shhh: Invalid attempt",
    2: "Shhh: Invalid attempt",
    3: "Take care of invalid attempts.",
    4: "No more invalid attempts please....",
    5: "Stop clicking on random numbers!",
    6: "I am serious! Stop it right now!",
    7: "I am angryyyyyyyyyyyyyyyy!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  };
  let message = actions[invalidAttempts] || "You will be blocked soon if you continue and will not be able to play the Game.";
  if(invalidAttempts >= 10) {
    message = "Go to Hell!!!";
    blockedChatIds.push(chatId);
  }
  return push(() => telegram.sendMessage(chatId, message));
};

const getHelpText = () => {
  const html = fs.readFileSync('./help.html', 'utf-8');
  return html.replace('__TITLE__', TITLE).replace('__COST_PER_TICKET__', COST_PER_TICKET);
}

// Private done.

bot.use(session());
bot.use((context, next) => {
  const {from, chat, message, callbackQuery} = context;
  const text = message ? message.text : callbackQuery.data;
  const log = `${new Date().toString()} ${from.id}-${from.first_name} : ${text}`;
  if(blockedChatIds.includes(chat.id)) {
    console.log(`${log} <- From BLOCKED user`);
    return;
  }
  console.log(log);
  return next();
});
bot.start(({replyWithHTML}) => {
  return push(() => replyWithHTML(getHelpText()));
});
bot.help(({replyWithHTML}) => {
  return push(() => replyWithHTML(getHelpText()));
});

//Player
bot.command("example", ({replyWithPhoto}) => {
  return push(() => replyWithPhoto({
    source: "./transposed-ticket.png"
  }));
});

bot.command("signup", async (context) => {
  const regEx = new RegExp("^(/signup) ([123])\$");
  const {from, chat, message, reply} = context;
  const matchs = regEx.exec(message.text);
  if(!matchs) {
    return push(() => reply("Please specify the number of tickets(1 or 2 or 3). Ex: /signup 1"));
  }
  const signedUp = await signup({
    id: from.id,
    chatId: chat.id,
    name: `${from.first_name} ${from.last_name || ''}`,
    numberOfTickets: matchs[2]
  }).catch((err) => onError(context, err));
  if(signedUp.error) {
    return push(() => reply(signedUp.error));
  }
  return push(() => reply(`Signed up successfully. Please contact admin and pay money`));
});

bot.command("tickets", async (context) => {
  const tickets = await getTickets(context.from.id);
  if(tickets.error) {
    return push(() => context.reply(tickets.error));
  }
  push(() => context.reply("Here are your ticket(s)..."));
  return tickets.forEach((ticket, index) => {
    push(() => {
      telegram.sendMessage(context.chat.id, `Ticket ${index+1}`, convertToTicket(ticket));
    });
  });
});

bot.command("winners", async (context) => {
  const winners = await getWinners();
  push(() => context.reply(winners));
});

bot.action(isMarkAction, async ({reply, chat, editMessageText, from, callbackQuery, answerCbQuery}) => {
  const data = JSON.parse(callbackQuery.data.split("mark ")[1]);
  const result = await mark({...data, playerId: from.id});
  if(result.error) {
    actionOnInvalidAttempt(result.invalidAttempts, chat.id);
    return push(() => answerCbQuery(result.error));
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
  return push(() => answerCbQuery("Shhh!"));
});


//Admin
bot.use((context, next) => {
  const {from} = context;
  if(!admins.includes(from.id)) {
    admins.forEach(admin => {
      push(() => telegram.sendMessage(admin, `Message from ${from.id}-${from.first_name}: ${context.message.text}`));
    });
    return;
  }
  return next();
});

bot.command("getUser", (context) => {
  const regEx = new RegExp("^(/getUser) (\\d+)\$");
  const matchs = regEx.exec(context.message.text);
  telegram.getChat(matchs[2]).then((data) => {
    if(data.photo) {
      telegram.getFileLink(data.photo.big_file_id).then((photoLink) => {
        context.reply({...data, photo: photoLink});
      });
    } else {
      context.reply(data);
    }
  });
});

bot.command("allRegistered", async (context) => {
  const players = await getRegisteredPlayers();
  return push(() => context.reply(convertPlayersToMessage(players) || "Empty"));
});

bot.command("registered", async (context) => {
  const players = await getRegisteredNotConfirmedPlayers();
  return push(() => context.reply(convertPlayersToMessage(players) || "Empty"));
});

bot.command("players", async (context) => {
  const players = await getConfirmedPlayers();
  return push(() => context.reply(convertPlayersToMessage(players) || "Empty"));
});

bot.command("confirm", async (context) => {
  const regEx = new RegExp("^(/confirm) (\\d+)\$");
  const matchs = regEx.exec(context.message.text);
  if(!matchs) {
    return push(() => context.reply("Player id is missing."));
  }
  const playerId = matchs[2];
  const result = await confirmPlayer(playerId).catch((err) => onError(context, err));
  if(result.error) {
    return push(() => context.reply(result.error));
  }
  push(() => telegram.sendMessage(result.chatId, "You are confirmed by admin to play the game."));
  return push(() => context.reply(`Confirmed player: ${playerId}`));
});

bot.command("viewTickets", async (context) => {
  const regEx = new RegExp("^(/viewTickets) (\\d+)\$");
  const matchs = regEx.exec(context.message.text);
  if(!matchs) {
    return push(() => context.reply("Player id is missing."));
  }
  const playerId = matchs[2];
  const tickets = await getTickets(playerId);
  if(tickets.error) {
    return push(() => context.reply(tickets.error));
  }
  push(() => context.reply(`Here are ${playerId}'s ticket(s)...`));
  return tickets.forEach((ticket, index) => {
    push(() => {
      telegram.sendMessage(context.chat.id, `Ticket ${index+1}`, convertToTicket(ticket));
    });
  });
});

bot.command('create', async (context) => {
  const created = await createGame().catch((err) => onError(context, err));
  return push(() => context.reply(created.result));
});
bot.command('delete', async (context) => {
  const deleted = await deleteGame().catch((err) => onError(context, err));
  return push(() => context.reply(deleted.result));
});

bot.command('game', async (context) => {
  const game = Buffer.from(JSON.stringify(await getGame()));
  return push(() => context.replyWithDocument({source: game, filename: "game.json"}));
});

bot.command("startGame", async (context) => {
  const players = await startGameAndGetChatIds();
  if(players.error) {
    return push(() => context.reply(players.error));
  }
  informEveryone(players, "Game started now. Get ready for the numbers in the middle of messages.");
  return push(() => context.reply("Informed all players."));
});

bot.command("reveal", async (context) => {
  const result = await revealNumber();
  if(result.error) {
    return push(() => context.reply(result.error));
  }
  informEveryone(result.chatIds, numbers[result.number], {parse_mode: "HTML"});
  return push(() => context.reply("Informed all players."));
});

bot.command("send", async (context) => {
  const regEx = new RegExp("^(/send) (.*)$");
  const matchs = regEx.exec(context.message.text);
  const message = matchs[2];
  const chatIds = await getAllChatIds();
  informEveryone(chatIds, message);
  return context.reply("Sent to everyone");
});

bot.command("sendToRegistered", async (context) => {
  const regEx = new RegExp("^(/sendToRegistered) (.*)$");
  const matchs = regEx.exec(context.message.text);
  const message = matchs[2];
  const registeredNotConfirmedPlayers = await getRegisteredNotConfirmedPlayers();
  const chatIds =  registeredNotConfirmedPlayers.map(player => player.chatId);
  informEveryone(chatIds, message);
  return context.reply("Sent to everyone");
});

bot.command("sendTo", async (context) => {
  const regEx = new RegExp("^(/sendTo) ([0-9]*) (.*)$");
  const matchs = regEx.exec(context.message.text);
  const to = matchs[2];
  const message = matchs[3];
  push(() => telegram.sendMessage(to, message));
  return context.reply(`Sent to ${to}`);
});

bot.command("allRevealed", async (context) => {
  const revealedNumbers = await getAllRevealedNumbers();
  return push(() => context.reply(`All revealed numbers: ${revealedNumbers} `));
});

bot.catch((err) => {
  console.log('ERROR =>', err)
});

bot.launch();
startPing();
