import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const logo = require('../assets/images/logo-1-dareme.png');

export default function Home() {
  const router = useRouter();

  const fadeOutAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoScale, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTimeout(() => {
        Animated.timing(fadeOutAnim, {
          toValue: 0.01,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          if (user) {
            router.replace('/(tabs)/challenges');
          } else {
            router.replace('/login');
          }
        });
      }, 2000);
    });

    return unsubscribe;
  }, []);

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.gradient}>
      <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image source={logo} style={styles.logo} />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginTop: 10,
  },
});
