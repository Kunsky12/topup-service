const PlayFab = require("playfab-sdk/Scripts/PlayFab/PlayFabServer");

PlayFab.settings.titleId = process.env.PLAYFAB_TITLE_ID;
PlayFab.settings.developerSecretKey = process.env.PLAYFAB_SECRET;

console.log(process.env.PLAYFAB_TITLE_ID); // should print your bot token
console.log(process.env.PLAYFAB_SECRET); // should print -1003822499318

module.exports = PlayFab;
