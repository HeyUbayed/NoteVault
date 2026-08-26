require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');

const db = require('./config/db');
const sessionMiddleware = require('./config/session');
const { attachUser } = require('./middleware/auth');
const { ensureToken } = require('./middleware/csrf');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ------------------------------------------------------------
// View engine
// ------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ------------------------------------------------------------
// Security & core middleware
// ------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// Session & authentication middleware
// ------------------------------------------------------------
app.use(sessionMiddleware);
app.use(attachUser);
app.use(ensureToken);

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------
// Tests both the Express server and Railway MySQL connection.
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.status(200).json({
            success: true,
            server: 'NoteVault API is running',
            database: 'Connected to Railway MySQL'
        });
    } catch (error) {
        console.error('Database health check failed:', error);

        res.status(500).json({
            success: false,
            server: 'NoteVault API is running',
            database: 'Railway MySQL connection failed'
        });
    }
});

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', mainRoutes);

// ------------------------------------------------------------
// Error handling
// ------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`NoteVault running on http://localhost:${PORT}`);
});

module.exports = app;
