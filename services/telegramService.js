// services/telegramService.js
const TelegramBot = require('node-telegram-bot-api');
const orderService = require('./orderService'); // <-- missing import
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

if (!token || !GROUP_CHAT_ID) {
    console.warn("Telegram bot token or group chat ID not set!");
}

// Initialize bot instance (was missing entirely)
const bot = new TelegramBot(token, { polling: false });

// send message function (used by orderService)
exports.sendMessage = async (text) => {
    try {
        const res = await bot.sendMessage(
            GROUP_CHAT_ID,
            text,
            { parse_mode: "Markdown" } // <-- add this
        );

        console.log("Message sent:", res.text);

    } catch (err) {

        console.error("Telegram send failed:", err.message);

    }

};
