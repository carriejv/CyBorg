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
const commander = require('./lib/commands.js');
const stats = require('./lib/stats');

const cyInstances = {};
const STAT_REFRESH_INTERVAL = 30000;

async function init() {
  // Load config
  const CONFIG = async () => {
    try {
      return await JSON.parse(fs.readFile('./config/global.json'));
    } catch (e) {
      console.error('CyBorg could not find a ./config/global.json file!');
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

  // Create global Eris instance
  const eris = new Eris(SECRET.discord.TOKEN);
  let isReady = false;
  let isConnecting = false;
  let reconnectInterval = false;

  // Generate Commands
  const commandParser = commander(eris, LANG);

  /** 
   * Triggers an auto-reconnect loop.
   * If one is already in progress, another will not be triggered.
   */
  function beginReconnecting() {
    if(isConnecting) {
      return false;
    }
    isConnecting = true;
    reconnectInterval = setInterval(() => {
      console.log('Attempting to reconnect...');
      eris.connect();
    }, 10000);
  }

  /**
   * Creates a CyBorg instance and binds it to a guild (server).
   * @param {Guild} guild The Eris Guild object to join.
   */
  function joinGuild(guild) {
    console.log(printf(LANG[gLang].JOIN, {
      id: guild.id,
      name: guild.name || '(Unknown or Unavailable Guild)',
    }));
    cyInstances[guild.id] = new Cyborg(eris, commandParser, guild, LANG);
  }

  let statusIndex = 0
  /** Updates bot status message. */
  function statusUpdate() {
    let status;
    switch(statusIndex) {
      case 0:
        status = {
          name: `${stats.currentStats.users} users. Booyah!`,
          type: 3,
          url: 'https://github.com/carriejv/cyborg',
        };
        break;
      case 1:
        status = {
          name: `${stats.currentStats.servers} servers. Booyah!`,
          type: 3,
          url: 'https://github.com/carriejv/cyborg',
        };
        break;
      case 2:
        status = {
          name: `${stats.currentStats.cytubeChannels} CyTube channels. Booyah!`,
          type: 3,
          url: 'https://github.com/carriejv/cyborg',
        };
        break;
      case 3:
        status = {
          name: `!cy ?. Booyah!`,
          type: 0,
          url: 'https://github.com/carriejv/cyborg',
        };
        break;
    }
    eris.editStatus('online', status);
    if(++statusIndex > 3) {
      statusIndex = 0;
    }
  }

  eris.on('ready', () => {
    if(isReady) {
      return false;
    }
    isReady = true;
    eris.guilds.forEach((guild) => {
      joinGuild(guild);
    });
    eris.unavailableGuilds.forEach((guild) => {
      joinGuild(guild);
    });
    console.log('...');
    console.log(LANG[gLang].READY);
    console.log(printf(LANG[gLang].OAUTH, {
      url: `https://discordapp.com/api/oauth2/authorize?client_id=${SECRET.discord.CLIENT_ID}&permissions=199680&scope=bot`,
    }));
    stats.updateStats(eris, cyInstances);
    setInterval(() => {
      stats.updateStats(eris, cyInstances);
    }, STAT_REFRESH_INTERVAL);
    statusUpdate();
    setInterval(statusUpdate, STAT_REFRESH_INTERVAL);
    // Attach listeners.
    eris.on('messageCreate', (msg) => {
      if(msg.channel && msg.channel.guild && msg.channel.guild.id) {
        // Do not parse PMs
        let cyborgHandler = cyInstances[msg.channel.guild.id];
        if(!cyborgHandler) {
          console.log('Message received without a handler (possibly a PM):', msg);
        }
        if (cyborgHandler.isValidCommand(msg)) {
          eris.sendChannelTyping(msg.channel.id);
          commandParser.parse(`${cyborgHandler.config.lang} ${msg.content.replace(cyborgHandler.config.prefix, '').trim()}`, {
            cyborg: cyborgHandler,
            message: msg,
          });
        }
      }
    });

    // Handle joining a new server
    eris.on('guildCreate', (guild) => {
      joinGuild(guild);
      try {
        eris.createMessage(guild.systemChannelID, printf(LANG[gLang].NEW_GUILD,
          {
            version: process.env.npm_package_version,
          }));
        }
        catch(err) {
          console.error(err);
        }
    });

  });

  // Stop auto-reconnecting if disconnected.
  eris.on('connect', () => {
    console.log('Successfully connected to Discord.');
    reconnectInterval && clearInterval(reconnectInterval);
  });

  // Raw Eris errors usually indicate a connection problem
  eris.on('error', (err) => {
    console.error('Discord connection error.');
    console.error(err);
    beginReconnecting();
  });

  eris.connect();

}

init();
