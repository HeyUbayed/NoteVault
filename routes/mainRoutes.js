const express = require('express');
const router = express.Router();

const indexController = require('../controllers/indexController');
const dashboardController = require('../controllers/dashboardController');
const uploadController = require('../controllers/uploadController');
const notesController = require('../controllers/notesController');
const ratingController = require('../controllers/ratingController');
const searchController = require('../controllers/searchController');
const profileController = require('../controllers/profileController');

const { isAuthenticated, isAuthenticatedOrAdmin } = require('../middleware/auth');
const { verifyToken } = require('../middleware/csrf');
// No uploadProfileImage middleware needed.
// Profile images are uploaded directly to Cloudinary.

// Home
router.get('/', indexController.home);

// Dashboard
router.get('/dashboard', isAuthenticated, dashboardController.show);

// Upload
router.get('/upload', isAuthenticated, uploadController.showUploadForm);

// IMPORTANT:
// PDF and thumbnail are now uploaded directly from the browser to Cloudinary.
// Therefore multer/uploadNote is NOT used here.
router.post(
    '/upload',
    isAuthenticated,
    verifyToken,
    uploadController.handleUpload
);

// Browse & Notes
router.get('/browse', notesController.browse);

router.get(
    '/notes/:id',
    notesController.details
);

router.get(
    '/notes/:id/download-check',
    isAuthenticatedOrAdmin,
    notesController.checkDownload
);

router.get(
    '/notes/:id/download',
    isAuthenticatedOrAdmin,
    notesController.download
);

router.post(
    '/notes/:id/rate',
    isAuthenticated,
    verifyToken,
    ratingController.rate
);

router.post(
    '/notes/:id/bookmark',
    isAuthenticated,
    verifyToken,
    notesController.toggleBookmark
);

router.post(
    '/notes/:id/report',
    isAuthenticated,
    verifyToken,
    notesController.report
);

router.post(
    '/notes/:id/delete',
    isAuthenticated,
    verifyToken,
    notesController.deleteOwn
);

// Search
router.get(
    '/search',
    searchController.showSearch
);

router.get(
    '/api/search',
    searchController.apiSearch
);

// Public profile
router.get(
    '/users/:id',
    profileController.showPublic
);

// Profile
router.get(
    '/profile',
    isAuthenticated,
    profileController.show
);

router.post(
    '/profile',
    isAuthenticated,
    verifyToken,
    profileController.updateProfile
);

router.post(
    '/profile/image',
    isAuthenticated,
    verifyToken,
    profileController.updateProfileImage
);

router.post(
    '/profile/password',
    isAuthenticated,
    verifyToken,
    profileController.changePassword
);

module.exports = router;
