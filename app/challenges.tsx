import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database'; // For fetching and updating data
import { router } from 'expo-router';

export default function Challenges() {
    const [dares, setDares] = useState([]);

    useEffect(() => {
        const daresRef = ref(db, 'dares');
        const unsubscribe = onValue(daresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedDares = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setDares(formattedDares);
            } else {
                setDares([]);
            }
        });

        return () => unsubscribe(); // Cleanup the listener on unmount
    }, []);

    const handleAcceptDare = async (dareId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to accept a dare.');
                return;
            }

            const dareRef = ref(db, `dares/${dareId}`);
            await update(dareRef, {
                status: 'in-progress', // Update the status to "in-progress"
                acceptedBy: user.uid, // Track the user who accepted the dare
            });

            Alert.alert('Success', 'You have accepted the dare!');
        } catch (error) {
            console.error('Error accepting dare:', error);
            Alert.alert('Error', 'Failed to accept the dare. Please try again.');
        }
    };

    const renderDare = ({ item }: { item: any }) => (
        <View style={styles.dareItem}>
            <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
            <Text style={styles.dareText}>Reward: {item.reward}</Text>
            <Text style={styles.dareText}>Posted by: {item.username || 'Anonymous'}</Text>
            <Text style={styles.dareText}>
                Status: {item.status === 'in-progress' ? 'In Progress' : 'Available'}
            </Text>
            {item.status !== 'in-progress' && (
                <Button title="Accept Dare" onPress={() => handleAcceptDare(item.id)} />
            )}
        </View>
    );

    const handleLogout = async () => {
        try {
            if (Platform.OS === 'web') {
                const { signOut } = require('firebase/auth');
                await signOut(auth);
            } else {
                await (auth as any).signOut();
            }
            router.replace('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Available Dares</Text>
            <Button title="Logout" onPress={handleLogout} />
            <Button
                title="Post a Dare"
                onPress={() => router.push('/create-dare')}
            />
            <Button
                title="My Accepted Dares"
                onPress={() => router.push('/my-dares')}
            />
            <FlatList
                data={dares}
                keyExtractor={(item) => item.id}
                renderItem={renderDare}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    list: {
        marginTop: 20,
    },
    dareItem: {
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: '#f9f9f9',
    },
    dareText: {
        fontSize: 16,
    },
});