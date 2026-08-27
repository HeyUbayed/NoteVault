const sanitizeHtml = require('sanitize-html');

const Note = require('../models/Note');
const User = require('../models/User');
const CreditHistory = require('../models/CreditHistory');
const cloudinary = require('../config/cloudinary');

const UPLOAD_REWARD = 5;

// ------------------------------------------------------------
// Clean text
// ------------------------------------------------------------
function clean(str) {
    return sanitizeHtml((str || '').trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });
}

// ------------------------------------------------------------
// Upload buffer to Cloudinary
// ------------------------------------------------------------
function uploadToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        stream.end(buffer);
    });
}

// ------------------------------------------------------------
// Upload form
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
            return `${
                field.charAt(0).toUpperCase() + field.slice(1)
            } must be ${limit} characters or fewer.`;
        }
    }

    return null;
}

// ------------------------------------------------------------
// Handle note upload
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
            tags
        } = req.body;

        const files = req.files || {};

        // ----------------------------------------------------
        // PDF required
        // ----------------------------------------------------
        if (!files.pdf || !files.pdf[0]) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg: 'A PDF file is required.'
                    }
                ]
            });
        }

        // ----------------------------------------------------
        // Required fields
        // ----------------------------------------------------
        if (!title || !department || !semester || !course) {
            return res.status(400).render('upload', {
                title: 'Upload a Note',
                errors: [
                    {
                        msg:
                            'Title, department, semester, and course are required.'
                    }
                ]
            });
        }

        // ----------------------------------------------------
        // Field length validation
        // ----------------------------------------------------
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

        const pdfFile = files.pdf[0];

        const thumbFile =
            files.thumbnail && files.thumbnail[0]
                ? files.thumbnail[0]
                : null;

        // ----------------------------------------------------
        // Upload PDF to Cloudinary
        // ----------------------------------------------------
        const pdfResult = await uploadToCloudinary(
            pdfFile.buffer,
            {
                resource_type: 'raw',
                folder: 'notevault/pdfs',
                public_id: `note-${Date.now()}`
            }
        );

        // ----------------------------------------------------
        // Upload thumbnail
        // ----------------------------------------------------
        let thumbPath = '/images/default-thumbnail.png';

        if (thumbFile) {
            const thumbnailResult = await uploadToCloudinary(
                thumbFile.buffer,
                {
                    resource_type: 'image',
                    folder: 'notevault/thumbnails',
                    public_id: `thumbnail-${Date.now()}`
                }
            );

            thumbPath = thumbnailResult.secure_url;
        }

        // ----------------------------------------------------
        // Create database record
        // ----------------------------------------------------
        const noteId = await Note.create({
            title: clean(title),
            description: clean(description),

            // Cloudinary URL instead of /uploads/pdfs/...
            pdf_path: pdfResult.secure_url,

            // Cloudinary URL or default image
            thumbnail: thumbPath,

            department: clean(department),
            semester: clean(semester),
            course: clean(course),
            teacher: clean(teacher),
            tags: clean(tags),

            uploaded_by: req.session.userId,
            file_size: pdfFile.size
        });

        // ----------------------------------------------------
        // Give upload credit
        // ----------------------------------------------------
        const newBalance = await User.adjustCredit(
            req.session.userId,
            UPLOAD_REWARD
        );

        await CreditHistory.log({
            userId: req.session.userId,
            action: `Uploaded note: ${clean(title)}`,
            creditChange: UPLOAD_REWARD,
            balance: newBalance
        });

        // ----------------------------------------------------
        // Success
        // ----------------------------------------------------
        res.redirect(`/notes/${noteId}?uploaded=1`);

    } catch (err) {
        console.error('Note upload error:', err);
        next(err);
    }
};
