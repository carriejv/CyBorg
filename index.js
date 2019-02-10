const fs = require('fs');
const Eris = require('eris');
const quaff = require('quaff');

async function init() {

    // Load config
    const CONFIG = () => {
        try {
            return require('./config.json');
        }
        catch(e) {
            console.error('CyBorg could not find a config.json file!');
            process.exit(1);
        }    
    };

    
    // Load language packs
    const LANG = await quaff('./lang');
    let gLang = (LANG[CONFIG.lang] ? CONFIG.lang : 'en-US');

    console.log(LANG[gLang].BOOT);

    // Load secrets
    const SECRET = await quaff('./secret');
    if(!(SECRET.discord.TOKEN)) {
        console.error(LANG[gLang].ERR_NOTOKEN);
        process.exit(1);
    }
    let bot = new Eris(SECRET.discord.TOKEN);
    console.log(bot);
}

init();

