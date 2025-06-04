"use client"

import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native"
import { getAuth } from "firebase/auth"
import { db } from "../firebaseConfig"
import { ref, onValue } from "firebase/database"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Feather } from "@expo/vector-icons"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

export default function Profile() {
  const { uid } = useLocalSearchParams()
  const currentUser = getAuth().currentUser
  const userId = uid || currentUser?.uid

  const [data, setData] = useState<any>(null)
  const [completedDares, setCompletedDares] = useState<any[]>([])
  const [postedDares, setPostedDares] = useState<any[]>([])
  const [acceptedDares, setAcceptedDares] = useState<any[]>([])
  const [declinedDares, setDeclinedDares] = useState<any[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"completed" | "posted" | "accepted" | "declined">("completed")

  const router = useRouter()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const backButtonAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!userId) return

    const userRef = ref(db, `users/${userId}`)
    onValue(userRef, (snap) => {
      const val = snap.val()
      setData(val)
      setBadges(val?.badges || [])
    })

    const daresRef = ref(db, "dares")
    onValue(daresRef, (snap) => {
      const all = snap.val() || {}

      const completed = Object.keys(all)
        .filter(
          (key) => (all[key].acceptedBy === userId || all[key].acceptedBy?.[userId]) && all[key].status === "completed",
        )
        .map((key) => ({ id: key, ...all[key] }))

      const posted = Object.keys(all)
        .filter((key) => all[key].userId === userId)
        .map((key) => ({ id: key, ...all[key] }))

      const accepted = Object.keys(all)
        .filter((key) => all[key].acceptedBy === userId || all[key].acceptedBy?.[userId])
        .map((key) => ({ id: key, ...all[key] }))

      const declined = Object.keys(all)
        .filter((key) => all[key].declinedBy?.[userId])
        .map((key) => ({ id: key, ...all[key] }))

      setPostedDares(posted)
      setAcceptedDares(accepted)
      setDeclinedDares(declined)
      setCompletedDares(completed)
      setLoading(false)

      // Start animations when data loads
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
    })
  }, [userId])

  // Pulse animation for avatar
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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
  }, [])

  // Rotation animation for loading
  useEffect(() => {
    if (loading) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      )
      rotation.start()
      return () => rotation.stop()
    }
  }, [loading])

  const handleLogout = async () => {
    try {
      await getAuth().signOut()
      router.replace("/login")
    } catch {
      alert("Logout failed.")
    }
  }

  const handleReturnToChallenges = () => {
    router.push("/challenges")
  }

  const getViewData = () => {
    switch (viewMode) {
      case "completed":
        return completedDares
      case "posted":
        return postedDares
      case "accepted":
        return acceptedDares
      case "declined":
        return declinedDares
      default:
        return []
    }
  }

  const getTabIcon = (mode: string) => {
    switch (mode) {
      case "completed":
        return "check-circle"
      case "posted":
        return "megaphone"
      case "accepted":
        return "thumbs-up"
      case "declined":
        return "x-circle"
      default:
        return "circle"
    }
  }

  const getTabColor = (mode: string) => {
    switch (mode) {
      case "completed":
        return "#4CAF50"
      case "posted":
        return "#FF9800"
      case "accepted":
        return "#2196F3"
      case "declined":
        return "#F44336"
      default:
        return "#fff"
    }
  }

  const getStatIcon = (type: string) => {
    switch (type) {
      case "posted":
        return "edit-3"
      case "accepted":
        return "check"
      case "declined":
        return "x"
      case "completed":
        return "award"
      default:
        return "circle"
    }
  }

  const calculateLevel = () => {
    const totalPoints = data?.points || 0
    return Math.floor(totalPoints / 100) + 1
  }

  const calculateProgress = () => {
    const totalPoints = data?.points || 0
    const currentLevelPoints = totalPoints % 100
    return currentLevelPoints / 100
  }

  if (loading) {
    return (
      <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD", "#9370DB"]} style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Animated.View
            style={[
              styles.loadingIcon,
              {
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.loadingIconGradient}>
              <Feather name="zap" size={40} color="#1A0033" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.loadingText}>Loading Profile...</Text>
          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD", "#9370DB"]} style={styles.container}>
      {/* Enhanced Return to Challenges Button */}
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
              {
                scale: backButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleReturnToChallenges} activeOpacity={0.8}>
          <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]} style={styles.backButtonGradient}>
            <View style={styles.backButtonContent}>
              <Feather name="arrow-left" size={20} color="#fff" />
              <Text style={styles.backButtonText}>Challenges</Text>
            </View>

            {/* Animated pulse ring */}
            <Animated.View
              style={[
                styles.backButtonPulse,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [1, 1.05],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.05],
                    outputRange: [0.3, 0],
                  }),
                },
              ]}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Enhanced Header Section */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]} style={styles.headerGradient}>
            {/* Avatar with Pulse Animation */}
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient colors={["#FFD700", "#FFA000", "#FF8F00"]} style={styles.avatarGradient}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarText}>{data?.email?.[0]?.toUpperCase() || "U"}</Text>
                </View>
              </LinearGradient>

              {/* Level Badge */}
              <View style={styles.levelBadge}>
                <LinearGradient colors={["#FF6B6B", "#E55A5A"]} style={styles.levelBadgeGradient}>
                  <Text style={styles.levelText}>LV {calculateLevel()}</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{data?.email || "Anonymous"}</Text>
              <Text style={styles.userTitle}>Dare Challenger</Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Level Progress</Text>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={["#4CAF50", "#8BC34A"]}
                    style={[styles.progressFill, { width: `${calculateProgress() * 100}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.floor(calculateProgress() * 100)}%</Text>
              </View>

              {/* Points Display */}
              <View style={styles.pointsContainer}>
                <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.pointsGradient}>
                  <Feather name="star" size={20} color="#1A0033" />
                  <Text style={styles.pointsText}>{data?.points || 0} Points</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Stats Section */}
        <Animated.View
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📊 Statistics</Text>
          <View style={styles.statsGrid}>
            {[
              { label: "Posted", value: postedDares.length, type: "posted" },
              { label: "Accepted", value: acceptedDares.length, type: "accepted" },
              { label: "Completed", value: completedDares.length, type: "completed" },
              { label: "Declined", value: declinedDares.length, type: "declined" },
            ].map((stat, index) => (
              <Animated.View
                key={stat.type}
                style={[
                  styles.statCard,
                  {
                    transform: [
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
                  style={styles.statCardGradient}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: getTabColor(stat.type) + "20" }]}>
                    <Feather name={getStatIcon(stat.type)} size={24} color={getTabColor(stat.type)} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Enhanced Badges Section */}
        <Animated.View
          style={[
            styles.badgesSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>🏅 Achievements</Text>
          <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.badgesContainer}>
            {badges.length > 0 ? (
              <View style={styles.badgesList}>
                {badges.map((badge, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.badgeItem,
                      {
                        transform: [
                          {
                            scale: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.badgeGradient}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.noBadgesContainer}>
                <Feather name="award" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.noBadgesText}>No achievements yet</Text>
                <Text style={styles.noBadgesSubtext}>Complete dares to earn badges!</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Tab Navigation */}
        <Animated.View
          style={[
            styles.tabSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>📋 Dare History</Text>
          <View style={styles.tabContainer}>
            {["completed", "posted", "accepted", "declined"].map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode as any)}
                style={[styles.tabButton, viewMode === mode && styles.activeTabButton]}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={
                    viewMode === mode
                      ? [getTabColor(mode), getTabColor(mode) + "CC"]
                      : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
                  }
                  style={styles.tabButtonGradient}
                >
                  <Feather name={getTabIcon(mode)} size={18} color={viewMode === mode ? "#fff" : getTabColor(mode)} />
                  <Text style={[styles.tabButtonText, { color: viewMode === mode ? "#fff" : getTabColor(mode) }]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Enhanced Dare List */}
        <Animated.View
          style={[
            styles.dareListSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {getViewData().length > 0 ? (
            getViewData().map((item, index) => (
              <Animated.View
                key={item.id}
                style={[
                  styles.dareCard,
                  {
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
                  style={styles.dareCardGradient}
                >
                  <View style={styles.dareHeader}>
                    <View style={[styles.dareStatusIcon, { backgroundColor: getTabColor(viewMode) + "20" }]}>
                      <Feather name={getTabIcon(viewMode)} size={20} color={getTabColor(viewMode)} />
                    </View>
                    <View style={styles.dareInfo}>
                      <Text style={styles.dareTitle}>{item.challenge}</Text>
                      <Text style={styles.dareReward}>🎁 {item.reward}</Text>
                    </View>
                  </View>

                  {item.status && (
                    <View style={styles.dareFooter}>
                      <View style={[styles.statusBadge, { backgroundColor: getTabColor(item.status) + "20" }]}>
                        <Text style={[styles.statusText, { color: getTabColor(item.status) }]}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                      </View>
                      {item.completedAt && (
                        <Text style={styles.completedDate}>✅ {new Date(item.completedAt).toLocaleDateString()}</Text>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
                style={styles.emptyStateGradient}
              >
                <Feather name="inbox" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTitle}>No {viewMode} dares</Text>
                <Text style={styles.emptyStateSubtext}>
                  {viewMode === "posted" && "You haven't posted any dares yet"}
                  {viewMode === "accepted" && "You haven't accepted any dares yet"}
                  {viewMode === "completed" && "You haven't completed any dares yet"}
                  {viewMode === "declined" && "You haven't declined any dares yet"}
                </Text>
              </LinearGradient>
            </View>
          )}
        </Animated.View>

        {/* Enhanced Logout Button */}
        {!uid && (
          <Animated.View
            style={[
              styles.logoutSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <LinearGradient colors={["#FF6666", "#FF3333"]} style={styles.logoutButtonGradient}>
                <Feather name="log-out" size={20} color="#fff" />
                <Text style={styles.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Enhanced Back Button Styles
  backButtonContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    zIndex: 1000,
  },

  backButton: {
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  backButtonGradient: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    position: "relative",
    overflow: "hidden",
  },

  backButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  backButtonPulse: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 120 : 100, // Increased to accommodate back button
    paddingBottom: 40,
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
    borderRadius: 40,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  loadingIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  headerSection: {
    marginBottom: 30,
  },

  headerGradient: {
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },

  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 48,
    color: "#4B0082",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  levelBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    borderRadius: 15,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  levelBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#fff",
  },

  levelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  userInfo: {
    alignItems: "center",
    width: "100%",
  },

  userName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  userTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
  },

  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },

  progressLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },

  progressBar: {
    width: "80%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 5,
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  progressText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "bold",
  },

  pointsContainer: {
    borderRadius: 20,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  pointsGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },

  pointsText: {
    color: "#1A0033",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },

  statsSection: {
    marginBottom: 30,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  statCardGradient: {
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },

  statLabel: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },

  badgesSection: {
    marginBottom: 30,
  },

  badgesContainer: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  badgesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  badgeItem: {
    margin: 6,
    borderRadius: 15,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  badgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  badgeText: {
    color: "#1A0033",
    fontSize: 14,
    fontWeight: "bold",
  },

  noBadgesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },

  noBadgesText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },

  noBadgesSubtext: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
  },

  tabSection: {
    marginBottom: 25,
  },

  tabContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  tabButton: {
    width: "48%",
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  activeTabButton: {
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  tabButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  tabButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },

  dareListSection: {
    marginBottom: 30,
  },

  dareCard: {
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  dareCardGradient: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  dareHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },

  dareStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  dareInfo: {
    flex: 1,
  },

  dareTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    lineHeight: 24,
  },

  dareReward: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "600",
  },

  dareFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  completedDate: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
  },

  emptyStateContainer: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },

  emptyStateSubtext: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },

  logoutSection: {
    marginTop: 20,
  },

  logoutButton: {
    borderRadius: 15,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  logoutButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 15,
  },

  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
})
