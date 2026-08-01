const db = require('../config/db');

class Note {
    static async create(data) {
        const {
            title, description, pdf_path, thumbnail, department,
            semester, course, teacher, tags, uploaded_by, file_size
        } = data;
        const [result] = await db.query(
            `INSERT INTO notes
             (title, description, pdf_path, thumbnail, department, semester, course, teacher, tags, uploaded_by, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, pdf_path, thumbnail, department, semester, course, teacher || '', tags || '', uploaded_by, file_size || 0]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             WHERE n.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    // Basic browsing only - no department/semester/course filters or sorting yet (Phase 2)
    static async list({ page = 1, limit = 12 } = {}) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             ORDER BY n.upload_date DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM notes`);
        return { rows, count };
    }

    static async getByUploader(userId) {
        const [rows] = await db.query(
            `SELECT * FROM notes WHERE uploaded_by = ? ORDER BY upload_date DESC`, [userId]
        );
        return rows;
    }

    static async incrementDownloads(id) {
        await db.query(`UPDATE notes SET downloads = downloads + 1 WHERE id = ?`, [id]);
    }

    static async getPopularDepartments(limit = 6) {
        const [rows] = await db.query(
            `SELECT department, COUNT(*) AS notes_count FROM notes
             GROUP BY department ORDER BY notes_count DESC LIMIT ?`,
            [limit]
        );
        return rows;
    }

    static async getLatest(limit = 8) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM notes n
             JOIN users u ON n.uploaded_by = u.id
             ORDER BY n.upload_date DESC LIMIT ?`, [limit]
        );
        return rows;
    }

    static async getGlobalStats() {
        const [[stats]] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM notes) AS total_notes,
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COALESCE(SUM(downloads),0) FROM notes) AS total_downloads,
                (SELECT COUNT(DISTINCT department) FROM notes) AS total_departments`
        );
        return stats;
    }
}

module.exports = Note;
