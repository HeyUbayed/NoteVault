const path = require('path');
const fs = require('fs');
const Note = require('../models/Note');

exports.browse = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const { rows, count } = await Note.list({ page, limit: 12 });

        res.render('browse', {
            title: 'Browse Notes',
            notes: rows,
            totalCount: count,
            currentPage: page,
            totalPages: Math.max(Math.ceil(count / 12), 1)
        });
    } catch (err) {
        next(err);
    }
};

exports.details = async (req, res, next) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).render('404', { title: 'Note Not Found' });
        }

        res.render('note-details', {
            title: note.title,
            note,
            justUploaded: req.query.uploaded === '1'
        });
    } catch (err) {
        next(err);
    }
};

exports.download = async (req, res, next) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).render('404', { title: 'Note Not Found' });
        }

        await Note.incrementDownloads(noteId);

        const filePath = path.join(__dirname, '..', 'public', note.pdf_path);
        if (!fs.existsSync(filePath)) {
            return res.status(404).render('error', {
                title: 'File Not Found',
                message: 'This file is missing from storage. Please contact support.'
            });
        }

        res.download(filePath, `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (err) {
        next(err);
    }
};
