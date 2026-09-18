// ============================================================
// FIREBASE CONFIG — fill this in with YOUR Firebase project keys
// ============================================================
// You get these values from: Firebase Console > Project Settings
// > General tab > "Your apps" > Web app > SDK setup and configuration
//
// See SETUP.md in this folder for the full step-by-step walkthrough.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyD7ig38E4hpsEi8Lvg796VBweGcGkqWLv8",
  authDomain: "neko-868fa.firebaseapp.com",
  projectId: "neko-868fa",
  storageBucket: "neko-868fa.firebasestorage.app",
  messagingSenderId: "887669127257",
  appId: "1:887669127257:web:35d7f421c2e653861c9948"
};

// Initialize Firebase (using the compat SDK loaded via <script> tags in HTML)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Internal domain used to turn usernames into fake emails Firebase Auth needs.
// Users never see this — they only ever type a username.
const FAKE_EMAIL_DOMAIN = "nekko.local";
