import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { router } from 'expo-router';
import { app } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const isWeb = Platform.OS === 'web';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    const auth = getAuth(app);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password Reset', `A reset link has been sent to ${email}`, [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (error: any) {
      handleFirebaseError(error);
    }
  };

  const handleFirebaseError = (error: any) => {
    let message = 'An error occurred. Please try again.';
    switch (error.code) {
      case 'auth/invalid-email':
        message = 'The email address is not valid.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email.';
        break;
      default:
        message = error.message;
        break;
    }
    Alert.alert('Error', message);
  };

  const GlassContainer = ({ children }: { children: React.ReactNode }) => {
    return isWeb ? (
      <View style={styles.glassContainer}>{children}</View>
    ) : (
      <BlurView intensity={80} tint="light" style={styles.glassContainer}>
        {children}
      </BlurView>
    );
  };

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.centered}>
          <GlassContainer>
            <Text style={styles.title}>Forgot Password</Text>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              underlineColor="transparent"
              theme={{
                colors: { text: '#fff', primary: '#fff', placeholder: '#ccc' },
              }}
            />
            <Button mode="contained" onPress={handlePasswordReset} style={styles.button}>
              Send Reset Link
            </Button>
          </GlassContainer>
        </View>
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
    width: Platform.OS === 'web' ? 400 : '100%',
    padding: 25,
    borderRadius: 22,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.2,
    backgroundColor:
      Platform.OS === 'web'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.10)',
    backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    WebkitBackdropFilter: Platform.OS === 'web' ? 'blur(12px)' : undefined,
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#fff',
  },
  input: {
    marginBottom: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#6A0DAD',
    borderRadius: 10,
  },
});