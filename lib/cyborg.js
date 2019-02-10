/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

class Cyborg {
  /**
     * Creates a new instance of CyBorg, which handles events on a single Discord guild (server).
     * @class
     * @classdesc A CyBorg instance manages a single Discord guild (server).
     * @param {Eris} eris The global Eris instance.
     * @param {BotCommander} commander The global bot-commander command parser.
     * @param {Guild} guild The Eris Guild object to which to attach the instance.
     * @param {object} lang Language data, in JSON format.
     * @param {object} config Config settings. Valid options are lang, prefix, admins, talkChannel, and cyChannels.
     */
  constructor(eris, commander, guild, lang, config) {
    this.eris = eris;
    this.commander = commander;
    this.guild = guild;
    this.guildId = guild.id;
    this.lang = lang;
    this.config = {
      lang: config.lang || 'en-US',
      prefix: config.prefix || '!cy',
      admins: config.admins || [this.guild.ownerID],
      talkChannel: config.talkChannel || false,
      cyChannels: config.cyChannels || [],
    };
    if (!lang[this.config.lang]) {
      this.config.lang = 'en-US';
    }
    this.eris.on('messageCreate', (msg) => {
      if (this.isValidCommand(msg)) {
        this.eris.sendChannelTyping(msg.channel.id);
        this.commander.parse(`${this.config.lang} ${msg.content.replace(this.config.prefix, '').trim()}`, {
          cyborg: this,
          message: msg,
        });
      }
    });
  }

  /**
   * Checks if a Message object is a valid command for this CyBorg instance.
   * @param {Message} msg The Eris Message object.
   * @returns {boolean}
   */
  isValidCommand(msg) {
    return (msg.channel.guild
            && msg.channel.guild.id === this.guildId
            && msg.content.indexOf(this.config.prefix) === 0);
  }

  /**
   * Checks if a User object is an administrator of this CyBorg instance.
   * @param {User} user The Eris User object.
   * @returns {boolean}
   */
  isAdmin(user) {
    return this.config.admins.includes(`${user.id}`);
  }

  /**
   * Sets the default channel in which listener events are announced. Must be a valid channel in the bound guild.
   * @param {number|string} channelId The channel id to announce listener events in.
   */
  setTalkChannel(channelId) {
    if (this.guild.channels.channelId) {
      this.talkChannel = channelId;
      return true;
    }
    return false;
  }

  /**
     * Sends a Discord message.
     * @param {number|string} channelId The id of the channel in which to send the message.
     * @param {string} message The message to send.
     */
  async sendMessage(channelId, message) {
    this.eris.createMessage(channelId, message);
  }

  /**
     * Prints information about this object.
     * @override
     * @returns A string representation of the object.
     */
  toString() {
    return (`${this.guildId}: ${this.config.lang} | ${this.config.prefix}\n${this.commands}`);
  }
}

module.exports = Cyborg;
