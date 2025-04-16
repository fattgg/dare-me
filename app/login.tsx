"use client"

import { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type ViewStyle,
  type TextStyle,
} from "react-native"
import { Button } from "react-native-paper"
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  type UserCredential,
  type AuthError,
} from "firebase/auth"
import { useIdTokenAuthRequest } from "expo-auth-session/providers/google"
import { router } from "expo-router"
import { auth } from "../firebaseConfig"
import { LinearGradient } from "expo-linear-gradient"

const isWeb = Platform.OS === "web"

// Define types for our component props and state
type LoginProps = {}

export default function Login({ }: LoginProps): JSX.Element {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId: "883347608544-9qfpfo449nh7niobqhu4mps0s4lthj53.apps.googleusercontent.com",
    redirectUri: "https://auth.expo.io/@fatlindosmanii/DareMe",
  })

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params
      const credential = GoogleAuthProvider.credential(id_token)
      signInWithCredential(auth, credential)
        .then(() => {
          Alert.alert("Success", "Logged in with Google!")
          router.replace("../challenges")
        })
        .catch((error: AuthError) => {
          Alert.alert("Error", error.message)
        })
    }
  }, [response])

  const handleLogin = async (): Promise<void> => {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password)
      Alert.alert("Login Successful", `Welcome back, ${userCredential.user.email}!`)
      router.replace("../challenges")
    } catch (error: any) {
      Alert.alert("Login Failed", error.message)
    }
  }

  const handleSignUp = (): void => {
    router.push("../signup")
  }

  const handleForgotPassword = (): void => {
    router.push("../forgot-password")
  }

  return (
    <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient as ViewStyle}>
      <View style={styles.container as ViewStyle}>
        <View style={styles.formContainer as ViewStyle}>
          <RNText style={styles.title as TextStyle}>Welcome!</RNText>

          {/* Using React Native's built-in TextInput instead of Paper's */}
          <View style={styles.inputContainer as ViewStyle}>
            <RNText style={styles.label as TextStyle}>Email</RNText>
            <RNTextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input as TextStyle}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#ccc"
              placeholder="Enter your email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer as ViewStyle}>
            <RNText style={styles.label as TextStyle}>Password</RNText>
            <RNTextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input as TextStyle}
              secureTextEntry={true}
              autoCorrect={false}
              placeholderTextColor="#ccc"
              placeholder="Enter your password"
              textContentType="password"
            />
          </View>

          <TouchableOpacity onPress={handleForgotPassword}>
            <RNText style={styles.forgotPassword as TextStyle}>Forgot Password?</RNText>
          </TouchableOpacity>

          <Button mode="contained" onPress={handleLogin} style={styles.button as ViewStyle}>
            Login
          </Button>

          <Button
            mode="outlined"
            onPress={handleSignUp}
            style={styles.signUpButton as ViewStyle}
            labelStyle={{ color: "#fff" } as TextStyle}
          >
            Sign Up
          </Button>

          <Button
            mode="contained"
            onPress={() => promptAsync()}
            disabled={!request}
            style={styles.googleButton as ViewStyle}
          >
            Sign in with Google
          </Button>
        </View>
      </View>
    </LinearGradient>
  )
}

// Define styles with proper type annotations
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  } as ViewStyle,
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  } as ViewStyle,
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
  } as ViewStyle,
  inputContainer: {
    marginBottom: 15,
  } as ViewStyle,
  label: {
    color: "#fff",
    marginBottom: 5,
    fontSize: 14,
  } as TextStyle,
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  } as TextStyle,
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#fff",
  } as TextStyle,
  forgotPassword: {
    textAlign: "right",
    color: "#fff",
    marginBottom: 20,
    fontSize: 14,
  } as TextStyle,
  button: {
    marginTop: 10,
    backgroundColor: "#6A0DAD",
    marginBottom: 10,
    borderRadius: 10,
  } as ViewStyle,
  signUpButton: {
    marginTop: 10,
    borderColor: "#fff",
    marginBottom: 3,
    borderRadius: 10,
  } as ViewStyle,
  googleButton: {
    marginTop: 20,
    backgroundColor: "#6A0DAD",
    borderRadius: 10,
  } as ViewStyle,
})
