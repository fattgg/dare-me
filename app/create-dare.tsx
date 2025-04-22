import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../firebaseConfig'; // Import Firebase database and auth
import { ref, push } from 'firebase/database'; // For Realtime Database
import { useRouter } from 'expo-router';

export default function CreateDare() {
    const [challenge, setChallenge] = useState('');
    const [reward, setReward] = useState('');
    const [criteria, setCriteria] = useState(''); // New state for criteria
    const router = useRouter();

    const handleCreateDare = async () => {
        if (!challenge || !reward || !criteria) {
            Alert.alert('Error', 'Please fill in all fields: challenge, reward, and criteria.');
            return;
        }

        try {
            const user = auth.currentUser; // Get the currently logged-in user
            if (!user) {
                Alert.alert('Error', 'You must be logged in to create a dare.');
                return;
            }

            // Convert criteria to an array
            const criteriaArray = criteria.split(',').map((item) => item.trim());

            // Save the dare to Firebase Realtime Database
            const daresRef = ref(db, 'dares');
            await push(daresRef, {
                challenge,
                reward,
                criteria: criteriaArray, // Save criteria as an array
                userId: user.uid, // Associate the dare with the user's ID
                username: user.email || 'Anonymous', // Use the user's email or a default name
                createdAt: new Date().toISOString(),
                status: 'available', // Default status
            });

            Alert.alert('Success', 'Dare posted successfully!');
            setChallenge('');
            setReward('');
            setCriteria('');
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
            <TextInput
                style={styles.input}
                placeholder="Enter criteria (comma-separated)"
                value={criteria}
                onChangeText={setCriteria}
            />
            <Button title="Post Dare" onPress={handleCreateDare} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'top',
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