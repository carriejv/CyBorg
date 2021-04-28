/*!
 * CyBorg
 * Copyright(c) 2019 Carrie Vrtis
 * MIT Licensed
 */

const fs = require('fs');
const cytube = require('cytube-client');
const printf = require('printf');

const CONFIG_DIR = './config';

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
    let safeConfig = config || {};
    if (!config && fs.existsSync(`${CONFIG_DIR}/${this.guildId}.json`)) {
      try {
        safeConfig = JSON.parse(fs.readFileSync(`${CONFIG_DIR}/${this.guildId}.json`));
      }
      catch(err) {
        console.log(`Invalid settings file on ${this.guildId}`);
      }
    }
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
    // Re-hook any saved cytube announce channels.
    for(const channel of this.config.cyChannels) {
      this.cytubeListen(channel, (response) => {
        this.eris.createMessage(this.config.talkChannel, printf(this.lang[this.config.lang].COMMAND.ANNOUNCE_CB, {
          name: channel,
          title: response.media.title,
          users: response.users.length,
          url: response.url || '(No Video URL)',
        }));
      });
    }
    this.saveConfig();
  }

  /**
   * Saves config as a JSON file in CONFIG_DIR/<guildId>.json
   */
  saveConfig() {
    fs.writeFile(`${CONFIG_DIR}/${this.guildId}.json`, JSON.stringify(this.config), (err) => {
      if (err) {
        console.error(err);
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
      connection = await cytube.connect(roomName, {});
    } catch (err) {
      throw new Error(err);
    }
    return connection;
  }

  /**
   * Retrieves information about a CyTu.be channel.
   * @param {string} roomName The name of the CyTu.be room.
   * @throws {Error} Throws cytube connection errors or timeout error
   * @returns {object} Information about the CyTu.be channel
   */
  async cytubeInfo(roomName) {
    // For reasons currently unknown, the second request is likely to time out if made on the same connection.
    // This is likely an issue with cy.tube itself. Strangely, listener connections can be open near-indefinitely.
    let mediaConn;
    try {
      mediaConn = await this.cytubeConnect(roomName);
    } catch (err) {
      throw new Error(err);
    }
    const media = await mediaConn.getCurrentMedia();
    mediaConn.close();

    let userConn;
    try {
      userConn = await this.cytubeConnect(roomName);
    } catch (err) {
      throw new Error(err);
    }
    const users = await userConn.getUserlist();
    userConn.close();

    let url = false;
    switch (media.type) {
      case 'yt':
        url = `https://www.youtube.com/watch?v=${media.id}`;
        break;
    }

    return { media, users, url };
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
    this.config.cyChannels.push(roomName);
    const dedupedChannels = new Set(this.config.cyChannels);
    this.config.cyChannels = Array.from(dedupedChannels);
    this.saveConfig();
  }

  /**
   * Removes listeners on a CyTu.be channel.
   * @param {string} roomName The name of the CyTu.be room.
   */
  cytubeUnlisten(roomName) {
    this.cytubeConnections[roomName].off('changeMedia');
    this.cytubeConnections[roomName].close();
    delete this.cytubeConnections[roomName];
    this.config.cyChannels = this.config.cyChannels.filter(x => x !== roomName);
    this.saveConfig();
  }

  /**
   * Returns a valid user id from a mention string if the user exists in the bound guild.
   * @param {string} mention The Discord mention string (ex: <@123456...>)
   * @returns {string} The user id.
   */
  validateMention(mention) {
    const id = mention.match(/(\d+)/gmi)[0];
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
      this.saveConfig();
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
      this.saveConfig();
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
    this.saveConfig();
  }

  /**
   * Promotes a user to admin by id.
   * @param {number|string} userId The user id.
   */
  setAdmin(userId) {
    this.config.admins.push(userId);
    this.saveConfig();
  }

  /**
   * Demotes a user from admin by id.
   * @param {number|string} userId The user id.
   */
  unsetAdmin(userId) {
    this.config.admins = this.config.admins(e => e !== userId);
    this.saveConfig();
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
