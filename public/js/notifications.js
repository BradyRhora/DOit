function setNotificationButtonState(state) {
    let icon = $('#notification-allowed-icon');
    let button = $('#allow-push-notifications');
    
    button.attr('data-toggle', 'tooltip');
    button.tooltip({trigger: 'hover'});

    if (state === 'granted') {
        icon.removeClass('bi-bell').addClass('bi-bell-fill');
        button.attr('data-bs-original-title', 'Use your browser settings to disable notifications.');
    } else if (state === 'denied') {
        icon.removeClass('bi-bell-fill').addClass('bi-bell-slash-fill');
        button.attr('data-bs-original-title', 'Subscribe to notifications.');
    } else {
        icon.removeClass('bi-bell-slash-fill').addClass('bi-bell');
        button.attr('data-bs-original-title', 'Subscribe to notifications.');
    }
}

function allowPushNotifications() {
    if ('serviceWorker' in navigator == false) {
        alert('Your browser does not support push notifications.');
        return;
    }

    if (Notification.permission != 'granted') {
        Notification.requestPermission().then(function(result) {
            if (result === 'granted') { // User has chosen to receive notifications
                navigator.serviceWorker.register('/doit-service-worker.js').then(function(registration) {
                    navigator.serviceWorker.ready.then(function(registration) {
                        
                        // From https://gist.github.com/Klerith
                        function urlBase64ToUint8Array(base64String) {
                            var padding = '='.repeat((4 - base64String.length % 4) % 4);
                            var base64 = (base64String + padding)
                                .replace(/\-/g, '+')
                                .replace(/_/g, '/');
                        
                            var rawData = window.atob(base64);
                            var outputArray = new Uint8Array(rawData.length);
                        
                            for (var i = 0; i < rawData.length; ++i) {
                                outputArray[i] = rawData.charCodeAt(i);
                            }
                            return outputArray;
                        }

                        registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                        }).then(function(subscription) {
                            console.log('[DEBUG] Subscribing');
                            console.log(subscription)
                            $.ajax({
                                url: '/subscribe',
                                type: 'POST',
                                data: JSON.stringify(subscription), 
                                contentType: 'application/json',
                                success: function(data) {
                                    if (data == "OK") {
                                        alert('You will now receive notifications.');
                                    }
                                },
                                error: function(error) {
                                    console.error(error);
                                }
                            });
                        });
                    });
                });
            }
            setNotificationButtonState(result);
        });
    }
}

function ensureServiceWorker() {
    if (Notification.permission != 'granted')
        return;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('/doit-service-worker.js').then(function(registration) {
            if (!registration) {
                navigator.serviceWorker.register('/doit-service-worker.js').catch(function(error) {
                    console.error('[ERROR] Service worker registration failed: ' + error);
                });
            }
        }).catch(function(error) {
            console.error('[ERROR] Failed to check service worker registration: ' + error);
        });
    }
}

$(document).ready(function() {
    setNotificationButtonState(Notification.permission);
    ensureServiceWorker();
});