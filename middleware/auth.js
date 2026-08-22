const User = require('../models/User');

async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const banned = await User.isBanned(req.session.userId);
            if (banned) {
                return req.session.destroy(() => {
                    res.clearCookie('notevault_sid');
                    if (req.xhr || req.headers.accept?.includes('application/json')) {
                        return res.status(403).json({ success: false, message: 'This account has been suspended.' });
                    }
                    return res.redirect('/login');
                });
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
}

// Lets either a logged-in user OR a logged-in admin through. Used for actions
// (like downloading a note from the public site) that admins should be able
// to do while browsing, without needing a separate user account.
async function isAuthenticatedOrAdmin(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    if (req.session && req.session.userId) {
        try {
            const banned = await User.isBanned(req.session.userId);
            if (banned) {
                return req.session.destroy(() => {
                    res.clearCookie('notevault_sid');
                    if (req.xhr || req.headers.accept?.includes('application/json')) {
                        return res.status(403).json({ success: false, message: 'This account has been suspended.' });
                    }
                    return res.redirect('/login');
                });
            }
            return next();
        } catch (err) {
            return next(err);
        }
    }
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
}

function isGuest(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
}

function isAdmin(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    return res.redirect('/admin/login');
}

// Attaches current user info to res.locals for use in every view
function attachUser(req, res, next) {
    res.locals.currentUser = (req.session && req.session.user) || null;
    res.locals.isAdmin = !!(req.session && req.session.adminId);
    next();
}

module.exports = { isAuthenticated, isAuthenticatedOrAdmin, isGuest, isAdmin, attachUser };
