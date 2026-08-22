# NoteVault 📚

A full-stack academic notes-sharing platform where students upload notes to earn credits and spend credits to download notes shared by others.

## Features

- **Authentication** — Register/login with bcrypt password hashing, MySQL-backed sessions, protected routes. Admin and user sessions are mutually exclusive: logging into the admin panel ends any active user session, and vice versa; leaving the admin area for the public site automatically logs the admin out.
- **Upload & Browse** — PDF upload (up to 100MB) with optional thumbnail, filter by department/semester/course, sort by latest/popular/rating
- **Credit Economy** — Earn +5 credits per upload, spend 1 credit per unique download (downloading your own uploaded note is always free)
- **5-Star Ratings & Reviews** — Rate notes you've downloaded, see aggregate ratings on cards and detail pages
- **Search** — Full-text MySQL search with live autocomplete suggestions in the navbar
- **Profile** — Editable bio/department/avatar, tabs for your notes/bookmarks/settings, password change
- **Public Profiles** — Visit any user's profile at `/users/:id` to see their uploads and rating
- **Bookmarks** — Save notes for later, persists across sessions
- **Reporting** — Flag a note for review; reports show up in the admin panel
- **Admin Panel** — Separate login, manage users (suspend/delete), manage notes (view/download/delete/moderate), review reports, analytics dashboard with CSS-based charts
- **Responsive Design** — Mobile-friendly navigation, grid layouts, and forms

## Tech Stack

- **Backend:** Node.js, Express.js (MVC architecture)
- **Database:** MySQL (via `mysql2`)
- **Auth:** express-session + express-mysql-session, bcrypt
- **File Uploads:** Multer
- **Templating:** EJS
- **Frontend:** Vanilla HTML5, CSS3 (custom design system), JavaScript (no frameworks)

## Project Structure

```
notevault/
├── app.js                 # Application entry point
├── config/                 # DB, session, and multer configuration
├── controllers/             # Route handler logic
├── models/                  # Data access layer (raw SQL via mysql2)
├── middleware/               # Auth guards + error handling
├── routes/                   # Express routers
├── views/                    # EJS templates (+ views/admin, views/partials)
├── public/
│   ├── css/                  # variables.css, style.css, components.css
│   ├── js/                   # main.js + per-page scripts
│   ├── images/                # default avatar/thumbnail
│   └── uploads/                # pdfs/, thumbnails/, profiles/ (created at runtime)
└── database/
    ├── schema.sql             # Full MySQL schema
    └── seed.js                 # Creates admin account + sample data
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # edit .env with your MySQL credentials and a strong SESSION_SECRET
   ```

4. **Seed an admin account (and optional sample data)**
   ```bash
   npm run seed
   ```
   This creates an admin account using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
   (defaults to `admin@notevault.com` / `Admin@12345` if unset — **change this in production**).
   It will also seed 4 sample users and 6 sample notes if the `users` table is empty
   (sample login: `ayesha@uiu.ac.bd` / `Password@123`).

5. **Run the app**
   ```bash
   npm start        # production
   npm run dev       # development (nodemon, auto-restart)
   ```

   Visit `http://localhost:3000`. Admin panel is at `http://localhost:3000/admin/login`.

## Credit Economy Rules

| Action | Credit Change |
|---|---|
| Upload a note | +5 |
| Download a note (first time only) | −1 |
| Re-downloading a note you already downloaded | Free |

## Notes on Sample Data

The seeded sample notes point to a placeholder PDF (`sample-placeholder.pdf`) so downloads work
out of the box for demo purposes — replace with real uploads via the Upload page for full functionality.

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- Sessions stored server-side in MySQL, httpOnly cookies
- Helmet for basic security headers / CSP
- File upload validation restricts PDF/image mimetypes and sizes (configurable via `.env`)
- Admin routes are fully separate from user auth and require a distinct admin login
