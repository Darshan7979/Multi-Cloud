// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBevRw_Os--qfl3z5fdg5DDPnnFuEA9LTg",
    authDomain: "campus-cloud-9a88c.firebaseapp.com",
    projectId: "campus-cloud-9a88c",
    storageBucket: "campus-cloud-9a88c.firebasestorage.app",
    messagingSenderId: "1029722549186",
    appId: "1:1029722549186:web:1445d5974dcbb28d90845b",
    measurementId: "G-Z6CV6RCRBY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();

// ── FCM Push Notifications ───────────────────────────────────────────────────
// VAPID key: Firebase Console → Project Settings → Cloud Messaging
//            → Web Push certificates → Generate key pair → copy the Key pair value
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

window.initFCM = async function(apiBase, getAuthToken) {
    try {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
        if (VAPID_KEY === "YOUR_VAPID_KEY_HERE") {
            console.warn("[FCM] VAPID key not set. Open firebase-config.js and replace YOUR_VAPID_KEY_HERE.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.log("[FCM] Notification permission denied");
            return null;
        }

        const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
        const messaging = firebase.messaging();
        const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

        if (!token) return null;

        // Save token to backend
        const idToken = await getAuthToken();
        await fetch(apiBase + "/auth/fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
            body: JSON.stringify({ token }),
        });

        console.log("[FCM] Device registered for push notifications");
        return token;
    } catch (err) {
        console.warn("[FCM] Init error:", err.message);
        return null;
    }
};