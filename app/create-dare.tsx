import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
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
const CATEGORY_OPTIONS = ['Fitness', 'Social', 'Adventure'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function CreateDare() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  });

  const [challenge, setChallenge] = useState('');
  const [reward, setReward] = useState('');
  const [criteria, setCriteria] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [focusField, setFocusField] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    challenge: false,
    reward: false,
    criteria: false,
    category: false,
    difficulty: false,
  });

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const handleCreateDare = async () => {
    const newErrors = {
      challenge: !challenge.trim(),
      reward: !reward.trim(),
      criteria: !criteria.trim(),
      category: !category,
      difficulty: !difficulty,
    };

    setErrors(newErrors);

    if (newErrors.challenge || newErrors.reward || newErrors.criteria || newErrors.category || newErrors.difficulty) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      const criteriaArray = criteria.split(',').map((item) => item.trim());

      const daresRef = ref(db, 'dares');
      await push(daresRef, {
        challenge,
        reward,
        criteria: criteriaArray,
        category,
        difficulty,
        userId: user.uid,
        username: user.email || 'Anonymous',
        createdAt: new Date().toISOString(),
      });

      setChallenge('');
      setReward('');
      setCriteria('');
      setCategory('');
      setDifficulty('');
      setErrors({ challenge: false, reward: false, criteria: false, category: false, difficulty: false });

      setSuccessModalVisible(true);
    } catch (error) {
      console.error('Error creating dare:', error);
    }
  };

  return (
    <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.container}>
      <View style={[styles.card, {
        width: width > 900 ? '30%' : width > 600 ? '60%' : '90%',
        paddingVertical: width > 900 ? 40 : 20,
      }]}>
        <Text style={styles.title}>Post a Dare</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
          {CATEGORY_OPTIONS.map((cat) => (
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
        {errors.category && <Text style={styles.errorText}>Category is required.</Text>}

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
          {DIFFICULTY_OPTIONS.map((level) => (
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
        {errors.difficulty && <Text style={styles.errorText}>Difficulty is required.</Text>}

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
        {errors.challenge && <Text style={styles.errorText}>Challenge is required.</Text>}

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
        {errors.reward && <Text style={styles.errorText}>Reward is required.</Text>}

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
        {errors.criteria && <Text style={styles.errorText}>Criteria is required.</Text>}

        <TouchableOpacity onPress={handleCreateDare} style={styles.button}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonLabel}>Post Dare</Text>
            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/challenges')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#fff" style={styles.backIcon} />
          <Text style={styles.backText}>Back to Challenges</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Success 🎉</Text>
            <Text style={styles.modalMessage}>
              Dare posted successfully!{"\n\n"}You can edit this dare only for 2 minutes after posting.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/challenges');
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: -5,
    marginBottom: 10,
    fontFamily: 'Montserrat-SemiBoldItalic',
  },
  button: {
    backgroundColor: '#6A0DAD',
    borderRadius: 10,
    paddingVertical: 12,
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  backIcon: { marginRight: 5 },
  backText: { color: "#fff", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#4B0082',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalMessage: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  modalButton: {
    backgroundColor: '#6A0DAD',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: 'bold' },
});
