const { uploadToCloudinary } = require('../config/cloudinary');
const Note = require('../models/Note');

exports.renderUploadPage = (req, res) => {
  res.render('upload', { error: null });
};

exports.handleFileUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.pdfFile) {
      return res.status(400).render('upload', { error: 'Please select a PDF file to upload.' });
    }

    const pdfFile = req.files.pdfFile[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // 1. Upload PDF to Cloudinary as raw file type
    const pdfResult = await uploadToCloudinary(
      pdfFile.buffer,
      'notevault/pdfs',
      'raw'
    );

    // 2. Upload Thumbnail to Cloudinary (or use default image)
    let thumbnailUrl = '/images/default-thumbnail.png';
    if (thumbnailFile) {
      const thumbResult = await uploadToCloudinary(
        thumbnailFile.buffer,
        'notevault/thumbnails',
        'image'
      );
      thumbnailUrl = thumbResult.secure_url;
    }

    // 3. Save to Database using Cloudinary URLs
    const newNote = await Note.create({
      title: req.body.title,
      description: req.body.description,
      subject: req.body.subject,
      courseCode: req.body.courseCode,
      fileUrl: pdfResult.secure_url,
      thumbnailUrl: thumbnailUrl,
      userId: req.session.user.id
    });

    res.redirect(`/notes/${newNote.id}`);
  } catch (error) {
    console.error('Upload Controller Error:', error);
    res.status(500).render('upload', { error: 'Upload failed. Please try again.' });
  }
};
