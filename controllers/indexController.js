const Note = require('../models/Note');
const User = require('../models/User');

exports.home = async (req, res, next) => {
    try {
        const [departments, latest, topRated, trending, stats, topContributors, popularCourses] = await Promise.all([
            Note.getPopularDepartments(6),
            Note.getLatest(8),
            Note.getTopRated(8),
            Note.getTrending(8),
            Note.getGlobalStats(),
            User.getTopContributors(5),
            Note.getPopularCourses(6)
        ]);

        res.render('home', {
            title: 'NoteVault — Share Knowledge, Ace Together',
            departments, latest, topRated, trending, stats, topContributors, popularCourses
        });
    } catch (err) {
        next(err);
    }
};
