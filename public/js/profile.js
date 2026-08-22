document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Avatar upload preview + auto-submit
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', () => {
            if (avatarInput.files[0]) {
                document.getElementById('avatarForm').submit();
            }
        });
    }

    // Password change
    const pwForm = document.getElementById('passwordChangeForm');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(pwForm);
            const body = Object.fromEntries(formData.entries());
            const btn = pwForm.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const res = await csrfFetch('/profile/password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                showToast(data.message, data.success ? 'success' : 'error');
                if (data.success) pwForm.reset();
            } catch (err) {
                showToast('Something went wrong.', 'error');
            }
            btn.disabled = false;
        });
    }
});
