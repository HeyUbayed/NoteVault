const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Note = require('../models/Note');
const Report = require('../models/Report');
const Rating = require('../models/Rating');
const db = require('../config/db');

// See controllers/authController.js for why this is necessary (session fixation).
function regenerateSession(req) {
    return promisify(req.session.regenerate).call(req.session);
}

exports.showLogin = (req, res) => {
    if (req.session.adminId) return res.redirect('/admin');
    res.render('admin/login', { title: 'Admin Login', error: null });
};

exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('admin/login', { title: 'Admin Login', error: errors.array()[0].msg });
        }
        const { email, password } = req.body;
        const admin = await Admin.findByEmail(email.toLowerCase().trim());
        if (!admin) {
            return res.status(400).render('admin/login', { title: 'Admin Login', error: 'Invalid credentials.' });
        }
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(400).render('admin/login', { title: 'Admin Login', error: 'Invalid credentials.' });
        }
        // Prevent session fixation: issue a fresh session ID before granting access.
        // This also clears any prior user session, since regenerate() wipes old data.
        await regenerateSession(req);

        req.session.adminId = admin.id;
        res.redirect('/admin');
    } catch (err) {
        next(err);
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('notevault_sid');
        res.redirect('/admin/login');
    });
};

exports.dashboard = async (req, res, next) => {
    try {
        const [stats, pendingReports] = await Promise.all([
            Note.getGlobalStats(),
            Report.listPending()
        ]);

        const [[creditStats]] = await db.query(
            `SELECT COALESCE(SUM(CASE WHEN credit_change > 0 THEN credit_change ELSE 0 END),0) AS credits_issued,
                    COALESCE(SUM(CASE WHEN credit_change < 0 THEN -credit_change ELSE 0 END),0) AS credits_spent
             FROM credit_history`
        );

        res.render('admin/dashboard', {
            title: 'Admin Panel',
            stats, pendingReports, creditStats
        });
    } catch (err) {
        next(err);
    }
};

exports.manageUsers = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const search = req.query.search || '';
        const { rows, count } = await User.list({ search, page, limit: 20 });

        res.render('admin/users', {
            title: 'Manage Users',
            users: rows,
            search,
            currentPage: page,
            totalPages: Math.max(Math.ceil(count / 20), 1)
        });
    } catch (err) {
        next(err);
    }
};

exports.toggleBanUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        await User.setBanned(user.id, !user.is_banned);
        res.json({ success: true, banned: !user.is_banned });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        await User.delete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.manageNotes = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const { rows, count } = await Note.listForAdmin({ page, limit: 20 });

        res.render('admin/notes', {
            title: 'Manage Notes',
            notes: rows,
            currentPage: page,
            totalPages: Math.max(Math.ceil(count / 20), 1)
        });
    } catch (err) {
        next(err);
    }
};

// Deletes a note's PDF and (if not the shared default placeholder) its
// thumbnail from disk. Mirrors the same helper in notesController.js.
function removeNoteFiles(note) {
    if (note.pdf_path) {
        fs.unlink(path.join(__dirname, '..', 'public', note.pdf_path), () => {});
    }
    if (note.thumbnail && note.thumbnail !== '/images/default-thumbnail.png') {
        fs.unlink(path.join(__dirname, '..', 'public', note.thumbnail), () => {});
    }
}

exports.deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        await Note.delete(req.params.id);
        if (note) removeNoteFiles(note);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Used by the "View" action on a note (from Manage Notes, or a resolved
// report). Viewing a reported note through this route clears its reported
// flag and resolves any pending reports against it, then opens the note.
exports.viewNote = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).render('404', { title: 'Note Not Found' });
        }
        await Report.resolveAllForNote(noteId);
        await Note.clearReported(noteId);
        res.redirect(`/notes/${noteId}`);
    } catch (err) {
        next(err);
    }
};

// Lets an admin download any uploaded note directly from the admin panel,
// without needing a separate user login or spending credits.
exports.downloadNote = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).render('404', { title: 'Note Not Found' });
        }
        const filePath = path.join(__dirname, '..', 'public', note.pdf_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).render('error', { title: 'File Not Found', message: 'This file is missing from storage.' });
        }
        res.download(filePath, `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (err) {
        next(err);
    }
};

// Resolving a report takes the admin to the note itself (like "View" does),
// while also resolving every pending report against that note and clearing
// its reported flag, so the note shows as clean again afterward.
exports.resolveReport = async (req, res, next) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).render('404', { title: 'Report Not Found' });
        }
        await Report.resolveAllForNote(report.note_id);
        await Note.clearReported(report.note_id);
        res.redirect(`/notes/${report.note_id}`);
    } catch (err) {
        next(err);
    }
};

exports.manageReviews = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const { rows, count } = await Rating.listForAdmin({ page, limit: 20 });

        res.render('admin/reviews', {
            title: 'Manage Reviews',
            reviews: rows,
            currentPage: page,
            totalPages: Math.max(Math.ceil(count / 20), 1)
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteReview = async (req, res, next) => {
    try {
        const review = await Rating.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        await Rating.delete(review.id);

        const note = await Note.findById(review.note_id);
        await Note.recalculateRating(review.note_id);
        if (note) {
            await User.recalculateAverageRating(note.uploaded_by);
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.analytics = async (req, res, next) => {
    try {
        const [deptRows] = await db.query(
            `SELECT department, COUNT(*) as count FROM notes GROUP BY department ORDER BY count DESC`
        );
        const [growthRows] = await db.query(
            `SELECT DATE_FORMAT(upload_date, '%Y-%m') AS month, COUNT(*) AS count
             FROM notes GROUP BY month ORDER BY month DESC LIMIT 6`
        );
        const [userGrowthRows] = await db.query(
            `SELECT DATE_FORMAT(joined_date, '%Y-%m') AS month, COUNT(*) AS count
             FROM users GROUP BY month ORDER BY month DESC LIMIT 6`
        );

        res.render('admin/analytics', {
            title: 'Analytics',
            deptRows, growthRows, userGrowthRows
        });
    } catch (err) {
        next(err);
    }
};
