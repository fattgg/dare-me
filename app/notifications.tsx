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
        if (!user) return;

        const notificationsRef = ref(db, "/notifications");
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const userNotifications = Object.values(data).filter(
                (notif: any) => notif.userId === user.uid
            );
            setNotifications(userNotifications.reverse());
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notifications</Text>
            <FlatList
                data={notifications}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Text style={styles.message}>
                            {item.type === "complete" ? "✅" : ""} {item.message}
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
