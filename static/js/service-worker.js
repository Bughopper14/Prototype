// LIUGONG PORTAL SERVICE WORKER
// Handles push notifications and background execution

self.addEventListener('install', function(event) {
    // Force immediate activation
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// LISTEN FOR PUSH EVENT
self.addEventListener('push', function(event) {
    if (!event.data) {
        console.log('[Service Worker] Push event received but had no data.');
        return;
    }

    try {
        const payload = event.data.json();
        const title = payload.title || "Notification";
        const options = {
            body: payload.body || "",
            icon: payload.icon || "/static/img/logo_192.png",
            badge: "/static/img/logo_192.png",
            data: {
                url: payload.url || "/"
            },
            vibrate: [100, 50, 100],
            actions: [
                { action: 'open', title: 'Buka Aplikasi' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (e) {
        console.error('[Service Worker] Error parsing push data:', e);
        // Fallback text notification
        const rawText = event.data.text();
        event.waitUntil(
            self.registration.showNotification("Document Approval Update", {
                body: rawText,
                icon: "/static/img/logo_192.png",
                data: { url: "/doc-approval/" }
            })
        );
    }
});

// LISTEN FOR NOTIFICATION CLICK EVENT
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    let targetUrl = "/";
    if (event.notification.data && event.notification.data.url) {
        targetUrl = event.notification.data.url;
    }

    // Force relative links to be absolute for comparison
    const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Check if there is already a window open with this app/url
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === absoluteTargetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
