// app/declined.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { auth, db } from '../firebaseConfig';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Dare = {
  id: string;
  challenge: string;
  reward: string;
  declinedBy?: { [uid: string]: boolean };
};

export default function DeclinedDares() {
  const [declinedDares, setDeclinedDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const daresRef = ref(db, 'dares');

    const unsubscribe = onValue(daresRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const filtered = Object.entries(data)
          .map(([id, dare]: any) => ({ id, ...dare }))
          .filter((d) => d.declinedBy?.[user.uid]);

        setDeclinedDares(filtered);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleReturnDare = async (dareId: string) => {
    if (!user) return;

    try {
      const updates: any = {};
      updates[`dares/${dareId}/declinedBy/${user.uid}`] = null;

      await update(ref(db), updates);
      setConfirmModalVisible(false);
      Alert.alert('✅ Success', 'Dare returned to the list!');
    } catch (error) {
      console.error("Failed to return dare:", error);
      Alert.alert('Error', 'Something went wrong while returning the dare.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.container}>
      <Text style={styles.title}>Declined Dares</Text>

      {declinedDares.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}> You haven't declined any dares yet!</Text>
        </View>
      ) : (
        <FlatList
          data={declinedDares}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.dareCard}>
              <Text style={styles.challenge}>Challenge: {item.challenge}</Text>
              <Text style={styles.reward}>Reward: {item.reward}</Text>

              <TouchableOpacity
                onPress={() => {
                  setSelectedDare(item);
                  setConfirmModalVisible(true);
                }}
                style={styles.returnButton}
              >
                <Feather name="refresh-ccw" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.returnButtonText}>Return Dare</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Modal Konfirmimi */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Return Dare</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to return this dare?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => selectedDare && handleReturnDare(selectedDare.id)}
              >
                <Text style={styles.modalButtonText}>Yes, Return</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
  },
  dareCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  challenge: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
  },
  reward: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Montserrat-ExtraLightItalic',
  },
  returnButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5A189A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#B788C4',
  },
  returnButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4B0082',
  },

  emptyContainer: {
  alignItems: 'center',
  justifyContent: 'flex-start',
  marginTop: 40, // ose 30-50 për pozicionim më të lartë
},

  emptyText: {
    color: '#ccc',
    fontSize: 16,
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 500,
    backgroundColor: '#350064',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: '#ccc',
    fontFamily: 'Montserrat-ExtraLightItalic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalConfirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCancelButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
  },
});
