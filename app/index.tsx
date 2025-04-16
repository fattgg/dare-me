import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

// Import the logo image
const logo = require('../assets/images/logo-1-dareme.png');

export default function Home() {
  const navigation = useNavigation();

  // Animation value for fading out the logo
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  // Animation value for scaling the logo
  const logoScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale-in animation for the logo on initial load
    Animated.timing(logoScale, {
      toValue: 1, // Final scale size
      duration: 800, // Duration of the animation
      useNativeDriver: true, // Use native driver for better performance
    }).start();

    // Check the authentication state of the user
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Wait 2 seconds before starting fade-out and navigation
      setTimeout(() => {
        // Fade-out animation for the logo
        Animated.timing(fadeOutAnim, {
          toValue: 0.01,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          // Navigate to the correct screen based on user's auth state
          if (user) {
            navigation.replace('challenges'); // If user is logged in
          } else {
            navigation.replace('login'); // If user is not logged in
          }
        });
      }, 2000); // Delay of 2 seconds
    });

    // Cleanup the listener when the component unmounts
    return unsubscribe;
  }, []);

  return (
    // Background gradient from purple to lavender
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.gradient}>
      {/* Wrapper for the animated logo view with fading effect */}
      <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
        {/* Animated logo with scaling effect */}
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image source={logo} style={styles.logo} />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

// Styling for the components
const styles = StyleSheet.create({
  gradient: {
    flex: 1, // Fill the whole screen
  },
  container: {
    flex: 1,
    justifyContent: 'center', // Center the logo vertically
    alignItems: 'center', // Center the logo horizontally
  },
  logo: {
    width: 200,
    height: 200,
    marginTop: 10,
  },
});
