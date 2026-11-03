/**
 * LiuGong Finance Indonesia - Universal Session & Inactivity Watcher
 * -------------------------------------------------------------------
 * Monitors user interaction (mouse, keyboard, touch, scroll) and:
 * 1. Synchronizes activity with MySQL session_logs via periodic heartbeat.
 * 2. Enforces maximum session lifetime and idle inactivity logout.
 * 3. Shows warning dialog before logout with option to extend session.
 * 4. Intercepts 401 Session Timeout responses from APIs.
 */
(function() {
    'use strict';

    // Default configuration (will be updated dynamically from server)
    let INACTIVITY_LIMIT_MS = 15 * 60 * 1000;   // 15 minutes default
    let MAX_LIFETIME_MS     = 120 * 60 * 1000;  // 120 minutes default
    const WARNING_BEFORE_MS = 60 * 1000;         // 60 seconds warning
    const HEARTBEAT_INTERVAL_MS = 60 * 1000;     // Send heartbeat at most once per 60s of active use

    let lastActivityTime = Date.now();
    let sessionStartTime = Date.now();
    let lastHeartbeatTime = Date.now();
    let isWarningShown = false;
    let warningModalEl = null;

    // Detect appropriate heartbeat endpoint
    function getHeartbeatUrl() {
        if (window.location.pathname.startsWith('/crm-dashboard')) {
            return '/crm-dashboard/api/v1/heartbeat';
        }
        if (window.location.pathname.startsWith('/user-management')) {
            return '/user-management/api/heartbeat';
        }
        return '/api/heartbeat';
    }

    // Ping server to refresh session last_activity and get exact timeout settings
    function sendHeartbeat(force = false) {
        const now = Date.now();
        if (!force && (now - lastHeartbeatTime < HEARTBEAT_INTERVAL_MS)) {
            return;
        }
        lastHeartbeatTime = now;

        fetch(getHeartbeatUrl(), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.status === 401) {
                // Session expired on server
                return response.json().then(data => {
                    handleSessionExpired(data.error || 'Sesi telah berakhir.');
                });
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;
            if (data.isAdmin || data.inactivity_timeout_minutes === null || data.inactivity_timeout_minutes === 0) {
                INACTIVITY_LIMIT_MS = Infinity;
                MAX_LIFETIME_MS = Infinity;
            } else if (data.inactivity_timeout_minutes > 0) {
                INACTIVITY_LIMIT_MS = data.inactivity_timeout_minutes * 60 * 1000;
                if (data.max_lifetime_minutes) {
                    MAX_LIFETIME_MS = data.max_lifetime_minutes * 60 * 1000;
                }
            }
        })
        .catch(err => {
            // Network issue or offline - will retry next cycle
            console.debug('[SessionWatcher] Heartbeat check:', err);
        });
    }

    // Handle user interaction
    function onUserInteraction() {
        lastActivityTime = Date.now();
        if (isWarningShown) {
            hideWarningModal();
        }
        sendHeartbeat(false);
    }

    // Build & Show Warning Modal
    function showWarningModal(secondsRemaining) {
        if (isWarningShown) {
            const countdownEl = document.getElementById('sessionCountdownVal');
            if (countdownEl) countdownEl.textContent = secondsRemaining;
            return;
        }
        isWarningShown = true;

        if (!warningModalEl) {
            warningModalEl = document.createElement('div');
            warningModalEl.id = 'sessionWarningModalContainer';
            warningModalEl.innerHTML = `
                <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,18,45,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);font-family:'Plus Jakarta Sans',sans-serif;">
                    <div style="background:#ffffff;border-radius:18px;max-width:440px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;border:1px solid #e2e8f0;text-align:center;padding:32px 24px;">
                        <div style="width:64px;height:64px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#d97706;font-size:30px;">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <h3 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">Peringatan Sesi Berakhir</h3>
                        <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.5;">
                            Anda tidak melakukan pergerakan selama beberapa saat. Demi keamanan, sesi Anda akan otomatis keluar dalam:
                        </p>
                        <div style="display:inline-block;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:10px 24px;margin-bottom:24px;">
                            <span id="sessionCountdownVal" style="font-size:32px;font-weight:800;color:#ea580c;letter-spacing:1px;">${secondsRemaining}</span>
                            <span style="font-size:14px;color:#64748b;font-weight:600;margin-left:4px;">detik</span>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:center;">
                            <button id="btnExtendSession" style="flex:1;background:#003A8C;color:#ffffff;border:none;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px;transition:background 0.2s;">
                                <i class="fas fa-check-circle" style="margin-right:6px;"></i>Tetap Masuk
                            </button>
                            <a href="/logout" style="flex:1;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:12px 20px;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px;display:flex;align-items:center;justify-content:center;">
                                Keluar Sekarang
                            </a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(warningModalEl);

            document.getElementById('btnExtendSession').addEventListener('click', function() {
                lastActivityTime = Date.now();
                hideWarningModal();
                sendHeartbeat(true);
            });
        } else {
            warningModalEl.style.display = 'block';
            const countdownEl = document.getElementById('sessionCountdownVal');
            if (countdownEl) countdownEl.textContent = secondsRemaining;
        }
    }

    function hideWarningModal() {
        isWarningShown = false;
        if (warningModalEl) {
            warningModalEl.style.display = 'none';
        }
    }

    // Redirect to login on session expiration
    function handleSessionExpired(reason) {
        hideWarningModal();
        const nextUrl = encodeURIComponent(window.location.pathname + window.location.search);
        const encodedReason = encodeURIComponent(reason || 'Sesi telah berakhir.');
        window.location.href = `/login?timeout=1&reason=${encodedReason}&next=${nextUrl}`;
    }

    // Periodic check loop (every 1 second)
    function checkSessionStatus() {
        const now = Date.now();
        const idleElapsed = now - lastActivityTime;
        const totalSessionElapsed = now - sessionStartTime;

        // 1. Check Max Session Lifetime
        if (totalSessionElapsed >= MAX_LIFETIME_MS) {
            handleSessionExpired('Batas waktu maksimal login telah berakhir.');
            return;
        }

        // 2. Check Inactivity Limit
        if (idleElapsed >= INACTIVITY_LIMIT_MS) {
            handleSessionExpired('Sesi telah berakhir karena tidak ada aktivitas/pergerakan.');
            return;
        }

        // 3. Check Warning threshold
        const remainingUntilIdle = INACTIVITY_LIMIT_MS - idleElapsed;
        if (remainingUntilIdle <= WARNING_BEFORE_MS && remainingUntilIdle > 0) {
            const secondsLeft = Math.ceil(remainingUntilIdle / 1000);
            showWarningModal(secondsLeft);
        } else if (isWarningShown && remainingUntilIdle > WARNING_BEFORE_MS) {
            hideWarningModal();
        }
    }

    // Intercept window fetch to detect 401 Session Timeout globally
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            if (response.status === 401) {
                const clone = response.clone();
                clone.json().then(data => {
                    if (data && (data.code === 'SESSION_TIMEOUT' || data.code === 'NO_SESSION')) {
                        handleSessionExpired(data.error);
                    }
                }).catch(() => {});
            }
            return response;
        });
    };

    // Attach user activity listeners
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    activityEvents.forEach(evtName => {
        window.addEventListener(evtName, onUserInteraction, { passive: true });
    });

    // Start timer and initial heartbeat
    document.addEventListener('DOMContentLoaded', function() {
        sendHeartbeat(true);
        setInterval(checkSessionStatus, 1000);
    });

    // Also run immediately in case DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        sendHeartbeat(true);
        setInterval(checkSessionStatus, 1000);
    }
})();
