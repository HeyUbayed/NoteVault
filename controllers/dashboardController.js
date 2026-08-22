const User = require('../models/User');
const Note = require('../models/Note');
const Download = require('../models/Download');

exports.show = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const [user, stats, myNotes, recentDownloads] = await Promise.all([
            User.findById(userId),
            User.getStats(userId),
            Note.getByUploader(userId),
            Download.listForUser(userId, { page: 1, limit: 5 })
        ]);

        const recentlyViewed = await Note.getByIds(req.session.recentlyViewed || []);

        res.render('dashboard', {
            title: 'Your Dashboard',
            user,
            stats,
            myNotes: myNotes.slice(0, 6),
            totalMyNotes: myNotes.length,
            recentDownloads: recentDownloads.rows,
            recentlyViewed
        });
    } catch (err) {
        next(err);
    }
};
