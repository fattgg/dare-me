import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { router } from 'expo-router';
import { app } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

// Kontrollo nëse është platforma web
const isWeb = Platform.OS === 'web';

export default function SignUp() {
    // State për inputet
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');

    // Inicializo auth dhe database
    const auth = getAuth(app);
    const db = getDatabase(app);

    // Funksioni për regjistrim të përdoruesit
    const handleSignUp = async () => {
        // Kontrollo nëse passwordet përputhen
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match!');
            return;
        }

        try {
            console.log("📩 Attempting to create user...");

            // Krijo përdoruesin në Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log("✅ User created:", user);

            // Ruaj të dhënat e përdoruesit në bazën e të dhënave
            await set(ref(db, `users/${user.uid}`), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
            });

            console.log("✅ User data saved to DB");

            // Trego një mesazh sukses
            setTimeout(() => {
                Alert.alert('🎉 Success!', 'Your account has been created!', [
                    { text: "OK", onPress: () => router.replace('/login') }
                ]);
            }, 500);

        } catch (error: any) {
            console.error("🚨 Sign Up Error:", error);
            Alert.alert('Sign Up Failed', error.message);
        }
    };

    // Komponenti për Glassmorphism
    const GlassContainer = ({ children }: { children: React.ReactNode }) => {
        return (
            <View style={isWeb ? styles.glassContainerWeb : styles.glassContainer}>
                {children}
            </View>
        );
    };

    return (
        <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.gradient}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={30}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.centered}>
                        <GlassContainer>
                            <Text style={styles.title}>Create an Account</Text>

                            {/* Fusha për emrin */}
                            <TextInput
                                label="Full Name"
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                autoCapitalize="words"
                                textContentType="name"
                                mode="flat"
                                theme={{
                                    colors: {
                                        text: '#fff',
                                        primary: '#fff',
                                        placeholder: '#ccc',
                                        background: 'transparent',
                                    },
                                }}
                            />
                            {/* Fusha për email */}
                            <TextInput
                                label="Email"
                                value={email}
                                onChangeText={setEmail}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                textContentType="emailAddress"
                                mode="flat"
                                theme={{
                                    colors: {
                                        text: '#fff',
                                        primary: '#fff',
                                        placeholder: '#ccc',
                                        background: 'transparent',
                                    },
                                }}
                            />
                            {/* Fusha për password */}
                            <TextInput
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                style={styles.input}
                                secureTextEntry
                                textContentType="password"
                                mode="flat"
                                theme={{
                                    colors: {
                                        text: '#fff',
                                        primary: '#fff',
                                        placeholder: '#ccc',
                                        background: 'transparent',
                                    },
                                }}
                            />
                            {/* Fusha për confirm password */}
                            <TextInput
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                style={styles.input}
                                secureTextEntry
                                textContentType="password"
                                mode="flat"
                                theme={{
                                    colors: {
                                        text: '#fff',
                                        primary: '#fff',
                                        placeholder: '#ccc',
                                        background: 'transparent',
                                    },
                                }}
                            />

                            {/* Butoni për regjistrim */}
                            <Button mode="contained" onPress={handleSignUp} style={styles.button}>
                                Sign Up
                            </Button>
                        </GlassContainer>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

// Stilet për ekranin dhe fushat
const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    glassContainer: {
        width: '100%',
        maxWidth: 420,
        padding: 25,
        borderRadius: 22,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1.2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    glassContainerWeb: {
        width: '100%',
        maxWidth: 420,
        padding: 25,
        borderRadius: 22,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1.2,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden',
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#fff',
    },
    button: {
        marginTop: 10,
        backgroundColor: '#6A0DAD',
        marginBottom: 10,
        borderRadius: 10,
    },
});
