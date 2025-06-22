import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ref, get } from 'firebase/database';
import { db } from '../firebaseConfig';

const CATEGORY_OPTIONS = ['Fitness', 'Social', 'Adventure'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function RandomDare() {
    const [category, setCategory] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [loading, setLoading] = useState(false);
    const [dare, setDare] = useState(null);
    const [error, setError] = useState('');

    const fetchRandomDare = async () => {
        setLoading(true);
        setError('');
        setDare(null);
        try {
            const snapshot = await get(ref(db, 'dares'));
            const dares = [];
            snapshot.forEach(child => {
                const val = child.val();
                if (
                    (!category || val.category === category) &&
                    (!difficulty || val.difficulty === difficulty)
                ) {
                    dares.push(val);
                }
            });
            if (dares.length === 0) {
                setError('No dares found for this category and difficulty.');
            } else {
                const randomIndex = Math.floor(Math.random() * dares.length);
                setDare(dares[randomIndex]);
            }
        } catch (e) {
            setError('Failed to fetch dares.');
        }
        setLoading(false);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Select Category:</Text>
            <View style={{ flexDirection: 'row', marginVertical: 10 }}>
                {CATEGORY_OPTIONS.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={{
                            padding: 10,
                            marginHorizontal: 5,
                            borderRadius: 20,
                            backgroundColor: category === cat ? '#6A0DAD' : '#eee',
                        }}
                        onPress={() => setCategory(cat)}
                    >
                        <Text style={{ color: category === cat ? '#fff' : '#333' }}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text>Select Difficulty:</Text>
            <View style={{ flexDirection: 'row', marginVertical: 10 }}>
                {DIFFICULTY_OPTIONS.map(level => (
                    <TouchableOpacity
                        key={level}
                        style={{
                            padding: 10,
                            marginHorizontal: 5,
                            borderRadius: 20,
                            backgroundColor: difficulty === level ? '#6A0DAD' : '#eee',
                        }}
                        onPress={() => setDifficulty(level)}
                    >
                        <Text style={{ color: difficulty === level ? '#fff' : '#333' }}>{level}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
                onPress={fetchRandomDare}
                style={{
                    backgroundColor: '#6A0DAD',
                    padding: 12,
                    borderRadius: 10,
                    marginTop: 20,
                }}
                disabled={loading || !category || !difficulty}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {loading ? 'Loading...' : 'Get Random Dare'}
                </Text>
            </TouchableOpacity>
            {error ? <Text style={{ color: 'red', marginTop: 20 }}>{error}</Text> : null}
            {dare && (
                <View style={{ marginTop: 30, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{dare.challenge}</Text>
                    <Text>Reward: {dare.reward}</Text>
                    <Text>Criteria: {Array.isArray(dare.criteria) ? dare.criteria.join(', ') : dare.criteria}</Text>
                    <Text>Category: {dare.category}</Text>
                    <Text>Difficulty: {dare.difficulty}</Text>
                </View>
            )}
        </View>
    );
}