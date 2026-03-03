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
