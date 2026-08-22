const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const User = require('../models/User');
const Note = require('../models/Note');
const Bookmark = require('../models/Bookmark');

function clean(str) {
    return sanitizeHtml((str || '').trim(), { allowedTags: [], allowedAttributes: {} });
}

// Public profile view - lets any visitor see another user's uploads and rating.
// Redirects to the editable /profile page if the visitor is viewing themselves.
exports.showPublic = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        if (!targetId) {
            return res.status(404).render('404', { title: 'User Not Found' });
        }
        if (req.session.userId && req.session.userId === targetId) {
            return res.redirect('/profile');
        }

        const fullUser = await User.findById(targetId);
        if (!fullUser) {
            return res.status(404).render('404', { title: 'User Not Found' });
        }

        // Only expose safe, public fields - never leak email, password hash, or credit balance
        const profileUser = {
            id: fullUser.id,
            name: fullUser.name,
            department: fullUser.department,
            profile_image: fullUser.profile_image,
            bio: fullUser.bio,
            average_rating: fullUser.average_rating,
            joined_date: fullUser.joined_date
        };

        const [notes, stats] = await Promise.all([
            Note.getByUploader(targetId),
            User.getStats(targetId)
        ]);

        res.render('user-profile', {
            title: fullUser.name,
            profileUser,
            notes,
            stats
        });
    } catch (err) {
        next(err);
    }
};

exports.show = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.userId);
        const [myNotes, stats, bookmarks] = await Promise.all([
            Note.getByUploader(req.session.userId),
            User.getStats(req.session.userId),
            Bookmark.listForUser(req.session.userId)
        ]);

        res.render('profile', {
            title: 'Your Profile',
            user, myNotes, stats, bookmarks,
            errors: [], success: req.query.updated === '1'
        });
    } catch (err) {
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { name, department, bio } = req.body;
        const nameTooLong = (name || '').length > 100;
        const bioTooLong = (bio || '').length > 500;

        if (!name || !name.trim() || nameTooLong || bioTooLong) {
            const user = await User.findById(req.session.userId);
            const [myNotes, stats, bookmarks] = await Promise.all([
                Note.getByUploader(req.session.userId),
                User.getStats(req.session.userId),
                Bookmark.listForUser(req.session.userId)
            ]);
            let msg = 'Name is required.';
            if (nameTooLong) msg = 'Name must be 100 characters or fewer.';
            else if (bioTooLong) msg = 'Bio must be 500 characters or fewer.';
            return res.status(400).render('profile', {
                title: 'Your Profile', user, myNotes, stats, bookmarks,
                errors: [{ msg }], success: false
            });
        }

        await User.updateProfile(req.session.userId, {
            name: clean(name),
            department: department || null,
            bio: clean(bio)
        });

        req.session.user.name = clean(name);
        res.redirect('/profile?updated=1');
    } catch (err) {
        next(err);
    }
};

exports.updateProfileImage = async (req, res, next) => {
    try {
        if (!req.file) return res.redirect('/profile');
        const imagePath = `/uploads/profiles/${req.file.filename}`;

        // Clean up the old avatar file so replacing it doesn't leave the
        // previous upload behind forever (skip the shared default image).
        const previous = await User.findById(req.session.userId);
        if (previous && previous.profile_image && previous.profile_image !== '/images/default-avatar.png') {
            fs.unlink(path.join(__dirname, '..', 'public', previous.profile_image), () => {});
        }

        await User.updateProfileImage(req.session.userId, imagePath);
        req.session.user.profile_image = imagePath;
        res.redirect('/profile?updated=1');
    } catch (err) {
        next(err);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.userId);

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New passwords do not match.' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await User.updatePassword(req.session.userId, hashed);
        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        next(err);
    }
};
