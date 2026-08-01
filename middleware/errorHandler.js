const multer = require('multer');

function notFoundHandler(req, res) {
    res.status(404).render('404', { title: 'Page Not Found' });
}

function globalErrorHandler(err, req, res, next) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.message);

    if (err instanceof multer.MulterError) {
        let message = 'File upload error.';
        if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large.';
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({ success: false, message });
        }
        return res.status(400).render('error', { title: 'Upload Error', message });
    }

    if (req.xhr || req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api')) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Something went wrong on our end.'
        });
    }

    res.status(err.status || 500).render('error', {
        title: 'Something went wrong',
        message: err.message || 'An unexpected error occurred. Please try again.'
    });
}

module.exports = { notFoundHandler, globalErrorHandler };
