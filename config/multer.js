const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const MAX_PDF_SIZE = (parseInt(process.env.MAX_PDF_SIZE_MB) || 100) * 1024 * 1024;
const MAX_THUMB_SIZE = (parseInt(process.env.MAX_THUMB_SIZE_MB) || 3) * 1024 * 1024;

function storageFor(subfolder) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '..', 'public', 'uploads', subfolder));
        },
        filename: (req, file, cb) => {
            const unique = uuidv4();
            cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
        }
    });
}

function fileFilterPdf(req, file, cb) {
    if (file.fieldname === 'pdf') {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed for notes.'));
        }
    }
    if (file.fieldname === 'thumbnail' || file.fieldname === 'profile_image') {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, or WEBP images are allowed.'));
        }
    }
    cb(null, true);
}

const uploadNote = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const sub = file.fieldname === 'pdf' ? 'pdfs' : 'thumbnails';
            cb(null, path.join(__dirname, '..', 'public', 'uploads', sub));
        },
        filename: (req, file, cb) => {
            cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
        }
    }),
    fileFilter: fileFilterPdf,
    limits: { fileSize: Math.max(MAX_PDF_SIZE, MAX_THUMB_SIZE) }
}).fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);

const uploadProfileImage = multer({
    storage: storageFor('profiles'),
    fileFilter: fileFilterPdf,
    limits: { fileSize: MAX_THUMB_SIZE }
}).single('profile_image');

module.exports = { uploadNote, uploadProfileImage };
