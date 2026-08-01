const User = require('../models/User');
const Note = require('../models/Note');

exports.show = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const [user, stats, myNotes] = await Promise.all([
            User.findById(userId),
            User.getStats(userId),
            Note.getByUploader(userId)
        ]);

        res.render('dashboard', {
            title: 'Your Dashboard',
            user,
            stats,
            myNotes: myNotes.slice(0, 6),
            totalMyNotes: myNotes.length
        });
    } catch (err) {
        next(err);
    }
};
