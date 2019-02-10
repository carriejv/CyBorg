/*!
 * CyBorg
 * Copyright(c) 22019 Carrie Vrtis
 * MIT Licensed
 */

const fs = require('fs');
const Eris = require('eris');
const quaff = require('quaff');

const Cyborg = require('./lib/cyborg.js');

async function init() {
  // Load config
  const CONFIG = async () => {
    try {
      return await JSON.parse(fs.readFile('./config.json'));
    } catch (e) {
      console.error('CyBorg could not find a config.json file!');
      return false;
    }
  };
  if (!CONFIG) {
    process.exit(1);
  }

  // Load language packs
  const LANG = await quaff('./lang');
  const gLang = (LANG[CONFIG.lang] ? CONFIG.lang : 'en-US');

  console.log(LANG[gLang].BOOT);

  // Load secrets
  const SECRET = await quaff('./secret');
  if (!(SECRET.discord.TOKEN)) {
    console.error(LANG[gLang].ERR_NOTOKEN);
    process.exit(1);
  }
  let bot = new Eris(SECRET.discord.TOKEN);
  bot.on('ready', () => {
    console.log(LANG[gLang].READY);
    let cyborg = new Cyborg(bot, {id: `415353531193884682`}, LANG, {lang: 'en-US', prefix: '!cy'});
  });
  bot.connect();
}

init();
