// ============================================================
// Global JavaScript for User Management System
// ============================================================

// Close offcanvas sidebar
function closeOffcanvas() {
    const el = document.getElementById('sidebarOverlayMenu');
    if (el) {
        const instance = bootstrap.Offcanvas.getInstance(el);
        if (instance) instance.hide();
    }
}

// Auto-close sidebar nav links on click
document.addEventListener('DOMContentLoaded', function () {
    const sidebarLinks = document.querySelectorAll('#sidebarNavLinks .nav-link');
    sidebarLinks.forEach(function (link) {
        link.addEventListener('click', closeOffcanvas);
    });

    // Fix mobile DataTable scroll boundary
    function fixMobileOverflow() {
        if (window.innerWidth <= 767) {
            document.querySelectorAll(
                '.dataTables_wrapper, .dataTables_scroll, .dataTables_scrollBody, .dataTables_scrollHead, .table-responsive'
            ).forEach(function (el) {
                el.style.overflow = 'visible';
                el.style.overflowX = 'visible';
                el.style.overflowY = 'visible';
                el.style.height = 'auto';
                el.style.maxHeight = 'none';
            });
        }
    }

    // Observe tab switching to re-apply fix after show
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(function (btn) {
        btn.addEventListener('shown.bs.tab', fixMobileOverflow);
    });

    // Initial apply after short delay (wait for DataTable init)
    setTimeout(fixMobileOverflow, 400);
});

// Change Password AJAX
function submitChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current_password').value;
    const newPassword     = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const errorDiv        = document.getElementById('changePasswordError');

    errorDiv.classList.add('d-none');
    errorDiv.textContent = '';

    if (newPassword !== confirmPassword) {
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Konfirmasi password baru tidak cocok.';
        return;
    }
    if (newPassword.length < 6) {
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Password baru minimal harus 6 karakter.';
        return;
    }

    const btn = document.getElementById('btnSavePassword');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Menyimpan...';

    fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('Password berhasil diubah!');
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            document.getElementById('formChangePassword').reset();
        } else {
            errorDiv.classList.remove('d-none');
            errorDiv.textContent = data.error || 'Terjadi kesalahan pada server.';
        }
    })
    .catch(() => {
        errorDiv.classList.remove('d-none');
        errorDiv.textContent = 'Koneksi gagal. Periksa jaringan Anda.';
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Simpan Password';
    });
}

// Force Logout User Function
function forceLogoutUser(userId, username) {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan paksa (Force Logout) user '${username}' dari seluruh perangkat?`)) {
        return;
    }
    
    fetch('/user-management/api/user/force_logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert(data.message || `Berhasil mengeluarkan paksa user ${username}.`);
            location.reload();
        } else {
            alert('Gagal: ' + (data.error || 'Terjadi kesalahan pada server.'));
        }
    })
    .catch(err => alert('Koneksi gagal. Periksa jaringan Anda.'));
}

// Terminate Specific Session Function
function terminateSession(sessionId) {
    if (!confirm('Apakah Anda yakin ingin menghentikan sesi aktif ini?')) {
        return;
    }

    fetch('/user-management/api/session/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ session_id: sessionId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert(data.message || 'Sesi berhasil dihentikan.');
            location.reload();
        } else {
            alert('Gagal: ' + (data.error || 'Terjadi kesalahan pada server.'));
        }
    })
    .catch(err => alert('Koneksi gagal. Periksa jaringan Anda.'));
}

