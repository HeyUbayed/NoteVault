const db = require('../config/db');

class Bookmark {
    static async isBookmarked(userId, noteId) {
        const [rows] = await db.query(
            `SELECT id FROM bookmarks WHERE user_id = ? AND note_id = ? LIMIT 1`,
            [userId, noteId]
        );
        return !!rows[0];
    }

    static async toggle(userId, noteId) {
        const exists = await this.isBookmarked(userId, noteId);
        if (exists) {
            await db.query(`DELETE FROM bookmarks WHERE user_id = ? AND note_id = ?`, [userId, noteId]);
            return false;
        }
        try {
            await db.query(`INSERT INTO bookmarks (user_id, note_id) VALUES (?, ?)`, [userId, noteId]);
        } catch (err) {
            // A concurrent request (e.g. a rapid double-click) may have already
            // inserted the same bookmark first - that's fine, the end state
            // ("bookmarked") is the same either way.
            if (err.code !== 'ER_DUP_ENTRY') throw err;
        }
        return true;
    }

    static async listForUser(userId) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM bookmarks b
             JOIN notes n ON b.note_id = n.id
             JOIN users u ON n.uploaded_by = u.id
             WHERE b.user_id = ? ORDER BY b.created_at DESC`,
            [userId]
        );
        return rows;
    }
}

module.exports = Bookmark;
