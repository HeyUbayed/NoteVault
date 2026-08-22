const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const { verifyToken } = require('../middleware/csrf');

const loginValidation = [
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
];

router.get('/login', adminController.showLogin);
router.post('/login', verifyToken, loginValidation, adminController.login);
router.get('/logout', adminController.logout);

router.get('/', isAdmin, adminController.dashboard);
router.get('/users', isAdmin, adminController.manageUsers);
router.post('/users/:id/ban', isAdmin, verifyToken, adminController.toggleBanUser);
router.post('/users/:id/delete', isAdmin, verifyToken, adminController.deleteUser);

router.get('/notes', isAdmin, adminController.manageNotes);
router.get('/notes/:id/view', isAdmin, adminController.viewNote);
router.get('/notes/:id/download', isAdmin, adminController.downloadNote);
router.post('/notes/:id/delete', isAdmin, verifyToken, adminController.deleteNote);

router.get('/reviews', isAdmin, adminController.manageReviews);
router.post('/reviews/:id/delete', isAdmin, verifyToken, adminController.deleteReview);

router.get('/reports/:id/resolve', isAdmin, adminController.resolveReport);

router.get('/analytics', isAdmin, adminController.analytics);

module.exports = router;
