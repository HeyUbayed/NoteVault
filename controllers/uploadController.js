const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const Note = require('../models/Note');
const User = require('../models/User');
const CreditHistory = require('../models/CreditHistory');

const UPLOAD_REWARD = 5;

// Strips all HTML/markup from free-text fields before they ever reach the database.
function clean(str) {
    return sanitizeHtml((str || '').trim(), { allowedTags: [], allowedAttributes: {} });
}

exports.showUploadForm = (req, res) => {
    res.render('upload', { title: 'Upload a Note', errors: [] });
};

// Matches the VARCHAR limits in database/schema.sql. Enforced here so an
// over-length field produces a friendly validation message instead of an
// unhandled "Data too long for column" database error.
const FIELD_LIMITS = {
    title: 200,
    description: 1000,
    department: 100,
    semester: 50,
    course: 150,
    teacher: 150,
    tags: 300
};

function firstLengthError(fields) {
    for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
        if ((fields[field] || '').length > limit) {
            return `${field.charAt(0).toUpperCase() + field.slice(1)} must be ${limit} characters or fewer.`;
        }
    }
    return null;
}

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

        const lengthError = firstLengthError({ title, description, department, semester, course, teacher, tags });
        if (lengthError) {
            files.pdf?.forEach(f => fs.unlink(f.path, () => {}));
            files.thumbnail?.forEach(f => fs.unlink(f.path, () => {}));
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [{ msg: lengthError }]
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

        const newBalance = await User.adjustCredit(req.session.userId, UPLOAD_REWARD);
        await CreditHistory.log({
            userId: req.session.userId,
            action: `Uploaded note: ${clean(title)}`,
            creditChange: UPLOAD_REWARD,
            balance: newBalance
        });

        res.redirect(`/notes/${noteId}?uploaded=1`);
    } catch (err) {
        next(err);
    }
};
