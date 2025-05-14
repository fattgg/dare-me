import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";

type Notification = {
  type: string;
  dareId: string;
  userId: string;
  message: string;
  likerName?: string;
  timestamp: number;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myDareIds, setMyDareIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) return;

    const daresRef = ref(db, "/dares");
    onValue(daresRef, (snapshot) => {
      const data = snapshot.val() || {};
      const ids = Object.entries(data)
        .filter(([_, dare]: any) => dare.userId === user.uid)
        .map(([id]) => id);
      setMyDareIds(ids);
    });

    const notificationsRef = ref(db, "/notifications");
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const filtered = Object.values(data).filter(
        (notif: any) => notif.dareId && myDareIds.includes(notif.dareId)
      );
      setNotifications(filtered.reverse());
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, myDareIds.length]);

  const getIconForType = (type: string) => {
    switch (type) {
      case "like":
        return "👍 ";
      case "complete":
        return "✅ ";
      case "evidence":
        return "📸 ";
      case "accept":
        return "🙌 ";
      case "decline":
        return "❌ ";
      case "comment":
        return "💬 ";
      default:
        return "🔔 ";
    }
  };

  const renderMessage = (item: Notification) => {
    switch (item.type) {
      case "like":
        return `${item.likerName || "Someone"} liked your dare`;
      case "complete":
        return item.message || "Someone completed your dare";
      case "evidence":
        return item.message || "Someone submitted evidence";
      case "accept":
        return item.message || "Someone accepted your dare";
      case "decline":
        return item.message || "Someone declined your dare";
      case "comment":
        return item.message || "Someone commented on your dare";
      default:
        return item.message || "You have a new notification";
    }
  };

  return (
    <LinearGradient colors={['#4B0082', '#B788C4']} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>📣 Notifications</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.notificationBox}>
                <Text style={styles.message}>
                  {getIconForType(item.type)}
                  {renderMessage(item)}
                </Text>
                <Text style={styles.time}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.noNotif}>No notifications yet.</Text>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 30,
  },
  title: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "Montserrat-SemiBold",
  },
  notificationBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 5,
    fontFamily: "Montserrat-SemiBold",
  },
  time: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  noNotif: {
    textAlign: "center",
    marginTop: 50,
    color: "#ccc",
    fontSize: 16,
    fontFamily: "Montserrat-ExtraLightItalic",
  },
});
