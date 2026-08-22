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

    // Lightweight check used on every authenticated request to make sure a
    // ban takes effect immediately, not just on the next login.
    static async isBanned(id) {
        const [rows] = await db.query(`SELECT is_banned FROM users WHERE id = ? LIMIT 1`, [id]);
        if (!rows[0]) return true; // account no longer exists - treat as blocked
        return !!rows[0].is_banned;
    }

    static async updateProfile(id, { name, department, bio }) {
        await db.query(
            `UPDATE users SET name = ?, department = ?, bio = ? WHERE id = ?`,
            [name, department, bio, id]
        );
    }

    static async updateProfileImage(id, imagePath) {
        await db.query(`UPDATE users SET profile_image = ? WHERE id = ?`, [imagePath, id]);
    }

    static async updatePassword(id, hashedPassword) {
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, id]);
    }

    static async adjustCredit(id, amount) {
        await db.query(`UPDATE users SET credit = credit + ? WHERE id = ?`, [amount, id]);
        const [rows] = await db.query(`SELECT credit FROM users WHERE id = ?`, [id]);
        return rows[0].credit;
    }

    // Atomically deducts credit only if the balance is sufficient at the moment
    // of the update (checked and applied in the same statement, so concurrent
    // requests can't both pass a stale check and drive the balance negative).
    // Returns the new balance if the deduction succeeded, or null if it didn't.
    static async deductCreditIfSufficient(id, amount) {
        const [result] = await db.query(
            `UPDATE users SET credit = credit - ? WHERE id = ? AND credit >= ?`,
            [amount, id, amount]
        );
        if (result.affectedRows === 0) return null;
        const [rows] = await db.query(`SELECT credit FROM users WHERE id = ?`, [id]);
        return rows[0].credit;
    }

    static async recalculateAverageRating(userId) {
        // Average rating across all of a user's uploaded notes
        await db.query(
            `UPDATE users u
             SET u.average_rating = COALESCE((
                SELECT AVG(n.average_rating) FROM notes n
                WHERE n.uploaded_by = u.id AND n.rating_count > 0
             ), 0)
             WHERE u.id = ?`,
            [userId]
        );
    }

    static async getStats(userId) {
        const [[uploadStats]] = await db.query(
            `SELECT COUNT(*) AS total_uploads, COALESCE(SUM(downloads),0) AS total_downloads_received
             FROM notes WHERE uploaded_by = ?`, [userId]
        );
        const [[downloadStats]] = await db.query(
            `SELECT COUNT(*) AS total_downloads FROM downloads WHERE user_id = ?`, [userId]
        );
        return { ...uploadStats, ...downloadStats };
    }

    static async getTopContributors(limit = 5) {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.profile_image, u.department, u.average_rating,
                    COUNT(n.id) AS notes_count, COALESCE(SUM(n.downloads),0) AS total_downloads
             FROM users u
             JOIN notes n ON n.uploaded_by = u.id
             GROUP BY u.id
             ORDER BY total_downloads DESC, notes_count DESC
             LIMIT ?`,
            [limit]
        );
        return rows;
    }

    static async list({ search = '', page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        const like = `%${search}%`;
        const [rows] = await db.query(
            `SELECT id, name, email, department, credit, average_rating, is_banned, joined_date
             FROM users WHERE name LIKE ? OR email LIKE ?
             ORDER BY joined_date DESC LIMIT ? OFFSET ?`,
            [like, like, limit, offset]
        );
        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM users WHERE name LIKE ? OR email LIKE ?`,
            [like, like]
        );
        return { rows, count };
    }

    static async setBanned(id, banned) {
        await db.query(`UPDATE users SET is_banned = ? WHERE id = ?`, [banned ? 1 : 0, id]);
    }

    static async delete(id) {
        await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    }
}

module.exports = User;
