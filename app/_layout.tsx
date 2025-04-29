//_layout.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Enables gesture support for the app
import { Stack } from 'expo-router'; // Expo Router for handling screen navigation
import { Image, Platform, View, Text } from 'react-native'; // Core React Native components (optional here)
import { Provider as PaperProvider } from 'react-native-paper'; // Paper UI library provider (optional usage)

/**
 * Root layout component for the entire app.
 * Sets up gesture handling and screen navigation.
 */
export default function Layout() {
  return (
    // Gesture handler wrapper - required for screens using gesture interactions
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Stack navigation configuration using Expo Router */}
      <Stack
        screenOptions={{
          headerShown: true, // Show header by default on all screens
        }}
      >
        {/* Home screen (index.tsx) */}
        <Stack.Screen
          name="index"
          options={{
            title: '', // No title in header
            headerShown: false, // Hide the header entirely on the home screen
            headerBackVisible: false, // Hide the back button (if any)
          }}
        />

        {/* Login screen */}
        <Stack.Screen
          name="login"
          options={{
            title: 'Login', // Title shown if header is enabled
            animation: 'fade', // Use fade animation when navigating
            headerShown: false, // Hide header for a full-screen login experience
          }}
        />

        {/* Challenges screen */}
        <Stack.Screen
          name="challenges"
          options={{
            title: '', // Page title shown in header
            animation: 'fade',
            headerBackVisible: false, // Disable back button for this screen
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: "Notifications"

          }} />

        {/* Sign Up screen */}
        <Stack.Screen
          name="signup"
          options={{
            title: '', // No title needed
            animation: 'fade', // Use fade transition
            headerShown: false, // Hide the header on sign up screen
          }}
        />

        {/* Forgot Password screen */}
        <Stack.Screen
          name="forgot-password"
          options={{
            title: '', // No title
            animation: 'fade', // Smooth transition
            headerShown: false, // Fullscreen view without header
          }}
        />

        {/* Create Dare screen */}
        <Stack.Screen
          name="create-dare"
          options={{
            title: '', // Header title
            animation: 'fade', // Smooth transition
            headerShown: false, // Fullscreen view without header
          }}
        />

        {/* My Dares screen */}
        <Stack.Screen
          name="my-dares"
          options={{
            title: 'My Accepted Dares', // Header title for user's accepted dares
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
