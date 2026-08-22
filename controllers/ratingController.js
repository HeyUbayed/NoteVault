const sanitizeHtml = require('sanitize-html');
const Rating = require('../models/Rating');
const Note = require('../models/Note');
const User = require('../models/User');
const Download = require('../models/Download');

function clean(str) {
    return sanitizeHtml((str || '').trim(), { allowedTags: [], allowedAttributes: {} });
}

exports.rate = async (req, res, next) => {
    try {
        const { rating, review } = req.body;
        const noteId = req.params.id;
        const userId = req.session.userId;

        const ratingNum = parseInt(rating);
        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
        }

        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found.' });
        }
        if (note.uploaded_by === userId) {
            return res.status(403).json({ success: false, message: 'You cannot rate your own note.' });
        }

        const hasDownloaded = await Download.hasDownloaded(userId, noteId);
        if (!hasDownloaded) {
            return res.status(403).json({ success: false, message: 'Download the note before rating it.' });
        }

        const cleanedReview = clean(review);
        if (cleanedReview.length > 500) {
            return res.status(400).json({ success: false, message: 'Review must be 500 characters or fewer.' });
        }

        await Rating.upsert({ noteId, userId, rating: ratingNum, review: cleanedReview });
        const agg = await Note.recalculateRating(noteId);
        await User.recalculateAverageRating(note.uploaded_by);

        res.json({
            success: true,
            message: 'Thanks for rating this note!',
            average: Number(agg.avg_rating).toFixed(1),
            count: agg.cnt
        });
    } catch (err) {
        next(err);
    }
};
