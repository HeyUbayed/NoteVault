const db = require('../config/db');

class CreditHistory {
    static async log({ userId, action, creditChange, balance }) {
        await db.query(
            `INSERT INTO credit_history (user_id, action, credit_change, balance) VALUES (?, ?, ?, ?)`,
            [userId, action, creditChange, balance]
        );
    }

    static async listForUser(userId, { page = 1, limit = 15 } = {}) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT * FROM credit_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM credit_history WHERE user_id = ?`, [userId]
        );
        return { rows, count };
    }
}

module.exports = CreditHistory;
