document.addEventListener('DOMContentLoaded', () => {
    // ---------- Star rating input ----------
    const starInput = document.getElementById('starInput');
    let selectedRating = starInput ? parseInt(starInput.dataset.current) || 0 : 0;

    if (starInput) {
        const stars = starInput.querySelectorAll('.star');
        paintStars(selectedRating);

        stars.forEach(star => {
            star.addEventListener('mouseenter', () => paintStars(parseInt(star.dataset.value), true));
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value);
                paintStars(selectedRating);
            });
        });
        starInput.addEventListener('mouseleave', () => paintStars(selectedRating));

        function paintStars(count, hover = false) {
            stars.forEach(s => {
                const val = parseInt(s.dataset.value);
                s.classList.toggle('filled', val <= count && !hover);
                s.classList.toggle('hovered', val <= count && hover);
            });
        }
    }

    const ratingForm = document.getElementById('ratingForm');
    if (ratingForm) {
        ratingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedRating) {
                showToast('Please select a star rating.', 'error');
                return;
            }
            const noteId = ratingForm.dataset.noteId;
            const review = ratingForm.querySelector('textarea[name="review"]').value;
            const btn = ratingForm.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const res = await csrfFetch(`/notes/${noteId}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: selectedRating, review })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast(data.message, 'error');
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Something went wrong. Please try again.', 'error');
                btn.disabled = false;
            }
        });
    }

    // ---------- Download flow ----------
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const noteId = downloadBtn.dataset.noteId;
            const alreadyDownloaded = downloadBtn.dataset.downloaded === 'true';

            if (!alreadyDownloaded) {
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = 'Checking credits...';
                try {
                    const check = await csrfFetch(`/notes/${noteId}/download-check`);
                    if (check.status === 402) {
                        openModal('insufficientCreditModal');
                        downloadBtn.disabled = false;
                        downloadBtn.innerHTML = originalDownloadLabel();
                        return;
                    }
                } catch (err) { /* fall through to real navigation below */ }
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalDownloadLabel();
            }
            window.location.href = `/notes/${noteId}/download`;
        });
    }

    function originalDownloadLabel() {
        return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3v13m0 0l-4.5-4.5M12 16l4.5-4.5M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Download Note`;
    }

    // ---------- Bookmark toggle ----------
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', async () => {
            const noteId = bookmarkBtn.dataset.noteId;
            try {
                const res = await csrfFetch(`/notes/${noteId}/bookmark`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    bookmarkBtn.classList.toggle('active', data.bookmarked);
                    showToast(data.bookmarked ? 'Saved to your bookmarks.' : 'Removed from bookmarks.', 'success');
                }
            } catch (err) {
                showToast('Could not update bookmark.', 'error');
            }
        });
    }

    // ---------- Report note ----------
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const noteId = reportForm.dataset.noteId;
            const reason = reportForm.querySelector('textarea[name="reason"]').value.trim();
            if (!reason) { showToast('Please describe the issue.', 'error'); return; }

            try {
                const res = await csrfFetch(`/notes/${noteId}/report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason })
                });
                const data = await res.json();
                showToast(data.message, data.success ? 'success' : 'error');
                if (data.success) closeModal('reportModal');
            } catch (err) {
                showToast('Something went wrong.', 'error');
            }
        });
    }

    // ---------- Delete note (admin, while browsing the public site) ----------
    const adminDeleteBtn = document.getElementById('adminDeleteBtn');
    if (adminDeleteBtn) {
        adminDeleteBtn.addEventListener('click', async () => {
            if (!confirm('Permanently delete this note?')) return;
            const noteId = adminDeleteBtn.dataset.noteId;
            adminDeleteBtn.disabled = true;
            try {
                const res = await csrfFetch(`/admin/notes/${noteId}/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('Note deleted.', 'success');
                    setTimeout(() => { window.location.href = '/browse'; }, 700);
                } else {
                    showToast(data.message || 'Could not delete this note.', 'error');
                    adminDeleteBtn.disabled = false;
                }
            } catch (err) {
                showToast('Something went wrong.', 'error');
                adminDeleteBtn.disabled = false;
            }
        });
    }

    // ---------- Delete note (uploader, their own note) ----------
    const ownerDeleteBtn = document.getElementById('ownerDeleteBtn');
    if (ownerDeleteBtn) {
        ownerDeleteBtn.addEventListener('click', async () => {
            if (!confirm('Permanently delete your note? This cannot be undone.')) return;
            const noteId = ownerDeleteBtn.dataset.noteId;
            ownerDeleteBtn.disabled = true;
            try {
                const res = await csrfFetch(`/notes/${noteId}/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Note deleted.', 'success');
                    setTimeout(() => { window.location.href = '/dashboard'; }, 700);
                } else {
                    showToast(data.message || 'Could not delete this note.', 'error');
                    ownerDeleteBtn.disabled = false;
                }
            } catch (err) {
                showToast('Something went wrong.', 'error');
                ownerDeleteBtn.disabled = false;
            }
        });
    }
});
