// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfIXmgq8FAXC4nQeErSCkEqn7vBbFCh_E",
  authDomain: "webchat-1185b.firebaseapp.com",
  databaseURL: "https://webchat-1185b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "webchat-1185b",
  storageBucket: "webchat-1185b.firebasestorage.app",
  messagingSenderId: "278191013540",
  appId: "1:278191013540:web:124f7fd4803ad2208e3031",
  measurementId: "G-J3YX8ETG88"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);