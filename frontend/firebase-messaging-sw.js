importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBevRw_Os--qfl3z5fdg5DDPnnFuEA9LTg",
    authDomain: "campus-cloud-9a88c.firebaseapp.com",
    projectId: "campus-cloud-9a88c",
    storageBucket: "campus-cloud-9a88c.firebasestorage.app",
    messagingSenderId: "1029722549186",
    appId: "1:1029722549186:web:1445d5974dcbb28d90845b",
});

const messaging = firebase.messaging();

// Handle push notifications when the app is in the background or closed
messaging.onBackgroundMessage(function(payload) {
    const title = payload.notification && payload.notification.title || "CloudFusion";
    const body = payload.notification && payload.notification.body || "File uploaded successfully";
    self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
    });
});