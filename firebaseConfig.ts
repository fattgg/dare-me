import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: "AIzaSyDPhzlX3lt1IUM7XH4RQof5pJmv88el1K4",
    authDomain: "dare-me1.firebaseapp.com",
    projectId: "dare-me1",
    storageBucket: "dare-me1.appspot.com", // Fixed: added .appspot.com
    messagingSenderId: "883347608544",
    appId: "1:883347608544:web:bdc933aa3d83792b9ad185",
    measurementId: "G-9CM5EGYR19",
    databaseURL: "https://dare-me1-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase app only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Realtime Database
const db = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Platform-specific auth initialization
let auth;

if (Platform.OS === 'web') {
    // Web-specific imports and initialization
    const { getAuth, browserLocalPersistence, setPersistence } = require('firebase/auth');
    auth = getAuth(app);

    // Set persistence for web
    setPersistence(auth, browserLocalPersistence)
        .then(() => {
            console.log('Using browser local persistence for Firebase Auth');
        })
        .catch((error) => {
            console.error("Error setting auth persistence for web:", error);
        });
} else {
    // React Native specific imports and initialization
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    console.log('Using AsyncStorage for Firebase Auth persistence');
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
}

export { app, auth, db, storage };