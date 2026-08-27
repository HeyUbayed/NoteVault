const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');

const User = require('../models/User');
const Note = require('../models/Note');
const Bookmark = require('../models/Bookmark');

function clean(str) {
    return sanitizeHtml((str || '').trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });
}

// Public profile view
exports.showPublic = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id, 10);

        if (!targetId) {
            return res.status(404).render('404', {
                title: 'User Not Found'
            });
        }

        if (
            req.session.userId &&
            req.session.userId === targetId
        ) {
            return res.redirect('/profile');
        }

        const fullUser = await User.findById(targetId);

        if (!fullUser) {
            return res.status(404).render('404', {
                title: 'User Not Found'
            });
        }

        // Only expose safe public fields.
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
            user,
            myNotes,
            stats,
            bookmarks,
            errors: [],
            success: req.query.updated === '1'
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

        if (
            !name ||
            !name.trim() ||
            nameTooLong ||
            bioTooLong
        ) {
            const user = await User.findById(req.session.userId);

            const [myNotes, stats, bookmarks] = await Promise.all([
                Note.getByUploader(req.session.userId),
                User.getStats(req.session.userId),
                Bookmark.listForUser(req.session.userId)
            ]);

            let msg = 'Name is required.';

            if (nameTooLong) {
                msg = 'Name must be 100 characters or fewer.';
            } else if (bioTooLong) {
                msg = 'Bio must be 500 characters or fewer.';
            }

            return res.status(400).render('profile', {
                title: 'Your Profile',
                user,
                myNotes,
                stats,
                bookmarks,
                errors: [{ msg }],
                success: false
            });
        }

        const cleanedName = clean(name);

        await User.updateProfile(req.session.userId, {
            name: cleanedName,
            department: department || null,
            bio: clean(bio)
        });

        if (req.session.user) {
            req.session.user.name = cleanedName;
        }

        res.redirect('/profile?updated=1');
    } catch (err) {
        next(err);
    }
};


/*
|--------------------------------------------------------------------------
| Profile Image
|--------------------------------------------------------------------------
|
| IMPORTANT:
| The browser will upload the profile image directly to Cloudinary.
| This controller no longer receives req.file.
|
| The frontend sends:
|
| profile_image_url = Cloudinary secure_url
|
*/
exports.updateProfileImage = async (req, res, next) => {
    try {
        const imageUrl = req.body.profile_image_url;

        if (!imageUrl) {
            return res.redirect('/profile');
        }

        // Basic validation:
        // Only accept Cloudinary HTTPS URLs.
        let parsedUrl;

        try {
            parsedUrl = new URL(imageUrl);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Invalid profile image URL.'
            });
        }

        if (
            parsedUrl.protocol !== 'https:' ||
            !parsedUrl.hostname.endsWith('cloudinary.com')
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid profile image provider.'
            });
        }

        await User.updateProfileImage(
            req.session.userId,
            imageUrl
        );

        if (req.session.user) {
            req.session.user.profile_image = imageUrl;
        }

        res.redirect('/profile?updated=1');
    } catch (err) {
        next(err);
    }
};


exports.changePassword = async (req, res, next) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        const user = await User.findById(
            req.session.userId
        );

        const match = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            });
        }

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match.'
            });
        }

        const hashed = await bcrypt.hash(
            newPassword,
            12
        );

        await User.updatePassword(
            req.session.userId,
            hashed
        );

        res.json({
            success: true,
            message: 'Password updated successfully.'
        });
    } catch (err) {
        next(err);
    }
};
