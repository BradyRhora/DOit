self.addEventListener('push', function(event) {
    const data = event.data.json();

    const options = {
        body: data.body,
        icon: data.icon,
        image: data.image,
        tag: data.id
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});