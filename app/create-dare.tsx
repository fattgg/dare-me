import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    useWindowDimensions,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { ref, push } from 'firebase/database';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

export default function CreateDare() {
    const [fontsLoaded] = useFonts({
        "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
        "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
        "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
        "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
    });

    const [challenge, setChallenge] = useState('');
    const [reward, setReward] = useState('');
    const [criteria, setCriteria] = useState(''); // New state for criteria
    const [focusField, setFocusField] = useState<string | null>(null); // Track which field is focused
    const router = useRouter();
    const { width } = useWindowDimensions();

    const handleCreateDare = async () => {
        if (!challenge || !reward || !criteria) {
            Alert.alert('Error', 'Please fill in all fields: challenge, reward, and criteria.');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to create a dare.');
                return;
            }

            const criteriaArray = criteria.split(',').map((item) => item.trim());

            const daresRef = ref(db, 'dares');
            await push(daresRef, {
                challenge,
                reward,
                criteria: criteriaArray, // Save criteria as an array
                userId: user.uid,
                username: user.email || 'Anonymous',
                createdAt: new Date().toISOString(),
            });

            Alert.alert('Success', 'Dare posted successfully!');
            setChallenge('');
            setReward('');
            setCriteria('');
            router.replace('/challenges');
        } catch (error) {
            console.error('Error creating dare:', error);
            Alert.alert('Error', 'Failed to post dare. Please try again.');
        }
    };

    return (
        <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.container}>
            <View style={[styles.card, {
                width: width > 900 ? '30%' : width > 600 ? '60%' : '90%',
                paddingVertical: width > 900 ? 40 : 20,
            }]}>
                <Text style={styles.title}>Post a Dare</Text>
                <TextInput
                    style={[styles.input, {
                        fontFamily: focusField === 'challenge' ? 'Montserrat-SemiBold' : 'Montserrat-SemiBoldItalic',
                    }]}
                    placeholder="Enter the challenge"
                    placeholderTextColor="#ccc"
                    value={challenge}
                    onChangeText={setChallenge}
                    onFocus={() => setFocusField('challenge')}
                    onBlur={() => setFocusField(null)}
                />
                <TextInput
                    style={[styles.input, {
                        fontFamily: focusField === 'reward' ? 'Montserrat-SemiBold' : 'Montserrat-SemiBoldItalic',
                    }]}
                    placeholder="Enter the reward"
                    placeholderTextColor="#ccc"
                    value={reward}
                    onChangeText={setReward}
                    onFocus={() => setFocusField('reward')}
                    onBlur={() => setFocusField(null)}
                />
                <TextInput
                    style={[styles.input, {
                        fontFamily: focusField === 'criteria' ? 'Montserrat-SemiBold' : 'Montserrat-SemiBoldItalic',
                    }]}
                    placeholder="Enter criteria (comma-separated)"
                    placeholderTextColor="#ccc"
                    value={criteria}
                    onChangeText={setCriteria}
                    onFocus={() => setFocusField('criteria')}
                    onBlur={() => setFocusField(null)}
                />
                <TouchableOpacity onPress={handleCreateDare} style={styles.button}>
                    <View style={styles.buttonContent}>
                        <Text style={styles.buttonLabel}>Post Dare</Text>
                        <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                </TouchableOpacity>
                
                {/* Back to Challenges Button */}
                <TouchableOpacity onPress={() => router.push('/challenges')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={18} color="#fff" style={styles.backIcon} />
                    <Text style={styles.backText}>Back to Challenges</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        padding: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#6A0DAD',
        borderRadius: 10,
        paddingVertical: 12,
        width: '100%',
        marginTop: 10,
        alignItems: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 15,
    },
    backIcon: {
        marginRight: 5,
    },
    backText: {
        color: "#fff",
        fontSize: 14,
    },
});
