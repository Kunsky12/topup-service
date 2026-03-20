// db.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./orders.db");

db.serialize(() => {

    // Create table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playerId TEXT NOT NULL,
            type TEXT NOT NULL,
            pack TEXT,
            amount REAL NOT NULL,
            code TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL,
            paymentMethod TEXT,
            contactInfo TEXT,
            createdAt INTEGER,
            paidAt INTEGER,
            balanceBefore INTEGER DEFAULT 0,
            balanceChange INTEGER DEFAULT 0,
            balanceAfter INTEGER DEFAULT 0
        );
    `);

    // Create index for fast order lookup
    db.run(`CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code)`);

    // Ensure missing columns are added automatically
    db.all(`PRAGMA table_info(orders)`, (err, columns) => {
        if (err) {
            console.error("❌ Failed to read table schema:", err.message);
            return;
        }

        const existing = columns.map(c => c.name);

        const requiredColumns = {
            type:          "TEXT DEFAULT 'RP'",
            contactInfo:   "TEXT",              // ✅ added
            paidAt:        "INTEGER",
            balanceBefore: "INTEGER DEFAULT 0",
            balanceChange: "INTEGER DEFAULT 0",
            balanceAfter:  "INTEGER DEFAULT 0"
        };

        Object.entries(requiredColumns).forEach(([name, definition]) => {
            if (!existing.includes(name)) {
                db.run(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`, err => {
                    if (err) {
                        console.error(`❌ Failed adding column ${name}:`, err.message);
                    } else {
                        console.log(`✅ Added column: ${name}`);
                    }
                });
            }
        });
    });

});

module.exports = db;