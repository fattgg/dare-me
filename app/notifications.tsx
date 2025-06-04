"use client"

import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native"
import { db } from "../firebaseConfig"
import { ref, onValue } from "firebase/database"
import { getAuth } from "firebase/auth"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useFonts } from "expo-font"

const { width: screenWidth } = Dimensions.get("window")

type Notification = {
  type: string
  dareId: string
  userId: string
  message: string
  likerName?: string
  timestamp: number
}

export default function Notifications() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  })

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [myDareIds, setMyDareIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "likes" | "completions" | "evidence">("all")
  const user = getAuth().currentUser
  const router = useRouter()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (fontsLoaded) {
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
    if (!user) return

    const daresRef = ref(db, "/dares")
    onValue(daresRef, (snapshot) => {
      const data = snapshot.val() || {}
      const ids = Object.entries(data)
        .filter(([_, dare]: any) => dare.userId === user.uid)
        .map(([id]) => id)
      setMyDareIds(ids)
    })

    const notificationsRef = ref(db, "/notifications")
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val() || {}
      const filtered = Object.values(data)
        .filter((notif: any) => notif.dareId && myDareIds.includes(notif.dareId))
        .sort((a: any, b: any) => b.timestamp - a.timestamp) // Sort by newest first
      setNotifications(filtered)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user, myDareIds.length])

  const getIconForType = (type: string) => {
    switch (type) {
      case "like":
        return "heart"
      case "complete":
        return "check-circle"
      case "evidence":
        return "camera"
      case "accept":
        return "thumbs-up"
      case "decline":
        return "thumbs-down"
      case "comment":
        return "message-circle"
      default:
        return "bell"
    }
  }

  const getColorForType = (type: string) => {
    switch (type) {
      case "like":
        return "#FF6B6B"
      case "complete":
        return "#4CAF50"
      case "evidence":
        return "#2196F3"
      case "accept":
        return "#FF9800"
      case "decline":
        return "#F44336"
      case "comment":
        return "#9C27B0"
      default:
        return "#FFD700"
    }
  }

  const renderMessage = (item: Notification) => {
    switch (item.type) {
      case "like":
        return `${item.likerName || "Someone"} liked your dare`
      case "complete":
        return item.message || "Someone completed your dare"
      case "evidence":
        return item.message || "Someone submitted evidence"
      case "accept":
        return item.message || "Someone accepted your dare"
      case "decline":
        return item.message || "Someone declined your dare"
      case "comment":
        return item.message || "Someone commented on your dare"
      default:
        return item.message || "You have a new notification"
    }
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case "likes":
        return notifications.filter((n) => n.type === "like")
      case "completions":
        return notifications.filter((n) => n.type === "complete")
      case "evidence":
        return notifications.filter((n) => n.type === "evidence")
      default:
        return notifications
    }
  }

  const getFilterStats = () => {
    const total = notifications.length
    const likes = notifications.filter((n) => n.type === "like").length
    const completions = notifications.filter((n) => n.type === "complete").length
    const evidence = notifications.filter((n) => n.type === "evidence").length
    return { total, likes, completions, evidence }
  }

  const renderFilterButton = (
    filterType: "all" | "likes" | "completions" | "evidence",
    label: string,
    icon: string,
  ) => (
    <TouchableOpacity
      onPress={() => setFilter(filterType)}
      style={[styles.filterButton, filter === filterType && styles.activeFilterButton]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={filter === filterType ? ["#FFD700", "#FFA000"] : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
        style={styles.filterButtonGradient}
      >
        <Feather name={icon} size={14} color={filter === filterType ? "#1A0033" : "#fff"} />
        <Text style={[styles.filterButtonText, { color: filter === filterType ? "#1A0033" : "#fff" }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const timeAgo = getTimeAgo(item.timestamp)
    const isRecent = Date.now() - item.timestamp < 24 * 60 * 60 * 1000 // Less than 24 hours

    return (
      <Animated.View
        style={[
          styles.notificationCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, index * 5],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={
            isRecent
              ? ["rgba(255,215,0,0.15)", "rgba(255,215,0,0.05)"]
              : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
          }
          style={[
            styles.notificationGradient,
            {
              borderColor: isRecent ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.1)",
            },
          ]}
        >
          {/* Notification Icon */}
          <View style={[styles.notificationIcon, { backgroundColor: getColorForType(item.type) + "20" }]}>
            <Feather name={getIconForType(item.type)} size={20} color={getColorForType(item.type)} />
          </View>

          {/* Notification Content */}
          <View style={styles.notificationContent}>
            <Text style={styles.notificationMessage}>{renderMessage(item)}</Text>
            <View style={styles.notificationFooter}>
              <Text style={styles.notificationTime}>{timeAgo}</Text>
              {isRecent && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.notificationAction} activeOpacity={0.7}>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    )
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.emptyStateGradient}>
        <Feather name="bell-off" size={64} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyStateTitle}>No notifications yet</Text>
        <Text style={styles.emptyStateSubtext}>
          {filter === "all"
            ? "When people interact with your dares, you'll see notifications here!"
            : `No ${filter} notifications found.`}
        </Text>
        <TouchableOpacity style={styles.exploreButton} onPress={() => router.push("/challenges")} activeOpacity={0.8}>
          <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.exploreButtonGradient}>
            <Feather name="plus-circle" size={18} color="#1A0033" />
            <Text style={styles.exploreButtonText}>Create a Dare</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  )

  if (!fontsLoaded || isLoading) {
    return (
      <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD"]} style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Feather name="bell" size={40} color="#FFD700" />
        </Animated.View>
        <Text style={styles.loadingText}>Loading notifications...</Text>
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
      </LinearGradient>
    )
  }

  const stats = getFilterStats()
  const filteredNotifications = getFilteredNotifications()

  return (
    <LinearGradient colors={["#1A0033", "#4B0082", "#6A0DAD", "#9370DB"]} style={styles.container}>
      {/* Enhanced Back Button */}
      <Animated.View
        style={[
          styles.backButtonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.push("/challenges")} style={styles.backButton} activeOpacity={0.8}>
          <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]} style={styles.backButtonGradient}>
            <Feather name="arrow-left" size={20} color="#fff" />
            <Text style={styles.backText}>Back to Challenges</Text>
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
          <LinearGradient colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]} style={styles.headerGradient}>
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.titleIconGradient}>
                  <Feather name="bell" size={28} color="#1A0033" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Stay updated with your dare activities!</Text>
            </View>

            {/* Stats Overview */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#FF6B6B" }]}>{stats.likes}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{stats.completions}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#2196F3" }]}>{stats.evidence}</Text>
                <Text style={styles.statLabel}>Evidence</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Filter Buttons */}
        <Animated.View
          style={[
            styles.filterContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {renderFilterButton("all", "All", "list")}
          {renderFilterButton("likes", "Likes", "heart")}
          {renderFilterButton("completions", "Done", "check-circle")}
          {renderFilterButton("evidence", "Evidence", "camera")}
        </Animated.View>

        {/* Enhanced Notifications List */}
        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {filteredNotifications.length > 0 ? (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={renderNotification}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            renderEmptyState()
          )}
        </Animated.View>
      </ScrollView>
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

  loadingIcon: {
    marginBottom: 20,
  },

  loadingText: {
    color: "#FFD700",
    fontSize: 18,
    fontFamily: "Montserrat-SemiBold",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingBottom: 40,
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

  backText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },

  headerContainer: {
    marginBottom: 24,
  },

  headerGradient: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  titleSection: {
    alignItems: "center",
    marginBottom: 20,
  },

  titleIconContainer: {
    marginBottom: 12,
    borderRadius: 30,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  titleIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Montserrat-SemiBold",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontFamily: "Montserrat-ExtraLightItalic",
    textAlign: "center",
    lineHeight: 22,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  statItem: {
    alignItems: "center",
  },

  statNumber: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-SemiBold",
    marginBottom: 4,
  },

  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Montserrat-ExtraLightItalic",
  },

  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 6,
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
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
  },

  filterButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  filterButtonText: {
    fontSize: 12,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 4,
  },

  listContainer: {
    flex: 1,
  },

  list: {
    paddingBottom: 20,
  },

  notificationCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  notificationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  notificationContent: {
    flex: 1,
  },

  notificationMessage: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    lineHeight: 22,
    marginBottom: 6,
  },

  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notificationTime: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Montserrat-ExtraLightItalic",
  },

  newBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  newBadgeText: {
    color: "#1A0033",
    fontSize: 10,
    fontFamily: "Montserrat-SemiBold",
  },

  notificationAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
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
    fontFamily: "Montserrat-SemiBold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },

  emptyStateSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontFamily: "Montserrat-ExtraLightItalic",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  exploreButton: {
    borderRadius: 15,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  exploreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 15,
  },

  exploreButtonText: {
    color: "#1A0033",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
    marginLeft: 8,
  },
})