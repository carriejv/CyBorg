/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const fs = require('fs');
const Eris = require('eris');
const quaff = require('quaff');
const printf = require('printf');

const Cyborg = require('./lib/cyborg.js');

const cyInstances = {};

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

  /**
   * Creates a CyBorg instance and binds it to a guild (server).
   * @param {Guild} guild The Eris Guild object to join.
   */
  function joinGuild(guild) {
    console.log(printf(LANG[gLang].JOIN, {
      id: guild.id,
      name: guild.name,
    }));
    cyInstances[guild.id] = new Cyborg(eris, guild, LANG, { lang: 'en-US', prefix: '!cy' });
  }

  eris.on('ready', () => {
    eris.guilds.forEach((guild) => {
      joinGuild(guild);
    });
    console.log('...');
    console.log(LANG[gLang].READY);
    console.log(printf(LANG[gLang].OAUTH, {
      url: `https://discordapp.com/api/oauth2/authorize?client_id=${SECRET.discord.CLIENT_ID}&permissions=199680&scope=bot`
    }));
  });
  eris.on('guildCreate', (guild) => {
    joinGuild(guild);
  });
  eris.connect();
}

init();
