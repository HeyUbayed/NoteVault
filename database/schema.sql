-- ============================================================
-- NoteVault Database Schema — Phase 1 (Basic Note Sharing Platform)
-- Academic Notes Sharing Platform
-- ============================================================

CREATE DATABASE IF NOT EXISTS notevault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE notevault;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT NULL,
    profile_image VARCHAR(255) DEFAULT '/images/default-avatar.png',
    joined_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Notes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000) DEFAULT '',
    pdf_path VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(255) DEFAULT '/images/default-thumbnail.png',
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    course VARCHAR(150) NOT NULL,
    teacher VARCHAR(150) DEFAULT '',
    tags VARCHAR(300) DEFAULT '',
    uploaded_by INT NOT NULL,
    downloads INT NOT NULL DEFAULT 0,
    file_size INT DEFAULT 0,
    upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notes_department (department),
    INDEX idx_notes_course (course)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sessions table (used by express-mysql-session)
-- Created automatically by the session store, kept here for reference.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- NOTE: Ratings, downloads-tracking, credit history, bookmarks,
-- reports, and admins tables are intentionally NOT part of Phase 1.
-- They are introduced in later development phases.
-- ------------------------------------------------------------
