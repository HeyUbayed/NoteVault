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
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image, u.department AS uploader_department
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             WHERE n.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    static async list({ department, semester, course, sort = 'latest', page = 1, limit = 12 } = {}) {
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];
        if (department) { where += ' AND n.department = ?'; params.push(department); }
        if (semester) { where += ' AND n.semester = ?'; params.push(semester); }
        if (course) { where += ' AND n.course = ?'; params.push(course); }

        let orderBy = 'n.upload_date DESC';
        if (sort === 'popular') orderBy = 'n.downloads DESC';
        if (sort === 'rating') orderBy = 'n.average_rating DESC, n.rating_count DESC';
        if (sort === 'oldest') orderBy = 'n.upload_date ASC';

        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM notes n ${where}`, params
        );
        return { rows, count };
    }

    static async search({ query = '', department, semester, sort = 'relevance', page = 1, limit = 12 } = {}) {
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];
        let selectScore = '0 AS relevance';

        if (query && query.trim().length > 0) {
            selectScore = 'MATCH(n.title, n.description, n.tags, n.course, n.teacher) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance';
            params.push(query);
            where += ' AND (MATCH(n.title, n.description, n.tags, n.course, n.teacher) AGAINST (? IN NATURAL LANGUAGE MODE) OR n.title LIKE ? OR n.course LIKE ?)';
            params.push(query, `%${query}%`, `%${query}%`);
        }
        if (department) { where += ' AND n.department = ?'; params.push(department); }
        if (semester) { where += ' AND n.semester = ?'; params.push(semester); }

        let orderBy = 'relevance DESC, n.upload_date DESC';
        if (sort === 'popular') orderBy = 'n.downloads DESC';
        if (sort === 'rating') orderBy = 'n.average_rating DESC';

        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image, ${selectScore}
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM notes n ${where}`, params
        );
        return { rows, count };
    }

    static async getRelated(noteId, course, limit = 4) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM notes n
             JOIN users u ON n.uploaded_by = u.id
             WHERE n.course = ? AND n.id != ?
             ORDER BY n.average_rating DESC LIMIT ?`,
            [course, noteId, limit]
        );
        return rows;
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

    static async recalculateRating(noteId) {
        const [[agg]] = await db.query(
            `SELECT COALESCE(AVG(rating),0) AS avg_rating, COUNT(*) AS cnt FROM ratings WHERE note_id = ?`,
            [noteId]
        );
        await db.query(
            `UPDATE notes SET average_rating = ?, rating_count = ? WHERE id = ?`,
            [Number(agg.avg_rating).toFixed(2), agg.cnt, noteId]
        );
        return agg;
    }

    static async getPopularCourses(limit = 6) {
        const [rows] = await db.query(
            `SELECT course, department, COUNT(*) AS notes_count, AVG(average_rating) AS avg_rating
             FROM notes GROUP BY course, department ORDER BY notes_count DESC LIMIT ?`,
            [limit]
        );
        return rows;
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

    static async getTopRated(limit = 8) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM notes n
             JOIN users u ON n.uploaded_by = u.id
             WHERE n.rating_count > 0
             ORDER BY n.average_rating DESC, n.rating_count DESC LIMIT ?`, [limit]
        );
        return rows;
    }

    static async getTrending(limit = 8) {
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM notes n
             JOIN users u ON n.uploaded_by = u.id
             WHERE n.upload_date >= (NOW() - INTERVAL 30 DAY)
             ORDER BY n.downloads DESC, n.average_rating DESC LIMIT ?`, [limit]
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

    static async markReported(id) {
        await db.query(`UPDATE notes SET is_reported = 1 WHERE id = ?`, [id]);
    }

    static async clearReported(id) {
        await db.query(`UPDATE notes SET is_reported = 0 WHERE id = ?`, [id]);
    }

    static async delete(id) {
        await db.query(`DELETE FROM notes WHERE id = ?`, [id]);
    }

    static async getByIds(ids = []) {
        if (!ids.length) return [];
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name, u.profile_image AS uploader_image
             FROM notes n JOIN users u ON n.uploaded_by = u.id
             WHERE n.id IN (?)`,
            [ids]
        );
        // Preserve the original (most-recent-first) order from the session list
        const byId = new Map(rows.map(r => [r.id, r]));
        return ids.map(id => byId.get(id)).filter(Boolean);
    }

    static async getAllCourses() {
        const [rows] = await db.query(`SELECT DISTINCT course, department FROM notes ORDER BY course`);
        return rows;
    }

    static async listForAdmin({ page = 1, limit = 20 } = {}) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT n.*, u.name AS uploader_name FROM notes n
             JOIN users u ON n.uploaded_by = u.id
             ORDER BY n.upload_date DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ count }]] = await db.query(`SELECT COUNT(*) AS count FROM notes`);
        return { rows, count };
    }
}

module.exports = Note;
