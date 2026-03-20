// topupServiceFull.js

const repo = require("../repository/orderRepository");
const playfab = require("./playfabService");
const telegram = require("./telegramService");
const axios = require("axios");
const { generateServiceToken } = require("./JwtAuth");
const cron = require('node-cron');
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const EXPIRATION_TIME = (Number(process.env.ORDER_EXPIRATION) || 5) * 60 * 1000;
const NOTIFY_URL = process.env.WEBSOCKET_URL;
const dbFile = path.resolve(__dirname, "../db.sqlite");

// ------------------------
// Helper Functions
// ------------------------
function formatDate(ts) {
    const date = new Date(ts);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} at ` +
           `${date.getHours() % 12 || 12}:${date.getMinutes().toString().padStart(2,'0')} ` +
           `${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}

async function generate4DigitCode() {
    let code, exists = true;

    while (exists) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        const order = await repo.findPendingByCode(code);
        if (!order) exists = false;
    }

    return code;
}

function backupDatabase() {
    const backupDir = path.resolve(__dirname, "../db_backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.sqlite`);

    fs.copyFile(dbFile, backupFile, (err) => {
        if (err) console.error("❌ Failed to backup DB:", err);
        else console.log(`💾 Weekly backup created: ${backupFile}`);
    });
}

async function sendTopUpNotification(receiverId, orderCode, amount) {
    try {
        const token = generateServiceToken();
        const payload = {
            facebookId: "https://raw.githubusercontent.com/Kunsky12/kkmversion/main/Logo.png",
            receiverId,
            referenceId: orderCode,
            senderName: "Top-Up Service",
            transactionDate: new Date().toISOString(),
            amount,
            currency: "RP"
        };

        await axios.post(NOTIFY_URL, payload, {
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        });

        console.log(`📡 Notification sent to ${receiverId}`);
    } catch (err) {
        console.error(`❌ Failed to send notification:`, err.response?.data || err.message);
    }
}

// ------------------------
// Core Service Functions
// ------------------------
exports.createOrder = async function(playerId, type, pack, amount, paymentMethod, contactInfo) {
    const createdAt = Date.now();
    let code, created = false;

    while (!created) {
        code = await generate4DigitCode();
        try {
            await repo.create({ playerId, type, pack, amount, code, status: "PENDING", paymentMethod, contactInfo, createdAt });
            created = true;
        } catch (err) {
            if (err.message.includes("UNIQUE constraint failed")) console.log("Duplicate code, retrying...");
            else throw err;
        }
    }

    const profile = await playfab.fetchPlayerProfile(playerId);

    try {
        await telegram.sendMessage(
            `📝 *Order Created*\n` +
            `👤 Player ID: ${playerId}\n` +
            `📦 Coins Pack: ${pack}\n` +
            `💰 Amount: $${amount}\n` +
            `🆔 Order Code: ${code}\n` +
            `📞 Contact: ${contactInfo || 'N/A'}\n` +
            `💳 Payment: ${paymentMethod}\n` +
            `⏱ Status: PENDING\n` +
            `📅 Created At: ${formatDate(createdAt)}`
        );
    } catch (err) { 
        console.error("❌ Failed to send Telegram message for order creation:", err); 
    }

    return { success: true, orderData: { orderCode: code, profile } };
}

exports.verifyPayment = async function(code, amount) {
    console.log(`🔍 Verifying payment - Code: "${code}", Amount: $${amount}`);
    
    const order = await repo.findPendingByCode(code);
    
    if (!order) {
        await telegram.sendMessage(
            `❌ *Order Not Found*\n` +
            `🆔 Code: ${code}\n` +
            `💰 Amount Received: $${amount}`
        );
        return false;
    }

    if (order.status !== "PENDING") {
        await telegram.sendMessage(
            `❌ *Order Already Processed*\n` +
            `🆔 Code: ${code}\n` +
            `⏱ Status: ${order.status}\n` +
            `📞 Contact: ${order.contactInfo || 'N/A'}`
        );
        return false;
    }

    if (order.amount != amount) {
        await telegram.sendMessage(
            `❌ *Amount Mismatch*\n` +
            `🆔 Code: ${code}\n` +
            `👤 Player ID: ${order.playerId}\n` +
            `📞 Contact: ${order.contactInfo || 'N/A'}\n` +
            `💵 Expected: $${order.amount}\n` +
            `💵 Received: $${amount}\n` +
            `⚠️ Please contact customer for clarification`
        );
        return false;
    }

    const paidAt = Date.now();
    let coinResult = null;

    if (order.type === "RP") {
        let coins = 0;
        switch (order.pack) {
            case "500 RP": coins = 550; break;
            case "1500 RP": coins = 1700; break;
            case "3000 RP": coins = 3400; break;
            case "6000 RP": coins = 6800; break;
        }

        coinResult = await playfab.addCoins(order.playerId, coins);

        await telegram.sendMessage(
            `✅ *Top-Up Success*\n` +
            `👤 Player ID: ${order.playerId}\n` +
            `📦 Coins Pack: ${order.pack}\n` +
            `💰 Amount: $${order.amount}\n` +
            `🪙 Coins Received: ${coins}\n` +
            `🆔 Order Code: ${order.code}\n` +
            `📞 Contact: ${order.contactInfo || 'N/A'}\n` +
            `💳 Payment Method: ${order.paymentMethod}\n` +
            `📅 Paid At: ${formatDate(paidAt)}`
        );

        await sendTopUpNotification(order.playerId, order.code, coins);

    } else if (order.type === "VIP Membership") {
        coinResult = await playfab.addVipMembership(order.playerId);

        await telegram.sendMessage(
            `👑 *VIP Activated*\n` +
            `👤 Player ID: ${order.playerId}\n` +
            `🎁 Granted Bonus: 550 RP\n` +
            `💰 Amount: $${order.amount}\n` +
            `🆔 Order Code: ${order.code}\n` +
            `📞 Contact: ${order.contactInfo || 'N/A'}\n` +
            `💳 Payment Method: ${order.paymentMethod}\n` +
            `📅 Paid At: ${formatDate(paidAt)}`
        );

        await sendTopUpNotification(order.playerId, order.code, 550);
    }

    const updated = await repo.markPaid(order.code, {
        paymentMethod: order.paymentMethod,
        paidAt,
        balanceBefore: coinResult?.before || 0,
        balanceChange: coinResult?.change || 0,
        balanceAfter: coinResult?.after || 0
    });

    if (updated === 0) {
        await telegram.sendMessage(
            `⚠️ *Duplicate Payment Prevented*\n` +
            `🆔 Code: ${code}\n` +
            `📞 Contact: ${order.contactInfo || 'N/A'}`
        );
        return false;
    }

    return true;
}

exports.getOrder = async function(orderCode) {
    if (!orderCode) throw new Error('orderCode is required');

    const order = await repo.findPendingByCode(orderCode);
    if (!order) {
        return { status: 'NOT_FOUND' };
    }

    return { status: order.status, order };
}

exports.cancelOrder = async function(orderCode) {
    const order = await repo.findPendingByCode(orderCode);
    if (!order || order.status !== "PENDING") return false;

    const deleted = await repo.deleteByCode(orderCode);
    if (deleted) {
        console.log(`✅ Cancelled order ${orderCode}`);
        
        try {
            await telegram.sendMessage(
                `🚫 *Order Cancelled*\n` +
                `🆔 Code: ${orderCode}\n` +
                `👤 Player ID: ${order.playerId}\n` +
                `📞 Contact: ${order.contactInfo || 'N/A'}\n` +
                `💰 Amount: $${order.amount}`
            );
        } catch (err) {
            console.error("❌ Failed to send cancellation message:", err);
        }
    } else {
        console.error(`❌ Failed to delete order ${orderCode}`);
    }

    return deleted;
}

// ------------------------
// Cleanup and Backup
// ------------------------
async function cleanupPendingOrders() {
    try {
        const deleted = await repo.deleteExpiredOrders(EXPIRATION_TIME);
        if (deleted > 0) console.log(`🧹 Cleaned ${deleted} expired orders`);
    } catch (err) {
        console.error("❌ Cleanup error:", err);
    }
}

setInterval(cleanupPendingOrders, 60 * 1000);
cron.schedule("0 2 * * 0", backupDatabase);
cleanupPendingOrders();