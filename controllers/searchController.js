const Note = require('../models/Note');

exports.showSearch = async (req, res, next) => {
    try {
        const { q = '', department, semester, sort } = req.query;
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        let results = { rows: [], count: 0 };
        if (q.trim() || department || semester) {
            results = await Note.search({ query: q.trim(), department, semester, sort, page, limit: 12 });
        }

        const departments = await Note.getPopularDepartments(20);

        res.render('search', {
            title: q ? `Search: ${q}` : 'Search Notes',
            query: q,
            notes: results.rows,
            totalCount: results.count,
            currentPage: page,
            totalPages: Math.max(Math.ceil(results.count / 12), 1),
            filters: { department, semester, sort: sort || 'relevance' },
            departments
        });
    } catch (err) {
        next(err);
    }
};

// Lightweight JSON endpoint for real-time search suggestions
exports.apiSearch = async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ success: true, results: [] });

        const { rows } = await Note.search({ query: q, page: 1, limit: 6 });
        res.json({
            success: true,
            results: rows.map(n => ({
                id: n.id,
                title: n.title,
                course: n.course,
                department: n.department,
                thumbnail: n.thumbnail,
                rating: n.average_rating
            }))
        });
    } catch (err) {
        next(err);
    }
};
