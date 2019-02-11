/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const cytube = require('cytube-client');

const TIMEOUT = 10 * 1000;

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
    this.cytubeConnections = {};
    const safeConfig = config || {};
    this.config = {
      lang: safeConfig.lang || 'en-US',
      prefix: safeConfig.prefix || '!cy',
      admins: safeConfig.admins || [this.guild.ownerID],
      talkChannel: safeConfig.talkChannel || this.guild.systemChannelID,
      cyChannels: safeConfig.cyChannels || [],
    };
    if (!lang[this.config.lang]) {
      this.config.lang = 'en-US';
    }
    // Attach listeners.
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
   * Establishes a connection to a CyTu.be room in order to listen to events.
   * @param {string} roomName The name of the CyTu.be room to which to connect.
   * @throws {Error}
   * @returns {CytubeConnection} A cytube-client CytubeConnection object.
   */
  async cytubeConnect(roomName) {
    let connection;
    try {
      connection = await cytube.connect(roomName);
    } catch (err) {
      throw new Error(err);
    }
    return connection;
  }

  /**
   * Retrieves information about a CyTu.be channel.
   * @param {string} roomName The name of the CyTu.be room.
   * @throws {Error}
   * @returns {object|boolean} Information about the CyTu.be channel, or false on timeout.
   */
  async cytubeInfo(roomName) {
    async function getInfo(cyborg) {
      let cyConn;
      try {
        cyConn = await cyborg.cytubeConnect(roomName);
      } catch (err) {
        throw new Error(err);
      }
      const media = await cyConn.getCurrentMedia();
      const users = await cyConn.getUserlist();
      let url = false;
      switch (media.type) {
        case 'yt':
          url = `https://www.youtube.com/watch?v=${media.id}`;
          break;
        default:
          url = false;
          break;
      }
      return { media, users, url };
    }
    return Promise.race([getInfo(this), this.getTimeoutPromise(TIMEOUT)]);
  }

  /**
   * Listens for media changes on a CyTu.be channel.
   * @param {string} roomName The name of the CyTu.be room.
   * @param {function} callback A callback function with one arg, a Promise for the channel information.
   * @throws {Error}
   */
  async cytubeListen(roomName, callback) {
    let cyConn;
    try {
      cyConn = await this.cytubeConnect(roomName);
    } catch (err) {
      throw new Error(err);
    }
    cyConn.on('changeMedia', async () => {
      try {
        callback(await this.cytubeInfo(roomName));
      } catch (err) {
        console.error(`${err}`);
      }
    });
    this.cytubeConnections[roomName] = cyConn;
  }

  /**
   * Removes listeners on a CyTu.be channel.
   * @param {string} roomName The name of the CyTu.be room.
   */
  cytubeUnlisten(roomName) {
    this.cytubeConnections[roomName].off('changeMedia');
    this.cytubeConnections[roomName].close();
    delete this.cytubeConnections[roomName];
  }

  /**
   * Wraps a timeout in a Promise object for use in races.
   * @param {number} time Time in ms.
   * @returns {Promise}
   */
  async getTimeoutPromise(time) {
    const promise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timed out.'));
      }, time);
    });
    return promise;
  }

  /**
   * Returns a valid user id from a mention string if the user exists in the bound guild.
   * @param {string} mention The Discord mention string (ex: <@123456...>)
   * @returns {string} The user id.
   */
  validateMention(mention) {
    const id = mention.slice(2, -1);
    if (this.guild.members.get(id)) {
      return id;
    }
    return false;
  }

  /**
   * Returns a valid channel id from a mention string if the channel exists in the bound guild.
   * @param {string} mention The Discord mention string (ex: <#123456...>)
   * @returns {string} The channel id.
   */
  validateChannel(mention) {
    const id = mention.slice(2, -1);
    if (this.guild.channels.get(id)) {
      return id;
    }
    return false;
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
   * @returns {boolean} True on success, else false.
   */
  setTalkChannel(channelId) {
    if (this.guild.channels.get(channelId)) {
      this.config.talkChannel = channelId;
      return true;
    }
    return false;
  }

  /**
   * Sets the interface language. Must be a valid i18n language code and lang file.
   * @param {string} lang The channel id to announce listener events in.
   * @returns {boolean} True on success, else false.
   */
  setLang(lang) {
    if (lang[this.config.lang]) {
      this.config.lang = lang;
      return true;
    }
    return false;
  }

  /**
   * Sets the command prefix.
   * @param {string} prefix The new prefix.
   */
  setPrefix(prefix) {
    this.config.prefix = prefix;
  }

  /**
   * Promotes a user to admin by id.
   * @param {number|string} userId The user id.
   */
  setAdmin(userId) {
    this.config.admins.push(userId);
  }

  /**
   * Demotes a user from admin by id.
   * @param {number|string} userId The user id.
   */
  unsetAdmin(userId) {
    this.config.admins = this.config.admins(e => e !== userId);
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
