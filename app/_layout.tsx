import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true, // Show headers for all screens
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="login" options={{ title: 'Login' }} />
            <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
            <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
            <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
            <Stack.Screen name="create-dare" options={{ title: 'Create Dare' }} />
            <Stack.Screen name="my-dares" options={{ title: 'My Accepted Dares' }} />
        </Stack>
    );
}