document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.classList.toggle('active');
        });
    });

    // Live password strength hint on register page
    const pwInput = document.getElementById('password');
    const strengthEl = document.getElementById('passwordStrength');
    if (pwInput && strengthEl) {
        pwInput.addEventListener('input', () => {
            const val = pwInput.value;
            let score = 0;
            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
            const colors = ['#EF4444', '#EF4444', '#F59E0B', '#2563EB', '#10B981'];
            strengthEl.textContent = val.length ? labels[score] : '';
            strengthEl.style.color = colors[score];
        });
    }
});
