import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Button } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database'; // For fetching and updating data
import { useRouter } from 'expo-router';

export default function MyDares() {
    const [myDares, setMyDares] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const fetchMyDares = () => {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to view your accepted dares.');
                return;
            }

            const daresRef = ref(db, 'dares');
            const unsubscribe = onValue(daresRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const formattedDares = Object.keys(data).map((key) => ({
                        id: key,
                        ...data[key],
                    }));

                    // Show all dares accepted by the current user, regardless of status
                    const userDares = formattedDares.filter((dare) => dare.acceptedBy === user.uid);
                    setMyDares(userDares);
                } else {
                    setMyDares([]);
                }
            });

            return () => unsubscribe(); // Cleanup the listener on unmount
        };

        fetchMyDares();
    }, []);

    const handleMarkAsCompleted = async (dareId: string) => {
        try {
            const dareRef = ref(db, `dares/${dareId}`);
            await update(dareRef, {
                status: 'completed', // Update the status to "completed"
            });

            Alert.alert('Success', 'You have marked the dare as completed!');
        } catch (error) {
            console.error('Error marking dare as completed:', error);
            Alert.alert('Error', 'Failed to mark the dare as completed. Please try again.');
        }
    };

    const renderDare = ({ item }: { item: any }) => (
        <View style={styles.dareItem}>
            <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
            <Text style={styles.dareText}>Reward: {item.reward}</Text>
            <Text style={styles.dareText}>Status: {item.status}</Text>
            {item.status !== 'completed' && (
                <Button title="Mark as Completed" onPress={() => handleMarkAsCompleted(item.id)} />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Accepted Dares</Text>
            <FlatList
                data={myDares}
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