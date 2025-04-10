import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerShown: true, // Default: shfaq header për të gjitha ekranet
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        headerShown: false, // Mos shfaq header për faqen e parë
                        headerBackVisible: false
                    }}
                />
                <Stack.Screen
                    name="login"
                    options={{
                        title: 'Login',
                        headerBackVisible: false, // Mos shfaq butonin "back"
                        headerStyle: {
                            backgroundColor: '#6A0DAD', // Vjollcë më e thellë, mund ta ndryshoni sipas nevojës
                        },
                        headerTintColor: '#fff', // Titulli do të jetë i bardhë
                    }}
                />
                <Stack.Screen
                    name="challenges"
                    options={{
                        title: 'Challenges',
                        headerBackVisible: false
                    }} />
                <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
                <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
                <Stack.Screen name="create-dare" options={{ title: 'Create Dare' }} />
                <Stack.Screen name="my-dares" options={{ title: 'My Accepted Dares' }} />
            </Stack>
        </GestureHandlerRootView>
    );
}