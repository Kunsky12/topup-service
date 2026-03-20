const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const axios = require("axios");
require('dotenv').config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || "30425359");
const apiHash = process.env.TELEGRAM_API_HASH || "58d7402151cf2ca4125529a004bdbb3e";
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || "1BQANOTEuMTA4LjU2LjEwMQG7pZ2ZFEadoFkWlBIwKw8HBhxhn1hU5dhA58ZwSkHLsEsOTqAUolPdrlrdy8QlvJ+BUwbzE1KyjN8HeRAF0fm1mDjRzQFmEWXX4DxhItIqzngV3/IIuZ2ZDtIWYJ4C4eGVhwnvwh//C672Vq4UJFOar1fuvwj3/LjoJn/QVk0FpiZJ0sWunlVA5ZMThJ+/HPTHklsX7X9oylkEDu7XBO7sEBueBb46dcuSV0qd3CHBS760QSdRSQL+NC7+YSryN4InRpyoOzNOkTXSIf78CybnxY2oaaro0+x0VMcw0rpmI3l6pfGDr6R9PzvkLvQsYr3Oafs1gpyGS74a6F2I6GoplA==");

const ACLEDA_REGEX = /Received\s([\d.]+)\sUSD.*?Ref\.ID:\s(\d+).*?Purpose:(\S+)/;
const ABA_REGEX = /\$([\d.]+)\s+paid.*?Remark:\s*(\w+)/;

async function notifyPayment(orderId, amount) {
    try {
        const response = await axios.post('http://localhost:3000/api/verify-payment', {
            orderId,
            amount
        }, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ Payment verified: ${orderId} - $${amount}`, response.data);
        return response.data;
    } catch (err) {
        console.error(`❌ Failed to verify payment ${orderId}:`, err.response?.data || err.message);
    }
}

(async () => {
    console.log("🚀 Starting Telegram payment listener...");

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("📱 Phone number: "),
        password: async () => await input.text("🔐 Password (if any): "),
        phoneCode: async () => await input.text("📩 OTP Code: "),
        onError: (err) => console.error("Auth error:", err),
    });

    console.log("✅ Telegram Client logged in!");
    console.log("💾 Session string:", client.session.save());

    client.addEventHandler(async (event) => {
        if (!event.message?.message) return;
        
        const msg = event.message.message;
        console.log("📨 New message:", msg.substring(0, 100) + "...");

        // ACLEDA Bank
        let match = msg.match(ACLEDA_REGEX);
        if (match) {
            const [_, amount, refId, purpose] = match;
            console.log(`💰 ACLEDA payment detected: ${purpose} - $${amount}`);
            await notifyPayment(purpose, parseFloat(amount));
            return;
        }

        // ABA Bank
        match = msg.match(ABA_REGEX);
        if (match) {
            const [_, amount, remark, trxId] = match;
            console.log(`💰 ABA payment detected: ${remark} - $${amount}`);
            await notifyPayment(remark, parseFloat(amount));
            return;
        }
    }, new NewMessage({}));

    console.log("👂 Listening for ACLEDA and ABA payment notifications...");
})();