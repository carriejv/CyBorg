/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const printf = require('printf');
const commander = require('bot-commander');

/**
 *  Generates a command parser using language data.
 *  @param {Cyborg} cyborg A Cyborg object to which to bind the commands
 *  @param {string} lang The i18n language code to use for command docs.
 *  @param {object} langData The language data for docs, in JSON format.
 *  @returns {BotCommand} A bot-commander command parser.
 */
function generateCommands(cyborg, lang, langData) {
  const COMMAND_LANG = langData[lang].COMMAND;

  commander.setSend((meta, message) => {
    cyborg.sendMessage(meta.channel.id, message);
  });

  commander.command(COMMAND_LANG.HELP)
    .description(COMMAND_LANG.HELP_DESC)
    .alias('?')
    .action((meta) => {
      commander.send(meta, printf(COMMAND_LANG.HELP_RESP, {
        prefix: cyborg.config.prefix,
        help: commander.help(),
      }));
    });

  commander.command(COMMAND_LANG.INFO)
    .description(COMMAND_LANG.INFO_DESC)
    .action((meta) => {
      commander.send(meta, printf(COMMAND_LANG.INFO_RESP, {
        version: process.env.npm_package_version,
        guilds: cyborg.eris.guilds.size,
        users: cyborg.eris.users.size,
        uptime: cyborg.eris.uptime,
      }));
    });

  commander.command(COMMAND_LANG.BOOYAH)
    .description(COMMAND_LANG.BOOYAH_DESC)
    .action((meta) => {
      commander.send(meta, COMMAND_LANG.BOOYAH_RESP);
    });

  commander.command(COMMAND_LANG.CHANNEL)
    .description(COMMAND_LANG.CHANNEL_DESC)
    .action((meta) => {
      commander.send(meta, COMMAND_LANG.CHANNEL_RESP);
    });

  return commander;
}

module.exports = generateCommands;
