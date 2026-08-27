const multer = require('multer');
require('dotenv').config();

const MAX_PDF_SIZE =
    (parseInt(process.env.MAX_PDF_SIZE_MB) || 100) * 1024 * 1024;

const MAX_THUMB_SIZE =
    (parseInt(process.env.MAX_THUMB_SIZE_MB) || 3) * 1024 * 1024;

// Vercel has a read-only filesystem.
// Files are kept in memory temporarily and will be uploaded to Cloudinary.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    // PDF
    if (file.fieldname === 'pdf') {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed for notes.'));
        }
    }

    // Images
    if (
        file.fieldname === 'thumbnail' ||
        file.fieldname === 'profile_image'
    ) {
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowed.includes(file.mimetype)) {
            return cb(
                new Error('Only JPG, PNG, or WEBP images are allowed.')
            );
        }
    }

    cb(null, true);
}

// ------------------------------------------------------------
// Note upload
// ------------------------------------------------------------
const uploadNote = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: Math.max(MAX_PDF_SIZE, MAX_THUMB_SIZE)
    }
}).fields([
    {
        name: 'pdf',
        maxCount: 1
    },
    {
        name: 'thumbnail',
        maxCount: 1
    }
]);

// ------------------------------------------------------------
// Profile image upload
// ------------------------------------------------------------
const uploadProfileImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_THUMB_SIZE
    }
}).single('profile_image');

module.exports = {
    uploadNote,
    uploadProfileImage
};
