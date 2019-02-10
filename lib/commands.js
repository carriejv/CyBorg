/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const printf = require('printf');
const commander = require('bot-commander');

/**
 *  Generates a command parser using language data.
 *  @param {Eris} eris The Eris object, used to send back messages.
 *  @param {object} lang The language data for docs, in JSON format.
 *  @returns {BotCommand} A bot-commander command parser.
 */
function generateCommands(eris, lang) {

  const DEFAULT_LANG = 'en-US';
  const COMMAND_DEFAULT = lang[DEFAULT_LANG];

  commander.setSend((meta, message) => {
    eris.createMessage(meta.channel.id, message);
  });

  lang.forEach( (value, key) => {
    const COMMAND_LANG = value;

  commander.command(`${key} ${COMMAND_LANG.HELP}`)
    .description(COMMAND_LANG.HELP_DESC)
    .alias(`${key} ?`)
    .alias(`${(key === DEFAULT_LANG ? 'default' : key)} ${COMMAND_DEFAULT.HELP}`)
    .action((meta) => {
      commander.send(meta, printf(COMMAND_LANG.HELP_RESP, {
        prefix: cyborg.config.prefix,
        help: commander.help(),
      }));
    });

  commander.command(`${key} ${COMMAND_LANG.INFO}`)
    .description(COMMAND_LANG.INFO_DESC)
    .alias(`${(key === DEFAULT_LANG ? 'default' : key)} ${COMMAND_DEFAULT.INFO}`)
    .action((meta) => {
      commander.send(meta, printf(COMMAND_LANG.INFO_RESP, {
        version: process.env.npm_package_version,
        guilds: cyborg.eris.guilds.size,
        users: cyborg.eris.users.size,
        uptime: cyborg.eris.uptime,
      }));
    });

  commander.command(`${key} ${COMMAND_LANG.BOOYAH}`)
    .description(COMMAND_LANG.BOOYAH_DESC)
    .alias(`${(key === DEFAULT_LANG ? 'default' : key)} ${COMMAND_DEFAULT.BOOYAH}`)
    .action((meta) => {
      commander.send(meta, COMMAND_LANG.BOOYAH_RESP);
    });

  commander.command(`${key} ${COMMAND_LANG.CHANNEL}`)
    .description(COMMAND_LANG.CHANNEL_DESC)
    .alias(`${(key === DEFAULT_LANG ? 'default' : key)} ${COMMAND_DEFAULT.CHANNEL}`)
    .action((meta) => {
      commander.send(meta, COMMAND_LANG.CHANNEL_RESP);
    });
  });

  return commander;
}

module.exports = generateCommands;
