import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyDPhzlX3lt1IUM7XH4RQof5pJmv88el1K4",
    authDomain: "dare-me1.firebaseapp.com",
    projectId: "dare-me1",
    storageBucket: "dare-me1.appspot.com",
    messagingSenderId: "883347608544",
    appId: "1:883347608544:web:bdc933aa3d83792b9ad185",
    measurementId: "G-9CM5EGYR19",
    databaseURL: "https://dare-me1-default-rtdb.europe-west1.firebasedatabase.app",
};

// ✅ Prevent Firebase from initializing multiple times
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
