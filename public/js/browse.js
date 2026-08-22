document.addEventListener('DOMContentLoaded', () => {
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', () => filterForm.submit());
        });
    }

    // Bookmark toggle on note cards (browse/search/dashboard grids)
    document.querySelectorAll('.note-card-bookmark').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const noteId = btn.dataset.noteId;
            try {
                const res = await csrfFetch(`/notes/${noteId}/bookmark`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    btn.classList.toggle('active', data.bookmarked);
                    showToast(data.bookmarked ? 'Saved to your bookmarks.' : 'Removed from bookmarks.', 'success');
                } else if (res.status === 401) {
                    window.location.href = '/login';
                }
            } catch (err) {
                showToast('Could not update bookmark.', 'error');
            }
        });
    });
});
