/*!
 * CyBorg
 * Copyright(c) 22019 Carrie Vrtis
 * MIT Licensed
 */

const printf = require('printf');

/**
 *  Generates a command parser using language data.
 *  @param {Cyborg} cyborg A Cyborg object to which to bind the commands
 *  @param {string} lang The i18n language code to use for command docs.
 *  @param {object} langData The language data for docs, in JSON format.
 *  @returns {Bot-Commander} A bot-commander command parser.
 */
function generateCommands(cyborg, lang, langData) {

    let commander = require('bot-commander');

    commander.command(langData[lang].COMMAND.INFO)
        .description(langData[lang].COMMAND.INFO_DESC)
        .action((message) => {
            cyborg.sendMessage(message.channel.id, printf(langData[lang].COMMAND.INFO_RESP, {
                version: process.env.npm_package_version,
                guilds: Object.keys(cyborg.eris.guilds).length,
                users: Object.keys(cyborg.eris.users).length,
                uptime: cyborg.eris.uptime
            }));
            console.log(cyborg.eris.guilds)
        });

    return commander;

};

module.exports = generateCommands;