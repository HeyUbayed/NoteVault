const crypto = require('crypto');

// ------------------------------------------------------------
// Ensure every session has a CSRF token
// ------------------------------------------------------------
function ensureToken(req, res, next) {
    if (!req.session) {
        res.locals.csrfToken = '';
        return next();
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');

        // Explicitly save the session so the CSRF token exists
        // in MySQL before the browser submits the form.
        return req.session.save((err) => {
            if (err) {
                return next(err);
            }

            res.locals.csrfToken = req.session.csrfToken;
            next();
        });
    }

    res.locals.csrfToken = req.session.csrfToken;
    next();
}

// ------------------------------------------------------------
// Verify CSRF token on state-changing requests
// ------------------------------------------------------------
function verifyToken(req, res, next) {
    const submitted =
        (req.body && req.body._csrf) ||
        req.headers['x-csrf-token'];

    const expected =
        req.session && req.session.csrfToken;

    if (!submitted || !expected || submitted !== expected) {
        const wantsJson =
            req.xhr ||
            (req.headers.accept || '').includes('application/json') ||
            req.is('application/json');

        const message =
            'Your session security token has expired. Please refresh the page and try again.';

        if (wantsJson) {
            return res.status(403).json({
                success: false,
                message
            });
        }

        return res.status(403).render('error', {
            title: 'Security Check Failed',
            message
        });
    }

    next();
}

module.exports = {
    ensureToken,
    verifyToken
};
