"use client"

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
  ScrollView,
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
                style={styles.menuButton}
              >
                <Feather name="more-vertical" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
          <Text style={styles.dareText}>Reward: {item.reward}</Text>
          <View style={styles.userInfoContainer}>
            <View style={styles.userInfoRow}>
              <Feather name="user" size={16} color="#E8D5FF" style={{ marginRight: 8 }} />
              <Text style={styles.statusText}>
                Posted by: <Text style={styles.usernameText}>{item.username || 'Anonymous'}</Text>
              </Text>
            </View>

            {item.userId !== user?.uid && (
              <TouchableOpacity
                onPress={() => routerInstance.push(`/profile?uid=${item.userId}`)}
                style={styles.profileButton}
              >
                <Feather name="arrow-right" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.profileButtonText}>
                  View Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.statusText}>
            Status:{" "}
            <Text style={styles.statusValue}>
              {item.status === "completed" && item.acceptedBy && item.acceptedBy[user?.uid]
                ? "Completed"
                : item.status === "in-progress" && item.acceptedBy && item.acceptedBy[user?.uid]
                  ? "In Progress"
                  : "Available"}
            </Text>
          </Text>

          <View style={[styles.row, isSmallScreen && styles.rowSmall]}>
            <View style={[styles.likeContainer, isSmallScreen && styles.likeContainerSmall]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => fetchLikedUsers(item.likedBy || [])}
              >
                <Feather name="users" size={16} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionText}>
                  {item.likes} {item.likes === 1 ? 'Like' : 'Likes'}
                </Text>
              </TouchableOpacity>

              {!isOwner && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    item.likedBy?.includes(user?.uid) && styles.likedButton
                  ]}
                  onPress={() => handleLikeDare(item.id, item.likedBy || [])}
                >
                  <Feather name="thumbs-up" size={16} color="#fff" style={styles.actionIcon} />
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
              <Feather name="message-circle" size={16} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Comments</Text>
            </TouchableOpacity>
          </View>

          {!isOwner && (!item.acceptedBy || !item.acceptedBy[user?.uid]) && (!item.declinedBy || !item.declinedBy[user?.uid]) && (
            <View style={[styles.row, isSmallScreen && styles.rowSmall]}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => {
                  setDareIdToConfirm(item.id);
                  setConfirmAcceptVisible(true);
                }}
              >
                <Feather name="check" size={16} color="#fff" style={styles.actionIcon} />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  setDareIdToConfirm(item.id);
                  setConfirmDeclineVisible(true);
                }}
              >
                <Feather name="x" size={16} color="#fff" style={styles.actionIcon} />
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
                <Feather name="upload" size={16} color="#fff" style={styles.actionIcon} />
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
                  <Text style={styles.aiAnalysisText}>Tags: {item.aiAnalysis.tags?.join(', ') || 'No tags available'}</Text>
                  <Text style={styles.aiAnalysisText}>Description: {item.aiAnalysis.description || 'No description available'}</Text>
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
      <LinearGradient colors={['#1a0033', '#4B0082', '#8A2BE2', '#DA70D6']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />

        <Modal visible={sidebarVisible} transparent animationType="slide" onRequestClose={() => setSidebarVisible(false)}>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <LinearGradient
              colors={['#2D1B69', '#1a0033']}
              style={styles.sidebarContainer}
            >
              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/profile');
              }}>
                <Feather name="user" size={20} color="#fff" />
                <Text style={styles.sidebarText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                setSidebarVisible(false);
                setLeaderboardVisible(true);
              }}>
                <Feather name="bar-chart" size={20} color="#fff" />
                <Text style={styles.sidebarText}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                setSidebarVisible(false);
                routerInstance.push('/my-dares');
              }}>
                <Feather name="list" size={20} color="#fff" />
                <Text style={styles.sidebarText}>My Accepted Dares</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                setSidebarVisible(false);
                handleLogout();
              }}>
                <Feather name="log-out" size={20} color="#fff" />
                <Text style={styles.sidebarText}>Logout</Text>
              </TouchableOpacity>
            </LinearGradient>
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
        colors={['#1a0033', '#4B0082', '#8A2BE2', '#DA70D6']}
        style={styles.gradient}
      >
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButtonFixed}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.menuButtonGradient}
          >
            <Feather name="menu" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.iconContainer}
              >
                <Feather name="award" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>Available Dares</Text>
              
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.pointsContainer}
              >
                <Feather name="star" size={20} color="#FFD700" style={{ marginRight: 10 }} />
                <Text style={styles.pointsText}>
                  Your Points: {points}
                </Text>
              </LinearGradient>

              {badges.length > 0 && (
                <View style={styles.badgesContainer}>
                  <Text style={styles.badgesText}>
                    🏅 Badges: {badges.join(', ')}
                  </Text>
                </View>
              )}

              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                style={styles.searchContainer}
              >
                <Feather name="search" size={20} color="#E8D5FF" style={styles.searchIcon} />
                <TextInput
                  placeholder="Search dare or email..."
                  placeholderTextColor="rgba(232, 213, 255, 0.7)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                />
              </LinearGradient>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScrollView}
                contentContainerStyle={styles.categoriesContainer}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === cat && styles.categoryTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.buttonContainer, isSmallScreen && styles.buttonContainerSmall]}>
              <TouchableOpacity 
                style={[styles.mainButton, isSmallScreen && { width: '100%' }]} 
                onPress={() => routerInstance.push('/create-dare')}
              >
                <LinearGradient
                  colors={['#8A2BE2', '#6A0DAD']}
                  style={styles.mainButtonGradient}
                >
                  <Feather name="plus-circle" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Post a Dare</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainButton}
                onPress={() => routerInstance.push("/notifications")}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF4757']}
                  style={styles.mainButtonGradient}
                >
                  <Feather name="bell" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Notifications</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.randomDareContainer}
            >
              <Text style={styles.randomDareTitle}>
                🎲 Get a Random Dare
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
              >
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.optionButton,
                      randomCategory === cat && styles.optionButtonActive
                    ]}
                    onPress={() => setRandomCategory(cat)}
                  >
                    <Text style={[
                      styles.optionText,
                      randomCategory === cat && styles.optionTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
              >
                {DIFFICULTY_OPTIONS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      randomDifficulty === level && styles.optionButtonActive
                    ]}
                    onPress={() => setRandomDifficulty(level)}
                  >
                    <Text style={[
                      styles.optionText,
                      randomDifficulty === level && styles.optionTextActive
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.randomButton,
                  (!randomCategory || !randomDifficulty) && styles.randomButtonDisabled
                ]}
                onPress={handleGetRandomDare}
                disabled={!randomCategory || !randomDifficulty || randomLoading}
              >
                <LinearGradient
                  colors={randomCategory && randomDifficulty ? ['#6A0DAD', '#8A2BE2'] : ['#666', '#888']}
                  style={styles.randomButtonGradient}
                >
                  <Text style={styles.randomButtonText}>
                    {randomLoading ? 'Loading...' : 'Get Random Dare'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {randomError ? (
                <Text style={styles.randomErrorText}>{randomError}</Text>
              ) : null}
              {randomDare && (
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.randomDareResult}
                >
                  <Text style={styles.randomDareChallenge}>{randomDare.challenge}</Text>
                  <Text style={styles.randomDareDetail}>Reward: {randomDare.reward}</Text>
                  <Text style={styles.randomDareDetail}>Category: {randomDare.category}</Text>
                  <Text style={styles.randomDareDetail}>Difficulty: {randomDare.difficulty}</Text>
                  <Text style={styles.randomDareCriteria}>
                    Criteria: {Array.isArray(randomDare.criteria) ? randomDare.criteria.join(', ') : randomDare.criteria}
                  </Text>
                  <View style={styles.randomDareActions}>
                    <TouchableOpacity
                      style={styles.randomAcceptButton}
                      onPress={() => {
                        setDareIdToConfirm(randomDare.id);
                        setConfirmAcceptVisible(true);
                      }}
                    >
                      <Text style={styles.randomActionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.randomDeclineButton}
                      onPress={() => {
                        setDareIdToConfirm(randomDare.id);
                        setConfirmDeclineVisible(true);
                      }}
                    >
                      <Text style={styles.randomActionText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              )}
            </LinearGradient>

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
              scrollEnabled={false}
            />

            <Modal visible={modalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <LinearGradient
                  colors={['#2D1B69', '#1a0033']}
                  style={styles.modalContainer}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Comments</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Feather name="x" size={24} color="#fff" />
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
                          <Text style={styles.replyText}>Reply</Text>
                        </TouchableOpacity>

                        {replies[item.id]?.map((reply) => (
                          <View key={reply.id} style={styles.replyContainer}>
                            <Text style={styles.commentAuthor}>{reply.username}:</Text>
                            <Text style={styles.commentText}>{reply.text}</Text>
                            <Text style={styles.commentTime}>{new Date(reply.timestamp).toLocaleString()}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    contentContainerStyle={styles.commentsList}
                    style={styles.commentsListContainer}
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
                      style={styles.commentInput}
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
                        style={styles.cancelReplyButton}
                      >
                        <Text style={styles.cancelReplyText}>
                          Cancel Reply
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
                      <LinearGradient
                        colors={['#6A0DAD', '#8A2BE2']}
                        style={styles.addCommentGradient}
                      >
                        <Feather name="send" size={20} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </Modal>

            <Modal visible={menuVisible} transparent animationType="fade">
              <View style={styles.menuModal}>
                <LinearGradient
                  colors={['#2D1B69', '#1a0033']}
                  style={styles.menuContent}
                >
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
                        <Text style={styles.menuButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.menuButton, styles.cancelButton]}
                        onPress={() => setEditMode(false)}>
                        <Text style={styles.menuButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.menuTitle}>Options</Text>
                      <TouchableOpacity style={styles.menuOption}
                        onPress={() => startEditDare(selectedDareForMenu)}>
                        <Feather name="edit" size={20} color="#fff" style={styles.menuIcon} />
                        <Text style={styles.menuOptionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuOption}
                        onPress={() => {
                          setDareIdToDelete(selectedDareForMenu);
                          setDeleteConfirmVisible(true);
                        }}
                      >
                        <Feather name="trash-2" size={20} color="#ff6b6b" style={styles.menuIcon} />
                        <Text style={[styles.menuOptionText, styles.deleteText]}>Delete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.menuButton, styles.closeButton]}
                        onPress={() => setMenuVisible(false)}>
                        <Text style={styles.menuButtonText}>Close</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </LinearGradient>
              </View>
            </Modal>

            <Modal
              visible={leaderboardVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setLeaderboardVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <LinearGradient
                  colors={['#2D1B69', '#1a0033']}
                  style={[styles.modalContainer, { maxHeight: 450 }]}
                >
                  <View style={styles.leaderboardHeader}>
                    <Text style={styles.modalTitle}>🏆 Leaderboard</Text>
                    <Text style={styles.leaderboardSubtitle}>
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
                        <LinearGradient
                          colors={isCurrentUser 
                            ? ['rgba(255,215,0,0.3)', 'rgba(255,215,0,0.1)']
                            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                          style={styles.leaderboardItem}
                        >
                          <Text style={[styles.leaderboardRank, { color }]}>
                            {medal || item.realIndex + 1}
                          </Text>
                          <View style={styles.leaderboardInfo}>
                            <Text style={[
                              styles.leaderboardName,
                              isCurrentUser && styles.leaderboardNameCurrent
                            ]}>
                              {item.name}
                            </Text>
                            <Text style={styles.leaderboardStats}>
                              Points: {item.points} | Completed: {item.completedCount}
                            </Text>
                          </View>
                        </LinearGradient>
                      );
                    }}
                  />

                  <TouchableOpacity
                    style={[styles.menuButton, { marginTop: 10 }]}
                    onPress={() => setLeaderboardVisible(false)}
                  >
                    <Text style={styles.menuButtonText}>Close</Text>
                  </TouchableOpacity>
                </LinearGradient>
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
                  style={styles.evidenceCloseButton}
                  onPress={() => setEvidenceModalVisible(false)}
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
                    style={styles.evidenceCloseGradient}
                  >
                    <Feather name="x" size={24} color="#fff" />
                  </LinearGradient>
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
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={styles.modalContainer}
              >
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
              </LinearGradient>
            </View>
          </Modal>

          <Modal
            visible={likeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLikeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={[styles.modalContainer, { maxHeight: 400 }]}
              >
                <Text style={styles.modalTitle}>👍 Liked By</Text>

                <FlatList
                  data={likedUsers}
                  keyExtractor={(item, index) => index.toString()}
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ paddingVertical: 5 }}
                  renderItem={({ item }) => (
                    <Text style={styles.likedUserText}>
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
              </LinearGradient>
            </View>
          </Modal>

          <Modal
            visible={deleteConfirmVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDeleteConfirmVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={styles.modalContainer}
              >
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
              </LinearGradient>
            </View>
          </Modal>

          <Modal visible={sidebarVisible} transparent animationType="slide" onRequestClose={() => setSidebarVisible(false)}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={styles.sidebarContainer}
              >
                <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                  setSidebarVisible(false);
                  routerInstance.push('/profile');
                }}>
                  <Feather name="user" size={20} color="#fff" />
                  <Text style={styles.sidebarText}>My Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                  setSidebarVisible(false);
                  setLeaderboardVisible(true);
                }}>
                  <Feather name="bar-chart" size={20} color="#fff" />
                  <Text style={styles.sidebarText}>Leaderboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                  setSidebarVisible(false);
                  routerInstance.push('/my-dares');
                }}>
                  <Feather name="list" size={20} color="#fff" />
                  <Text style={styles.sidebarText}>My Accepted Dares</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                  setSidebarVisible(false);
                  routerInstance.push('/declined');
                }}>
                  <Feather name="slash" size={20} color="#fff" />
                  <Text style={styles.sidebarText}>Declined Dares</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                  setSidebarVisible(false);
                  handleLogout();
                }}>
                  <Feather name="log-out" size={20} color="#fff" />
                  <Text style={styles.sidebarText}>Logout</Text>
                </TouchableOpacity>
              </LinearGradient>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebarVisible(false)} />
            </View>
          </Modal>

          <Modal
            visible={confirmAcceptVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmAcceptVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={styles.modalContainer}
              >
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
              </LinearGradient>
            </View>
          </Modal>

          <Modal
            visible={confirmDeclineVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmDeclineVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#2D1B69', '#1a0033']}
                style={styles.modalContainer}
              >
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
              </LinearGradient>
            </View>
          </Modal>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create<{
  gradient: ViewStyle;
  loadingContainer: ViewStyle;
  scrollContainer: ViewStyle;
  scrollContent: ViewStyle;
  container: ViewStyle;
  headerContainer: ViewStyle;
  iconContainer: ViewStyle;
  title: TextStyle;
  pointsContainer: ViewStyle;
  pointsText: TextStyle;
  badgesContainer: ViewStyle;
  badgesText: TextStyle;
  searchContainer: ViewStyle;
  searchIcon: ViewStyle;
  searchInput: TextStyle;
  categoriesScrollView: ViewStyle;
  categoriesContainer: ViewStyle;
  categoryButton: ViewStyle;
  categoryButtonActive: ViewStyle;
  categoryText: TextStyle;
  categoryTextActive: TextStyle;
  buttonContainer: ViewStyle;
  buttonContainerSmall: ViewStyle;
  mainButton: ViewStyle;
  mainButtonGradient: ViewStyle;
  buttonText: TextStyle;
  buttonIcon: ViewStyle;
  randomDareContainer: ViewStyle;
  randomDareTitle: TextStyle;
  optionsScrollView: ViewStyle;
  optionButton: ViewStyle;
  optionButtonActive: ViewStyle;
  optionText: TextStyle;
  optionTextActive: TextStyle;
  randomButton: ViewStyle;
  randomButtonDisabled: ViewStyle;
  randomButtonGradient: ViewStyle;
  randomButtonText: TextStyle;
  randomErrorText: TextStyle;
  randomDareResult: ViewStyle;
  randomDareChallenge: TextStyle;
  randomDareDetail: TextStyle;
  randomDareCriteria: TextStyle;
  randomDareActions: ViewStyle;
  randomAcceptButton: ViewStyle;
  randomDeclineButton: ViewStyle;
  randomActionText: TextStyle;
  list: ViewStyle;
  dareItem: ViewStyle;
  rowTop: ViewStyle;
  menuButton: ViewStyle;
  dareText: TextStyle;
  userInfoContainer: ViewStyle;
  userInfoRow: ViewStyle;
  statusText: TextStyle;
  usernameText: TextStyle;
  statusValue: TextStyle;
  profileButton: ViewStyle;
  profileButtonText: TextStyle;
  row: ViewStyle;
  rowSmall: ViewStyle;
  likeContainer: ViewStyle;
  likeContainerSmall: ViewStyle;
  actionButton: ViewStyle;
  likedButton: ViewStyle;
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
  evidenceText: TextStyle;
  viewButton: ViewStyle;
  viewButtonText: TextStyle;
  expiresText: TextStyle;
  expiredContainer: ViewStyle;
  expiredText: TextStyle;
  aiAnalysisContainer: ViewStyle;
  aiAnalysisTitle: TextStyle;
  aiAnalysisText: TextStyle;
  modalOverlay: ViewStyle;
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  commentsList: ViewStyle;
  commentsListContainer: ViewStyle;
  commentItem: ViewStyle;
  commentAuthor: TextStyle;
  commentText: TextStyle;
  commentTime: TextStyle;
  replyText: TextStyle;
  replyContainer: ViewStyle;
  commentInputContainer: ViewStyle;
  commentInput: TextStyle;
  cancelReplyButton: ViewStyle;
  cancelReplyText: TextStyle;
  addCommentButton: ViewStyle;
  addCommentGradient: ViewStyle;
  menuModal: ViewStyle;
  menuContent: ViewStyle;
  menuTitle: TextStyle;
  menuInput: TextStyle;
  menuButtonText: TextStyle;
  cancelButton: ViewStyle;
  closeButton: ViewStyle;
  menuOption: ViewStyle;
  menuIcon: ViewStyle;
  menuOptionText: TextStyle;
  deleteText: TextStyle;
  leaderboardHeader: ViewStyle;
  leaderboardSubtitle: TextStyle;
  leaderboardItem: ViewStyle;
  leaderboardRank: TextStyle;
  leaderboardInfo: ViewStyle;
  leaderboardName: TextStyle;
  leaderboardNameCurrent: TextStyle;
  leaderboardStats: TextStyle;
  likedUserText: TextStyle;
  evidenceModalContainer: ViewStyle;
  evidenceCloseButton: ViewStyle;
  evidenceCloseGradient: ViewStyle;
  fullScreenImage: ViewStyle;
  videoContainer: ViewStyle;
  fullScreenVideo: ViewStyle;
  menuButtonFixed: ViewStyle;
  menuButtonGradient: ViewStyle;
  sidebarContainer: ViewStyle;
  sidebarItem: ViewStyle;
  sidebarText: TextStyle;
  input: TextStyle;
}>({
  gradient: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  pointsContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  pointsText: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'Montserrat-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  badgesContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 20,
  },

  badgesText: {
    color: '#E8D5FF',
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic',
    fontSize: 14,
    textAlign: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(232, 213, 255, 0.3)',
    shadowColor: '#E8D5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  searchIcon: {
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },

  categoriesScrollView: {
    marginBottom: 10,
  },

  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },

  categoryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 6,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  categoryButtonActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.8)',
    borderColor: '#8A2BE2',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  categoryText: {
    color: '#E8D5FF',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },

  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    gap: 15,
  },

  buttonContainerSmall: {
    flexDirection: 'column',
  },

  mainButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  mainButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  buttonIcon: {
    marginRight: 8,
  },

  randomDareContainer: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  randomDareTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 20,
    textAlign: 'center',
  },

  optionsScrollView: {
    marginBottom: 15,
  },

  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  optionButtonActive: {
    backgroundColor: 'rgba(75, 0, 130, 0.8)',
    borderColor: '#4B0082',
  },

  optionText: {
    color: '#E8D5FF',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
  },

  optionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  randomButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  randomButtonDisabled: {
    opacity: 0.5,
  },

  randomButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },

  randomButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
  },

  randomErrorText: {
    color: '#FF6B6B',
    marginTop: 15,
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
  },

  randomDareResult: {
    marginTop: 20,
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  randomDareChallenge: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
    marginBottom: 10,
  },

  randomDareDetail: {
    color: '#E8D5FF',
    marginTop: 8,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },

  randomDareCriteria: {
    color: '#E8D5FF',
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic',
    fontSize: 13,
    textAlign: 'center',
  },

  randomDareActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 15,
  },

  randomAcceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  randomDeclineButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  randomActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },

  list: {
    paddingBottom: 30,
  },

  dareItem: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  rowTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },

  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  dareText: {
    color: '#fff',
    fontSize: 17,
    marginBottom: 8,
    fontFamily: 'Montserrat-SemiBold',
    lineHeight: 24,
  },

  userInfoContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  statusText: {
    color: '#E8D5FF',
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 8,
  },

  usernameText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  statusValue: {
    color: '#FFD700',
    fontWeight: 'bold',
  },

  profileButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(90, 24, 154, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90, 24, 154, 0.6)',
  },

  profileButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    gap: 12,
  },

  rowSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  likeContainerSmall: {
    width: '100%',
    marginBottom: 10,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  likedButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    borderColor: '#FF6B6B',
  },

  actionIcon: {
    marginRight: 6,
  },

  actionText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },

  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  acceptText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    fontWeight: 'bold',
  },

  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  rejectText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    fontWeight: 'bold',
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  uploadButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    fontWeight: 'bold',
  },

  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  uploadingText: {
    marginLeft: 12,
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
  },

  evidenceContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  evidenceText: {
    color: '#E8D5FF',
    fontSize: 15,
    marginBottom: 10,
    fontFamily: 'Montserrat-ExtraLightItalic',
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  viewButtonText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
    fontWeight: 'bold',
  },

  expiresText: {
    marginTop: 10,
    fontStyle: 'italic',
    color: '#FF9800',
    fontSize: 12,
    fontFamily: 'Montserrat-ExtraLightItalic',
  },

  expiredContainer: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  expiredText: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic',
    fontSize: 14,
  },

  aiAnalysisContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  aiAnalysisTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFD700',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
  },

  aiAnalysisText: {
    color: '#E8D5FF',
    fontFamily: 'Montserrat-ExtraLightItalic',
    fontSize: 13,
    marginBottom: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },

  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFD700',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'Montserrat-SemiBold',
  },

  commentsList: {
    flexGrow: 1,
  },

  commentsListContainer: {
    maxHeight: 300,
  },

  commentItem: {
    padding: 15,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  commentAuthor: {
    fontWeight: 'bold',
    color: '#B788C4',
    marginBottom: 6,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 15,
  },

  commentText: {
    color: '#fff',
    fontFamily: 'Montserrat-ExtraLightItalic',
    fontSize: 14,
    lineHeight: 20,
  },

  commentTime: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 6,
    fontFamily: 'Montserrat-Thin',
  },

  replyText: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 8,
    fontFamily: 'Montserrat-SemiBold',
  },

  replyContainer: {
    marginLeft: 25,
    marginTop: 8,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(183, 136, 196, 0.5)',
  },

  commentInputContainer: {
    marginTop: 20,
  },

  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },

  cancelReplyButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  cancelReplyText: {
    color: '#CCCCFF',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },

  addCommentButton: {
    alignSelf: 'flex-end',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6A0DAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  addCommentGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuContent: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat-SemiBold',
  },

  menuInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },

  menuButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
  },

  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  closeButton: {
    marginTop: 10,
  },

  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  menuIcon: {
    marginRight: 12,
  },

  menuOptionText: {
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
  },

  deleteText: {
    color: '#ff6b6b',
  },

  leaderboardHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },

  leaderboardSubtitle: {
    color: '#ccc',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Montserrat-ExtraLightItalic',
    textAlign: 'center',
  },

  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  leaderboardRank: {
    fontSize: 20,
    width: 35,
    textAlign: 'center',
    fontFamily: 'Montserrat-SemiBold',
  },

  leaderboardInfo: {
    flex: 1,
    marginLeft: 15,
  },

  leaderboardName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
  },

  leaderboardNameCurrent: {
    color: '#FFD700',
    fontWeight: 'bold',
  },

  leaderboardStats: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Montserrat-ExtraLightItalic',
  },

  likedUserText: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Montserrat-SemiBold',
    marginBottom: 12,
    paddingLeft: 10,
  },

  evidenceModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  evidenceCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    borderRadius: 25,
    overflow: 'hidden',
  },

  evidenceCloseGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullScreenImage: {
    width: '100%',
    height: '100%',
  },

  videoContainer: {
    width: '90%',
    height: '80%',
  },

  fullScreenVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },

  menuButtonFixed: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 1000,
    borderRadius: 20,
    overflow: 'hidden',
  },

  menuButtonGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sidebarContainer: {
    width: 280,
    paddingVertical: 50,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  sidebarText: {
    color: '#fff',
    marginLeft: 15,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
  },

  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
  },
});
