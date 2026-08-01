function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
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

// Attaches current user info to res.locals for use in every view
function attachUser(req, res, next) {
    res.locals.currentUser = (req.session && req.session.user) || null;
    next();
}

module.exports = { isAuthenticated, isGuest, attachUser };
