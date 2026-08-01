const db = require('../config/db');

class User {
    static async create({ name, email, hashedPassword, department }) {
        const [result] = await db.query(
            `INSERT INTO users (name, email, password, department) VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, department || null]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await db.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    static async getStats(userId) {
        const [[uploadStats]] = await db.query(
            `SELECT COUNT(*) AS total_uploads, COALESCE(SUM(downloads),0) AS total_downloads_received
             FROM notes WHERE uploaded_by = ?`, [userId]
        );
        return uploadStats;
    }
}

module.exports = User;
