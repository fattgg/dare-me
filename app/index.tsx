import { useNavigation } from 'expo-router';
import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { auth } from '../firebaseConfig'; // Import Firebase auth

export default function Home() {
  const navigation = useNavigation();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Check if the user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If the user is logged in, navigate to the main screen
        navigation.navigate('challenges');
      }
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [navigation]);

  const handlePress = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.3, // Scale up animation
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate('login'); // Navigate to login screen if no user is logged in
    });
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        android_ripple={null}
        style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
      >
        <Animated.Text style={[styles.title, { transform: [{ scale: scaleAnim }] }]}>
          DareMe
        </Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEDCF8', // Light purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#800080', // Purple
  },
});
