// routes/topup.js
const express = require("express");
const router = express.Router();
const orderService = require("../services/orderService"); // make sure this is the correct path
const playfabService = require("../services/playfabService")

router.post("/create", async (req, res) => {
    try {
        const { type, pack, amount, paymentMethod, contactInfo } = req.body;
        const playerId = req.body.playerId?.trim();

        // Guard: Use the 'i' flag for case-insensitive hex matching
        if (!playerId || !/^[0-9A-Fa-f]{16}$/i.test(playerId)) {
            console.log("INCORRECT ID FORMAT:", playerId);
            return res.status(400).json({ success: false, error: "invalid_format" });
        }

        const profile = await playfabService.fetchPlayerProfile(playerId);

        if (!profile || profile.displayName === "Unknown") {
            console.log("PLAYFAB ID NOT FOUND:", playerId);
            return res.status(404).json({ success: false, error: "not_found" });
        }

        const result = await orderService.createOrder(
            playerId,
            type,
            pack,
            amount,
            paymentMethod,
            contactInfo || null,
            profile
        );

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/cancel/:orderCode", async (req, res) => {
    const { orderCode } = req.params;

    const order = await orderService.getOrder(orderCode);

    if (!order) {
        return res.json({
            success: false,
            message: "Order not found"
        });
    }

    // If already paid
    if (order.status === "PAID") {
        return res.json({
            success: true,
            message: "Top-up success"
        });
    }

    const cancelled = await orderService.cancelOrder(orderCode);

    if (cancelled) {
        return res.json({
            success: true,
            message: "Order cancelled"
        });
    }

    return res.json({
        success: true,
        message: "Order already expired"
    });
});

// Verify payment
router.post("/verify", async (req, res) => {
    const { code, amount } = req.body;
    if (!code || !amount) {
        return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    try {
        const success = await orderService.verifyPayment(code, amount);
        res.json({ success });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ✅ Export router only once
module.exports = router;