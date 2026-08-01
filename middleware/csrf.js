const crypto = require('crypto');

// Ensures every session has a CSRF token, exposed to views as csrfToken
function ensureToken(req, res, next) {
    if (req.session && !req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = (req.session && req.session.csrfToken) || '';
    next();
}

// Verifies the token on state-changing requests (POST/PUT/PATCH/DELETE).
// Accepts the token from a form field (_csrf) or an 'X-CSRF-Token' header,
// so it works for both classic form posts and JSON/AJAX requests.
function verifyToken(req, res, next) {
    const submitted = (req.body && req.body._csrf) || req.headers['x-csrf-token'];
    const expected = req.session.csrfToken;

    if (!submitted || !expected || submitted !== expected) {
        const wantsJson = req.xhr || (req.headers.accept || '').includes('application/json') || req.is('application/json');
        const message = 'Your session security token has expired. Please refresh the page and try again.';
        if (wantsJson) {
            return res.status(403).json({ success: false, message });
        }
        return res.status(403).render('error', { title: 'Security Check Failed', message });
    }
    next();
}

module.exports = { ensureToken, verifyToken };
