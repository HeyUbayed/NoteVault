const db = require('../config/db');

class Download {
    static async hasDownloaded(userId, noteId) {
        const [rows] = await db.query(
            `SELECT id FROM downloads WHERE user_id = ? AND note_id = ? LIMIT 1`,
            [userId, noteId]
        );
        return !!rows[0];
    }

    static async record(userId, noteId) {
        await db.query(`INSERT INTO downloads (note_id, user_id) VALUES (?, ?)`, [noteId, userId]);
    }

    // Atomically records a download only if one doesn't already exist for this
    // user+note pair. Relies on the UNIQUE KEY on (note_id, user_id) to act as
    // a database-level mutex: if two requests race, only one INSERT can win,
    // and the loser is told "not new" instead of silently duplicating the row
    // (which is what let concurrent requests double-charge credit before).
    static async recordIfNew(userId, noteId) {
        try {
            await db.query(`INSERT INTO downloads (note_id, user_id) VALUES (?, ?)`, [noteId, userId]);
            return true;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return false;
            throw err;
        }
    }

    static async remove(userId, noteId) {
        await db.query(`DELETE FROM downloads WHERE user_id = ? AND note_id = ?`, [userId, noteId]);
    }

    static async listForUser(userId, { page = 1, limit = 12 } = {}) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT d.download_date, n.* FROM downloads d
             JOIN notes n ON d.note_id = n.id
             WHERE d.user_id = ? ORDER BY d.download_date DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM downloads WHERE user_id = ?`, [userId]
        );
        return { rows, count };
    }
}

module.exports = Download;
