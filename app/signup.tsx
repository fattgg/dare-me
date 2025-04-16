"use client"

import { useState } from "react"
import { View, StyleSheet, Alert, Platform, Text, TextInput } from "react-native"
import { Button } from "react-native-paper"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { getDatabase, ref, set } from "firebase/database"
import { router } from "expo-router"
import { app } from "../firebaseConfig"
import { LinearGradient } from "expo-linear-gradient"

const isWeb = Platform.OS === "web"

export default function SignUp() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [name, setName] = useState("")

    const auth = getAuth(app)
    const db = getDatabase(app)

    const handleSignUp = async () => {
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match!")
            return
        }

        try {
            console.log("📩 Attempting to create user...")
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            console.log("✅ User created:", user)
            await set(ref(db, `users/${user.uid}`), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
            })

            console.log("✅ User data saved to DB")
            setTimeout(() => {
                Alert.alert("🎉 Success!", "Your account has been created!", [
                    { text: "OK", onPress: () => router.replace("/login") },
                ])
            }, 500)
        } catch (error) {
            console.error("🚨 Sign Up Error:", error)
            Alert.alert("Sign Up Failed", error.message)
        }
    }

    return (
        <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient}>
            <View style={styles.container}>
                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create an Account</Text>

                    {/* Name field */}
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="#ccc"
                    />

                    {/* Email field */}
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="Enter your email"
                        placeholderTextColor="#ccc"
                    />

                    {/* Password field */}
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                        placeholder="Enter your password"
                        placeholderTextColor="#ccc"
                    />

                    {/* Confirm password field */}
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.input}
                        secureTextEntry
                        placeholder="Confirm your password"
                        placeholderTextColor="#ccc"
                    />

                    {/* Sign up button */}
                    <Button mode="contained" onPress={handleSignUp} style={styles.button}>
                        Sign Up
                    </Button>
                </View>
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    formContainer: {
        width: "100%",
        maxWidth: 420,
        padding: 25,
        borderRadius: 22,
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderWidth: 1.2,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        ...(isWeb && {
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
        }),
    },
    label: {
        color: "#fff",
        marginBottom: 5,
        fontSize: 14,
    },
    input: {
        backgroundColor: "rgba(255, 255, 255, 0.10)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        color: "#fff",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    title: {
        fontSize: 30,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 30,
        color: "#fff",
    },
    button: {
        marginTop: 20,
        backgroundColor: "#6A0DAD",
        marginBottom: 15,
        borderRadius: 10,
    },
})
