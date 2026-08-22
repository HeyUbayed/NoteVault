const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/auth');
const { verifyToken } = require('../middleware/csrf');

const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match.');
        return true;
    })
];

const loginValidation = [
    body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.')
];

router.get('/register', isGuest, authController.showRegister);
router.post('/register', isGuest, verifyToken, registerValidation, authController.register);

router.get('/login', isGuest, authController.showLogin);
router.post('/login', isGuest, verifyToken, loginValidation, authController.login);

router.get('/logout', authController.logout);

router.get('/forgot-password', isGuest, authController.showForgotPassword);
router.post('/forgot-password', isGuest, verifyToken, authController.submitForgotPassword);

module.exports = router;
