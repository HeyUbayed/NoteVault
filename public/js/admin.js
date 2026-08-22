document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.js-ban-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            if (!confirm('Are you sure you want to change this user\'s account status?')) return;
            try {
                const res = await csrfFetch(`/admin/users/${userId}/ban`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast(data.banned ? 'User has been suspended.' : 'User has been reinstated.', 'success');
                    setTimeout(() => window.location.reload(), 800);
                }
            } catch (err) {
                showToast('Action failed.', 'error');
            }
        });
    });

    document.querySelectorAll('.js-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.userId;
            if (!confirm('This will permanently delete the user and all their notes. Continue?')) return;
            try {
                const res = await csrfFetch(`/admin/users/${userId}/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('User deleted.', 'success');
                    btn.closest('tr').remove();
                }
            } catch (err) {
                showToast('Action failed.', 'error');
            }
        });
    });

    document.querySelectorAll('.js-delete-note').forEach(btn => {
        btn.addEventListener('click', async () => {
            const noteId = btn.dataset.noteId;
            if (!confirm('Permanently delete this note?')) return;
            try {
                const res = await csrfFetch(`/admin/notes/${noteId}/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('Note deleted.', 'success');
                    btn.closest('tr').remove();
                }
            } catch (err) {
                showToast('Action failed.', 'error');
            }
        });
    });

    document.querySelectorAll('.js-delete-review').forEach(btn => {
        btn.addEventListener('click', async () => {
            const reviewId = btn.dataset.reviewId;
            if (!confirm('Permanently delete this review?')) return;
            try {
                const res = await csrfFetch(`/admin/reviews/${reviewId}/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('Review deleted.', 'success');
                    btn.closest('tr').remove();
                }
            } catch (err) {
                showToast('Action failed.', 'error');
            }
        });
    });

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        let t;
        userSearchInput.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(() => userSearchInput.closest('form').submit(), 500);
        });
    }
});
