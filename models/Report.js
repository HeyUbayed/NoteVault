const db = require('../config/db');

class Report {
    static async create({ noteId, userId, reason }) {
        await db.query(
            `INSERT INTO reports (note_id, user_id, reason) VALUES (?, ?, ?)`,
            [noteId, userId, reason]
        );
    }

    static async listPending() {
        const [rows] = await db.query(
            `SELECT r.*, n.title AS note_title, u.name AS reporter_name
             FROM reports r
             JOIN notes n ON r.note_id = n.id
             JOIN users u ON r.user_id = u.id
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC`
        );
        return rows;
    }

    static async updateStatus(id, status) {
        await db.query(`UPDATE reports SET status = ? WHERE id = ?`, [status, id]);
    }

    static async findById(id) {
        const [rows] = await db.query(`SELECT * FROM reports WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    // Marks every pending report against a note as reviewed in one go, so a
    // note doesn't keep showing up as "reported" after an admin has looked at it.
    static async resolveAllForNote(noteId) {
        await db.query(
            `UPDATE reports SET status = 'reviewed' WHERE note_id = ? AND status = 'pending'`,
            [noteId]
        );
    }
}

module.exports = Report;
