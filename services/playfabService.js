// services/playfabService.js
require('dotenv').config();

const PlayFab = require("playfab-sdk");

PlayFab.settings.titleId = process.env.PLAYFAB_TITLE_ID;
PlayFab.settings.developerSecretKey = process.env.PLAYFAB_SECRET;

// Add coins
exports.addCoins = async (playerId, amount) => {
    try {
        // 1️⃣ Fetch current balance
        const beforeBalance = await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.GetUserInventory(
                { PlayFabId: playerId },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result.data.VirtualCurrency?.RP || 0);
                }
            );
        });

        // 2️⃣ Add coins
        await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.AddUserVirtualCurrency(
                { PlayFabId: playerId, VirtualCurrency: "RP", Amount: amount },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        // 3️⃣ Calculate after balance
        const afterBalance = beforeBalance + amount;

        console.log(`Coins added: ${amount} | ${beforeBalance} → ${afterBalance}`);

        // 4️⃣ Return for DB storage
        return { before: beforeBalance, after: afterBalance, change: amount };

    } catch (err) {
        console.error("addCoins failed:", err);
        throw err;
    }
};

// VIP membership with balance fetch and ledger info
exports.addVipMembership = async (playerId) => {
    try {

        console.log("ADD VIP MEMBERSHIP CALLED");
        // 1️⃣ Mark player as VIP
        await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.UpdateUserData(
                {
                    PlayFabId: playerId,
                    Data: { PaidUser: "true" }
                },
                (err) => {
                    if (err) return reject(err);
                    console.log("VIP activated");
                    resolve();
                }
            );
        });

        // 2️⃣ Fetch current balance
        const beforeBalance = await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.GetUserInventory(
                { PlayFabId: playerId },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result.data.VirtualCurrency?.RP || 0);
                }
            );
        });

        // 3️⃣ Add VIP bonus coins
        const bonusAmount = 550;
        await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.AddUserVirtualCurrency(
                { PlayFabId: playerId, VirtualCurrency: "RP", Amount: bonusAmount },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        const afterBalance = beforeBalance + bonusAmount;
        console.log(`VIP bonus added: ${bonusAmount} | ${beforeBalance} → ${afterBalance}`);

        // 4️⃣ Return ledger info
        return { before: beforeBalance, after: afterBalance, change: bonusAmount };

    } catch (err) {
        console.error("addVipMembership failed:", err);
        throw err;
    }
};

exports.fetchPlayerProfile = async (playFabId) => {
    try {
        // Get basic player info
        const profileResp = await new Promise((resolve, reject) => {
            PlayFab.PlayFabServer.GetPlayerProfile({
                PlayFabId: playFabId,
                ProfileConstraints: {
                    ShowDisplayName: true,
                    ShowAvatarUrl: true,
                }
            }, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        const displayName = profileResp.data.PlayerProfile?.DisplayName || "Unknown";
        const avatarUrl = profileResp.data.PlayerProfile?.AvatarUrl || "";

        // Coins are stored as VC "RP", VIP as a bool in player data (example)
        //const coins = statsResp.data.VirtualCurrency?.RP || 0;
        //const vip = statsResp.data.PlayerData?.isPaidSser?.Value === "true";

        return {displayName, avatarUrl};

    } catch (err) {
        console.error("Failed to fetch PlayFab profile:", err);
        return {
            displayName: "Unknown",
            avatarUrl: "",
        };
    }
};
