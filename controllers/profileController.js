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

// ------------------------------------------------------------
// Public profile
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Own profile
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Update profile information
// ------------------------------------------------------------
exports.updateProfile = async (req, res, next) => {
    try {
        const {
            name,
            department,
            bio
        } = req.body;

        const nameTooLong =
            (name || '').length > 100;

        const bioTooLong =
            (bio || '').length > 500;

        if (
            !name ||
            !name.trim() ||
            nameTooLong ||
            bioTooLong
        ) {
            const user =
                await User.findById(
                    req.session.userId
                );

            const [
                myNotes,
                stats,
                bookmarks
            ] = await Promise.all([
                Note.getByUploader(
                    req.session.userId
                ),
                User.getStats(
                    req.session.userId
                ),
                Bookmark.listForUser(
                    req.session.userId
                )
            ]);

            let msg =
                'Name is required.';

            if (nameTooLong) {
                msg =
                    'Name must be 100 characters or fewer.';
            } else if (bioTooLong) {
                msg =
                    'Bio must be 500 characters or fewer.';
            }

            return res.status(400).render(
                'profile',
                {
                    title: 'Your Profile',
                    user,
                    myNotes,
                    stats,
                    bookmarks,
                    errors: [{ msg }],
                    success: false
                }
            );
        }

        const cleanedName =
            clean(name);

        await User.updateProfile(
            req.session.userId,
            {
                name: cleanedName,
                department:
                    department
                        ? clean(department)
                        : null,
                bio: clean(bio)
            }
        );

        if (req.session.user) {
            req.session.user.name =
                cleanedName;
        }

        res.redirect(
            '/profile?updated=1'
        );
    } catch (err) {
        next(err);
    }
};

// ------------------------------------------------------------
// Update profile image
// ------------------------------------------------------------
//
// IMPORTANT:
// The image must already have been uploaded directly
// from the browser to Cloudinary.
//
// The browser sends:
//
// profile_image_url = Cloudinary secure_url
//
// This server NEVER writes the image to /public/uploads.
// That is necessary because Vercel's filesystem is read-only.
// ------------------------------------------------------------
exports.updateProfileImage = async (
    req,
    res,
    next
) => {
    try {
        const imageUrl =
            typeof req.body.profile_image_url === 'string'
                ? req.body.profile_image_url.trim()
                : '';

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message:
                    'Profile image URL is required.'
            });
        }

        // Validate URL
        let parsedUrl;

        try {
            parsedUrl =
                new URL(imageUrl);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid profile image URL.'
            });
        }

        // HTTPS only
        if (
            parsedUrl.protocol !== 'https:'
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Profile image must use HTTPS.'
            });
        }

        // Only allow Cloudinary URLs
        const hostname =
            parsedUrl.hostname.toLowerCase();

        if (
            !hostname.endsWith(
                'cloudinary.com'
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid profile image provider.'
            });
        }

        // Make sure this is actually an image
        // hosted by Cloudinary.
        if (
            !hostname.includes(
                'res.cloudinary.com'
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid Cloudinary image URL.'
            });
        }

        await User.updateProfileImage(
            req.session.userId,
            imageUrl
        );

        // Keep session data synchronized
        if (req.session.user) {
            req.session.user.profile_image =
                imageUrl;
        }

        return res.json({
            success: true,
            message:
                'Profile image updated successfully.',
            profile_image:
                imageUrl
        });
    } catch (err) {
        next(err);
    }
};

// ------------------------------------------------------------
// Change password
// ------------------------------------------------------------
exports.changePassword = async (
    req,
    res,
    next
) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'All password fields are required.'
            });
        }

        const user =
            await User.findById(
                req.session.userId
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    'User not found.'
            });
        }

        const match =
            await bcrypt.compare(
                currentPassword,
                user.password
            );

        if (!match) {
            return res.status(400).json({
                success: false,
                message:
                    'Current password is incorrect.'
            });
        }

        if (
            newPassword.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must be at least 8 characters.'
            });
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'New passwords do not match.'
            });
        }

        const hashed =
            await bcrypt.hash(
                newPassword,
                12
            );

        await User.updatePassword(
            req.session.userId,
            hashed
        );

        return res.json({
            success: true,
            message:
                'Password updated successfully.'
        });
    } catch (err) {
        next(err);
    }
};
