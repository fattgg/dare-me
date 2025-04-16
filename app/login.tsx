import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { app, auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const isWeb = Platform.OS === 'web';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId:
      '883347608544-9qfpfo449nh7niobqhu4mps0s4lthj53.apps.googleusercontent.com',
    redirectUri: 'https://auth.expo.io/@fatlindosmanii/DareMe',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => {
          Alert.alert('Success', 'Logged in with Google!');
          router.replace('../challenges');
        })
        .catch((error) => {
          Alert.alert('Error', error.message);
        });
    }
  }, [response]);

  const handleLogin = async () => {
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
              <Text style={styles.title}>Welcome!</Text>

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                underlineColor="transparent"
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

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCorrect={false}
                textContentType="password"
                underlineColor="transparent"
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

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button mode="contained" onPress={handleLogin} style={styles.button}>
                Login
              </Button>
              <Button
                mode="outlined"
                onPress={handleSignUp}
                style={styles.signUpButton}
                labelStyle={{ color: '#fff' }}
              >
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
            </GlassContainer>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

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
  forgotPassword: {
    textAlign: 'right',
    color: '#fff',
    marginBottom: 20,
    fontSize: 14,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#6A0DAD',
    marginBottom: 10,
    borderRadius: 10,
  },
  signUpButton: {
    marginTop: 10,
    borderColor: '#fff',
    marginBottom: 3,
    borderRadius: 10,
  },
  googleButton: {
    marginTop: 20,
    backgroundColor: '#6A0DAD',
    borderRadius: 10,
  },
});
