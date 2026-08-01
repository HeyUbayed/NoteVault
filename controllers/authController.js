const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const User = require('../models/User');

exports.showRegister = (req, res) => {
    res.render('register', { title: 'Create Account', errors: [], old: {} });
};

exports.showLogin = (req, res) => {
    res.render('login', { title: 'Log In', errors: [], old: {} });
};

exports.register = async (req, res) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;

    if (!errors.isEmpty()) {
        return res.status(400).render('register', {
            title: 'Create Account',
            errors: errors.array(),
            old: { name, email }
        });
    }

    try {
        const existing = await User.findByEmail(email.toLowerCase().trim());
        if (existing) {
            return res.status(400).render('register', {
                title: 'Create Account',
                errors: [{ msg: 'An account with this email already exists.' }],
                old: { name, email }
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            hashedPassword,
            department: req.body.department || null
        });

        req.session.userId = userId;
        req.session.user = { id: userId, name: name.trim(), email: email.toLowerCase().trim(), profile_image: '/images/default-avatar.png' };
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('register', {
            title: 'Create Account',
            errors: [{ msg: 'Something went wrong. Please try again.' }],
            old: { name, email }
        });
    }
};

exports.login = async (req, res) => {
    const errors = validationResult(req);
    const { email, password } = req.body;

    if (!errors.isEmpty()) {
        return res.status(400).render('login', {
            title: 'Log In',
            errors: errors.array(),
            old: { email }
        });
    }

    try {
        const user = await User.findByEmail(email.toLowerCase().trim());
        if (!user) {
            return res.status(400).render('login', {
                title: 'Log In',
                errors: [{ msg: 'Invalid email or password.' }],
                old: { email }
            });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).render('login', {
                title: 'Log In',
                errors: [{ msg: 'Invalid email or password.' }],
                old: { email }
            });
        }

        req.session.userId = user.id;
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            profile_image: user.profile_image
        };

        const returnTo = req.session.returnTo;
        delete req.session.returnTo;
        res.redirect(returnTo || '/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('login', {
            title: 'Log In',
            errors: [{ msg: 'Something went wrong. Please try again.' }],
            old: { email }
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('notevault_sid');
        res.redirect('/login');
    });
};
