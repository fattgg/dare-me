import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { Platform, View, Image } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Layout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: '',
            headerShown: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: 'Login',
            animation: 'fade',
            headerBackVisible: false,
            headerStyle: {
              backgroundColor: '#6A0DAD',
              height: 80,
            },
            headerTintColor: '#fff',
            headerTitle: () => (
              <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: Platform.OS !== 'web' ? -20 : 0,
              }}>
                <Image
                  source={require('../assets/images/logo-1-dareme.png')}
                  style={{ width: 185, height: 75, resizeMode: 'contain' }}
                />
              </View>
            ),
            headerTitleAlign: 'center',
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: 'Sign Up',
            animation: 'fade',
            headerStyle: {
              backgroundColor: '#6A0DAD',
              height: 80,
            },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Forgot Password',
            animation: 'fade',
            headerStyle: {
              backgroundColor: '#6A0DAD',
              height: 80,
            },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            headerBackVisible: false,
          }}
        />

        {/* Logged-in Screens Only */}
        {user && (
          <>
            <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
            <Stack.Screen name="create-dare" options={{ title: 'Create Dare' }} />
            <Stack.Screen name="my-dares" options={{ title: 'My Accepted Dares' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          </>
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}
