// _layout.tsx


import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Enables gesture support
import { Stack } from 'expo-router'; // Expo Router for screen navigation
import { Provider as PaperProvider } from 'react-native-paper'; // Paper UI library provider (optional here)

export default function Layout() {
    return (
        // Root view required for gesture handling
        <GestureHandlerRootView style={{ flex: 1 }}>
            {/* Navigation stack configuration */}
            <Stack
                screenOptions={{
                    headerShown: true, // By default, show header for all screens
                }}
            >
                {/* Home screen (index.tsx) */}
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        headerShown: false, // Hide the header on the home screen
                        headerBackVisible: false // Hide the back button
                    }}
                />

                {/* Login screen */}
                <Stack.Screen
                    name="login"
                    options={{
                        title: 'Login',
                        animation: 'fade', // Fade animation when navigating to this screen
                        headerBackVisible: false, // Hide the back button
                        headerStyle: {
                            backgroundColor: '#6A0DAD', // Custom purple header background
                            borderBottomWidth: 0, // Remove bottom border from the header
                        },
                        headerTintColor: '#fff', // Header title and icons will be white
                    }}
                />

                {/* Challenges screen */}
                <Stack.Screen
                    name="challenges"
                    options={{
                        title: 'Challenges',
                        headerBackVisible: false, // Hide back button
                    }}
                />

                {/* Sign Up screen */}
                <Stack.Screen
                    name="signup"
                    options={{
                        title: 'Sign Up',
                        animation: 'fade',
                        headerStyle: {
                            backgroundColor: '#6A0DAD',
                            borderBottomWidth: 0,
                        },
                        headerTintColor: '#fff', // White header text
                    }}
                />

                {/* Forgot Password screen */}
                <Stack.Screen
                    name="forgot-password"
                    options={{
                        title: 'Forgot Password',
                        animation: 'fade',
                        headerStyle: {
                            backgroundColor: '#6A0DAD',
                            borderBottomWidth: 0,
                        },
                        headerTintColor: '#fff', // White header text
                    }}
                />

                {/* Create Dare screen */}
                <Stack.Screen name="create-dare" options={{ title: 'Create Dare' }} />

                {/* My Dares screen */}
                <Stack.Screen name="my-dares" options={{ title: 'My Accepted Dares' }} />
            </Stack>
        </GestureHandlerRootView>
    );
}
