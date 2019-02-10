/*!
 * CyBorg
 * Copyright(c) 22019 Carrie Vrtis
 * MIT Licensed
 */

const fs = require('fs');
const Eris = require('eris');
const quaff = require('quaff');
const printf = require('printf');

const Cyborg = require('./lib/cyborg.js');
let cyInstances = {};

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
  console.log('...');

  // Load secrets
  const SECRET = await quaff('./secret');
  if (!(SECRET.discord.TOKEN)) {
    console.error(LANG[gLang].ERR_NOTOKEN);
    process.exit(1);
  }
  const eris = new Eris(SECRET.discord.TOKEN);
  eris.on('ready', () => {
    for(let [id, guild] of eris.guilds) {
      console.log(printf(LANG[gLang].JOIN, {
        id: id,
        name: guild.name
      }));
      cyInstances[guild.id]= new Cyborg(eris, guild, LANG, { lang: 'en-US', prefix: '!cy' });
    }
    console.log('...');
    console.log(LANG[gLang].READY);
  });
  eris.connect();
}

init();
