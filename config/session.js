const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'notevault',
    port: process.env.DB_PORT || 3306,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 1000 * 60 * 60 * 24 * 7
});

module.exports = session({
    key: 'notevault_sid',
    secret: process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: 'lax'
    }
});
