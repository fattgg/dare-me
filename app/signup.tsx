import { useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { Button } from "react-native-paper";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { router } from "expo-router";
import { app } from "../firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Head from "expo-router/head";
import { useFonts } from "expo-font";

const isWeb = Platform.OS === "web";

export default function SignUp() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const auth = getAuth(app);
  const db = getDatabase(app);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

  const validateFields = () => {
    const newErrors = {
      name: name.trim() ? "" : "Full name is required.",
      email: email.trim()
        ? emailRegex.test(email)
          ? ""
          : "Invalid email address."
        : "Email is required.",
      password: password
        ? passwordRegex.test(password)
          ? ""
          : "Password must be 6+ chars, with 1 uppercase, 1 number, 1 symbol."
        : "Password is required.",
      confirmPassword: confirmPassword
        ? confirmPassword === password
          ? ""
          : "Passwords do not match."
        : "Please confirm your password.",
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === "");
  };

  const handleSignUp = async () => {
    if (!validateFields() || !termsAccepted) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        createdAt: new Date().toISOString(),
        acceptedTerms: true,
      });

      router.replace("/login");
    } catch (error) {
      setErrors((prev) => ({ ...prev, email: error.message }));
    }
  };

  if (!fontsLoaded) return null;

  const renderError = (field) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null;

  return (
    <>
      <Head>
        <title>DareMe | Sign Up</title>
      </Head>

      <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Feather name="user-plus" size={50} color="#fff" />
              <Text style={styles.title}>Sign Up</Text>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((prev) => ({
                  ...prev,
                  name: text.trim() ? "" : "Full name is required.",
                }));
              }}
              placeholder="Enter your full name"
              placeholderTextColor="#ccc"
              style={[styles.input, errors.name ? styles.inputError : null]}
              onSubmitEditing={Keyboard.dismiss}
            />
            {renderError("name")}

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({
                  ...prev,
                  email: !text
                    ? "Email is required."
                    : emailRegex.test(text)
                    ? ""
                    : "Invalid email address.",
                }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
              placeholderTextColor="#ccc"
              style={[styles.input, errors.email ? styles.inputError : null]}
              onSubmitEditing={Keyboard.dismiss}
            />
            {renderError("email")}

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({
                  ...prev,
                  password: !text
                    ? "Password is required."
                    : passwordRegex.test(text)
                    ? ""
                    : "Password must be 6+ chars, with 1 uppercase, 1 number, 1 symbol.",
                }));
              }}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor="#ccc"
              style={[styles.input, errors.password ? styles.inputError : null]}
              onSubmitEditing={Keyboard.dismiss}
            />
            {renderError("password")}

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: !text
                    ? "Please confirm your password."
                    : text === password
                    ? ""
                    : "Passwords do not match.",
                }));
              }}
              secureTextEntry
              placeholder="Confirm your password"
              placeholderTextColor="#ccc"
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              onSubmitEditing={handleSignUp}
            />
            {renderError("confirmPassword")}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={styles.checkbox}
              >
                {termsAccepted && <View style={styles.checkedBox} />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I accept the
                <Text style={styles.linkText} onPress={() => setShowTermsModal(true)}>
                  {" Terms and Conditions"}
                </Text>
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleSignUp}
              disabled={!termsAccepted}
              style={[styles.button, { opacity: termsAccepted ? 1 : 0.6 }]}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </Button>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/login")}
            >
              <Feather name="arrow-left" size={16} color="#fff" style={styles.backIcon} />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {showTermsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <Text style={styles.modalContent}>
              By accessing this app, you agree to be bound by the terms of service,
              community rules, and compliance with applicable laws.{"\n\n"}If you do not agree,
              you may not use the app.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                style={[styles.modalButton, { backgroundColor: "#6A0DAD" }]}
              >
                <Text style={styles.modalButtonText}>I AGREE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
              >
                <Text style={[styles.modalButtonText, { color: "#000" }]}>I DISAGREE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

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
    ...(isWeb
      ? {
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 16px 64px rgba(0, 0, 0, 0.80)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 5,
        }),
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 3,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  inputError: {
    borderColor: "#ff4d4d",
  },
  button: {
    marginTop: 10,
    backgroundColor: "#6A0DAD",
    padding: 7,
    borderRadius: 10,
  },
  buttonText: {
    fontFamily: "Montserrat-SemiBold",
    color: "#fff",
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  backIcon: {
    marginRight: 5,
  },
  backText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 5,
    marginTop: 5,
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 12,
    marginBottom: 8,
    fontFamily: "Montserrat-SemiBoldItalic",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#fff",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    width: 12,
    height: 12,
    backgroundColor: "#fff",
  },
  termsText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  linkText: {
    color: "#87CEFA",
    textDecorationLine: "underline",
    fontFamily: "Montserrat-SemiBoldItalic",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#6A0DAD",
    textAlign: "center",
  },
  modalContent: {
    fontSize: 14,
    color: "#333",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
