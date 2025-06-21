"use client"

import { useEffect, useState, useRef } from "react"
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
  Animated,
  Dimensions,
  ScrollView,
} from "react-native"
import { auth, db } from "../firebaseConfig"
import { ref, onValue, update, push } from "firebase/database"
import { Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useFonts } from "expo-font"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")


type Dare = {
  id: string
  challenge: string
  reward: string
  status: string
  acceptedBy: { [uid: string]: any }
  userId: string
  evidence?: string
  evidenceType?: string
  evidenceUrl?: string
  completedAt?: string
  acceptedAt?: string
}

export default function MyDares() {
  const [fontsLoaded] = useFonts({
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
  })

  const [myDares, setMyDares] = useState<Dare[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("all")
  const [isReady, setIsReady] = useState(false)
  const [returnModalVisible, setReturnModalVisible] = useState(false);
const [dareToReturn, setDareToReturn] = useState<string | null>(null);


  const router = useRouter()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const backButtonAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (fontsLoaded) {
      setIsReady(true)
      // Entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Continuous pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      )
      pulse.start()

      return () => pulse.stop()
    }
  }, [fontsLoaded])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      Alert.alert("Error", "You must be logged in.")
      return
    }

    const daresRef = ref(db, "dares")
    const unsubscribe = onValue(daresRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const accepted = Object.keys(data)
          .filter((key) => data[key].acceptedBy && data[key].acceptedBy[user.uid])
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .sort((a, b) => {
            // Sort by status priority and then by date
            const statusPriority = { "in-progress": 0, completed: 1 }
            if (statusPriority[a.status] !== statusPriority[b.status]) {
              return statusPriority[a.status] - statusPriority[b.status]
            }
            return new Date(b.acceptedAt || 0).getTime() - new Date(a.acceptedAt || 0).getTime()
          })
        setMyDares(accepted)
      } else {
        setMyDares([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleMarkAsCompleted = async (dare: Dare) => {
    try {
      await update(ref(db, `dares/${dare.id}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      })

      await push(ref(db, 'notifications'), {
        type: 'complete',
        dareId: dare.id,
        userId: dare.userId,
        message: `Your dare "${dare.challenge}" has been completed!`,
        timestamp: Date.now(),
      })

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


  const getFilteredDares = () => {
    if (filter === "all") return myDares
    return myDares.filter((dare) => dare.status === filter)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4CAF50"
      case "in-progress":
        return "#FF9800"
      default:
        return "#2196F3"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "check-circle"
      case "in-progress":
        return "clock"
      default:
        return "circle"
    }
  }

  const renderFilterButton = (filterType: "all" | "in-progress" | "completed", label: string, icon: string) => (
    <TouchableOpacity
      onPress={() => setFilter(filterType)}
      style={[styles.filterButton, filter === filterType && styles.activeFilterButton]}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={
          filter === filterType
            ? [
              getStatusColor(filterType === "all" ? "in-progress" : filterType),
              getStatusColor(filterType === "all" ? "in-progress" : filterType) + "CC",
            ]
            : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
        }
        style={styles.filterButtonGradient}
      >
        <Feather
          name={icon}
          size={16}
          color={filter === filterType ? "#fff" : getStatusColor(filterType === "all" ? "in-progress" : filterType)}
        />
        <Text
          style={[
            styles.filterButtonText,
            {
              color: filter === filterType ? "#fff" : getStatusColor(filterType === "all" ? "in-progress" : filterType),
            },
          ]}
        >
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderDare = ({ item, index }: { item: Dare; index: number }) => {
    const user = auth.currentUser
    const statusColor = getStatusColor(item.status)

    return (
      <Animated.View
        style={[
          styles.dareCard,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, index * 10],
                }),
              },
              { scale: scaleAnim },
            ],
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.dareCardGradient}>
          {/* Header with status */}
          <View style={styles.dareHeader}>
            <View style={[styles.statusContainer, { backgroundColor: statusColor + "20" }]}>
              <Feather name={getStatusIcon(item.status)} size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status === "completed" ? "Completed" : "In Progress"}
              </Text>
            </View>
            {item.completedAt && (
              <Text style={styles.completedDate}>✅ {new Date(item.completedAt).toLocaleDateString()}</Text>
            )}
          </View>

          {/* Challenge content */}
          <View style={styles.challengeContent}>
            <View style={styles.challengeHeader}>
              <Feather name="target" size={20} color="#FFD700" />
              <Text style={styles.challengeLabel}>Challenge</Text>
            </View>
            <Text style={styles.challengeText}>{item.challenge}</Text>

            <View style={styles.rewardHeader}>
              <Feather name="gift" size={20} color="#FF6B6B" />
              <Text style={styles.rewardLabel}>Reward</Text>
            </View>
            <Text style={styles.rewardText}>{item.reward}</Text>
          </View>

          {/* Progress info */}
          {item.acceptedAt && (
            <View style={styles.progressInfo}>
              <Feather name="calendar" size={14} color="#ccc" />
              <Text style={styles.progressText}>Accepted: {new Date(item.acceptedAt).toLocaleDateString()}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionSection}>
            {item.status === "in-progress" && !item.evidence && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert("Coming Soon", "Upload evidence feature will be available soon! 📸")}
                activeOpacity={0.8}
              >
                <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.actionButtonGradient}>
                  <Feather name="upload" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Upload Evidence</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {item.status === "in-progress" && user?.uid && item.acceptedBy[user.uid] && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleMarkAsCompleted(item)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={["#4CAF50", "#45A049"]} style={styles.actionButtonGradient}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Completed</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {item.status === "completed" && (
              <View style={styles.completedBadge}>
                <LinearGradient colors={["#4CAF50", "#45A049"]} style={styles.completedBadgeGradient}>
                  <Feather name="award" size={16} color="#fff" />
                  <Text style={styles.completedBadgeText}>Dare Completed!</Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    )
  }

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.emptyStateGradient}>
        <Feather name="inbox" size={64} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyStateTitle}>No Accepted Dares</Text>
        <Text style={styles.emptyStateSubtext}>
          {filter === "all"
            ? "You haven't accepted any dares yet. Go explore some challenges!"
            : filter === "in-progress"
              ? "No dares in progress. Time to get started!"
              : "No completed dares yet. Keep working on your challenges!"}
        </Text>
        <TouchableOpacity style={styles.exploreButton} onPress={() => router.push("/challenges")} activeOpacity={0.8}>
          <LinearGradient colors={["#FF6B6B", "#E55A5A"]} style={styles.exploreButtonGradient}>
            <Feather name="compass" size={18} color="#fff" />
            <Text style={styles.exploreButtonText}>Explore Dares</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  )

  if (!isReady || loading) {
    return (
      <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD"]} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Animated.View
            style={[
              styles.loadingIcon,
              {
                transform: [
                  {
                    rotate: pulseAnim.interpolate({
                      inputRange: [1, 1.02],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <Feather name="zap" size={40} color="#FFD700" />
          </Animated.View>
          <Text style={styles.loadingText}>Loading Your Dares...</Text>
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD"]} style={styles.container}>
      {/* Enhanced Back Button */}
      <Animated.View
        style={[
          styles.backButtonContainer,
          {
            opacity: backButtonAnim,
            transform: [
              {
                translateY: backButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.push("/challenges")} style={styles.backButton} activeOpacity={0.8}>
          <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]} style={styles.backButtonGradient}>
            <Feather name="arrow-left" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Back to Challenges</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Enhanced Header */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.headerGradient}>
            <View style={styles.titleSection}>
              <Feather name="user-check" size={32} color="#FFD700" />
              <Text style={styles.title}>My Accepted Dares</Text>

            </View>

            {/* Stats Section */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myDares.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myDares.filter((d) => d.status === "in-progress").length}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{myDares.filter((d) => d.status === "completed").length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Filter Section */}
        <Animated.View
          style={[
            styles.filterSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.filterTitle}>Filter by Status</Text>
          <View style={styles.filterContainer}>
            {renderFilterButton("all", "All", "list")}
            {renderFilterButton("in-progress", "In Progress", "clock")}
            {renderFilterButton("completed", "Completed", "check-circle")}
          </View>
        </Animated.View>

        {/* Enhanced Dare List */}
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {getFilteredDares().length > 0 ? (
            <FlatList
              data={getFilteredDares()}
              keyExtractor={(item) => item.id}
              renderItem={renderDare}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              scrollEnabled={false}
            />
          ) : (
            renderEmptyState()
          )}
        </Animated.View>
      </ScrollView>

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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContent: {
    alignItems: "center",
  },

  loadingIcon: {
    marginBottom: 20,
  },

  loadingText: {
    color: "#FFD700",
    fontSize: 20,
    fontFamily: "Montserrat-SemiBold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  backButtonContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    zIndex: 1000,
  },

  backButton: {
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  backButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingBottom: 40,
  },

  headerContainer: {
    marginBottom: 24,
  },

  headerGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 12,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  statItem: {
    alignItems: "center",
  },

  statNumber: {
    color: "#FFD700",
    fontSize: 24,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 4,
  },

  statLabel: {
    color: "#ccc",
    fontSize: 12,
    fontFamily: "Montserrat-ExtraLightItalic",
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  filterSection: {
    marginBottom: 24,
  },

  filterTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },

  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  filterButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  activeFilterButton: {
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  filterButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  filterButtonText: {
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 6,
  },

  listContainer: {
    flex: 1,
  },

  list: {
    paddingBottom: 20,
  },

  dareCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  dareCardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  dareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 6,
  },

  completedDate: {
    color: "#4CAF50",
    fontSize: 12,
    fontFamily: "Montserrat-ExtraLightItalic",
  },

  challengeContent: {
    marginBottom: 16,
  },

  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  challengeLabel: {
    color: "#FFD700",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  challengeText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    lineHeight: 22,
    marginBottom: 12,
  },

  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  rewardLabel: {
    color: "#FF6B6B",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  rewardText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-ExtraLightItalic",
    lineHeight: 20,
  },

  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  progressText: {
    color: "#ccc",
    fontSize: 12,
    fontFamily: "Montserrat-ExtraLightItalic",
    marginLeft: 8,
  },

  actionSection: {
    gap: 12,
  },

  actionButton: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  completedBadge: {
    borderRadius: 12,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  completedBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  completedBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  emptyStateContainer: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  emptyStateGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  emptyStateTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Montserrat-SemiBold",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },

  emptyStateSubtext: {
    color: "#ccc",
    fontSize: 16,
    fontFamily: "Montserrat-ExtraLightItalic",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },

  exploreButton: {
    borderRadius: 15,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  exploreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 15,
  },

  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
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