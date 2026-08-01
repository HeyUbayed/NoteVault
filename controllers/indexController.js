const Note = require('../models/Note');

exports.home = async (req, res, next) => {
    try {
        const [departments, latest, stats] = await Promise.all([
            Note.getPopularDepartments(6),
            Note.getLatest(8),
            Note.getGlobalStats()
        ]);

        res.render('home', {
            title: 'NoteVault — Share Knowledge, Ace Together',
            departments, latest, stats
        });
    } catch (err) {
        next(err);
    }
};
