const sanitizeHtml = require('sanitize-html');

const Note = require('../models/Note');
const User = require('../models/User');
const CreditHistory = require('../models/CreditHistory');

const UPLOAD_REWARD = 5;

// ------------------------------------------------------------
// Clean user-provided text
// ------------------------------------------------------------
function clean(str) {
    return sanitizeHtml((str || '').trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });
}

// ------------------------------------------------------------
// Upload page
// ------------------------------------------------------------
exports.showUploadForm = (req, res) => {
    res.render('upload', {
        title: 'Upload a Note',
        errors: []
    });
};

// ------------------------------------------------------------
// Database field limits
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Handle note upload
// ------------------------------------------------------------
// Files are uploaded DIRECTLY from the browser to Cloudinary.
// Vercel does NOT receive the PDF/image file.
//
// The browser sends only:
// - pdf_path
// - thumbnail
// - normal form fields
// ------------------------------------------------------------
exports.handleUpload = async (req, res, next) => {
    try {
        const {
            title,
            description,
            department,
            semester,
            course,
            teacher,
            tags,
            pdf_path,
            thumbnail
        } = req.body;

        // --------------------------------------------------------
        // Validate Cloudinary PDF URL
        // --------------------------------------------------------
        if (!pdf_path) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg: 'PDF upload failed. Please upload the PDF again.'
                    }
                ]
            });
        }

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------
        if (!title || !department || !semester || !course) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg: 'Title, department, semester, and course are required.'
                    }
                ]
            });
        }

        // --------------------------------------------------------
        // Validate field lengths
        // --------------------------------------------------------
        const lengthError = firstLengthError({
            title,
            description,
            department,
            semester,
            course,
            teacher,
            tags
        });

        if (lengthError) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg: lengthError
                    }
                ]
            });
        }

        // --------------------------------------------------------
        // Basic Cloudinary URL validation
        // --------------------------------------------------------
        if (
            typeof pdf_path !== 'string' ||
            !pdf_path.startsWith('https://res.cloudinary.com/')
        ) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg: 'Invalid PDF upload URL.'
                    }
                ]
            });
        }

        let thumbnailPath = '/images/default-thumbnail.png';

        if (thumbnail) {
            if (
                typeof thumbnail !== 'string' ||
                !thumbnail.startsWith('https://res.cloudinary.com/')
            ) {
                return res.status(400).render('upload', {
                    title: 'Upload a Note',
                    errors: [
                        {
                            msg: 'Invalid thumbnail upload URL.'
                        }
                    ]
                });
            }

            thumbnailPath = thumbnail;
        }

        // --------------------------------------------------------
        // File size
        // --------------------------------------------------------
        // Since the browser uploads directly to Cloudinary,
        // the backend no longer receives the actual file.
        //
        // upload.js can send the size to us.
        // If unavailable, default to 0.
        // --------------------------------------------------------
        const fileSize = Number(req.body.file_size) || 0;

        // --------------------------------------------------------
        // Create note
        // --------------------------------------------------------
        const cleanedTitle = clean(title);

        const noteId = await Note.create({
            title: cleanedTitle,
            description: clean(description),
            pdf_path: pdf_path,
            thumbnail: thumbnailPath,
            department: clean(department),
            semester: clean(semester),
            course: clean(course),
            teacher: clean(teacher),
            tags: clean(tags),
            uploaded_by: req.session.userId,
            file_size: fileSize
        });

        // --------------------------------------------------------
        // Reward uploader
        // --------------------------------------------------------
        const newBalance = await User.adjustCredit(
            req.session.userId,
            UPLOAD_REWARD
        );

        await CreditHistory.log({
            userId: req.session.userId,
            action: `Uploaded note: ${cleanedTitle}`,
            creditChange: UPLOAD_REWARD,
            balance: newBalance
        });

        // --------------------------------------------------------
        // Success
        // --------------------------------------------------------
        return res.redirect(
            `/notes/${noteId}?uploaded=1`
        );

    } catch (err) {
        next(err);
    }
};
