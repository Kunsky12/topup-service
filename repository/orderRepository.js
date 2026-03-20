const db = require('../db');

exports.create = (order) => {

    return new Promise((resolve, reject) => {

        const query = `
        INSERT INTO orders
        (playerId,type,pack,amount,code,status,paymentMethod,contactInfo,createdAt)
        VALUES (?,?,?,?,?,?,?,?,?)
        `;

        db.run(query,[
            order.playerId,
            order.type || "RP",
            order.pack,
            order.amount,
            order.code,
            order.status,
            order.paymentMethod,
            order.contactInfo || null,  // ✅ was incorrectly set to order.paymentMethod
            order.createdAt || Date.now()
        ],
        function(err){

            if(err) return reject(err);

            resolve({
                id:this.lastID,
                ...order
            });

        });

    });

};

exports.markPaid = (code,data)=>{

    return new Promise((resolve,reject)=>{

        db.run(
            `UPDATE orders
             SET status='PAID',
                 paidAt=?,
                 paymentMethod=?,
                 balanceBefore=?,
                 balanceChange=?,
                 balanceAfter=?
             WHERE code=? AND status='PENDING'`,
            [
                data.paidAt,
                data.paymentMethod,
                data.balanceBefore,
                data.balanceChange,
                data.balanceAfter,
                code
            ],
            function(err){

                if(err) return reject(err);

                resolve(this.changes);

            }
        );

    });

};

exports.getAll = async (filter) => {
    return new Promise((resolve, reject) => {
        if (!filter || !filter.where) {
            return db.all("SELECT * FROM orders", [], (err, rows) => {
                if(err) return reject(err);
                resolve(rows);
            });
        }

        const { status, createdAt } = filter.where;

        if (!status || !createdAt?.$lt) return resolve([]);

        const query = "SELECT * FROM orders WHERE status = ? AND createdAt < ?";
        const params = [status, createdAt.$lt];

        db.all(query, params, (err, rows) => {
            if(err) return reject(err);
            resolve(rows);
        });
    });
};

exports.findPendingByCode = (code) => {

    return new Promise((resolve, reject) => {

        db.get(
            `SELECT * FROM orders 
             WHERE code=? AND status='PENDING'`,
            [code],
            (err,row)=>{
                if(err) return reject(err);
                resolve(row);
            }
        );

    });

};

exports.deleteByCode = (code) => {
    return new Promise((resolve, reject) => {
        db.run(
            "DELETE FROM orders WHERE code = ?",
            [code],
            function(err) {
                if (err) return reject(err);
                resolve(this.changes);
            }
        );
    });
};

exports.updateByCode = (code, data) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(data);
        if (fields.length === 0) return resolve(0);

        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const values = fields.map(f => data[f]);

        const query = `UPDATE orders SET ${setClause} WHERE code = ?`;

        db.run(query, [...values, code], function(err) {
            if (err) return reject(err);
            resolve(this.changes);
        });
    });
};

exports.deleteExpiredOrders = (expirationTime) => {

    const cutoff = Date.now() - expirationTime;

    return new Promise((resolve,reject)=>{

        db.run(
            `DELETE FROM orders
             WHERE status='PENDING'
             AND createdAt < ?`,
            [cutoff],
            function(err){

                if(err) return reject(err);

                resolve(this.changes);

            }
        );

    });

};