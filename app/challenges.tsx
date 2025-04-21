import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
    FlatList,
    TextInput,
    Alert,
    Modal,
    Platform,
    TouchableOpacity
} from 'react-native';
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
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedDareForMenu, setSelectedDareForMenu] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editedChallenge, setEditedChallenge] = useState('');
    const [editedReward, setEditedReward] = useState('');

    useEffect(() => {
        const daresRef = ref(db, 'dares');
        const unsubscribe = onValue(daresRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedDares = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                    likes: data[key].likedBy ? data[key].likedBy.length : 0,
                }));
                setDares(formattedDares);
            } else {
                setDares([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleAcceptDare = async (dareId) => {
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

    const handleDeleteDare = async () => {
        try {
            const dareRef = ref(db, `dares/${selectedDareForMenu}`);
            await remove(dareRef);
            setMenuVisible(false);
            Alert.alert('Success', 'Dare deleted successfully!');
        } catch (error) {
            console.error('Error deleting dare:', error);
            Alert.alert('Error', 'Failed to delete the dare. Please try again.');
        }
    };

    const handleLikeDare = async (dareId, likedBy = []) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to like a dare.');
                return;
            }

            const dare = dares.find((d) => d.id === dareId);
            if (dare && dare.userId === user.uid) return;

            const dareRef = ref(db, `dares/${dareId}`);
            if (likedBy.includes(user.uid)) {
                const updatedLikedBy = likedBy.filter((uid) => uid !== user.uid);
                await update(dareRef, { likedBy: updatedLikedBy });
            } else {
                await update(dareRef, { likedBy: [...likedBy, user.uid] });
            }
        } catch (error) {
            console.error('Error liking/unliking dare:', error);
            Alert.alert('Error', 'Failed to like/unlike the dare. Please try again.');
        }
    };

    const openComments = (dareId) => {
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

    const startEditDare = (dareId) => {
        const dareToEdit = dares.find((d) => d.id === dareId);
        if (dareToEdit) {
            setEditedChallenge(dareToEdit.challenge);
            setEditedReward(dareToEdit.reward);
            setEditMode(true);
        }
    };

    const handleUpdateDare = async () => {
        try {
            const dareRef = ref(db, `dares/${selectedDareForMenu}`);
            await update(dareRef, {
                challenge: editedChallenge,
                reward: editedReward,
            });
            setEditMode(false);
            setMenuVisible(false);
            Alert.alert('Success', 'Dare updated successfully!');
        } catch (error) {
            console.error('Error updating dare:', error);
            Alert.alert('Error', 'Failed to update dare. Please try again.');
        }
    };

    const renderDare = ({ item }) => {
        const user = auth.currentUser;
        const isOwner = user && item.userId === user.uid;

        return (
            <Swipeable>
                <View style={styles.dareItem}>
                    <View style={styles.rowTop}>
                        {isOwner && (
                            <TouchableOpacity onPress={() => {
                                setSelectedDareForMenu(item.id);
                                setMenuVisible(true);
                            }}>
                                <Text style={styles.optionsButton}>⋮</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
                    <Text style={styles.dareText}>Reward: {item.reward}</Text>
                    <Text style={styles.dareText}>Posted by: {item.username || 'Anonymous'}</Text>
                    <Text style={styles.dareText}>
                        Status: {item.status === 'completed' ? 'Completed' : item.status === 'in-progress' ? 'In Progress' : 'Available'}
                    </Text>
                    <View style={styles.row}>
                        <View style={styles.likeContainer}>
                            <Text style={styles.likeCount}>{item.likes} Likes</Text>
                            {!isOwner && (
                                <TouchableOpacity onPress={() => handleLikeDare(item.id, item.likedBy || [])}>
                                    <Text style={styles.likeButton}>👍 Like</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => openComments(item.id)}>
                            <Text style={styles.commentButton}>💬 Comments</Text>
                        </TouchableOpacity>
                    </View>
                    {!item.acceptedBy && !isOwner && (
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={() => handleAcceptDare(item.id)}
                            >
                                <Text style={styles.acceptText}>✅ Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => Alert.alert('Declined', 'You declined the dare.')}
                            >
                                <Text style={styles.rejectText}>❌ Decline</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Swipeable>
        );
    };

    const handleLogout = async () => {
        try {
            if (Platform.OS === 'web') {
                const { signOut } = require('firebase/auth');
                await signOut(auth);
            } else {
                await auth.signOut();
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
            <Button title="Post a Dare" onPress={() => router.push('/create-dare')} />
            <Button title="My Accepted Dares" onPress={() => router.push('/my-dares')} />
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

            <Modal visible={menuVisible} transparent={true} animationType="fade">
                <View style={styles.menuModal}>
                    <View style={styles.menuContent}>
                        {editMode ? (
                            <>
                                <TextInput
                                    style={styles.input}
                                    value={editedChallenge}
                                    onChangeText={setEditedChallenge}
                                    placeholder="Update challenge"
                                />
                                <TextInput
                                    style={styles.input}
                                    value={editedReward}
                                    onChangeText={setEditedReward}
                                    placeholder="Update reward"
                                />
                                <Button title="Save Changes" onPress={handleUpdateDare} />
                                <Button title="Cancel Edit" onPress={() => setEditMode(false)} />
                            </>
                        ) : (
                            <>
                                <TouchableOpacity onPress={handleDeleteDare}>
                                    <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => startEditDare(selectedDareForMenu)}>
                                    <Text style={styles.editButtonText}>✏️ Change</Text>
                                </TouchableOpacity>
                                <Button title="Close" onPress={() => setMenuVisible(false)} />
                            </>
                        )}
                    </View>
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
        alignItems: 'center',
        marginTop: 10,
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
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
    optionsButton: {
        fontSize: 22,
        color: '#555',
        paddingHorizontal: 10,
    },
    menuModal: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContent: {
        width: 300,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
    },
    editButtonText: {
        color: 'blue',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
    },
    acceptButton: {
        backgroundColor: 'green',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    rejectButton: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 5,
    },
    acceptText: {
        color: 'white',
        fontWeight: 'bold',
    },
    rejectText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
