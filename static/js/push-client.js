// LIUGONG PORTAL PUSH CLIENT
// Registers service worker and manages push subscriptions

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function initPushNotification() {
    console.log('[Push Client] Initializing push notification client...');
    console.log('[Push Diagnostics] Secure Context (HTTPS):', window.isSecureContext);
    console.log('[Push Diagnostics] Service Worker support:', 'serviceWorker' in navigator);
    console.log('[Push Diagnostics] PushManager support:', 'PushManager' in window);
    console.log('[Push Diagnostics] Notification API support:', typeof Notification !== 'undefined');

    // 1. Check secure context and browser support
    if (!window.isSecureContext) {
        console.warn('[Push Client] Web Push notifications require a secure context (HTTPS). Modern mobile browsers (Chrome on Android, Safari on iOS) will NOT prompt for notifications over insecure HTTP connections (except localhost/127.0.0.1).');
        return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push Client] Push notifications are not supported in this browser.');
        return;
    }

    if (typeof Notification === 'undefined') {
        console.warn('[Push Client] Notification API is not defined. (Note: iOS Safari only supports Web Push when the site is running as a standalone PWA added to the Home Screen).');
        return;
    }

    try {
        // 2. Register Service Worker
        console.log('[Push Client] Registering service worker...');
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });
        console.log('[Push Client] Service Worker registered with scope:', registration.scope);

        // 3. Check current notification permission
        if (Notification.permission === 'default') {
            console.log('[Push Client] Notification permission is default. Asking user...');
            // Wait for user to grant/deny permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push Client] Notification permission was denied by user.');
                return;
            }
        } else if (Notification.permission === 'denied') {
            console.log('[Push Client] Notification permission is denied by user or browser settings.');
            return;
        }

        // 4. Subscribe user if permission is granted
        console.log('[Push Client] Subscribing user...');
        
        // Fetch VAPID public key from backend
        const keyResponse = await fetch('/vapid-public-key');
        if (!keyResponse.ok) {
            throw new Error('Failed to fetch VAPID public key from server');
        }
        const keyData = await keyResponse.json();
        const vapidPublicKey = keyData.public_key;
        if (!vapidPublicKey) {
            throw new Error('VAPID public key kosong. Periksa koneksi database di server.');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to push service
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        console.log('[Push Client] User subscribed successfully:', JSON.stringify(subscription));

        // 5. Send subscription info to backend
        const saveResponse = await fetch('/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        });

        if (saveResponse.ok) {
            console.log('[Push Client] Subscription successfully saved on server.');
        } else {
            console.error('[Push Client] Failed to save subscription on server.');
            if (window.showToast) {
                window.showToast('Gagal menyimpan pendaftaran notifikasi di server.', 'danger');
            }
        }

    } catch (error) {
        console.warn('[Push Client] Push notification initialization skipped:', error);
    }
    }
}

// Automatically initialize on load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initPushNotification();
} else {
    document.addEventListener('DOMContentLoaded', initPushNotification);
}
