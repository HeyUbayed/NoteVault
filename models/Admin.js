const db = require('../config/db');

class Admin {
    static async findByEmail(email) {
        const [rows] = await db.query(`SELECT * FROM admins WHERE email = ? LIMIT 1`, [email]);
        return rows[0] || null;
    }

    static async create(email, hashedPassword) {
        const [result] = await db.query(
            `INSERT INTO admins (email, password) VALUES (?, ?)`, [email, hashedPassword]
        );
        return result.insertId;
    }
}

module.exports = Admin;
