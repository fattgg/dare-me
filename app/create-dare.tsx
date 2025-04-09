import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../firebaseConfig'; // Import Firebase database and auth
import { ref, push } from 'firebase/database'; // For Realtime Database
import { useRouter } from 'expo-router';

export default function CreateDare() {
    const [challenge, setChallenge] = useState('');
    const [reward, setReward] = useState('');
    const router = useRouter();

    const handleCreateDare = async () => {
        if (!challenge || !reward) {
            Alert.alert('Error', 'Please fill in both the challenge and reward.');
            return;
        }

        try {
            const user = auth.currentUser; // Get the currently logged-in user
            if (!user) {
                Alert.alert('Error', 'You must be logged in to create a dare.');
                return;
            }

            // Save the dare to Firebase Realtime Database
            const daresRef = ref(db, 'dares');
            await push(daresRef, {
                challenge,
                reward,
                userId: user.uid, // Associate the dare with the user's ID
                username: user.email || 'Anonymous', // Use the user's email or a default name
                createdAt: new Date().toISOString(),
            });

            Alert.alert('Success', 'Dare posted successfully!');
            setChallenge('');
            setReward('');
            router.replace('/challenges'); // Redirect to Challenges screen
        } catch (error) {
            console.error('Error creating dare:', error);
            Alert.alert('Error', 'Failed to post dare. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Post a Dare</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter the challenge"
                value={challenge}
                onChangeText={setChallenge}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter the reward"
                value={reward}
                onChangeText={setReward}
            />
            <Button title="Post Dare" onPress={handleCreateDare} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
});