const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const Note = require('../models/Note');
const User = require('../models/User');
const Download = require('../models/Download');
const CreditHistory = require('../models/CreditHistory');
const Rating = require('../models/Rating');
const Bookmark = require('../models/Bookmark');

function clean(str) {
    return sanitizeHtml((str || '').trim(), { allowedTags: [], allowedAttributes: {} });
}

// Deletes a note's PDF and (if not the shared default placeholder) its
// thumbnail from disk. Called after the DB row is gone, so a deleted note
// doesn't leave its file behind forever.
function removeNoteFiles(note) {
    if (note.pdf_path) {
        fs.unlink(path.join(__dirname, '..', 'public', note.pdf_path), () => {});
    }
    if (note.thumbnail && note.thumbnail !== '/images/default-thumbnail.png') {
        fs.unlink(path.join(__dirname, '..', 'public', note.thumbnail), () => {});
    }
}

const DOWNLOAD_COST = 1;

exports.browse = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const { department, semester, course, sort } = req.query;

        const { rows, count } = await Note.list({ department, semester, course, sort, page, limit: 12 });
        const departments = await Note.getPopularDepartments(20);

        res.render('browse', {
            title: 'Browse Notes',
            notes: rows,
            totalCount: count,
            currentPage: page,
            totalPages: Math.max(Math.ceil(count / 12), 1),
            filters: { department, semester, course, sort: sort || 'latest' },
            departments
        });
    } catch (err) {
        next(err);
    }
};

exports.details = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).render('404', { title: 'Note Not Found' });
        }

        const [related, ratings] = await Promise.all([
            Note.getRelated(note.id, note.course, 4),
            Rating.listForNote(note.id, 10)
        ]);

        let userRating = null;
        let isBookmarked = false;
        let hasDownloaded = false;
        if (req.session.userId) {
            userRating = await Rating.findByUserAndNote(req.session.userId, note.id);
            isBookmarked = await Bookmark.isBookmarked(req.session.userId, note.id);
            hasDownloaded = await Download.hasDownloaded(req.session.userId, note.id);
        }

        // Track recently viewed notes in the session (most recent first, max 8)
        if (!Array.isArray(req.session.recentlyViewed)) req.session.recentlyViewed = [];
        req.session.recentlyViewed = req.session.recentlyViewed.filter(id => id !== note.id);
        req.session.recentlyViewed.unshift(note.id);
        req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 8);

        res.render('note-details', {
            title: note.title,
            note, related, ratings, userRating, isBookmarked, hasDownloaded,
            justUploaded: req.query.uploaded === '1'
        });
    } catch (err) {
        next(err);
    }
};

exports.checkDownload = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found.' });
        }

        // Admins can always download, with no credit checks or per-user tracking
        if (req.session.adminId && !req.session.userId) {
            return res.json({ success: true, alreadyDownloaded: true });
        }

        const userId = req.session.userId;
        const isOwner = note.uploaded_by === userId;
        const alreadyDownloaded = await Download.hasDownloaded(userId, noteId);
        if (alreadyDownloaded || isOwner) {
            return res.json({ success: true, alreadyDownloaded: true });
        }
        const user = await User.findById(userId);
        if (user.credit < DOWNLOAD_COST) {
            return res.status(402).json({
                success: false,
                message: 'Not enough credits to download this note. Upload a note to earn +5 credits.',
                code: 'INSUFFICIENT_CREDIT'
            });
        }
        res.json({ success: true, alreadyDownloaded: false });
    } catch (err) {
        next(err);
    }
};

exports.download = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        const wantsJson = req.xhr || (req.headers.accept || '').includes('application/json');
        const note = await Note.findById(noteId);
        if (!note) {
            if (wantsJson) return res.status(404).json({ success: false, message: 'Note not found.' });
            return res.status(404).render('404', { title: 'Note Not Found' });
        }

        // Admins download directly - no credit checks, no per-user download records
        // (an admin id isn't a row in the users table, so it can't be logged there)
        const isAdminSession = req.session.adminId && !req.session.userId;

        if (!isAdminSession) {
            const userId = req.session.userId;
            const isOwner = note.uploaded_by === userId;

            if (!isOwner) {
                // Try to atomically claim "first download" via the unique constraint.
                // If this fails (another concurrent request already recorded it),
                // isNewDownload is false and we just serve the file for free below -
                // exactly the same as any other repeat download.
                const isNewDownload = await Download.recordIfNew(userId, noteId);

                if (isNewDownload) {
                    // Charge atomically: the WHERE clause re-checks the balance at
                    // the moment of the update, so a stale read can't cause an
                    // overspend even if many requests reach this point together.
                    const newBalance = await User.deductCreditIfSufficient(userId, DOWNLOAD_COST);
                    if (newBalance === null) {
                        // Payment failed - undo the download record we just claimed
                        await Download.remove(userId, noteId);
                        const message = 'Not enough credits to download this note. Upload a note to earn +5 credits.';
                        if (wantsJson) {
                            return res.status(402).json({ success: false, message, code: 'INSUFFICIENT_CREDIT' });
                        }
                        return res.status(402).render('error', { title: 'Not Enough Credits', message });
                    }

                    await CreditHistory.log({
                        userId,
                        action: `Downloaded note: ${note.title}`,
                        creditChange: -DOWNLOAD_COST,
                        balance: newBalance
                    });
                    await Note.incrementDownloads(noteId);
                }
            } else {
                // Free re-download-style record for the note's own uploader, no credit charged
                const isNewDownload = await Download.recordIfNew(userId, noteId);
                if (isNewDownload) await Note.incrementDownloads(noteId);
            }
        }

        const filePath = path.join(__dirname, '..', 'public', note.pdf_path);
        if (!fs.existsSync(filePath)) {
            const message = 'This file is missing from storage. Please contact support.';
            if (wantsJson) return res.status(404).json({ success: false, message });
            return res.status(404).render('error', { title: 'File Not Found', message });
        }

        res.download(filePath, `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (err) {
        next(err);
    }
};

exports.toggleBookmark = async (req, res, next) => {
    try {
        const bookmarked = await Bookmark.toggle(req.session.userId, req.params.id);
        res.json({ success: true, bookmarked });
    } catch (err) {
        next(err);
    }
};

exports.report = async (req, res, next) => {
    const Report = require('../models/Report');
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found.' });
        }
        if (note.uploaded_by === req.session.userId) {
            return res.status(403).json({ success: false, message: 'You cannot report your own note.' });
        }

        const reason = clean(req.body.reason) || 'No reason provided';
        if (reason.length > 300) {
            return res.status(400).json({ success: false, message: 'Report reason must be 300 characters or fewer.' });
        }

        await Report.create({
            noteId: req.params.id,
            userId: req.session.userId,
            reason
        });
        await Note.markReported(req.params.id);
        res.json({ success: true, message: 'Thanks — our team will review this note.' });
    } catch (err) {
        next(err);
    }
};

// Lets the uploader delete their own note directly from the note page.
exports.deleteOwn = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found.' });
        }
        if (note.uploaded_by !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'You can only delete your own notes.' });
        }
        await Note.delete(req.params.id);
        removeNoteFiles(note);
        res.json({ success: true, message: 'Note deleted.' });
    } catch (err) {
        next(err);
    }
};
