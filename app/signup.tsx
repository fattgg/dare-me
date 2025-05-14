import { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
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

  if (!fontsLoaded) return null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const auth = getAuth(app);
  const db = getDatabase(app);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      setTimeout(() => {
        Alert.alert("🎉 Success!", "Your account has been created!", [
          { text: "OK", onPress: () => router.replace("/login") },
        ]);
      }, 500);
    } catch (error) {
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  return (
    <>
      <Head>
        <title>DareMe | Sign Up</title>
        <meta
          name="description"
          content="Create your DareMe account and start taking on challenges!"
        />
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
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={[
                styles.input,
                {
                  fontFamily: name
                    ? "Montserrat-SemiBold"
                    : nameFocused
                    ? "Montserrat-SemiBoldItalic"
                    : "Montserrat-SemiBoldItalic",
                },
              ]}
              placeholder="Enter your full name"
              placeholderTextColor="#ccc"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={[
                styles.input,
                {
                  fontFamily: email
                    ? "Montserrat-SemiBold"
                    : emailFocused
                    ? "Montserrat-SemiBoldItalic"
                    : "Montserrat-SemiBoldItalic",
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
              placeholderTextColor="#ccc"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={[
                styles.input,
                {
                  fontFamily: password
                    ? "Montserrat-SemiBold"
                    : passwordFocused
                    ? "Montserrat-SemiBoldItalic"
                    : "Montserrat-SemiBoldItalic",
                },
              ]}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor="#ccc"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              style={[
                styles.input,
                {
                  fontFamily: confirmPassword
                    ? "Montserrat-SemiBold"
                    : confirmFocused
                    ? "Montserrat-SemiBoldItalic"
                    : "Montserrat-SemiBoldItalic",
                },
              ]}
              secureTextEntry
              placeholder="Confirm your password"
              placeholderTextColor="#ccc"
            />

            <Button mode="contained" onPress={handleSignUp} style={styles.button}>
              <Text
                style={{
                  fontFamily: "Montserrat-SemiBold",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                Sign Up
              </Text>
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
    </>
  );
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
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    boxSizing: "border-box",
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.80)",
    }),
    ...(!isWeb && {
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.50)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
    }),
  },
  label: {
    color: "#fff",
    marginBottom: 1,
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
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
  button: {
    marginTop: 20,
    backgroundColor: "#6A0DAD",
    padding: 7,
    marginBottom: 15,
    borderRadius: 10,
    fontFamily: "Montserrat-SemiBold",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  backIcon: {
    marginRight: 5,
    fontFamily: "Montserrat-SemiBold",
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
});