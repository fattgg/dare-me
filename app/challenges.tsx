import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, Platform, TouchableOpacity } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';

export default function Challenges() {
    const [dares, setDares] = useState([]);
    const [selectedDare, setSelectedDare] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const daresRef = ref(db, 'dares');
        const unsubscribe = onValue(daresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedDares = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                    likes: data[key].likedBy ? data[key].likedBy.length : 0, // Calculate likes from likedBy array
                }));
                setDares(formattedDares);
            } else {
                setDares([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAcceptDare = async (dareId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to accept a dare.');
                return;
            }

            const dareRef = ref(db, `dares/${dareId}`);
            await update(dareRef, {
                status: 'in-progress',
                acceptedBy: user.uid,
            });

            Alert.alert('Success', 'You have accepted the dare!');
        } catch (error) {
            console.error('Error accepting dare:', error);
            Alert.alert('Error', 'Failed to accept the dare. Please try again.');
        }
    };

    const handleDeleteDare = async (dareId: string) => {
        try {
            const dareRef = ref(db, `dares/${dareId}`);
            await remove(dareRef);
            Alert.alert('Success', 'Dare deleted successfully!');
        } catch (error) {
            console.error('Error deleting dare:', error);
            Alert.alert('Error', 'Failed to delete the dare. Please try again.');
        }
    };

    const handleLikeDare = async (dareId: string, likedBy: string[] = []) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to like a dare.');
                return;
            }

            const dareRef = ref(db, `dares/${dareId}`);
            if (likedBy.includes(user.uid)) {
                const updatedLikedBy = likedBy.filter((uid) => uid !== user.uid);
                await update(dareRef, {
                    likedBy: updatedLikedBy,
                });
            } else {
                await update(dareRef, {
                    likedBy: [...likedBy, user.uid],
                });
            }
        } catch (error) {
            console.error('Error liking/unliking dare:', error);
            Alert.alert('Error', 'Failed to like/unlike the dare. Please try again.');
        }
    };

    const openComments = (dareId: string) => {
        setSelectedDare(dareId);
        setModalVisible(true);

        const commentsRef = ref(db, `dares/${dareId}/comments`);
        onValue(commentsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedComments = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setComments(formattedComments);
            } else {
                setComments([]);
            }
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            Alert.alert('Error', 'Comment cannot be empty.');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to comment.');
                return;
            }

            const commentsRef = ref(db, `dares/${selectedDare}/comments`);
            await push(commentsRef, {
                userId: user.uid,
                username: user.email || 'Anonymous',
                text: newComment,
                timestamp: new Date().toISOString(),
            });

            setNewComment('');
            Alert.alert('Success', 'Comment added!');
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment. Please try again.');
        }
    };

    const renderRightActions = (dareId: string) => (
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDare(dareId)}
        >
            <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
    );

    const renderDare = ({ item }: { item: any }) => (
        <Swipeable
            renderRightActions={() => renderRightActions(item.id)} // Ensure renderRightActions is passed
        >
            <View style={styles.dareItem}>
                <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
                <Text style={styles.dareText}>Reward: {item.reward}</Text>
                <Text style={styles.dareText}>Posted by: {item.username || 'Anonymous'}</Text>
                <Text style={styles.dareText}>
                    Status: {item.status === 'completed' ? 'Completed' : item.status === 'in-progress' ? 'In Progress' : 'Available'}
                </Text>
                {/* Likes and Comments Row */}
                <View style={styles.row}>
                    <View style={styles.likeContainer}>
                        <Text style={styles.likeCount}>{item.likes} Likes</Text>
                        <TouchableOpacity onPress={() => handleLikeDare(item.id, item.likedBy || [])}>
                            <Text style={styles.likeButton}>👍 Like</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => openComments(item.id)}>
                        <Text style={styles.commentButton}>💬 Comments</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Swipeable>
    );

    const handleLogout = async () => {
        try {
            if (Platform.OS === 'web') {
                const { signOut } = require('firebase/auth');
                await signOut(auth);
            } else {
                await (auth as any).signOut();
            }
            router.replace('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Available Dares</Text>
            <Button
                title="Post a Dare"
                onPress={() => router.push('/create-dare')}
            />
            <Button
                title="My Accepted Dares"
                onPress={() => router.push('/my-dares')}
            />
            <FlatList
                data={dares}
                keyExtractor={(item) => item.id}
                renderItem={renderDare}
                contentContainerStyle={styles.list}
            />
            <Button title="Logout" onPress={handleLogout} color="red" />

            <Modal visible={modalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Comments</Text>
                    <FlatList
                        data={comments}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.commentItem}>
                                <Text style={styles.commentText}>
                                    <Text style={styles.commentAuthor}>{item.username}: </Text>
                                    {item.text}
                                </Text>
                            </View>
                        )}
                        contentContainerStyle={styles.commentsList}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <Button title="Add Comment" onPress={handleAddComment} />
                    <Button title="Close" onPress={() => setModalVisible(false)} />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    list: {
        marginTop: 20,
    },
    dareItem: {
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        backgroundColor: '#f9f9f9',
    },
    dareText: {
        fontSize: 16,
    },
    deleteButton: {
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    commentsList: {
        marginBottom: 20,
    },
    commentItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    commentText: {
        fontSize: 16,
    },
    commentAuthor: {
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    likeContainer: {
        alignItems: 'center',
    },
    likeCount: {
        fontSize: 14,
        color: 'gray',
    },
    likeButton: {
        fontSize: 16,
        color: 'blue',
    },
    commentButton: {
        fontSize: 16,
        color: 'green',
    },
});