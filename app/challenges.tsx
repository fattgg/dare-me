import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Alert, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database'; // For fetching data
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

    const renderDare = ({ item }: { item: any }) => (
        <View style={styles.dareItem}>
            <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
            <Text style={styles.dareText}>Reward: {item.reward}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Challenges Screen!</Text>
            <Button title="Logout" onPress={handleLogout} />
            <Button
                title="Create a Dare"
                onPress={() => router.push('/create-dare')}
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