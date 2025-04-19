"use client"

import { useState } from "react"
import { View, StyleSheet, Alert, Platform, Text, TextInput, TouchableOpacity } from "react-native"
import { Button } from "react-native-paper"
import { getAuth, sendPasswordResetEmail } from "firebase/auth"
import { router } from "expo-router"
import { app } from "../firebaseConfig"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"

const isWeb = Platform.OS === "web"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.")
      return
    }

    setIsLoading(true)
    const auth = getAuth(app)
    try {
      await sendPasswordResetEmail(auth, email)
      Alert.alert("Password Reset", `A reset link has been sent to ${email}`, [
        { text: "OK", onPress: () => router.replace("/login") },
      ])
    } catch (error: any) {
      handleFirebaseError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFirebaseError = (error: any) => {
    let message = "An error occurred. Please try again."
    switch (error.code) {
      case "auth/invalid-email":
        message = "The email address is not valid."
        break
      case "auth/user-not-found":
        message = "No account found with this email."
        break
      default:
        message = error.message
        break
    }
    Alert.alert("Error", message)
  }

  return (
    <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <Feather name="lock" size={40} color="#fff" />
          </View>

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password</Text>

          <View style={styles.inputContainer}>
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
          </View>

          <Button
            mode="contained"
            onPress={handlePasswordReset}
            style={styles.button}
            loading={isLoading}
            disabled={isLoading}
          >
            Send Reset Link
          </Button>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/login")}>
            <Feather name="arrow-left" size={16} color="#fff" style={styles.backIcon} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
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
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    boxSizing: "border-box",  // Sigurohuni që border dhe padding të mos ndikojnë në madhësinë totale
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.80)", // Hije jashtë për web
    }),
    ...(!isWeb && {
      shadowColor: "#000", 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.5, 
      shadowRadius: 10,   
      elevation: 5,       
    }),
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "rgba(255, 255, 255, 0.8)",
  },
  inputContainer: {
    marginBottom: 25,
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
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  button: {
    marginTop: 10,
    backgroundColor: "#6A0DAD",
    borderRadius: 10,
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  backIcon: {
    marginRight: 5,
  },
  backText: {
    color: "#fff",
    fontSize: 14,
  },
})
