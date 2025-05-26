import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Profile() {
  const { uid } = useLocalSearchParams();
  const currentUser = getAuth().currentUser;
  const userId = uid || currentUser?.uid;

  const [data, setData] = useState<any>(null);
  const [completedDares, setCompletedDares] = useState<any[]>([]);
  const [postedDares, setPostedDares] = useState<any[]>([]);
  const [acceptedDares, setAcceptedDares] = useState<any[]>([]);
  const [declinedDares, setDeclinedDares] = useState<any[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'completed' | 'posted' | 'accepted' | 'declined'>('completed');

  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, (snap) => {
      const val = snap.val();
      setData(val);
      setBadges(val?.badges || []);
    });

    const daresRef = ref(db, 'dares');
    onValue(daresRef, (snap) => {
      const all = snap.val() || {};

      const completed = Object.keys(all)
        .filter((key) =>
          (all[key].acceptedBy === userId || all[key].acceptedBy?.[userId]) &&
          all[key].status === 'completed'
        )
        .map((key) => ({ id: key, ...all[key] }));

      const posted = Object.keys(all)
        .filter((key) => all[key].userId === userId)
        .map((key) => ({ id: key, ...all[key] }));

      const accepted = Object.keys(all)
        .filter((key) =>
          all[key].acceptedBy === userId || all[key].acceptedBy?.[userId]
        )
        .map((key) => ({ id: key, ...all[key] }));

      const declined = Object.keys(all)
        .filter((key) => all[key].declinedBy?.[userId])
        .map((key) => ({ id: key, ...all[key] }));

      setPostedDares(posted);
      setAcceptedDares(accepted);
      setDeclinedDares(declined);
      setCompletedDares(completed);
      setLoading(false);
    });
  }, [userId]);

  const handleLogout = async () => {
    try {
      await getAuth().signOut();
      router.replace('/login');
    } catch {
      alert('Logout failed.');
    }
  };

  const getViewData = () => {
    switch (viewMode) {
      case 'completed':
        return completedDares;
      case 'posted':
        return postedDares;
      case 'accepted':
        return acceptedDares;
      case 'declined':
        return declinedDares;
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.container}>
      <FlatList
        data={getViewData()}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{data?.email?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 16 }}>{data?.email || 'Anonymous'}</Text>
            </View>

            <Text style={styles.subtitle}>Dares Posted: {postedDares.length}</Text>
            <Text style={styles.subtitle}>Dares Accepted: {acceptedDares.length}</Text>
            <Text style={styles.subtitle}>Dares Declined: {declinedDares.length}</Text>
            <Text style={styles.subtitle}>Dares Completed: {completedDares.length}</Text>

            <Text style={styles.subtitle}>Badges:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
              {badges.length > 0 ? (
                badges.map((b, i) => (
                  <View key={i} style={styles.badgeItem}>
                    <Text style={{ color: '#fff' }}>{b}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.badges}>No badges yet.</Text>
              )}
            </View>

            <View style={styles.toggleButtons}>
              {['completed', 'posted', 'accepted', 'declined'].map((mode) => (
                <TouchableOpacity key={mode} onPress={() => setViewMode(mode as any)}>
                  <Text
                    style={[
                      styles.subtitle,
                      viewMode === mode && styles.activeTab,
                      { marginHorizontal: 5 },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.subtitle, { marginTop: 10 }]}>Challenges:</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.dareItem}>
            <Text style={styles.dareTitle}>
              {viewMode === 'completed' ? '✔' : viewMode === 'posted' ? '📢' : viewMode === 'accepted' ? '👍' : '❌'}{' '}
              {item.challenge}
            </Text>
            <Text style={styles.dareReward}>Reward: {item.reward}</Text>
          </View>
        )}
        ListFooterComponent={
          !uid ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 32, color: '#4B0082', fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { color: '#fff', fontSize: 16, marginBottom: 10 },
  activeTab: { textDecorationLine: 'underline', fontWeight: 'bold' },
  badges: { color: '#fff', fontStyle: 'italic' },
  badgeItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 6,
    margin: 4,
  },
  dareItem: {
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 12,
    borderRadius: 8,
  },
  dareTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dareReward: { color: '#ccc' },
  toggleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  logoutButton: {
    backgroundColor: '#6A0DAD',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
