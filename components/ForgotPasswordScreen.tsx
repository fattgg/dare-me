// filepath: components/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import app from '../firebaseConfig';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        const auth = getAuth(app);
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Password Reset', `A reset link has been sent to ${email}`);
        } catch (error: any) {
            console.log(error); // Log the error for debugging
            handleFirebaseError(error);
        }
    };

    const handleFirebaseError = (error: any) => {
        console.log(error.code); // Log the error code for debugging
        let message = 'An error occurred. Please try again.';
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'The email address is not valid.';
                break;
            case 'auth/user-not-found':
                message = 'No account found with this email.';
                break;
            default:
                message = error.message; // Use Firebase's error message for unexpected errors
                break;
        }
        Alert.alert('Error', message);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>
            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <Button mode="contained" onPress={handlePasswordReset} style={styles.button}>
                Send Reset Link
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 10,
        backgroundColor: '#007BFF',
    },
});

export default ForgotPasswordScreen;