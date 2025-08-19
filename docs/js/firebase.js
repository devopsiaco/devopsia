import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA0bTCMkxBeZ9RQsqWSBI92-M6fcnwGbOU",
  authDomain: "devopsia-39ea5.firebaseapp.com",
  projectId: "devopsia-39ea5",
  storageBucket: "devopsia-39ea5.firebasestorage.app",
  messagingSenderId: "789816052410",
  appId: "1:789816052410:web:241ea4bd6a5b60ba855083"
};

// Expose config globally for pages that rely on window.firebaseConfig
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
