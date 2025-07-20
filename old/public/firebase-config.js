/* firebase-config.js */
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfIXmgq8FAXC4nQeErSCkEqn7vBbFCh_E",
  authDomain: "webchat-1185b.firebaseapp.com",
  projectId: "webchat-1185b",
  storageBucket: "webchat-1185b.firebasestorage.app",
  messagingSenderId: "278191013540",
  appId: "1:278191013540:web:124f7fd4803ad2208e3031",
  measurementId: "G-J3YX8ETG88"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// For easier access later
const auth = firebase.auth();
const db = firebase.firestore();
