# NoteVault — Phase 1: Basic Note Sharing Platform

This is the **Phase 1 development milestone** of NoteVault, an academic notes-sharing
platform. It represents the initial MVP: the smallest set of features needed for a
student to register, log in, upload a PDF note, browse notes, view details, and
download a note.

Built with Node.js, Express, MySQL, EJS, and vanilla JavaScript using an MVC structure.

## Features in this phase

- User registration & login (session-based auth, bcrypt password hashing)
- Basic user dashboard (your uploaded notes + simple stats)
- PDF note upload (with optional cover thumbnail)
- Browse all notes (paginated, newest first)
- Note details page
- Note download
- Basic department / semester / course metadata on notes
- Responsive UI

## Not included yet (planned for later phases)

- Department / semester / course filtering and sorting, search & autocomplete (Phase 2)
- User profile editing, profile pictures, password change (Phase 2)
- Credit economy (earn credits on upload, spend on download), credit history (Phase 2)
- Download tracking (Phase 2)
- Ratings, reviews, bookmarks, report note (Phase 3)
- Admin login, dashboard, user/note/report management, analytics (Phase 3)
- Security hardening & final UI/UX polish (Phase 4)

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your MySQL credentials.
3. Create the database and tables:
   ```
   mysql -u root -p < database/schema.sql
   ```
4. (Optional) Seed sample users and notes:
   ```
   npm run seed
   ```
5. Start the app:
   ```
   npm run dev
   ```
   Visit `http://localhost:3000`.

Sample login after seeding: `ayesha@uiu.ac.bd` / `Password@123`
