// ==================== TOP LOADING BAR ====================
(function initLoadingBar() {
    const bar = document.createElement('div');
    bar.id = 'topLoadingBar';
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;z-index:9999;background:linear-gradient(90deg,#2563EB,#7C3AED);transition:width 0.3s ease, opacity 0.3s ease;opacity:0;';
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bar));

    function startLoading() {
        bar.style.opacity = '1';
        bar.style.width = '75%';
    }
    function finishLoading() {
        bar.style.width = '100%';
        setTimeout(() => { bar.style.opacity = '0'; bar.style.width = '0'; }, 250);
    }
    window.addEventListener('beforeunload', startLoading);
    window.addEventListener('pageshow', finishLoading);

    // Also trigger on same-origin link clicks and form submits (full page navigations)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (link && link.href && link.origin === window.location.origin && !link.target && !e.ctrlKey && !e.metaKey) {
            startLoading();
        }
    });
    document.addEventListener('submit', (e) => {
        if (!e.target.dataset.noLoadingBar) startLoading();
    });
})();

// ==================== CSRF HELPER ====================
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
}

// Wraps fetch() and automatically attaches the CSRF token header for
// state-changing requests (POST/PUT/PATCH/DELETE).
function csrfFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    options.headers = Object.assign({ 'Accept': 'application/json' }, options.headers);
    if (method !== 'GET' && method !== 'HEAD') {
        options.headers['X-CSRF-Token'] = getCsrfToken();
    }
    return fetch(url, options);
}

document.addEventListener('DOMContentLoaded', () => {
    // ==================== PROFILE DROPDOWN ====================
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileTrigger) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target)) profileDropdown.classList.remove('active');
        });
    }

    // ==================== MOBILE MENU ====================
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }
});

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info', duration = 4200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10B981"/><path d="M8 12.5l2.5 2.5L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#EF4444"/><path d="M9 9l6 6M15 9l-6 6" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#F59E0B"/><path d="M12 8v5M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2563EB"/><path d="M12 11v5M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
    `;
    container.appendChild(toast);

    const remove = () => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 250);
    };
    toast.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, duration);
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
