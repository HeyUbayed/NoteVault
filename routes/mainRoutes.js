const express = require('express');
const router = express.Router();

const indexController = require('../controllers/indexController');
const dashboardController = require('../controllers/dashboardController');
const uploadController = require('../controllers/uploadController');
const notesController = require('../controllers/notesController');

const { isAuthenticated } = require('../middleware/auth');
const { verifyToken } = require('../middleware/csrf');
const { uploadNote } = require('../config/multer');

// Home
router.get('/', indexController.home);

// Dashboard
router.get('/dashboard', isAuthenticated, dashboardController.show);

// Upload (multer must parse the multipart body before CSRF token can be read)
router.get('/upload', isAuthenticated, uploadController.showUploadForm);
router.post('/upload', isAuthenticated, uploadNote, verifyToken, uploadController.handleUpload);

// Browse & Notes
router.get('/browse', notesController.browse);
router.get('/notes/:id', notesController.details);
router.get('/notes/:id/download', isAuthenticated, notesController.download);

module.exports = router;
