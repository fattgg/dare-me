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
  Image,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update, push, remove, get } from 'firebase/database';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

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

  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
  const [selectedEvidenceUri, setSelectedEvidenceUri] = useState<string | null>(null);
  const [selectedDareId, setSelectedDareId] = useState<string | null>(null);
  const [selectedDareStatus, setSelectedDareStatus] = useState<string | null>(null);

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

  const pickEvidence = async (dareId: string) => {
    try {
      const dareRef = ref(db, `dares/${dareId}`);
      const snapshot = await get(dareRef);
      const dareData = snapshot.val();

      if (dareData?.status === 'completed') {
        Alert.alert('Not Allowed', 'You cannot update evidence after completion.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        await update(ref(db, `dares/${dareId}`), {
          evidence: uri,
        });

        Alert.alert('Success', 'Evidence uploaded!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to upload evidence.');
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

  const openEvidence = (uri: string, dareId: string, status: string) => {
    setSelectedEvidenceUri(uri);
    setSelectedDareId(dareId);
    setSelectedDareStatus(status);
    setEvidenceModalVisible(true);
  };

  const renderDare = ({ item }: { item: Dare }) => {
    return (
      <View style={styles.dareItem}>
        <Text style={styles.dareTitle}>{item.challenge}</Text>
        <Text style={styles.dareDetail}>Reward: {item.reward}</Text>
        <Text style={styles.dareDetail}>Status: {item.status}</Text>

        {/* Upload Evidence only if not completed and no evidence */}
        {item.status !== 'completed' && !item.evidence && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6A0DAD' }]}
            onPress={() => pickEvidence(item.id)}
          >
            <Feather name="upload" size={16} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>Upload Evidence</Text>
          </TouchableOpacity>
        )}

        {/* View Evidence */}
        {item.evidence && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4682B4' }]}
            onPress={() => openEvidence(item.evidence!, item.id, item.status)}
          >
            <Feather name="star" size={16} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>View Evidence</Text>
          </TouchableOpacity>
        )}

        {/* Mark as Completed + Return */}
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

      {/* Return Modal */}
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

      {/* View Evidence Modal */}
      <Modal
        visible={evidenceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEvidenceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.returnModalBox, { width: '85%' }]}>
            <Text style={styles.returnModalTitle}>Evidence Preview</Text>
            {selectedEvidenceUri?.includes('video') || selectedEvidenceUri?.endsWith('.mp4') ? (
              <Video
                source={{ uri: selectedEvidenceUri }}
                style={{ width: '100%', height: 250, borderRadius: 10 }}
                useNativeControls
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: selectedEvidenceUri! }}
                style={{ width: '100%', height: 250, borderRadius: 10 }}
                resizeMode="contain"
              />
            )}
            <View style={[styles.modalButtonRow, { marginTop: 20 }]}>
              {selectedDareStatus !== 'completed' && selectedDareId && (
                <TouchableOpacity
                  style={[styles.returnModalButton, { backgroundColor: '#FFA500' }]}
                  onPress={() => {
                    setEvidenceModalVisible(false);
                    pickEvidence(selectedDareId);
                  }}
                >
                  <Text style={styles.returnModalButtonText}>Change Evidence</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.returnModalButton, { backgroundColor: '#6A0DAD' }]}
                onPress={() => setEvidenceModalVisible(false)}
              >
                <Text style={styles.returnModalButtonText}>Close</Text>
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
  },
  returnModalText: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
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
  },
});
