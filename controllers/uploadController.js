const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const Note = require('../models/Note');

// Strips all HTML/markup from free-text fields before they ever reach the database.
function clean(str) {
    return sanitizeHtml((str || '').trim(), { allowedTags: [], allowedAttributes: {} });
}

exports.showUploadForm = (req, res) => {
    res.render('upload', { title: 'Upload a Note', errors: [] });
};

exports.handleUpload = async (req, res, next) => {
    try {
        const { title, description, department, semester, course, teacher, tags } = req.body;
        const files = req.files || {};

        if (!files.pdf || !files.pdf[0]) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [{ msg: 'A PDF file is required.' }]
            });
        }

        if (!title || !department || !semester || !course) {
            // clean up uploaded files since we're rejecting
            files.pdf?.forEach(f => fs.unlink(f.path, () => {}));
            files.thumbnail?.forEach(f => fs.unlink(f.path, () => {}));
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [{ msg: 'Title, department, semester, and course are required.' }]
            });
        }

        const pdfFile = files.pdf[0];
        const thumbFile = files.thumbnail ? files.thumbnail[0] : null;

        const pdfPath = `/uploads/pdfs/${pdfFile.filename}`;
        const thumbPath = thumbFile ? `/uploads/thumbnails/${thumbFile.filename}` : '/images/default-thumbnail.png';

        const noteId = await Note.create({
            title: clean(title),
            description: clean(description),
            pdf_path: pdfPath,
            thumbnail: thumbPath,
            department,
            semester,
            course: clean(course),
            teacher: clean(teacher),
            tags: clean(tags),
            uploaded_by: req.session.userId,
            file_size: pdfFile.size
        });

        res.redirect(`/notes/${noteId}?uploaded=1`);
    } catch (err) {
        next(err);
    }
};
