require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');

const sessionMiddleware = require('./config/session');
const { attachUser } = require('./middleware/auth');
const { ensureToken } = require('./middleware/csrf');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');

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
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessionMiddleware);
app.use(attachUser);
app.use(ensureToken);

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------
app.use('/', authRoutes);
app.use('/', mainRoutes);

// ------------------------------------------------------------
// Error handling
// ------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`NoteVault running on http://localhost:${PORT}`);
});

module.exports = app;
