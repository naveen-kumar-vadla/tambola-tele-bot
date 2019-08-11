const {createGame, deleteGame, signup, getRegisteredPlayers, revealNumber, confirmPlayer, mark} = require("./housie/game_service");
const {admins} = require("./config");

const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');


const bot = new Telegraf(process.env.BOT_TOKEN);
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
  });
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
bot.command('create', async (context) => {
  const created = await createGame().catch(() => onError(context));
  return context.reply(created.result);
});
bot.command('delete', async (context) => {
  const deleted = await deleteGame().catch((err) => onError(context, err));
  return context.reply(deleted.result)
});

bot.catch((err) => {
  console.log('ERROR =>', err)
});

bot.launch();

// Private
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
