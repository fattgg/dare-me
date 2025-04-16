import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TextInput, Alert, Modal, Platform, TouchableOpacity, Image, ActivityIndicator, Linking } from 'react-native';
import { auth, db, storage } from '../firebaseConfig';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';

// Cloudinary configuration constants
const CLOUDINARY_CLOUD_NAME = 'dw0p7uxa6';
const CLOUDINARY_UPLOAD_PRESET = 'dareme_private';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export default function Challenges() {
    const [dares, setDares] = useState([]);
    const [selectedDare, setSelectedDare] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingDareId, setUploadingDareId] = useState(null);
    const [imageLoadError, setImageLoadError] = useState(false);

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
                acceptedAt: new Date().toISOString(),
            });

            Alert.alert('Success', 'You have accepted the dare!');
        } catch (error) {
            console.error('Error accepting dare:', error);
            Alert.alert('Error', 'Failed to accept the dare. Please try again.');
        }
    };

    const handleDeleteDare = async (dareId) => {
        try {
            const dareRef = ref(db, `dares/${dareId}`);
            await remove(dareRef);
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

    const handleUploadEvidence = async (dareId) => {
        try {
            setIsLoading(true);
            setUploadingDareId(dareId);

            // Request permission to access media library
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Denied', 'You need to allow access to your media library to upload evidence.');
                setIsLoading(false);
                setUploadingDareId(null);
                return;
            }

            // Allow user to pick an image or video
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled) {
                setIsLoading(false);
                setUploadingDareId(null);
                return;
            }

            const fileUri = result.assets[0].uri;
            const fileType = fileUri.endsWith('.mp4') || fileUri.endsWith('.mov') ? 'video' : 'image';

            // Create form data for upload
            const formData = new FormData();

            // Get file name and type
            const uriParts = fileUri.split('.');
            const fileExtension = uriParts[uriParts.length - 1];

            // Determine mime type
            let mimeType;
            if (fileType === 'video') {
                mimeType = fileExtension === 'mov' ? 'video/quicktime' : 'video/mp4';
            } else {
                mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
            }

            // Append file to form data
            formData.append('file', {
                uri: fileUri,
                type: mimeType,
                name: `evidence_${Date.now()}.${fileExtension}`,
            });

            // Add upload preset for authenticated uploads
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'dareme_private');

            // IMPORTANT: REMOVED the type parameter - it's not allowed with unsigned uploads
            // formData.append('type', 'upload');

            console.log('Uploading to Cloudinary...');

            // Upload to Cloudinary
            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const responseData = await response.json();
            console.log('Cloudinary response:', responseData);

            if (responseData.public_id) {
                // IMPORTANT: Store the secure_url from the response
                // This URL includes a token that allows access to the private resource
                const secureUrl = responseData.secure_url;
                console.log('Secure URL:', secureUrl);

                // Calculate expiration time (assuming 24 hours from now)
                const expirationTime = new Date();
                expirationTime.setHours(expirationTime.getHours() + 24);

                // Save the evidence data to Firebase
                const dareRef = ref(db, `dares/${dareId}`);
                await update(dareRef, {
                    evidence: responseData.public_id,
                    evidenceType: fileType,
                    evidenceUrl: secureUrl, // Store the secure URL
                    evidenceExpires: expirationTime.toISOString(), // Store when it expires
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                });

                Alert.alert('Success', 'Evidence uploaded successfully! The dare has been marked as completed. The evidence will be viewable for approximately 24 hours.');
            } else {
                console.error('Upload failed:', responseData);
                Alert.alert('Error', 'Failed to upload evidence. Please try again.');
            }

            setIsLoading(false);
            setUploadingDareId(null);
        } catch (error) {
            console.error('Error uploading evidence:', error);
            Alert.alert('Error', `Failed to upload evidence: ${error.message}`);
            setIsLoading(false);
            setUploadingDareId(null);
        }
    };

    const isUrlExpired = (item) => {
        if (!item.evidenceExpires) return false;

        const expirationDate = new Date(item.evidenceExpires);
        const now = new Date();

        return now > expirationDate;
    };

    const viewEvidence = async (item) => {
        try {
            setIsLoading(true);
            setImageLoadError(false); // Reset error state

            console.log('Viewing evidence for item:', item.id);
            console.log('Evidence URL:', item.evidenceUrl);
            console.log('Evidence type:', item.evidenceType);

            // Check if URL is likely expired based on our stored expiration time
            if (isUrlExpired(item)) {
                console.log('Evidence is expired according to stored expiration time');
                Alert.alert(
                    'Evidence Expired',
                    'This evidence is no longer available for viewing as it has expired.',
                    [{ text: 'OK' }]
                );
                setIsLoading(false);
                return;
            }

            console.log('Evidence is not expired, attempting to display');

            // Use the stored evidenceUrl if available
            if (item.evidenceUrl) {
                console.log('Using stored URL:', item.evidenceUrl);
                setSelectedEvidence({
                    url: item.evidenceUrl,
                    type: item.evidenceType || 'image'
                });
                setEvidenceModalVisible(true);
                setIsLoading(false);
                return;
            }

            // If no URL is available, show an error
            console.log('No evidence URL found');
            Alert.alert('Error', 'No valid URL found for this evidence. You may need to re-upload it.');
            setIsLoading(false);
        } catch (error) {
            console.error('Error viewing evidence:', error);
            Alert.alert('Error', 'Failed to load evidence. Please try again.');
            setIsLoading(false);
        }
    };

    const renderRightActions = (dareId) => (
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteDare(dareId)}
        >
            <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
    );

    const renderDare = ({ item }) => {
        const isUploading = uploadingDareId === item.id;
        const expired = isUrlExpired(item);

        return (
            <Swipeable
                renderRightActions={() => renderRightActions(item.id)}
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

                    {/* Accept Dare Button */}
                    {(!item.status || item.status === 'available' || item.status === '') && (
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleAcceptDare(item.id)}
                        >
                            <Text style={styles.acceptButtonText}>🎯 Accept Dare</Text>
                        </TouchableOpacity>
                    )}

                    {/* Upload Evidence Button or Loading Indicator */}
                    {item.status === 'in-progress' && (
                        isUploading ? (
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator size="small" color="#4CAF50" />
                                <Text style={styles.uploadingText}>Uploading evidence...</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={() => handleUploadEvidence(item.id)}
                                disabled={isLoading}
                            >
                                <Text style={styles.uploadButtonText}>
                                    📷 Upload Evidence
                                </Text>
                            </TouchableOpacity>
                        )
                    )}

                    {/* Display Evidence */}
                    {item.evidence && (
                        <View style={styles.evidenceContainer}>
                            <Text style={styles.evidenceTitle}>Evidence:</Text>

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
                                    {item.evidenceUrl ? (
                                        <>
                                            <Image
                                                source={{ uri: item.evidenceUrl }}
                                                style={styles.evidenceImage}
                                                resizeMode="cover"
                                            />
                                            <Text style={styles.viewFullText}>Tap to view full image</Text>
                                        </>
                                    ) : (
                                        <View style={styles.evidenceImagePlaceholder}>
                                            <Text style={styles.viewFullText}>
                                                {isLoading ? 'Loading...' : 'Tap to view evidence'}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}

                            {item.evidenceExpires && !expired && (
                                <Text style={styles.expiresText}>
                                    Evidence available until: {new Date(item.evidenceExpires).toLocaleString()}
                                </Text>
                            )}

                            {item.completedAt && (
                                <Text style={styles.completedText}>
                                    Completed on: {new Date(item.completedAt).toLocaleDateString()}
                                </Text>
                            )}
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

            {/* Comments Modal */}
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

            {/* Evidence Modal */}
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
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>

                    {selectedEvidence && (
                        selectedEvidence.type === 'video' ? (
                            // Replace this with your actual video player component
                            <Text style={{ color: 'white', textAlign: 'center' }}>
                                Video content goes here
                            </Text>
                        ) : selectedEvidence.type === 'image' ? (
                            <View style={styles.webViewContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color="#ffffff"
                                    style={styles.loadingIndicator}
                                />

                                {/* Use a simple HTML wrapper to display the image */}
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
                            `
                                    }}
                                    style={styles.fullScreenImage}
                                    onError={(e) => console.log('WebView error:', e)}
                                />
                            </View>
                        ) : (
                            <>
                                <ActivityIndicator
                                    size="large"
                                    color="#ffffff"
                                    style={styles.loadingIndicator}
                                />

                                <WebView
                                    source={{ uri: selectedEvidence.url }}
                                    style={styles.fullScreenImage}
                                    startInLoadingState={true}
                                    renderLoading={() => (
                                        <ActivityIndicator
                                            size="large"
                                            color="#ffffff"
                                            style={styles.loadingIndicator}
                                        />
                                    )}
                                />
                            </>
                        )
                    )}
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
        marginBottom: 5,
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
        marginBottom: 10,
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
    acceptButton: {
        backgroundColor: '#FF9800',
        padding: 12,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    uploadButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    uploadButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 5,
        marginTop: 10,
    },
    uploadingText: {
        marginLeft: 10,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    evidenceTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    evidenceContainer: {
        marginTop: 15,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        backgroundColor: '#f5f5f5',
    },
    evidenceText: {
        fontSize: 14,
        marginBottom: 5,
    },
    evidenceImage: {
        width: '100%',
        height: 200,
        borderRadius: 5,
        marginTop: 5,
    },
    evidenceImagePlaceholder: {
        width: '100%',
        height: 150,
        borderRadius: 5,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    viewFullText: {
        textAlign: 'center',
        color: 'blue',
        marginTop: 5,
    },
    completedText: {
        marginTop: 5,
        fontStyle: 'italic',
        color: 'green',
    },
    expiresText: {
        marginTop: 5,
        fontStyle: 'italic',
        color: '#FF9800',
        fontSize: 12,
    },
    expiredContainer: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expiredText: {
        color: '#999',
        fontStyle: 'italic',
    },
    viewButton: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 5,
        marginTop: 5,
        alignItems: 'center',
    },
    viewButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    evidenceModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '90%',
        height: '80%',
    },
    videoContainer: {
        width: '90%',
        height: '80%',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    loadingIndicator: {
        position: 'absolute',
        zIndex: 1,
    },
    webViewContainer: {
        width: '90%',
        height: '80%',
        backgroundColor: 'transparent',
    },
});