//forgot-password.tsx

"use client"

import { useState } from "react"
import { View, StyleSheet, Alert, Platform, Text, TextInput, TouchableOpacity } from "react-native"
import { Button } from "react-native-paper"
import { getAuth, sendPasswordResetEmail } from "firebase/auth"
import { router } from "expo-router"
import { app } from "../firebaseConfig"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"
import Head from 'expo-router/head'
import { useFonts } from "expo-font"

const isWeb = Platform.OS === "web"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#4B0082" }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Loading fonts...</Text>
      </View>
    )
  }

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
    <>
      <Head>
        <title>DareMe | Forgot Password</title>
        <meta name="description" content="Reset your password and continue your journey with DareMe!" />
      </Head>

      <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.header}></View>

          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Feather name="lock" size={40} color="#fff" />
            </View>

            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={[
                  styles.input,
                  { fontFamily: email ? "Montserrat-SemiBold" : "Montserrat-SemiBoldItalic" }
                ]}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
                placeholderTextColor="#ccc"
                editable={!isLoading}
              />



            </View>

            <Button
              mode="contained"
              onPress={handlePasswordReset}
              style={styles.button}
              disabled={isLoading}
              labelStyle={styles.buttonLabel}
            >
              Send Reset Link
            </Button>

            <TouchableOpacity style={styles.backButton} onPress={() => router.push("/login")}>
              <Feather name="arrow-left" size={16} color="#fff" style={styles.backIcon} />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
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
  header: {
    height: 0,
  },
  formContainer: {
    width: "100%",
    maxWidth: 420,
    padding: 25,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.80)",
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
    fontFamily: "Montserrat-SemiBold",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#fff",
  },
  subtitle: {
    fontFamily: "Montserrat-ExtraLightItalic",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "rgba(255, 255, 255, 0.8)",
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontFamily: "Montserrat-SemiBold",
    color: "#fff",
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    fontFamily: "Montserrat-SemiBoldItalic",
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
    marginBottom: 10,
    borderRadius: 10,
  },
  buttonLabel: {
    fontFamily: "Montserrat-SemiBold",
    fontSize: 15,
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
    fontFamily: "Montserrat-SemiBold",
    color: "#fff",
    fontSize: 14,
  },
})