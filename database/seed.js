require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
    console.log('Seeding NoteVault database...');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@notevault.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    const [existingAdmin] = await db.query(`SELECT id FROM admins WHERE email = ?`, [adminEmail]);
    if (existingAdmin.length === 0) {
        const hashed = await bcrypt.hash(adminPassword, 12);
        await db.query(`INSERT INTO admins (email, password) VALUES (?, ?)`, [adminEmail, hashed]);
        console.log(`Admin account created: ${adminEmail} / ${adminPassword}`);
    } else {
        console.log('Admin account already exists, skipping.');
    }

    const [existingUsers] = await db.query(`SELECT COUNT(*) AS count FROM users`);
    if (existingUsers[0].count === 0) {
        const samplePassword = await bcrypt.hash('Password@123', 12);
        const sampleUsers = [
            ['Tamim Ahmed', 'tamim@gmail.com', 'CSE'],
            ['Rauha Uddin', 'rauha@gmail.com', 'CSE'],
            ['Maliha Tasnim Chowdhury', 'maliha@gmail.com', 'EEE'],
            ['Aloy Deb', 'aloy@gmail.com', 'BBA']
        ];

        const userIds = [];
        for (const [name, email, department] of sampleUsers) {
            const [result] = await db.query(
                `INSERT INTO users (name, email, password, department, credit) VALUES (?, ?, ?, ?, ?)`,
                [name, email, samplePassword, department, 10]
            );
            userIds.push(result.insertId);
        }

        const sampleNotes = [
            {
                title: 'Data Structures Midterm Notes',
                description: 'Comprehensive notes covering arrays, linked lists, stacks, queues, and trees with solved examples.',
                department: 'CSE', semester: '3rd Semester', course: 'Data Structures', teacher: 'Rishad Amin Pulok',
                tags: 'data structures, arrays, linked list, trees', uploadedBy: userIds[0]
            },
            {
                title: 'Algorithms Complete Guide',
                description: 'Sorting, searching, dynamic programming, and greedy algorithms explained with diagrams.',
                department: 'CSE', semester: '4th Semester', course: 'Algorithms', teacher: 'Ruhul Amin',
                tags: 'algorithms, dp, greedy, sorting', uploadedBy: userIds[1]
            },
            {
                title: 'Digital Logic Design Handbook',
                description: 'Boolean algebra, logic gates, K-maps, and sequential circuits.',
                department: 'EEE', semester: '2nd Semester', course: 'Digital Logic Design', teacher: 'Golam Mostofa Naeem',
                tags: 'digital logic, boolean algebra, k-map', uploadedBy: userIds[2]
            },
            {
                title: 'Principles of Marketing Notes',
                description: 'Core marketing concepts, 4Ps, STP framework, and case studies.',
                department: 'BBA', semester: '1st Semester', course: 'Principles of Marketing', teacher: 'Farhana Akter',
                tags: 'marketing, 4ps, stp', uploadedBy: userIds[3]
            },
            {
                title: 'Database Systems Lab Manual',
                description: 'SQL queries, normalization, ER diagrams, and transaction management.',
                department: 'CSE', semester: '3rd Semester', course: 'Database Systems', teacher: 'Khudeja Khanom Anwara',
                tags: 'database, sql, normalization, er diagram', uploadedBy: userIds[0]
            },
            {
                title: 'Operating Systems Concepts',
                description: 'Process scheduling, memory management, deadlocks, and file systems.',
                department: 'CSE', semester: '4th Semester', course: 'Operating Systems', teacher: 'Nasif Istiak Remon',
                tags: 'os, scheduling, deadlock, memory', uploadedBy: userIds[1]
            }
        ];

        for (const n of sampleNotes) {
            await db.query(
                `INSERT INTO notes (title, description, pdf_path, thumbnail, department, semester, course, teacher, tags, uploaded_by, downloads, average_rating, rating_count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    n.title, n.description, '/uploads/pdfs/sample-placeholder.pdf', '/images/default-thumbnail.png',
                    n.department, n.semester, n.course, n.teacher, n.tags, n.uploadedBy,
                    Math.floor(Math.random() * 50), (Math.random() * 2 + 3).toFixed(2), Math.floor(Math.random() * 20) + 1
                ]
            );
        }
        console.log('Sample users and notes created.');
        console.log('Sample login: ayesha@uiu.ac.bd / Password@123');
    } else {
        console.log('Users already exist, skipping sample data.');
    }

    console.log('Seeding complete.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
