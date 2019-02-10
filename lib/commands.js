/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const printf = require('printf');
const commander = require('bot-commander');
const Chuck = require('chucknorris-io');

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
    eris.createMessage(meta.message.channel.id, message);
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
          help: commander.commandHelp(LANG_CODE),
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
          version: process.env.npm_package_version,
          guilds: meta.cyborg.eris.guilds.size,
          users: meta.cyborg.eris.users.size,
          uptime: new Date(meta.cyborg.eris.uptime).toISOString().slice(11, -1),
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
          console.error(err);
        }
      });
    if (DEFAULT_LANG !== LANG_CODE && COMMAND_DEFAULT.CHUCK !== COMMAND_LANG.CHUCK) {
      C_CHUCK.alias(COMMAND_DEFAULT.CHUCK);
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
              let adminArr = meta.cyborg.config.admins;
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

    // channel command

    const C_CHANNEL = LANG_META.command(`${COMMAND_LANG.CHANNEL}`)
      .description(COMMAND_LANG.CHANNEL_DESC)
      .action((meta, arg) => {
        if (meta.cyborg.isAdmin(meta.message.author)) {
          let channelId = (arg ? meta.cyborg.validateChannel(arg) : meta.message.channel.id);
          if(channelId) {
            meta.cyborg.setTalkChannel(channelId);
            commander.send(meta, printf(COMMAND_LANG.CHANNEL_RESP, {
              channel: arg
            }));
            console.log(meta.cyborg);
          }
          else {
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
