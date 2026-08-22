const multer = require('multer');

function notFoundHandler(req, res) {
    res.status(404).render('404', { title: 'Page Not Found' });
}

function globalErrorHandler(err, req, res, next) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);
    if (err.stack) console.error(err.stack);

    if (err instanceof multer.MulterError) {
        let message = 'File upload error.';
        if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large.';
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).render('error', { title: 'Upload Error', message });
    }

    // Only errors application code has explicitly marked as safe (status set,
    // e.g. a deliberate validation throw) are shown verbatim to the client.
    // Anything else - including raw database/driver exceptions - could reveal
    // internal details (table/column names, query fragments, etc.), so it
    // gets a generic message instead. The real error is always logged above.
    const safeMessage = err.expose && err.message
        ? err.message
        : 'Something went wrong on our end. Please try again.';

    if (req.xhr || req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api')) {
        return res.status(err.status || 500).json({
            success: false,
            message: safeMessage
        });
    }

    res.status(err.status || 500).render('error', {
        title: 'Something went wrong',
        message: safeMessage
    });
}

module.exports = { notFoundHandler, globalErrorHandler };
