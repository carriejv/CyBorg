/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const printf = require('printf');
const commander = require('bot-commander');
const Chuck = require('chucknorris-io');
const stats = require('./stats');
const os = require('os');

const chuckClient = new Chuck();

/**
 *  Generates a command parser using language data.
 *  @param {Eris} eris The Eris object, used to send back messages.
 *  @param {object} lang The language data for docs, in JSON format.
 *  @returns {BotCommand} A bot-commander command parser.
 */
function generateCommands(eris, lang) {
  const DEFAULT_LANG = 'en-US';
  const COMMAND_DEFAULT = lang[DEFAULT_LANG].COMMAND;

  commander.command('help')
    .description('Default help command.')
    .action((meta) => {
      commander.parse('en-US help', meta);
    });

  commander.setSend((meta, message) => {
    try {
      switch (meta.type) {
        case 'announce':
          eris.createMessage(meta.cyborg.config.talkChannel, message);
          break;
        default:
          eris.createMessage(meta.message.channel.id, message);
          break;
      }
    }
    catch(err) {
      console.error(`Failed to send message:\n${meta}\n${message}`);
    }
  });

  Object.entries(lang).forEach((entry) => {
    const LANG_CODE = entry[0];
    const COMMAND_LANG = entry[1].COMMAND;

    const LANG_META = commander.command(`${LANG_CODE}`).showHelpOnEmpty();

    // help command

    const C_HELP = LANG_META.command(`${COMMAND_LANG.HELP}`)
      .description(COMMAND_LANG.HELP_DESC)
      .alias(COMMAND_LANG.HELP_ALIAS)
      .alias('?')
      .action((meta) => {
        commander.send(meta, printf(COMMAND_LANG.HELP_RESP, {
          prefix: meta.cyborg.config.prefix,
          help: '```text' + `\n${LANG_META.commandHelp()}\n` + '```'
        }));
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.HELP !== COMMAND_LANG.HELP) {
      C_HELP.alias(COMMAND_DEFAULT.HELP);
    }

    // info command

    const C_INFO = LANG_META.command(`${COMMAND_LANG.INFO}`)
      .description(COMMAND_LANG.INFO_DESC)
      .action((meta) => {
        commander.send(meta, printf(COMMAND_LANG.INFO_RESP, {
          version: process.env.npm_package_version || lang[LANG_CODE].VERSION,
          shards: stats.currentStats.servers,
          users: stats.currentStats.users,
          uptime: new Date(meta.cyborg.eris.uptime).toISOString().slice(11, -1),
          respTime: Date.now() - meta.message.timestamp,
          shardId: os.hostname()
        }));
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.INFO !== COMMAND_LANG.INFO) {
      C_INFO.alias(COMMAND_DEFAULT.INFO);
    }

    // booyah command

    const C_BOOYAH = LANG_META.command(`${COMMAND_LANG.BOOYAH}`)
      .description(COMMAND_LANG.BOOYAH_DESC)
      .action((meta) => {
        commander.send(meta, COMMAND_LANG.BOOYAH_RESP);
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.BOOYAH !== COMMAND_LANG.BOOYAH) {
      C_BOOYAH.alias(COMMAND_DEFAULT.BOOYAH);
    }

    // chuck command

    const C_CHUCK = LANG_META.command(`${COMMAND_LANG.CHUCK}`)
      .description(COMMAND_LANG.CHUCK_DESC)
      .action(async (meta) => {
        let fact = COMMAND_LANG.CHUCK_ERR;
        try {
          fact = await chuckClient.getRandomJoke();
          commander.send(meta, printf(COMMAND_LANG.CHUCK_RESP, {
            chuck: fact.value,
          }));
        } catch (err) {
          console.log('Error running chuck,', err);
          commander.send(meta, COMMAND_LANG.CHUCK_ERR);
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.CHUCK !== COMMAND_LANG.CHUCK) {
      C_CHUCK.alias(COMMAND_DEFAULT.CHUCK);
    }

    // cytube command

    const C_CYTUBE = LANG_META.command(`${COMMAND_LANG.CYTUBE}`)
      .description(COMMAND_LANG.CYTUBE_DESC)
      .action(async (meta, arg) => {
        try {
          const response = await meta.cyborg.cytubeInfo(arg);
          commander.send(meta, printf(COMMAND_LANG.CYTUBE_RESP, {
            name: arg,
            title: response.media.title,
            users: response.users.length,
            url: response.url || '(No Video URL)',
          }));
        } catch (err) {
          console.log('Error retrieving cytube info,', err);
          commander.send(meta, COMMAND_LANG.CYTUBE_ERR);
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.CYTUBE !== COMMAND_LANG.CYTUBE) {
      C_CYTUBE.alias(COMMAND_DEFAULT.CYTUBE);
    }

    // announce command

    const C_ANNOUNCE = LANG_META.command(`${COMMAND_LANG.ANNOUNCE}`)
      .description(COMMAND_LANG.ANNOUNCE_DESC)
      .action(async (meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          if (meta.cyborg.cytubeConnections[arg]) {
            meta.cyborg.cytubeUnlisten(arg);
            commander.send(meta, printf(COMMAND_LANG.ANNOUNCE_UNDO, {
              channel: arg,
            }));
          } else {
            const callback = (response) => {
              const cbMeta = meta;
              cbMeta.type = 'announce';
              commander.send(cbMeta, printf(COMMAND_LANG.ANNOUNCE_CB, {
                name: arg,
                title: response.media.title,
                users: response.users.length,
                url: response.url || '(No Video URL)',
              }));
            };
            meta.cyborg.cytubeListen(arg, callback);
            if(!meta.cyborg.talkChannel) {
              meta.cyborg.setTalkChannel(meta.message.channel.id)
            }
            commander.send(meta, printf(COMMAND_LANG.ANNOUNCE_RESP, {
              channel: arg,
              discord: `<#${meta.cyborg.config.talkChannel}>`,
            }));
          }
        } else {
          commander.send(meta, printf(COMMAND_LANG.ERR_NOADMIN, {
            prefix: meta.cyborg.config.prefix,
            command: COMMAND_LANG.ADMIN,
          }));
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.ANNOUNCE !== COMMAND_LANG.ANNOUNCE) {
      C_ANNOUNCE.alias(COMMAND_DEFAULT.ANNOUNCE);
    }

    // admin command

    const C_ADMIN = LANG_META.command(`${COMMAND_LANG.ADMIN}`)
      .description(COMMAND_LANG.ADMIN_DESC)
      .action((meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          const userId = meta.cyborg.validateMention(arg);
          if (userId) {
            if (userId === meta.cyborg.guild.ownerID) {
              commander.send(meta, COMMAND_LANG.ADMIN_ERR.DEMOTE_OWNER);
            } else {
              const adminArr = meta.cyborg.config.admins;
              if (adminArr.includes(userId)) {
                meta.cyborg.unsetAdmin(userId);
                commander.send(meta, printf(COMMAND_LANG.ADMIN_UNDO, {
                  user: arg,
                }));
              } else {
                meta.cyborg.setAdmin(userId);
                commander.send(meta, printf(COMMAND_LANG.ADMIN_RESP, {
                  user: arg,
                }));
              }
            }
          } else {
            commander.send(meta, COMMAND_LANG.ADMIN_ERR.NO_USER);
          }
        } else {
          commander.send(meta, printf(COMMAND_LANG.ERR_NOADMIN, {
            prefix: meta.cyborg.config.prefix,
            command: COMMAND_LANG.ADMIN,
          }));
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.ADMIN !== COMMAND_LANG.ADMIN) {
      C_ADMIN.alias(COMMAND_DEFAULT.ADMIN);
    }

    // TODO - lang command
    /*
    const C_LANG = LANG_META.command(`${COMMAND_LANG.LANG}`)
      .description(COMMAND_LANG.LANG_DESC)
      .action((meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          if (meta.cyborg.setLang(arg)) {
            commander.send(meta, COMMAND_LANG.LANG_RESP);
          } else {
            commander.send(meta, COMMAND_LANG.LANG_ERR);
          }
        } else {
          commander.send(meta, printf(COMMAND_LANG.ERR_NOADMIN, {
            prefix: meta.cyborg.config.prefix,
            command: COMMAND_LANG.ADMIN,
          }));
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.LANG !== COMMAND_LANG.LANG) {
      C_LANG.alias(COMMAND_DEFAULT.LANG);
    }
    */

    // prefix command

    const C_PREFIX = LANG_META.command(`${COMMAND_LANG.PREFIX}`)
      .description(COMMAND_LANG.PREFIX_DESC)
      .action((meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          meta.cyborg.setPrefix(arg);
          commander.send(meta, printf(COMMAND_LANG.PREFIX_RESP, {
            prefix: arg,
          }));
        } else {
          commander.send(meta, printf(COMMAND_LANG.ERR_NOADMIN, {
            prefix: meta.cyborg.config.prefix,
            command: COMMAND_LANG.ADMIN,
          }));
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.PREFIX !== COMMAND_LANG.PREFIX) {
      C_PREFIX.alias(COMMAND_DEFAULT.PREFIX);
    }

    // channel command

    const C_CHANNEL = LANG_META.command(`${COMMAND_LANG.CHANNEL}`)
      .description(COMMAND_LANG.CHANNEL_DESC)
      .action((meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          const channelId = (arg ? meta.cyborg.validateChannel(arg) : meta.message.channel.id);
          if (channelId) {
            meta.cyborg.setTalkChannel(channelId);
            commander.send(meta, printf(COMMAND_LANG.CHANNEL_RESP, {
              channel: `<#${channelId}>`,
            }));
          } else {
            commander.send(meta, COMMAND_LANG.CHANNEL_ERR);
          }
        } else {
          commander.send(meta, printf(COMMAND_LANG.ERR_NOADMIN, {
            prefix: meta.cyborg.config.prefix,
            command: COMMAND_LANG.ADMIN,
          }));
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.CHANNEL !== COMMAND_LANG.CHANNEL) {
      C_CHANNEL.alias(COMMAND_DEFAULT.CHANNEL);
    }
  });

  return commander;
}

module.exports = generateCommands;
