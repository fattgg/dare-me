import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { db } from '../firebaseConfig'; // Import Firebase database
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
            const daresRef = ref(db, 'dares');
            await push(daresRef, {
                challenge,
                reward,
                createdAt: new Date().toISOString(),
            });

            Alert.alert('Success', 'Dare created successfully!');
            setChallenge('');
            setReward('');
            router.replace('/challenges');
        } catch (error) {
            console.error('Error creating dare:', error);
            Alert.alert('Error', 'Failed to create dare. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create a Dare</Text>
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
            <Button title="Create Dare" onPress={handleCreateDare} />
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