import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update, push, remove } from 'firebase/database';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Dare = {
  id: string;
  challenge: string;
  reward: string;
  status: string;
  acceptedBy: { [uid: string]: any };
  userId: string;
  evidence?: string;
};

export default function MyDares() {
  const [myDares, setMyDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [dareToReturn, setDareToReturn] = useState<string | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    const daresRef = ref(db, 'dares');
    const unsubscribe = onValue(daresRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const accepted = Object.keys(data)
          .filter((key) => data[key].acceptedBy && data[key].acceptedBy[user.uid])
          .map((key) => ({
            id: key,
            ...data[key],
          }));
        setMyDares(accepted);
      } else {
        setMyDares([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsCompleted = async (dare: Dare) => {
    try {
      await update(ref(db, `dares/${dare.id}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      await push(ref(db, 'notifications'), {
        type: 'complete',
        dareId: dare.id,
        userId: dare.userId,
        message: `Your dare "${dare.challenge}" has been completed!`,
        timestamp: Date.now(),
      });

      Alert.alert('Success', 'Marked as completed.');
    } catch {
      Alert.alert('Error', 'Could not complete.');
    }
  };

  const confirmReturnDare = (dareId: string) => {
    setDareToReturn(dareId);
    setReturnModalVisible(true);
  };

  const handleReturnDare = async () => {
    if (!user || !dareToReturn) return;

    try {
      await remove(ref(db, `users/${user.uid}/acceptedDares/${dareToReturn}`));

      await update(ref(db, `dares/${dareToReturn}`), {
        status: 'available',
        acceptedBy: null,
        acceptedAt: null,
      });

      Alert.alert('Success', 'You have returned the dare.');
    } catch {
      Alert.alert('Error', 'Failed to return dare.');
    } finally {
      setReturnModalVisible(false);
      setDareToReturn(null);
    }
  };

  const renderDare = ({ item }: { item: Dare }) => {
    return (
      <View style={styles.dareItem}>
        <Text style={styles.dareTitle}>{item.challenge}</Text>
        <Text style={styles.dareDetail}>Reward: {item.reward}</Text>
        <Text style={styles.dareDetail}>Status: {item.status}</Text>

        {item.status === 'in-progress' && !item.evidence && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Simulated', 'Upload screen will go here.')}
          >
            <Feather name="upload" size={16} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>Upload Evidence</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'completed' &&
          user?.uid &&
          item.acceptedBy[user.uid] && (
            <>
              {item.status === 'in-progress' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMarkAsCompleted(item)}
                >
                  <Feather name="check" size={16} color="#fff" style={styles.icon} />
                  <Text style={styles.buttonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FF6347' }]}
                onPress={() => confirmReturnDare(item.id)}
              >
                <Feather name="arrow-left" size={16} color="#fff" style={styles.icon} />
                <Text style={styles.buttonText}>Return Dare</Text>
              </TouchableOpacity>
            </>
          )}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.container}>
      <Text style={styles.title}>My Accepted Dares</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={myDares}
          keyExtractor={(item) => item.id}
          renderItem={renderDare}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Return Dare Modal */}
      <Modal
        visible={returnModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.returnModalBox}>
            <Text style={styles.returnModalTitle}>Return Dare?</Text>
            <Text style={styles.returnModalText}>
              Are you sure you want to return this dare?
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.returnModalButton, { backgroundColor: '#6A0DAD' }]}
                onPress={handleReturnDare}
              >
                <Text style={styles.returnModalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.returnModalButton, { backgroundColor: '#555' }]}
                onPress={() => setReturnModalVisible(false)}
              >
                <Text style={styles.returnModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  dareItem: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
  },
  dareTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dareDetail: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
  },
  actionButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A0DAD',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnModalBox: {
    backgroundColor: '#3A0D65',
    borderRadius: 14,
    padding: 20,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  returnModalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Montserrat-SemiBold',
  },
  returnModalText: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat-ExtraLightItalic',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  returnModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  returnModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
  },
});
