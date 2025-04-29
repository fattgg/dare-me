import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { db } from "../firebaseConfig";
import { ref, onValue, push } from "firebase/database";
import { getAuth } from "firebase/auth";
import { sendNotification } from "../notificationsHelper";

type Notification = {
    type: string;
    dareId: string;
    userId: string;
    message: string;
    timestamp: number;
};

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const user = getAuth().currentUser;

    useEffect(() => {
        const unsubscribeAuth = getAuth().onAuthStateChanged((firebaseUser) => {
            if (!firebaseUser) return;
            const notificationsRef = ref(db, "/notifications");
            const unsubscribeDb = onValue(notificationsRef, (snapshot) => {
                const data = snapshot.val() || {};
                const all = Object.entries(data);
                const filtered = all
                    .filter(([_, notif]) => (notif as any).userId === firebaseUser.uid)
                    .sort((a, b) => (b[1] as any).timestamp - (a[1] as any).timestamp)
                    .map(([_, notif]) => notif as any);
                setNotifications(filtered);
            });

            // Cleanup DB listener when auth changes
            return () => unsubscribeDb();
        });

        return () => unsubscribeAuth();
    }, []);


    const sendNotification = async ({ type, dare }) => {
        await push(ref(db, "/notifications"), {
            type, // "like", "comment", "accept"
            dareId: dare.id,
            userId: dare.userId,
            message: `Someone ${type}d your dare: "${dare.challenge}"`,
            timestamp: Date.now(),
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notifications</Text>
            <FlatList
                data={notifications}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Text style={styles.message}>
                            {item.type === "like" ? "❤️" : item.type === "comment" ? "💬" : "✅"} {item.message}
                        </Text>
                        <Text style={styles.time}>
                            {new Date(item.timestamp).toLocaleString()}
                        </Text>
                    </View>
                )}
                ListEmptyComponent={<Text>No notifications yet.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: "#fff" },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    item: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 8 },
    message: { fontSize: 16, fontWeight: "500" },
    time: { fontSize: 12, color: "#888" },
});
