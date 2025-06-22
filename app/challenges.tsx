// challenges.tsx

import React, { useEffect, useState, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Modal,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ViewStyle,
  TextStyle,
  Button,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update, remove, push, get } from 'firebase/database';
import { Swipeable } from 'react-native-gesture-handler';
import { router, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import { sendNotification } from '../notificationsHelper';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import Head from 'expo-router/head';

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dw0p7uxa6';
const CLOUDINARY_UPLOAD_PRESET = 'dareme_private';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

const isWeb = Platform.OS === 'web';
const SwipeableWrapper = ({ children, ...props }) =>
  isWeb ? <View>{children}</View> : <Swipeable {...props}>{children}</Swipeable>;

const CATEGORIES = ['All', 'Fitness', 'Social', 'Adventure'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function Challenges() {
  const [fontsLoaded] = useFonts({
    'Montserrat-SemiBold': require('../assets/fonts/static/Montserrat-SemiBold.ttf'),
    'Montserrat-ExtraLightItalic': require('../assets/fonts/static/Montserrat-ExtraLightItalic.ttf'),
    'Montserrat-Thin': require('../assets/fonts/static/Montserrat-Thin.ttf'),
    'Montserrat-SemiBoldItalic': require('../assets/fonts/static/Montserrat-SemiBoldItalic.ttf'),
  });

  interface Dare {
    id: string;
    challenge: string;
    reward: string;
    status?: string;
    acceptedBy?: string;
    likedBy?: string[];
    evidence?: string;
    evidenceType?: string;
    evidenceUrl?: string;
    evidenceExpires?: string;
    completedAt?: string;
    aiAnalysis?: {
      tags: string[];
      description: string;
    };
    category?: string;
    difficulty?: string;
    criteria?: string[];
    [key: string]: any; // Add this to allow additional properties
  }

  const [dares, setDares] = useState<Dare[]>([]);
  const [selectedDare, setSelectedDare] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [randomCategory, setRandomCategory] = useState('');
  const [randomDifficulty, setRandomDifficulty] = useState('');
  const [randomDare, setRandomDare] = useState<Dare | null>(null);
  const [randomError, setRandomError] = useState('');
  const [randomLoading, setRandomLoading] = useState(false);

  interface Comment {
    id: string;
    userId: string;
    username: string;
    text: string;
    timestamp: string;
  }

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedDareForMenu, setSelectedDareForMenu] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedChallenge, setEditedChallenge] = useState('');
  const [editedReward, setEditedReward] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<{ url: string; type: string } | null>(null);
  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingDareId, setUploadingDareId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timedOutModalVisible, setTimedOutModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [dareIdToDelete, setDareIdToDelete] = useState<string | null>(null);
  const [replies, setReplies] = useState<{ [commentId: string]: Comment[] }>({});
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToText, setReplyToText] = useState<string | null>(null);
  const [confirmAcceptVisible, setConfirmAcceptVisible] = useState(false);
  const [confirmDeclineVisible, setConfirmDeclineVisible] = useState(false);
  const [dareIdToConfirm, setDareIdToConfirm] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [likeModalVisible, setLikeModalVisible] = useState(false);
  const [likedUsers, setLikedUsers] = useState<string[]>([]);
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchLikedUsers = async (likedBy: string[]) => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const names = likedBy.map((uid) => data[uid]?.username || data[uid]?.email || 'User');
      setLikedUsers(names);
      setLikeModalVisible(true);
    }
  };

  const routerInstance = useRouter();
  const user = auth.currentUser;

  // --- Effects ---

  useEffect(() => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersArray = Object.entries(data).map(([uid, user]: any) => ({
          uid,
          name: user.username || user.email || 'User',
          points: user.points || 0,
          completedCount: Object.values(user?.acceptedDares || {}).filter((d: any) => d.status === 'completed').length || 0,
        }));

        const sorted = usersArray.sort((a, b) => b.points - a.points);
        setLeaderboard(sorted);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setPoints(data.points || 0);
        setBadges(data.badges || []);
      }
    });
  }, [user]);

  useEffect(() => {
    if (fontsLoaded) setIsReady(true);
  }, [fontsLoaded]);

  useEffect(() => {
    if (replyToId && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [replyToId]);

  useEffect(() => {
    const daresRef = ref(db, 'dares');
    const unsubscribe = onValue(daresRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
            likes: data[key].likedBy ? data[key].likedBy.length : 0,
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setDares(arr);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const pointsRef = ref(db, `users/${user.uid}/points`);
    onValue(pointsRef, (snap) => {
      if (snap.exists()) {
        setPoints(snap.val());
      } else {
        setPoints(0);
      }
    });
  }, [user]);

  useEffect(() => {
    if (isWeb) {
      const resize = () => setIsSmallScreen(window.innerWidth < 500);
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
  }, []);

  const handleAcceptDare = async (dareId) => {
    try {
      if (!user) return Alert.alert('Error', 'You must be logged in to accept a dare.');

      const dareRef = ref(db, `dares/${dareId}`);
      const timestamp = new Date().toISOString();

      await update(dareRef, {
        status: 'in-progress',
        acceptedBy: {
          [user.uid]: true,
        },
        acceptedAt: timestamp,
      });

      await update(ref(db, `users/${user.uid}/acceptedDares/${dareId}`), {
        status: 'in-progress',
        acceptedAt: timestamp,
      });

      Alert.alert('Success', 'Dare accepted!');
    } catch {
      Alert.alert('Error', 'Failed to accept dare.');
    }
  };

  const handleDeleteDare = async () => {
    try {
      await remove(ref(db, `dares/${selectedDareForMenu}`));
      setMenuVisible(false);
      Alert.alert('Success', 'Dare deleted.');
    } catch {
      Alert.alert('Error', 'Delete failed.');
    }
  };

  const handleLikeDare = async (dareId: string, likedBy: string[] = []) => {
    try {
      if (!user) return Alert.alert('Error', 'You must be logged in to like a dare.');

      const dare = dares.find((d) => d.id === dareId);
      if (!dare || !dare.userId) return;

      const isLiking = !likedBy.includes(user.uid);
      const newLiked = isLiking
        ? [...likedBy, user.uid]
        : likedBy.filter((u) => u !== user.uid);

      await update(ref(db, `dares/${dareId}`), { likedBy: newLiked });

      if (isLiking && dare.userId !== user.uid) {
        await addPointsToUser(dare.userId, 1);

        await push(ref(db, "notifications"), {
          type: "like",
          dareId: dare.id,
          userId: dare.userId,
          dare: {
            id: dare.id,
            challenge: dare.challenge,
          },
          likerName: user.email || user.uid,
          timestamp: Date.now(),
        });

      } else if (!isLiking && dare.userId !== user.uid) {
        await addPointsToUser(dare.userId, -1);
      }

    } catch (e) {
      console.error("Like error:", e);
      Alert.alert('Error', 'Like failed.');
    }
  };

  const addPointsToUser = async (userId: string, pointsToAdd: number) => {
    const userRef = ref(db, `users/${userId}/points`);
    const snapshot = await get(userRef);
    const currentPoints = snapshot.exists() ? snapshot.val() : 0;
    await update(ref(db, `users/${userId}`), {
      points: currentPoints + pointsToAdd
    });
  };

  const openComments = (dareId) => {
    setSelectedDare(dareId);
    setModalVisible(true);
    onValue(ref(db, `dares/${dareId}/comments`), (snap) => {
      const data = snap.val();
      if (!data) {
        setComments([]);
        setReplies({});
        return;
      }

      const commentsArray: Comment[] = [];
      const repliesMap: { [commentId: string]: Comment[] } = {};

      Object.entries(data).forEach(([commentId, commentData]: any) => {
        const { replies, ...mainComment } = commentData;

        commentsArray.push({ id: commentId, ...mainComment });

        if (replies) {
          repliesMap[commentId] = Object.entries(replies).map(([rid, replyData]: any) => ({
            id: rid,
            ...replyData,
          }));
        }
      });

      setComments(commentsArray);
      setReplies(repliesMap);
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return Alert.alert('Error', 'Comment cannot be empty.');

    try {
      if (!user) return Alert.alert('Error', 'You must be logged in to comment.');

      const commentData: Comment = {
        id: Date.now().toString(),
        userId: user.uid,
        username: user.email || 'Anonymous',
        text: newComment,
        timestamp: new Date().toISOString(),
      };

      if (replyToId) {
        await push(ref(db, `dares/${selectedDare}/comments/${replyToId}/replies`), commentData);
      } else {
        await push(ref(db, `dares/${selectedDare}/comments`), commentData);
      }

      setNewComment('');
      setReplyToText(null);
      setReplyToId(null);

      if (replyToId) {
        const index = comments.findIndex((c) => c.id === replyToId);
        if (index !== -1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5
            });
          }, 300);
        }
      }
      else {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: Number.MAX_SAFE_INTEGER,
            animated: true,
          });
        }, 300);
      }

    } catch {
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  const startEditDare = (dareId) => {
    const dare = dares.find((x) => x.id === dareId);
    if (!dare) return;

    const createdAt = new Date(dare.createdAt);
    const now = new Date();
    const minutesPassed = (now.getTime() - createdAt.getTime()) / 60000;

    if (minutesPassed > 2) {
      setTimedOutModalVisible(true);
      return;
    }

    setEditedChallenge(dare.challenge);
    setEditedReward(dare.reward);
    setEditMode(true);
  };

  const handleUpdateDare = async () => {
    try {
      await update(ref(db, `dares/${selectedDareForMenu}`), {
        challenge: editedChallenge,
        reward: editedReward,
      });
      setEditMode(false);
      setMenuVisible(false);
      Alert.alert('Success', 'Dare updated!');
    } catch {
      Alert.alert('Error', 'Update failed.');
    }
  };

  const analyzeMediaWithAzureAI = async (url, criteria) => {
    try {
      const endpoint = 'https://fatlindosmani.cognitiveservices.azure.com/';
      const key = 'Bw6HnOrW7hOTbQ2ug56DcDKJOdHyAO01dKR5dM16rQRmuazny3auJQQJ99BDACPV0roXJ3w3AAAFACOG0nPO';
      const res = await fetch(`${endpoint}/vision/v3.2/analyze?visualFeatures=Tags,Description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': key },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const tags = json.tags.map((t) => t.name);
      const desc = json.description?.captions?.[0]?.text || '';
      return { isCompleted: criteria.some((c) => tags.includes(c)), tags, description: desc };
    } catch {
      return { isCompleted: false, tags: [], description: '' };
    }
  };

  const handleUploadEvidence = async (dareId) => {
    try {
      setIsLoading(true);
      setUploadingDareId(dareId);

      const snap = await get(ref(db, `dares/${dareId}`));
      const crit = snap.val()?.criteria;
      if (!crit) {
        Alert.alert('Error', 'No criteria found.');
        setIsLoading(false);
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Error', 'Permission denied.');
        setIsLoading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const uri = result.assets[0].uri;
      const isVid = uri.endsWith('.mp4') || uri.endsWith('.mov');
      const ext = uri.split('.').pop();
      const mime = isVid ? (ext === 'mov' ? 'video/quicktime' : 'video/mp4') : (ext === 'png' ? 'image/png' : 'image/jpeg');
      const form = new FormData();
      form.append('file', { uri, name: `evidence_${Date.now()}.${ext}`, type: mime } as any);
      form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      form.append('folder', 'dareme_private');

      const up = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: form });
      const uj = await up.json();
      if (!uj.secure_url) throw new Error('Upload failed');

      const ai = await analyzeMediaWithAzureAI(uj.secure_url, crit);
      const updateData = {
        evidence: uj.public_id,
        evidenceType: isVid ? 'video' : 'image',
        evidenceUrl: uj.secure_url,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };
      if (ai.isCompleted) {
        updateData['aiAnalysis'] = ai;
      } else {
        let reason = "Evidence does not meet the challenge criteria.";

        if (!ai.tags.includes("person") && !ai.tags.includes("face")) {
          reason = "❌ Face or person not visible in the media.";
        } else if (
          ai.description.toLowerCase().includes("object") ||
          ai.tags.includes("indoor")
        ) {
          reason = "❌ Media appears unrelated to the challenge (e.g., random object or indoor scene).";
        } else if (ai.tags.length === 0) {
          reason = "❌ AI could not analyze or recognize anything meaningful from the media.";
        }

        Alert.alert(
          "Evidence Rejected",
          reason,
          [
            {
              text: "Retry",
              onPress: () => handleUploadEvidence(dareId)
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
        setIsLoading(false);
        return;

      }

      await update(ref(db, `dares/${dareId}`), updateData);
      await addPointsToUser(user.uid, 10);
      await update(ref(db, `users/${user.uid}/acceptedDares/${dareId}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const userBadgeRef = ref(db, `users/${user.uid}/badges`);
      const userDaresRef = ref(db, `dares`);
      const userSnapshot = await get(userBadgeRef);
      const dareSnapshot = await get(userDaresRef);

      if (dareSnapshot.exists()) {
        const allDares = dareSnapshot.val();
        const completedByUser = Object.values(allDares).filter((d: any) => d.status === 'completed' && d.acceptedBy?.[user.uid]);
        const postedByUser = Object.values(allDares).filter((d: any) => d.userId === user.uid);

        const badgesToAssign: string[] = [];

        if (completedByUser.length === 1) badgesToAssign.push('🎯 First Dare Completed');
        if (postedByUser.length === 10) badgesToAssign.push('🔥 10 Dares Posted');

        const currentBadges = userSnapshot.exists() ? userSnapshot.val() : [];
        const updatedBadges = [...new Set([...currentBadges, ...badgesToAssign])];

        await update(ref(db, `users/${user.uid}`), {
          badges: updatedBadges
        });
      }

      const dareSnap = await get(ref(db, `dares/${dareId}`));
      const dare = dareSnap.val();
      if (dare && dare.userId) {
        await push(ref(db, "notifications"), {
          type: "evidence",
          dareId,
          userId: dare.userId,
          message: `✅ Your dare: "${dare.challenge}" has been completed!`,
          timestamp: Date.now(),
        });
      }

      Alert.alert('Success', 'Evidence accepted!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Upload error');
    } finally {
      setIsLoading(false);
      setUploadingDareId(null);
    }
  };

  const isUrlExpired = (item) => {
    if (!item.evidenceExpires) return false;
    return new Date() > new Date(item.evidenceExpires);
  };

  const viewEvidence = (item) => {
    if (isUrlExpired(item)) {
      Alert.alert("Expired", "This evidence has expired and cannot be viewed.");
      return;
    }

    if (!item.evidenceUrl) {
      Alert.alert("Error", "No evidence URL found for this item.");
      return;
    }

    setSelectedEvidence({
      url: item.evidenceUrl,
      type: item.evidenceType || "image",
    });
    setEvidenceModalVisible(true);
  };

  const handleMarkAsCompleted = async (dareId) => {
    try {
      await update(ref(db, `dares/${dareId}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Dare marked as completed!');
    } catch {
      Alert.alert('Error', 'Failed to mark dare as completed.');
    }
  };

  const handleGetRandomDare = () => {
    setRandomError('');
    setRandomDare(null);
    setRandomLoading(true);
    // Filter dares by selected category and difficulty
    const filtered = dares.filter(
      d =>
        (!randomCategory || d.category === randomCategory) &&
        (!randomDifficulty || d.difficulty === randomDifficulty)
    );
    if (filtered.length === 0) {
      setRandomError('No dare found for this selection.');
      setRandomLoading(false);
      return;
    }
    const idx = Math.floor(Math.random() * filtered.length);
    setRandomDare(filtered[idx]);
    setRandomLoading(false);
  };

  const filteredDares = selectedCategory === 'All'
    ? dares
    : dares.filter((d) => d.category === selectedCategory);

  const renderDare = ({ item }) => {
    const isOwner = user?.uid === item.userId;
    const isAccepted = item.acceptedBy === user?.uid;
    const isUploading = uploadingDareId === item.id;
    const expired = isUrlExpired(item);

    return (
      <SwipeableWrapper>
        <View style={styles.dareItem}>
          <View style={styles.rowTop}>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDareForMenu(item.id);
                  setMenuVisible(true);
                }}
              >
                <Feather name="more-vertical" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
          <Text style={styles.dareText}>Reward: {item.reward}</Text>
          <View style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Feather name="user" size={16} color="#ccc" style={{ marginRight: 6 }} />
              <Text style={styles.statusText}>
                Posted by: <Text style={{ color: '#fff' }}>{item.username || 'Anonymous'}</Text>
              </Text>
            </View>

            {item.userId !== user?.uid && (
              <TouchableOpacity
                onPress={() => routerInstance.push(`/profile?uid=${item.userId}`)}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#5A189A',
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Feather name="arrow-right" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontFamily: 'Montserrat-SemiBold', fontSize: 12 }}>
                  View Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.statusText}>
            Status:{" "}
            {/* Shfaq "Completed" vetëm për përdoruesin që e ka përfunduar */}
            {item.status === "completed" && item.acceptedBy && item.acceptedBy[user?.uid]
              ? "Completed"
              : item.status === "in-progress" && item.acceptedBy && item.acceptedBy[user?.uid]
                ? "In Progress"
                : "Available"}
          </Text>


          <View
            style={[
              styles.row,
              isSmallScreen && { flexDirection: "column", alignItems: "flex-start" },
            ]}
          >
            <View
              style={[
                styles.likeContainer,
                isSmallScreen && { width: "100%", marginBottom: 5 },
              ]}
            >
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => fetchLikedUsers(item.likedBy || [])}
              >
                <Feather
                  name="users"
                  size={16}
                  color="#fff"
                  styles={styles.actionIcon}
                />
                <Text style={styles.actionText}>
                  {item.likes} {item.likes === 1 ? 'Like' : 'Likes'}
                </Text>
              </TouchableOpacity>

              {!isOwner && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    item.likedBy?.includes(user?.uid) && { backgroundColor: '#ff6b6b' }
                  ]}
                  onPress={() => handleLikeDare(item.id, item.likedBy || [])}
                >
                  <Feather
                    name="thumbs-up"
                    size={16}
                    color="#fff"
                    styles={styles.actionIcon}
                  />
                  <Text style={styles.actionText}>
                    {item.likedBy?.includes(user?.uid) ? 'Unlike' : 'Like'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openComments(item.id)}
            >
              <Feather
                name="message-circle"
                size={16}
                color="#fff"
                styles={styles.actionIcon}
              />
              <Text style={styles.actionText}>Comments</Text>
            </TouchableOpacity>
          </View>

          {!isOwner && (!item.acceptedBy || !item.acceptedBy[user?.uid]) && (!item.declinedBy || !item.declinedBy[user?.uid]) && (
            <View style={[styles.row, isSmallScreen && { flexDirection: "column", alignItems: "flex-start" }]}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => {
                  setDareIdToConfirm(item.id);
                  setConfirmAcceptVisible(true);
                }}
              >
                <Feather name="check" size={16} color="#fff" styles={styles.actionIcon} />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  setDareIdToConfirm(item.id);
                  setConfirmDeclineVisible(true);
                }}
              >
                <Feather name="x" size={16} color="#fff" styles={styles.actionIcon} />
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}


          {item.status === "in-progress" &&
            isAccepted &&
            (isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadingText}>Uploading evidence...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUploadEvidence(item.id)}
                disabled={isLoading}
              >
                <Feather
                  name="upload"
                  size={16}
                  color="#fff"
                  styles={styles.actionIcon}
                />
                <Text style={styles.uploadButtonText}>Upload Evidence</Text>
              </TouchableOpacity>
            ))}

          {item.evidence && (
            <View style={styles.evidenceContainer}>
              {expired ? (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>Evidence has expired</Text>
                </View>
              ) : item.evidenceType === 'video' ? (
                <View>
                  <Text style={styles.evidenceText}>Video evidence uploaded</Text>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => viewEvidence(item)}
                    disabled={isLoading}
                  >
                    <Text style={styles.viewButtonText}>
                      {isLoading ? 'Loading...' : 'View Video'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => viewEvidence(item)}
                  disabled={isLoading}
                >

                </TouchableOpacity>
              )}

              {item.evidenceExpires && !expired && (
                <Text style={styles.expiresText}>
                  Evidence available until: {new Date(item.evidenceExpires).toLocaleString()}
                </Text>
              )}

              {item.aiAnalysis && (
                <View style={styles.aiAnalysisContainer}>
                  <Text style={styles.aiAnalysisTitle}>AI Analysis:</Text>
                  <Text>Tags: {item.aiAnalysis.tags?.join(', ') || 'No tags available'}</Text>
                  <Text>Description: {item.aiAnalysis.description || 'No description available'}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </SwipeableWrapper>
    );
  };

  const handleLogout = async () => {
    try {
      if (isWeb) {
        const { signOut } = require('firebase/auth');
        await signOut(auth);
      } else {
        await auth.signOut();
      }
      routerInstance.replace('/login');
    } catch {
      Alert.alert('Error', 'Logout failed.');
    }
  };

  if (!isReady || isLoading) {
    return (
      <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />

        <Modal visible={sidebarVisible} transparent animationType="slide" onRequestClose={() => setSidebarVisible(false)}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{
              width: 250,
              backgroundColor: '#350064',
              paddingVertical: 40,
              paddingHorizontal: 20
            }}>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/profile');
              }}>
                <Feather name="user" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                setLeaderboardVisible(true);
              }}>
                <Feather name="bar-chart" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/my-dares');
              }}>
                <Feather name="list" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>My Accepted Dares</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 30 }} onPress={() => {
                setSidebarVisible(false);
                handleLogout();
              }}>
                <Feather name="log-out" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>Logout</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
          </View>
        </Modal>

      </LinearGradient>
    );
  }

  return (
    <>
      <Head>
        <title>DareMe | Challenges</title>
        <meta name="description"
          content="Browse and accept dares on DareMe"
        />
      </Head>
      <LinearGradient
        colors={['#4B0082', '#B788C4']}
        style={styles.gradient}
      >

        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={{ position: 'absolute', top: 10, left: 10, zIndex: 99 }}>
          <Feather name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Feather
              name="award"
              size={40}
              color="#fff"
            />
            <Text style={styles.title}>Available Dares</Text>
            <View style={{
              marginTop: 20,
              marginBottom: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}>
              <Feather name="star" size={20} color="#FFD700" style={{ marginRight: 10 }} />
              <Text style={{
                color: '#FFD700',
                fontSize: 16,
                fontFamily: 'Montserrat-SemiBold',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
                Your Points: {points}
              </Text>
            </View>

            {badges.length > 0 && (
              <Text style={{ color: '#fff', fontStyle: 'italic', marginTop: 5 }}>
                🏅 Badges: {badges.join(', ')}
              </Text>
            )}

            <TextInput
              placeholder="Search dare or email..."
              placeholderTextColor="#ccc"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.input, { marginBottom: 15 }]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={{
                    padding: 10,
                    marginHorizontal: 5,
                    borderRadius: 20,
                    backgroundColor: selectedCategory === cat ? '#4B0082' : '#eee',
                  }}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={{ color: selectedCategory === cat ? '#fff' : '#333' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[styles.buttonContainer, isSmallScreen && { flexDirection: 'column' }]}>
            <TouchableOpacity style={[styles.mainButton, isSmallScreen && { width: '100%' }]} onPress={() => routerInstance.push('/create-dare')}>
              <Feather
                name="plus-circle"
                size={18}
                color="#fff"
                styles={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Post a Dare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => routerInstance.push("/notifications")}
            >
              <Feather
                name="bell"
                size={18}
                color="#fff"
                styles={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Notifications</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: 18,
            marginBottom: 18,
            alignItems: 'center'
          }}>
            <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Montserrat-SemiBold', marginBottom: 10 }}>
              🎲 Get a Random Dare
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={{
                    padding: 8,
                    marginHorizontal: 4,
                    borderRadius: 16,
                    backgroundColor: randomCategory === cat ? '#4B0082' : '#eee',
                  }}
                  onPress={() => setRandomCategory(cat)}
                >
                  <Text style={{ color: randomCategory === cat ? '#fff' : '#333' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {DIFFICULTY_OPTIONS.map(level => (
                <TouchableOpacity
                  key={level}
                  style={{
                    padding: 8,
                    marginHorizontal: 4,
                    borderRadius: 16,
                    backgroundColor: randomDifficulty === level ? '#4B0082' : '#eee',
                  }}
                  onPress={() => setRandomDifficulty(level)}
                >
                  <Text style={{ color: randomDifficulty === level ? '#fff' : '#333' }}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#6A0DAD',
                paddingVertical: 10,
                paddingHorizontal: 24,
                borderRadius: 10,
                marginTop: 5,
                opacity: randomCategory && randomDifficulty ? 1 : 0.5
              }}
              onPress={handleGetRandomDare}
              disabled={!randomCategory || !randomDifficulty || randomLoading}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {randomLoading ? 'Loading...' : 'Get Random Dare'}
              </Text>
            </TouchableOpacity>
            {randomError ? (
              <Text style={{ color: 'red', marginTop: 10 }}>{randomError}</Text>
            ) : null}
            {randomDare && (
              <View style={{
                marginTop: 18,
                backgroundColor: 'rgba(255,255,255,0.09)',
                borderRadius: 12,
                padding: 14,
                width: '100%',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{randomDare.challenge}</Text>
                <Text style={{ color: '#fff', marginTop: 6 }}>Reward: {randomDare.reward}</Text>
                <Text style={{ color: '#fff', marginTop: 6 }}>Category: {randomDare.category}</Text>
                <Text style={{ color: '#fff', marginTop: 6 }}>Difficulty: {randomDare.difficulty}</Text>
                <Text style={{ color: '#fff', marginTop: 6, fontStyle: 'italic' }}>
                  Criteria: {Array.isArray(randomDare.criteria) ? randomDare.criteria.join(', ') : randomDare.criteria}
                </Text>
                {/* Accept/Decline Buttons */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#4CAF50',
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                      marginRight: 8,
                    }}
                    onPress={() => {
                      setDareIdToConfirm(randomDare.id);
                      setConfirmAcceptVisible(true);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#ff6b6b',
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      setDareIdToConfirm(randomDare.id);
                      setConfirmDeclineVisible(true);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <FlatList
            data={filteredDares.filter(
              (d) =>
                (d.challenge.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.username || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
                !(d.declinedBy && d.declinedBy[user?.uid])
            )}
            keyExtractor={(i) => i.id}
            renderItem={renderDare}
            contentContainerStyle={styles.list}
          />

          <Modal visible={modalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Comments</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x"
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
                <FlatList
                  ref={flatListRef}
                  data={comments}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{item.username}:</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <Text style={styles.commentTime}>{new Date(item.timestamp).toLocaleString()}</Text>

                      <TouchableOpacity onPress={() => {
                        setReplyToId(item.id);
                        setReplyToText(item.text);
                      }}>
                        <Text style={{ color: '#ccc', fontSize: 13 }}>Reply</Text>
                      </TouchableOpacity>

                      {replies[item.id]?.map((reply) => (
                        <View key={reply.id} style={{ marginLeft: 20, marginTop: 5 }}>
                          <Text style={styles.commentAuthor}>{reply.username}:</Text>
                          <Text style={styles.commentText}>{reply.text}</Text>
                          <Text style={styles.commentTime}>{new Date(reply.timestamp).toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  contentContainerStyle={styles.commentsList}
                  style={{ maxHeight: 300 }}
                  showsVerticalScrollIndicator={true}
                  getItemLayout={(data, index) => ({
                    length: 85,
                    offset: 85 * index,
                    index,
                  })}
                  onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToOffset({
                        offset: info.averageItemLength * info.index,
                        animated: true,
                      });
                    }, 300);
                  }}
                />

                <View style={styles.commentInputContainer}>
                  <TextInput
                    ref={commentInputRef}
                    style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                    placeholder="Add a comment..."
                    placeholderTextColor="#ccc"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                        nativeEvent.preventDefault?.();
                        handleAddComment();
                      }
                    }}
                  />

                  {replyToId && (
                    <TouchableOpacity
                      onPress={() => {
                        setReplyToId(null);
                        setReplyToText(null);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        alignSelf: 'flex-start',
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text
                        style={{
                          color: '#CCCCFF',
                          fontFamily: 'Montserrat-SemiBold',
                          fontSize: 14,
                        }}
                      >
                        Cancel Reply
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
                    <Feather name="send"
                      size={20}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={menuVisible} transparent animationType="fade">
            <View style={styles.menuModal}>
              <View style={styles.menuContent}>
                {editMode ? (
                  <>
                    <Text style={styles.menuTitle}>Edit Dare</Text>
                    <TextInput style={styles.menuInput}
                      value={editedChallenge}
                      onChangeText={setEditedChallenge}
                      placeholder="Challenge"
                      placeholderTextColor="#ccc"
                    />
                    <TextInput style={styles.menuInput}
                      value={editedReward}
                      onChangeText={setEditedReward}
                      placeholder="Reward"
                      placeholderTextColor="#ccc"
                    />
                    <TouchableOpacity style={styles.menuButton}
                      onPress={handleUpdateDare}>
                      <Text style={styles.menuButtonText}>Save
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuButton, styles.cancelButton]}
                      onPress={() => setEditMode(false)}>
                      <Text style={styles.menuButtonText}>Cancel
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.menuTitle}>Options</Text>
                    <TouchableOpacity style={styles.menuOption}
                      onPress={() => startEditDare(selectedDareForMenu)}>
                      <Feather name="edit"
                        size={20}
                        color="#fff"
                        styles={styles.menuIcon}
                      />
                      <Text style={styles.menuOptionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuOption}
                      onPress={() => {
                        setDareIdToDelete(selectedDareForMenu);
                        setDeleteConfirmVisible(true);
                      }}
                    >
                      <Feather
                        name="trash-2"
                        size={20}
                        color="#ff6b6b"
                        styles={styles.menuIcon}
                      />
                      <Text style={[styles.menuOptionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuButton, styles.closeButton]}
                      onPress={() => setMenuVisible(false)}>
                      <Text style={styles.menuButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={leaderboardVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setLeaderboardVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { maxHeight: 450 }]}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.modalTitle}>🏆 Leaderboard</Text>
                  <Text style={{ color: '#ccc', fontSize: 13, fontStyle: 'italic' }}>
                    See who's leading the dare challenge!
                  </Text>
                </View>
                <TextInput
                  placeholder="Search users..."
                  placeholderTextColor="#ccc"
                  value={leaderboardSearch}
                  onChangeText={setLeaderboardSearch}
                  style={[styles.input, { marginBottom: 15 }]}
                />

                <FlatList
                  data={leaderboard
                    .map((item, i) => ({ ...item, realIndex: i }))
                    .filter((item) =>
                      item.name.toLowerCase().includes(leaderboardSearch.toLowerCase())
                    )
                  }
                  keyExtractor={(item) => item.uid}
                  renderItem={({ item }) => {
                    const isCurrentUser = item.uid === user?.uid;

                    let medal = '';
                    let color = '#fff';

                    if (item.realIndex === 0) {
                      medal = '🥇';
                      color = '#FFD700';
                    } else if (item.realIndex === 1) {
                      medal = '🥈';
                      color = '#C0C0C0';
                    } else if (item.realIndex === 2) {
                      medal = '🥉';
                      color = '#CD7F32';
                    }

                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 10,
                          backgroundColor: isCurrentUser
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(255,255,255,0.05)',
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: isCurrentUser ? 1 : 0,
                          borderColor: isCurrentUser ? '#FFD700' : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 18, width: 30, color }}>
                          {medal || item.realIndex + 1}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: isCurrentUser ? '#FFD700' : '#fff',
                              fontWeight: isCurrentUser ? 'bold' : 'normal',
                              fontSize: 15,
                              fontFamily: 'Montserrat-SemiBold',
                            }}
                          >
                            {item.name}
                          </Text>
                          <Text style={{ color: '#ccc', fontSize: 13 }}>
                            Points: {item.points} | Completed: {item.completedCount}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                />

                <TouchableOpacity
                  style={[styles.menuButton, { marginTop: 10 }]}
                  onPress={() => setLeaderboardVisible(false)}
                >
                  <Text style={styles.menuButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={evidenceModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setEvidenceModalVisible(false)}
          >
            <View style={styles.evidenceModalContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEvidenceModalVisible(false)}
              >
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>

              {selectedEvidence?.type === "video" ? (
                <View style={styles.videoContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Video
                    source={{ uri: selectedEvidence.url }}
                    shouldPlay
                    useNativeControls
                    style={styles.fullScreenVideo}
                  />
                </View>
              ) : (
                selectedEvidence && (
                  <WebView
                    source={{
                      html: `
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                              body {
                                margin: 0;
                                padding: 0;
                                background: black;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                              }
                              img {
                                max-width: 100%;
                                max-height: 100%;
                                object-fit: contain;
                              }
                            </style>
                          </head>
                          <body>
                            <img src="${selectedEvidence.url}" />
                          </body>
                        </html>
                      `,
                    }}
                    style={styles.fullScreenImage}
                    onError={(e) => {
                      console.error("WebView error:", e);
                      Alert.alert(
                        "Error",
                        "Failed to load the image. It may have expired or is unavailable."
                      );
                      setEvidenceModalVisible(false);
                    }}
                  />
                )
              )}
            </View>
          </Modal>
        </View>

        <Modal
          visible={timedOutModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTimedOutModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Timed Out</Text>
              <Text style={[styles.commentText, { marginBottom: 15 }]}>
                You can no longer edit this dare because more than 2 minutes have passed.
              </Text>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setTimedOutModalVisible(false)}
              >
                <Text style={styles.menuButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={likeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLikeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: 400 }]}>
              <Text style={styles.modalTitle}>👍 Liked By</Text>

              <FlatList
                data={likedUsers}
                keyExtractor={(item, index) => index.toString()}
                style={{ marginBottom: 10 }}
                contentContainerStyle={{ paddingVertical: 5 }}
                renderItem={({ item }) => (
                  <Text style={{
                    fontSize: 17,
                    color: '#fff',
                    fontFamily: 'Montserrat-SemiBold',
                    marginBottom: 10
                  }}>
                    • {item}
                  </Text>
                )}
              />

              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setLikeModalVisible(false)}
              >
                <Text style={styles.menuButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deleteConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <Text style={[styles.commentText, { marginBottom: 15 }]}>
                Are you sure you want to delete this dare?
              </Text>

              <TouchableOpacity
                style={styles.menuButton}
                onPress={async () => {
                  if (dareIdToDelete) {
                    await remove(ref(db, `dares/${dareIdToDelete}`));
                    setMenuVisible(false);
                  }
                  setDeleteConfirmVisible(false);
                }}
              >
                <Text style={styles.menuButtonText}>Yes, Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.menuButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={sidebarVisible} transparent animationType="slide" onRequestClose={() => setSidebarVisible(false)}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{
              width: 250,
              backgroundColor: '#350064',
              paddingVertical: 40,
              paddingHorizontal: 20
            }}>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/profile');
              }}>
                <Feather name="user" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                setLeaderboardVisible(true);
              }}>
                <Feather name="bar-chart" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/my-dares');
              }}>
                <Feather name="list" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>My Accepted Dares</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 30 }} onPress={() => {
                setSidebarVisible(false);
                handleLogout();
              }}>
                <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => {
                  setSidebarVisible(false);
                  routerInstance.push('/declined');
                }}>
                  <Feather name="slash" size={20} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 10 }}>Declined Dares</Text>
                </TouchableOpacity>

                <Feather name="log-out" size={20} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 10 }}>Logout</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
          </View>
        </Modal>

      </LinearGradient>
      <Modal
        visible={confirmAcceptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAcceptVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Accept</Text>
            <Text style={[styles.commentText, { marginBottom: 15 }]}>
              Are you sure you want to accept this dare?
            </Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={async () => {
                if (dareIdToConfirm) await handleAcceptDare(dareIdToConfirm);
                setConfirmAcceptVisible(false);
              }}
            >
              <Text style={styles.menuButtonText}>Yes, Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, styles.cancelButton]}
              onPress={() => setConfirmAcceptVisible(false)}
            >
              <Text style={styles.menuButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmDeclineVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeclineVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Decline</Text>
            <Text style={[styles.commentText, { marginBottom: 15 }]}>
              Are you sure you want to decline this dare?
            </Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={async () => {
                if (!dareIdToConfirm || !user) return;
                const dare = dares.find((d) => d.id === dareIdToConfirm);
                await update(ref(db, `dares/${dareIdToConfirm}`), {
                  declinedBy: {
                    ...(dare?.declinedBy || {}),
                    [user.uid]: true,
                  },
                  status: "declined"
                });
                setConfirmDeclineVisible(false);
              }}
            >
              <Text style={styles.menuButtonText}>Yes, Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, styles.cancelButton]}
              onPress={() => setConfirmDeclineVisible(false)}
            >
              <Text style={styles.menuButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create<{
  gradient: ViewStyle;
  loadingContainer: ViewStyle;
  container: ViewStyle;
  headerContainer: ViewStyle;
  title: TextStyle;
  buttonContainer: ViewStyle;
  mainButton: ViewStyle;
  buttonText: TextStyle;
  buttonIcon: ViewStyle;
  list: ViewStyle;
  dareItem: ViewStyle;
  rowTop: ViewStyle;
  dareText: TextStyle;
  statusText: TextStyle;
  row: ViewStyle;
  likeContainer: ViewStyle;
  likeCount: TextStyle;
  actionButton: ViewStyle;
  actionIcon: ViewStyle;
  actionText: TextStyle;
  acceptButton: ViewStyle;
  acceptText: TextStyle;
  rejectButton: ViewStyle;
  rejectText: TextStyle;
  uploadButton: ViewStyle;
  uploadButtonText: TextStyle;
  uploadingContainer: ViewStyle;
  uploadingText: TextStyle;
  evidenceContainer: ViewStyle;
  evidenceTitle: TextStyle;
  evidenceText: TextStyle;
  evidenceImage: ViewStyle;
  evidenceImagePlaceholder: ViewStyle;
  viewFullText: TextStyle;
  viewButton: ViewStyle;
  viewButtonText: TextStyle;
  completedText: TextStyle;
  expiresText: TextStyle;
  expiredContainer: ViewStyle;
  expiredText: TextStyle;
  aiAnalysisContainer: ViewStyle;
  aiAnalysisTitle: TextStyle;
  logoutButton: ViewStyle;
  logoutText: TextStyle;
  modalOverlay: ViewStyle;
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  commentsList: ViewStyle;
  commentItem: ViewStyle;
  commentAuthor: TextStyle;
  commentText: TextStyle;
  commentInputContainer: ViewStyle;
  input: TextStyle;
  addCommentButton: ViewStyle;
  menuModal: ViewStyle;
  menuContent: ViewStyle;
  menuTitle: TextStyle;
  menuInput: TextStyle;
  menuButton: ViewStyle;
  menuButtonText: TextStyle;
  cancelButton: ViewStyle;
  closeButton: ViewStyle;
  menuOption: ViewStyle;
  menuIcon: ViewStyle;
  menuOptionText: TextStyle;
  deleteText: TextStyle;
  evidenceModalContainer: ViewStyle;
  fullScreenImage: ViewStyle;
  videoContainer: ViewStyle;
  fullScreenVideo: ViewStyle;
}>({
  gradient: {
    flex: 1
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 20
  },

  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 50
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10
  },

  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A0DAD',
    padding: 12,
    borderRadius: 10
  },

  buttonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Montserrat-SemiBold'
  },

  buttonIcon: {
    marginRight: 8
  },

  list: {
    paddingBottom: 20
  },

  dareItem: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  rowTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10
  },

  dareText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
    fontFamily: 'Montserrat-SemiBold'
  },

  statusText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Montserrat-SemiBold',
    marginTop: 5
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 10
  },

  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0
  },

  likeCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginRight: 10,
    fontFamily: 'Montserrat-ExtraLightItalic'
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },

  actionIcon: {
    marginRight: 5
  },

  actionText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14
  },

  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8
  },

  acceptText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14
  },

  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8
  },

  rejectText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15
  },

  uploadButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15
  },

  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15
  },

  uploadingText: {
    marginLeft: 10,
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold'
  },

  evidenceContainer: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },

  evidenceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Montserrat-SemiBold'
  },

  evidenceText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Montserrat-ExtraLightItalic'
  },

  evidenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 5
  },

  evidenceImagePlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5
  },

  viewFullText: {
    textAlign: 'center',
    color: '#B788C4',
    marginTop: 8,
    fontFamily: 'Montserrat-SemiBoldItalic'
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 8
  },

  viewButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14
  },

  completedText: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#4AC29A',
    fontFamily: 'Montserrat-SemiBold',
    fontWeight: '700',
    fontSize: 16,
    textShadowColor: 'rgba(74, 194, 154, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  expiresText: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#FF9800',
    fontSize: 12,
    fontFamily: 'Montserrat-ExtraLightItalic'
  },

  expiredContainer: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },

  expiredText: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic'
  },

  aiAnalysisContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)'
  },

  aiAnalysisTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#fff'
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A0DAD',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },

  logoutText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    marginLeft: 8
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#4B0082',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...(isWeb ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {})
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFD700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: 'Montserrat-SemiBold',
  },

  commentsList: {
    flexGrow: 1
  },

  commentItem: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8
  },

  commentAuthor: {
    fontWeight: 'bold',
    color: '#B788C4',
    marginBottom: 5,
    fontFamily: 'Montserrat-SemiBold'
  },

  commentText: {
    color: '#fff',
    fontFamily: 'Montserrat-ExtraLightItalic'
  },

  commentInputContainer: {
    flexDirection: 'row',
    marginTop: 15
  },

  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat-SemiBold'
  },

  addCommentButton: {
    backgroundColor: '#6A0DAD',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center'
  },

  menuModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  menuContent: {
    width: '80%',
    maxWidth: 350,
    backgroundColor: '#4B0082',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: isWeb ? '80%' : '90%', overflow: isWeb ? 'scroll' : 'hidden'
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Montserrat-SemiBold'
  },

  menuInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat-SemiBold'
  },

  menuButton: {
    backgroundColor: '#6A0DAD',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },

  menuButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold'
  },

  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)'
  },

  closeButton: {
    marginTop: 5
  },

  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },

  menuIcon: {
    marginRight: 8
  },

  menuOptionText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold'
  },

  deleteText: {
    color: '#ff6b6b'
  },

  evidenceModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  fullScreenImage: {
    width: '100%',
    height: '100%'
  },

  videoContainer: {
    width: '90%',
    height: '80%'
  },

  fullScreenVideo: {
    width: '100%',
    height: '100%'
  },

  commentTime: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  }
});