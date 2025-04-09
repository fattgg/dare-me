import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database'; // For fetching data
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

                    // Filter dares accepted by the current user
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

    const renderDare = ({ item }: { item: any }) => (
        <View style={styles.dareItem}>
            <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
            <Text style={styles.dareText}>Reward: {item.reward}</Text>
            <Text style={styles.dareText}>Status: {item.status}</Text>
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