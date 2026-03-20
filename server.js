require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const path = require("path");
const topupRoutes = require("./routes/topup");
const orderService = require("./services/orderService");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/topup", topupRoutes);

// Payment verification endpoint (called by listener.js)
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        
        if (!orderId || !amount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing orderId or amount' 
            });
        }

        console.log(`📥 Payment notification: ${orderId} - $${amount}`);
        
        const success = await orderService.verifyPayment(orderId, amount);
        
        res.json({ 
            success, 
            message: success ? 'Payment verified' : 'Payment verification failed' 
        });
    } catch (err) {
        console.error('❌ Payment verification error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});