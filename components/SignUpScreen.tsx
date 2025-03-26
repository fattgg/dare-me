// filepath: components/SignUpScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../constants/types';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { app } from '../firebaseConfig';

const SignUpScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const auth = getAuth(app);
    const db = getDatabase(app);

    const handleSignUp = async () => {
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match!');
            return;
        }

        try {
            console.log("📩 Attempting to create user...");  // ✅ Debug log

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log("✅ User created:", user);  // ✅ Debug log

            await set(ref(db, `users/${user.uid}`), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
            });

            console.log("✅ User data saved to DB");  // ✅ Debug log

            // ✅ Ensure Alert is triggered in the UI
            setTimeout(() => {
                Alert.alert('🎉 Success!', 'Your account has been created!', [
                    { text: "OK", onPress: () => navigation.navigate('Login') }
                ]);
            }, 500);  // Small delay to ensure UI updates

        } catch (error: any) {
            console.error("🚨 Sign Up Error:", error);  // ✅ Debug log
            Alert.alert('Sign Up Failed', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create an Account</Text>
            <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
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
            <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                secureTextEntry
            />
            <Button mode="contained" onPress={handleSignUp} style={styles.button}>
                Sign Up
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

export default SignUpScreen;