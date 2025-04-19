import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Enables gesture support
import { Stack } from 'expo-router'; // Expo Router for screen navigation
import { Image, Platform, View, Text } from 'react-native'; // Import Image and Text components to display logo and text
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
                        title: '',
                        headerShown: false, // Hide the header on the home screen
                        headerBackVisible: false // Hide the back button
                    }}
                />

                {/* Login screen */}
                <Stack.Screen
  name="login"
  options={{
    title: 'Login',
    animation: 'fade',
    headerBackVisible: false,
    headerStyle: {
      backgroundColor: '#6A0DAD',
      borderBottomWidth: 0,
      height: 80,
    },
    headerTintColor: '#fff',
    headerTitle: () => (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: Platform.OS === 'android' || Platform.OS === 'ios' ? -20 : 0,
          marginBottom: Platform.OS === 'android' || Platform.OS === 'ios' ? 10 : 0,
        }}
      >
        <Image
          source={require('../assets/images/logo-1-dareme.png')}
          style={{
            width: 185,
            height: 75,
            resizeMode: 'contain',
          }}
        />
      </View>
    ),
    headerTitleAlign: 'center',
    headerLeft: () => null,
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
                            height: 80,
                        },
                        headerLeft: () => null,
                        headerTintColor: '#fff', // White header text
                          headerTitleAlign: 'center', // 
                          headerBackVisible: false, // 
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
                            height: 80,
                        },
                        headerLeft: () => null,
                        headerTintColor: '#fff', // White header text
                          headerTitleAlign: 'center', // 
                          headerBackVisible: false, // 
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
