import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqiKgh9QJCWuQBgeD06s7yQPQ1RBImYm0",
  authDomain: "speakup-10839.firebaseapp.com",
  projectId: "speakup-10839",
  storageBucket: "speakup-10839.firebasestorage.app",
  messagingSenderId: "477692474938",
  appId: "1:477692474938:web:caa0ff87248dc6607e6703",
  measurementId: "G-J7BHX1JDC4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
