"use client";

import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  Image,
} from "react-native";
import { Button } from "react-native-paper";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  type UserCredential,
  type AuthError,
} from "firebase/auth";
import { useIdTokenAuthRequest } from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { auth } from "../firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Head from "expo-router/head";
import { useFonts } from "expo-font";

const isWeb = Platform.OS === "web";

export default function Login() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId: "YOUR_GOOGLE_CLIENT_ID",
    redirectUri: "https://auth.expo.io/@your-app/DareMe",
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      setIsReady(true);
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          router.replace("../challenges");
        })
        .catch((error: AuthError) => {
          console.error("Google login error:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [response]);

  const handleLogin = async (): Promise<void> => {
    setEmailError("");
    setPasswordError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (password.trim().length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      router.replace("../challenges");
    } catch (error: any) {
      const errorCode = error?.code;
      if (errorCode === "auth/user-not-found") {
        setEmailError("Email not found.");
      } else if (errorCode === "auth/wrong-password") {
        setPasswordError("Incorrect password.");
      } else {
        setPasswordError("Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (): void => {
    router.push("../signup");
  };

  const handleForgotPassword = (): void => {
    router.push("../forgot-password");
  };

  if (!isReady || loading) {
    return (
      <LinearGradient
        colors={["#4B0082", "#B788C4"]}
        style={[styles.gradient, styles.loadingContainer]}
      />
    );
  }

  return (
    <>
      <Head>
        <title>DareMe | Login</title>
        <meta name="description" content="Login to DareMe and take on new challenges!" />
      </Head>

      <LinearGradient
        colors={["#4B0082", "#B788C4"]}
        style={[styles.gradient, { backgroundColor: "#4B0082" }]}
      >
        <View style={styles.container}>
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Feather name="user" size={55} color="#fff" />
              <RNText style={styles.title}>Welcome!</RNText>
            </View>

            <View style={styles.inputContainer}>
              <RNText style={styles.label}>Email</RNText>
              <RNTextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
                placeholderTextColor="#ccc"
                style={[styles.input]}
                editable={!loading}
              />
              {emailError ? <RNText style={styles.errorText}>{emailError}</RNText> : null}
            </View>

            <View style={styles.inputContainer}>
              <RNText style={styles.label}>Password</RNText>
              <RNTextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError("");
                }}
                secureTextEntry
                autoCorrect={false}
                placeholder="Enter your password"
                placeholderTextColor="#ccc"
                style={[styles.input]}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              {passwordError ? <RNText style={styles.errorText}>{passwordError}</RNText> : null}
            </View>

            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <RNText style={styles.forgotPassword}>Forgot Password?</RNText>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.button}
              labelStyle={styles.buttonLabel}
              disabled={loading}
            >
              Login
            </Button>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptAsync()}
              disabled={!request || loading}
            >
              <View style={styles.googleContent}>
                <Image
                  source={require("../assets/images/google1.png")}
                  style={styles.googleIcon}
                />
                <RNText style={styles.googleButtonText}>Sign in with Google</RNText>
              </View>
            </TouchableOpacity>

            <View style={styles.createAccountLink}>
              <RNText style={styles.createAccountText}>
                Don’t have an account?{" "}
                {isWeb ? (
                  <RNText
                    onPress={handleSignUp}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    disabled={loading}
                    style={[
                      styles.signUpText,
                      hovered && styles.signUpTextHovered,
                    ]}
                  >
                    Sign up
                  </RNText>
                ) : (
                  <RNText
                    onPress={handleSignUp}
                    disabled={loading}
                    style={styles.signUpText}
                  >
                    Sign up
                  </RNText>
                )}
              </RNText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

export const unstable_settings = {
  initialRouteName: "login",
};

export const screenOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
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
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.80)",
    }),
    ...(!isWeb && {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    }),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  inputContainer: { marginBottom: 15 },
  label: {
    color: "white",
    marginBottom: 5,
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  title: {
    fontFamily: "Montserrat-SemiBold",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    marginTop: 5,
    color: "#fff",
  },
  errorText: {
    color: "#ffcccc",
    fontStyle: "italic",
    marginTop: 4,
    fontSize: 13,
  },
  forgotPassword: {
    fontFamily: "Montserrat-ExtraLightItalic",
    textAlign: "right",
    color: "#fff",
    marginBottom: 20,
    fontSize: 14,
  },
  buttonLabel: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 15,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#6A0DAD",
    marginBottom: 10,
    borderRadius: 10,
  },
  googleButton: {
    marginTop: 12,
    backgroundColor: "#6A0DAD",
    borderRadius: 10,
  },
  googleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  googleButtonText: {
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  iconContainer: { alignItems: "center", marginBottom: 30 },
  createAccountLink: { marginTop: 15, alignSelf: "center" },
  createAccountText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat-ExtraLightItalic",
    marginTop: 10,
  },
  signUpText: {
    textDecorationLine: "none",
    color: "#6A0DAD",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 17,
    marginTop: 10,
    cursor: isWeb ? "pointer" : "default",
  },
  signUpTextHovered: {
    textDecorationLine: "underline",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});


