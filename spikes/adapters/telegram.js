const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const fs = require("fs");
const help = fs.readFileSync("./adapters/help.html").toString('utf-8');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.start((ctx) => ctx.reply('Welcome!'));
bot.help((ctx) => ctx.replyWithHTML(help));

bot.command('claim', (ctx) => {
  return ctx.reply("Select ticket", Markup.keyboard([
    "First ticket",
    "Second ticket"
  ]).oneTime()
      .resize()
      .extra())

});

bot.command('inline', (ctx) => {
  return ctx.reply('random example',
      Markup.inlineKeyboard([
        Markup.callbackButton('Coke', 'Coke'),
        Markup.callbackButton('Dr Pepper', 'Dr Pepper', Math.random() > 0.5),
        Markup.callbackButton('Pepsi', 'Pepsi')
      ]).extra()
  )
});

bot.command('ticket', (ctx) => {
  return ctx.reply('Select the number you want to strike out', Markup.inlineKeyboard([
        [Markup.callbackButton('Coke', 'CokeR'), Markup.callbackButton('Coke2', 'Coke2R')],
        [Markup.callbackButton('Pepsi', 'PepR')],
        [Markup.callbackButton('None', 'noneR')]
      ]).extra()
  )
});

bot.action('noneR', (ctx) => {
  ctx.editMessageText("Edited: Select", Markup.inlineKeyboard([
        [Markup.callbackButton('Coke', 'CokeR'), Markup.callbackButton('Coke2', 'Coke2R')],
        [Markup.callbackButton('Pepsi', 'PepR')]
      ]).extra()
  );
});


bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();
