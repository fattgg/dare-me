import React from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';
import { auth } from '../firebaseConfig';
import { router } from 'expo-router';

export default function Challenges() {
    const handleLogout = async () => {
        try {
            if (Platform.OS === 'web') {
                const { signOut } = require('firebase/auth');
                await signOut(auth);
            } else {
                await (auth as any).signOut();
            }
            router.replace('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Challenges Screen!</Text>
            <Button title="Logout" onPress={handleLogout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});