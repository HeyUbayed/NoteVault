const db = require('../config/db');

class Rating {
    static async findByUserAndNote(userId, noteId) {
        const [rows] = await db.query(
            `SELECT * FROM ratings WHERE user_id = ? AND note_id = ? LIMIT 1`,
            [userId, noteId]
        );
        return rows[0] || null;
    }

    static async upsert({ noteId, userId, rating, review }) {
        // A single atomic statement instead of check-then-act: this can't be
        // beaten by a concurrent request the way a separate SELECT-then-
        // INSERT/UPDATE could (which risked an unhandled duplicate-key error
        // if two submissions from the same user landed at the same time).
        await db.query(
            `INSERT INTO ratings (note_id, user_id, rating, review)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)`,
            [noteId, userId, rating, review || '']
        );
    }

    static async listForNote(noteId, limit = 20) {
        const [rows] = await db.query(
            `SELECT r.*, u.name AS user_name, u.profile_image AS user_image
             FROM ratings r JOIN users u ON r.user_id = u.id
             WHERE r.note_id = ? ORDER BY r.created_at DESC LIMIT ?`,
            [noteId, limit]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query(`SELECT * FROM ratings WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    static async listForAdmin({ page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT r.*, u.name AS user_name, u.profile_image AS user_image,
                    n.title AS note_title, n.id AS note_id
             FROM ratings r
             JOIN users u ON r.user_id = u.id
             JOIN notes n ON r.note_id = n.id
             ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM ratings`);
        return { rows, count };
    }

    static async delete(id) {
        await db.query(`DELETE FROM ratings WHERE id = ?`, [id]);
    }
}

module.exports = Rating;
