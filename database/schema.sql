-- ============================================================
-- NoteVault Database Schema
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
    bio VARCHAR(500) DEFAULT '',
    credit INT NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    is_banned TINYINT(1) NOT NULL DEFAULT 0,
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
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT NOT NULL DEFAULT 0,
    downloads INT NOT NULL DEFAULT 0,
    file_size INT DEFAULT 0,
    is_reported TINYINT(1) NOT NULL DEFAULT 0,
    upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    FULLTEXT INDEX idx_notes_search (title, description, tags, course, teacher),
    INDEX idx_notes_department (department),
    INDEX idx_notes_course (course)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Ratings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review VARCHAR(500) DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_note_rating (note_id, user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Downloads
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    user_id INT NOT NULL,
    download_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_note_download (note_id, user_id),
    INDEX idx_downloads_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Credit History
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    credit_change INT NOT NULL,
    balance INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_credit_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Bookmarks (favorites) - extra feature
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    note_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_note_bookmark (user_id, note_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Reports - extra feature (report note)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(300) NOT NULL,
    status ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Sessions table (used by express-mysql-session)
-- Created automatically by the session store, kept here for reference.
-- ------------------------------------------------------------
