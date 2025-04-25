import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: "AIzaSyDPhzlX3lt1IUM7XH4RQof5pJmv88el1K4",
    authDomain: "dare-me1.firebaseapp.com",
    projectId: "dare-me1",
    storageBucket: "dare-me1",
    messagingSenderId: "883347608544",
    appId: "1:883347608544:web:bdc933aa3d83792b9ad185",
    measurementId: "G-9CM5EGYR19",
    databaseURL: "https://dare-me1-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Realtime Database
const db = getDatabase(app);

// Initialize Auth (Platform-aware)
let auth;

if (Platform.OS === 'web') {
    const { getAuth, browserLocalPersistence, setPersistence } = require('firebase/auth');
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence);
} else {
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
}

export { app, db, auth };
