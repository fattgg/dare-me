import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { app, auth } from '../firebaseConfig';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [request, response, promptAsync] = useIdTokenAuthRequest({
        clientId: '883347608544-9qfpfo449nh7niobqhu4mps0s4lthj53.apps.googleusercontent.com',
        redirectUri: 'https://auth.expo.io/@fatlindosmanii/DareMe',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
                .then(() => {
                    Alert.alert('Success', 'Logged in with Google!');
                })
                .catch((error) => {
                    Alert.alert('Error', error.message);
                });
        }
    }, [response]);

    const handleLogin = async () => {
        const auth = getAuth(app);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            Alert.alert('Login Successful', `Welcome back, ${userCredential.user.email}!`);
            router.replace('../challenges');
        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
        }
    };

    const handleSignUp = () => {
        router.push('../signup');
    };

    const handleForgotPassword = () => {
        router.push('../forgot-password');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back!</Text>
            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />
            <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
            <Button mode="contained" onPress={handleLogin} style={styles.button}>
                Login
            </Button>
            <Button mode="outlined" onPress={handleSignUp} style={styles.signUpButton}>
                Sign Up
            </Button>
            <Button
                mode="contained"
                onPress={() => promptAsync()}
                disabled={!request}
                style={styles.googleButton}
            >
                Sign in with Google
            </Button>
        </View>
    );
}

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
    forgotPassword: {
        textAlign: 'right',
        color: '#007BFF',
        marginBottom: 20,
        fontSize: 14,
    },
    button: {
        marginTop: 10,
        backgroundColor: '#007BFF',
    },
    signUpButton: {
        marginTop: 10,
        borderColor: '#007BFF',
    },
    googleButton: {
        marginTop: 20,
        backgroundColor: '#4285F4',
    },
});