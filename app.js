require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');

const db = require('./config/db');
const sessionMiddleware = require('./config/session');

const { attachUser } = require('./middleware/auth');
const { ensureToken } = require('./middleware/csrf');

const {
    notFoundHandler,
    globalErrorHandler
} = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ------------------------------------------------------------
// Trust Vercel reverse proxy
// ------------------------------------------------------------
// Required when using secure HTTPS cookies behind Vercel.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ------------------------------------------------------------
// View engine
// ------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ------------------------------------------------------------
// Security
// ------------------------------------------------------------
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],

                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.tailwindcss.com"
                ],

                scriptSrcAttr: ["'unsafe-inline'"],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://cdn.tailwindcss.com"
                ],

                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com"
                ],

                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:"
                ],

                connectSrc: [
                    "'self'"
                ]
            }
        }
    })
);

// ------------------------------------------------------------
// Body parsers
// ------------------------------------------------------------
app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ------------------------------------------------------------
// Static files
// ------------------------------------------------------------
app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

// ------------------------------------------------------------
// Session
// ------------------------------------------------------------
app.use(sessionMiddleware);

// ------------------------------------------------------------
// Authentication
// ------------------------------------------------------------
app.use(attachUser);

// ------------------------------------------------------------
// CSRF token
// ------------------------------------------------------------
app.use(ensureToken);

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------
// Tests both Express and Railway MySQL.
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        return res.status(200).json({
            success: true,
            server: 'NoteVault API is running',
            database: 'Connected to Railway MySQL'
        });

    } catch (error) {
        console.error(
            'Database health check failed:',
            error
        );

        return res.status(500).json({
            success: false,
            server: 'NoteVault API is running',
            database: 'Railway MySQL connection failed'
        });
    }
});

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

// Authentication routes
app.use('/', authRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// Main application routes
app.use('/', mainRoutes);

// ------------------------------------------------------------
// 404 Handler
// ------------------------------------------------------------
app.use(notFoundHandler);

// ------------------------------------------------------------
// Global Error Handler
// ------------------------------------------------------------
app.use(globalErrorHandler);

// ------------------------------------------------------------
// Local development server
// ------------------------------------------------------------
// Vercel imports this file as a serverless function.
// app.listen() is only needed when running locally.
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `NoteVault running on http://localhost:${PORT}`
        );
    });
}

// ------------------------------------------------------------
// Export Express application
// ------------------------------------------------------------
module.exports = app;
