"use client"

import { useEffect, useState } from "react"
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
} from "react-native"
import { auth, db } from "../firebaseConfig"
import { ref, onValue, update, remove, push } from "firebase/database"
import { Swipeable } from "react-native-gesture-handler"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Video } from "expo-av"
import { WebView } from "react-native-webview"
import { LinearGradient } from "expo-linear-gradient"
import { Feather } from "@expo/vector-icons"
import { useFonts } from "expo-font"
import Head from "expo-router/head"

// Cloudinary configuration constants
const CLOUDINARY_CLOUD_NAME = "dw0p7uxa6"
const CLOUDINARY_UPLOAD_PRESET = "dareme_private"
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`

const isWeb = Platform.OS === "web"

// Create a wrapper component that conditionally uses Swipeable
const SwipeableWrapper = ({ children, ...props }) => {
  if (isWeb) {
    // On web, just render the children without Swipeable
    return <View>{children}</View>
  } else {
    // On native platforms, use Swipeable
    return <Swipeable {...props}>{children}</Swipeable>
  }
}

export default function Challenges() {
  const [fontsLoaded] = useFonts({
    "Montserrat-Thin": require("../assets/fonts/static/Montserrat-Thin.ttf"),
    "Montserrat-SemiBoldItalic": require("../assets/fonts/static/Montserrat-SemiBoldItalic.ttf"),
    "Montserrat-SemiBold": require("../assets/fonts/static/Montserrat-SemiBold.ttf"),
    "Montserrat-ExtraLightItalic": require("../assets/fonts/static/Montserrat-ExtraLightItalic.ttf"),
  })

  const [dares, setDares] = useState<{ id: string; [key: string]: any }[]>([])
  const [selectedDare, setSelectedDare] = useState(null)
  const [comments, setComments] = useState<{ id: string; [key: string]: any }[]>([])
  const [newComment, setNewComment] = useState("")
  const [modalVisible, setModalVisible] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedDareForMenu, setSelectedDareForMenu] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editedChallenge, setEditedChallenge] = useState("")
  const [editedReward, setEditedReward] = useState("")

  // Evidence-related states
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingDareId, setUploadingDareId] = useState(null)
  const [isReady, setIsReady] = useState(false)

  // Debug state
  const [debugInfo, setDebugInfo] = useState("")

  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    if (fontsLoaded) {
      setIsReady(true)
    }
  }, [fontsLoaded])

  useEffect(() => {
    const daresRef = ref(db, "dares")
    const unsubscribe = onValue(daresRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const formattedDares = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
          likes: data[key].likedBy ? data[key].likedBy.length : 0,
        }))
        setDares(formattedDares)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleAcceptDare = async (dareId) => {
    try {
      const user = auth.currentUser
      if (!user) {
        Alert.alert("Error", "You must be logged in to accept a dare.")
        return
      }

      const dareRef = ref(db, `dares/${dareId}`)
      await update(dareRef, {
        status: "in-progress",
        acceptedBy: user.uid,
        acceptedAt: new Date().toISOString(),
      })

      Alert.alert("Success", "You have accepted the dare!")
    } catch (error) {
      console.error("Error accepting dare:", error)
      Alert.alert("Error", "Failed to accept the dare. Please try again.")
    }
  }

  const handleDeleteDare = async () => {
    try {
      const dareRef = ref(db, `dares/${selectedDareForMenu}`)
      await remove(dareRef)
      setMenuVisible(false)
      Alert.alert("Success", "Dare deleted successfully!")
    } catch (error) {
      console.error("Error deleting dare:", error)
      Alert.alert("Error", "Failed to delete the dare. Please try again.")
    }
  }

  const handleLikeDare = async (dareId, likedBy = []) => {
    try {
      const user = auth.currentUser
      if (!user) {
        Alert.alert("Error", "You must be logged in to like a dare.")
        return
      }

      const dare = dares.find((d) => d.id === dareId)
      if (dare && dare.userId === user.uid) return

      const dareRef = ref(db, `dares/${dareId}`)
      if (likedBy.includes(user.uid)) {
        const updatedLikedBy = likedBy.filter((uid) => uid !== user.uid)
        await update(dareRef, { likedBy: updatedLikedBy })
      } else {
        await update(dareRef, { likedBy: [...likedBy, user.uid] })
      }
    } catch (error) {
      console.error("Error liking/unliking dare:", error)
      Alert.alert("Error", "Failed to like/unlike the dare. Please try again.")
    }
  }

  const openComments = (dareId) => {
    setSelectedDare(dareId)
    setModalVisible(true)

    const commentsRef = ref(db, `dares/${dareId}/comments`)
    onValue(commentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const formattedComments = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))
        setComments(formattedComments)
      } else {
        setComments([])
      }
    })
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Comment cannot be empty.")
      return
    }

    try {
      const user = auth.currentUser
      if (!user) {
        Alert.alert("Error", "You must be logged in to comment.")
        return
      }

      const commentsRef = ref(db, `dares/${selectedDare}/comments`)
      await push(commentsRef, {
        userId: user.uid,
        username: user.email || "Anonymous",
        text: newComment,
        timestamp: new Date().toISOString(),
      })

      setNewComment("")
      Alert.alert("Success", "Comment added!")
    } catch (error) {
      console.error("Error adding comment:", error)
      Alert.alert("Error", "Failed to add comment. Please try again.")
    }
  }

  const startEditDare = (dareId) => {
    const dareToEdit = dares.find((d) => d.id === dareId)
    if (dareToEdit) {
      setEditedChallenge(dareToEdit.challenge)
      setEditedReward(dareToEdit.reward)
      setEditMode(true)
    }
  }

  const handleUpdateDare = async () => {
    try {
      const dareRef = ref(db, `dares/${selectedDareForMenu}`)
      await update(dareRef, {
        challenge: editedChallenge,
        reward: editedReward,
      })
      setEditMode(false)
      setMenuVisible(false)
      Alert.alert("Success", "Dare updated successfully!")
    } catch (error) {
      console.error("Error updating dare:", error)
      Alert.alert("Error", "Failed to update dare. Please try again.")
    }
  }

  // Evidence Upload Function
  const handleUploadEvidence = async (dareId) => {
    try {
      setIsLoading(true)
      setUploadingDareId(dareId)

      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your media library to upload evidence.")
        setIsLoading(false)
        setUploadingDareId(null)
        return
      }

      // Allow user to pick an image or video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      })

      if (result.canceled) {
        setIsLoading(false)
        setUploadingDareId(null)
        return
      }

      const fileUri = result.assets[0].uri
      const fileType = fileUri.endsWith(".mp4") || fileUri.endsWith(".mov") ? "video" : "image"

      // Create form data for upload
      const formData = new FormData()

      // Get file name and type
      const uriParts = fileUri.split(".")
      const fileExtension = uriParts[uriParts.length - 1]

      // Determine mime type
      let mimeType
      if (fileType === "video") {
        mimeType = fileExtension === "mov" ? "video/quicktime" : "video/mp4"
      } else {
        mimeType = fileExtension === "png" ? "image/png" : "image/jpeg"
      }

      // Append file to form data
      formData.append("file", {
        uri: fileUri,
        type: mimeType,
        name: `evidence_${Date.now()}.${fileExtension}`,
      })

      // Add upload preset for authenticated uploads
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
      formData.append("folder", "dareme_private")

      console.log("Uploading to Cloudinary...")

      // Upload to Cloudinary
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      })

      const responseData = await response.json()
      console.log("Cloudinary response:", responseData)

      if (responseData.public_id) {
        // Store the secure_url from the response
        const secureUrl = responseData.secure_url
        console.log("Secure URL:", secureUrl)

        // Calculate expiration time (24 hours from now)
        const expirationTime = new Date()
        expirationTime.setHours(expirationTime.getHours() + 24)

        // Save the evidence data to Firebase
        const dareRef = ref(db, `dares/${dareId}`)
        await update(dareRef, {
          evidence: responseData.public_id,
          evidenceType: fileType,
          evidenceUrl: secureUrl, // Store the secure URL
          evidenceExpires: expirationTime.toISOString(), // Store when it expires
          status: "completed",
          completedAt: new Date().toISOString(),
        })

        Alert.alert(
          "Success",
          "Evidence uploaded successfully! The dare has been marked as completed. The evidence will be viewable for approximately 24 hours.",
        )
      } else {
        console.error("Upload failed:", responseData)
        Alert.alert("Error", "Failed to upload evidence. Please try again.")
      }

      setIsLoading(false)
      setUploadingDareId(null)
    } catch (error) {
      console.error("Error uploading evidence:", error)
      Alert.alert("Error", `Failed to upload evidence: ${error.message}`)
      setIsLoading(false)
      setUploadingDareId(null)
    }
  }

  // Check if URL is expired
  const isUrlExpired = (item) => {
    if (!item.evidenceExpires) return false

    const expirationDate = new Date(item.evidenceExpires)
    const now = new Date()

    return now > expirationDate
  }

  // View Evidence Function
  const viewEvidence = async (item) => {
    try {
      setIsLoading(true)

      console.log("Viewing evidence for item:", item.id)
      console.log("Evidence URL:", item.evidenceUrl)
      console.log("Evidence type:", item.evidenceType)

      // Check if URL is likely expired based on our stored expiration time
      if (isUrlExpired(item)) {
        console.log("Evidence is expired according to stored expiration time")
        Alert.alert("Evidence Expired", "This evidence is no longer available for viewing as it has expired.", [
          { text: "OK" },
        ])
        setIsLoading(false)
        return
      }

      console.log("Evidence is not expired, attempting to display")

      // Use the stored evidenceUrl if available
      if (item.evidenceUrl) {
        console.log("Using stored URL:", item.evidenceUrl)
        setSelectedEvidence({
          url: item.evidenceUrl,
          type: item.evidenceType || "image",
        })
        setEvidenceModalVisible(true)
        setIsLoading(false)
        return
      }

      // If no URL is available, show an error
      console.log("No evidence URL found")
      Alert.alert("Error", "No valid URL found for this evidence. You may need to re-upload it.")
      setIsLoading(false)
    } catch (error) {
      console.error("Error viewing evidence:", error)
      Alert.alert("Error", "Failed to load evidence. Please try again.")
      setIsLoading(false)
    }
  }

  const renderDare = ({ item }) => {
    const user = auth.currentUser
    const isOwner = user && item.userId === user.uid
    const isAccepted = item.acceptedBy === user?.uid
    const isUploading = uploadingDareId === item.id
    const expired = isUrlExpired(item)

    return (
      <SwipeableWrapper>
        <View style={styles.dareItem}>
          <View style={styles.rowTop}>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedDareForMenu(item.id)
                  setMenuVisible(true)
                }}
              >
                <Feather name="more-vertical" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.dareText}>Challenge: {item.challenge}</Text>
          <Text style={styles.dareText}>Reward: {item.reward}</Text>
          <Text style={styles.dareText}>Posted by: {item.username || "Anonymous"}</Text>
          <Text style={styles.statusText}>
            Status:{" "}
            {item.status === "completed" ? "Completed" : item.status === "in-progress" ? "In Progress" : "Available"}
          </Text>

          <View style={[styles.row, isSmallScreen && { flexDirection: "column", alignItems: "flex-start" }]}>
            <View style={[styles.likeContainer, isSmallScreen && { width: "100%", marginBottom: 5 }]}>
              <Text style={styles.likeCount}>{item.likes} Likes</Text>
              {!isOwner && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleLikeDare(item.id, item.likedBy || [])}
                >
                  <Feather name="thumbs-up" size={16} color="#fff" style={styles.actionIcon} />
                  <Text style={styles.actionText}>Like</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={() => openComments(item.id)}>
              <Feather name="message-circle" size={16} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionText}>Comments</Text>
            </TouchableOpacity>
          </View>

          {/* Accept/Decline Buttons */}
          {!item.acceptedBy && !isOwner && (
            <View style={[styles.row, isSmallScreen && { flexDirection: "column", alignItems: "flex-start" }]}>
              <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptDare(item.id)}>
                <Feather name="check" size={16} color="#fff" style={styles.actionIcon} />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => Alert.alert("Declined", "You declined the dare.")}
              >
                <Feather name="x" size={16} color="#fff" style={styles.actionIcon} />
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload Evidence Button */}
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

          {/* Display Evidence */}
          {item.evidence && (
            <View style={styles.evidenceContainer}>
              <Text style={styles.evidenceTitle}>Evidence:</Text>

              {expired ? (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>Evidence has expired</Text>
                </View>
              ) : item.evidenceType === "video" ? (
                <View>
                  <Text style={styles.evidenceText}>Video evidence uploaded</Text>
                  <TouchableOpacity style={styles.viewButton} onPress={() => viewEvidence(item)} disabled={isLoading}>
                    <Feather name="video" size={16} color="#fff" style={styles.actionIcon} />
                    <Text style={styles.viewButtonText}>{isLoading ? "Loading..." : "View Video"}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => viewEvidence(item)} disabled={isLoading}>
                  {item.evidenceUrl ? (
                    <>
                      <Image source={{ uri: item.evidenceUrl }} style={styles.evidenceImage} resizeMode="cover" />
                      <Text style={styles.viewFullText}>Tap to view full image</Text>
                    </>
                  ) : (
                    <View style={styles.evidenceImagePlaceholder}>
                      <Text style={styles.viewFullText}>{isLoading ? "Loading..." : "Tap to view evidence"}</Text>
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
      </SwipeableWrapper>
    )
  }

  const handleLogout = async () => {
    try {
      if (Platform.OS === "web") {
        const { signOut } = require("firebase/auth")
        await signOut(auth)
      } else {
        await auth.signOut()
      }
      router.replace("/login")
    } catch (error) {
      console.error("Error logging out:", error)
      Alert.alert("Error", "Failed to log out. Please try again.")
    }
  }

  // Add this after the other useEffect hooks
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setIsSmallScreen(window.innerWidth < 500)
      }

      // Initial check
      handleResize()

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  if (!isReady || isLoading) {
    return (
      <LinearGradient colors={["#4B0082", "#B788C4"]} style={[styles.gradient, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    )
  }

  return (
    <>
      <Head>
        <title>DareMe | Challenges</title>
        <meta name="description" content="Browse and accept dares on DareMe" />
      </Head>

      <LinearGradient colors={["#4B0082", "#B788C4"]} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Feather name="award" size={40} color="#fff" />
            <Text style={styles.title}>Available Dares</Text>
          </View>

          <View style={[styles.buttonContainer, isSmallScreen && { flexDirection: "column" }]}>
            <TouchableOpacity
              style={[styles.mainButton, isSmallScreen && { width: "100%", flex: undefined }]}
              onPress={() => router.push("/create-dare")}
            >
              <Feather name="plus-circle" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Post a Dare</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainButton, isSmallScreen && { width: "100%", flex: undefined }]}
              onPress={() => router.push("/my-dares")}
            >
              <Feather name="list" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>My Accepted Dares</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={dares}
            keyExtractor={(item) => item.id}
            renderItem={renderDare}
            contentContainerStyle={styles.list}
          />

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Comments Modal */}
          <Modal visible={modalVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Comments</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Feather name="x" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{item.username}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  )}
                  contentContainerStyle={styles.commentsList}
                />

                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor="#ccc"
                    value={newComment}
                    onChangeText={setNewComment}
                  />
                  <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
                    <Feather name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Menu Modal */}
          <Modal visible={menuVisible} transparent={true} animationType="fade">
            <View style={styles.menuModal}>
              <View style={styles.menuContent}>
                {editMode ? (
                  <>
                    <Text style={styles.menuTitle}>Edit Dare</Text>
                    <TextInput
                      style={styles.menuInput}
                      value={editedChallenge}
                      onChangeText={setEditedChallenge}
                      placeholder="Update challenge"
                      placeholderTextColor="#ccc"
                    />
                    <TextInput
                      style={styles.menuInput}
                      value={editedReward}
                      onChangeText={setEditedReward}
                      placeholder="Update reward"
                      placeholderTextColor="#ccc"
                    />
                    <TouchableOpacity style={styles.menuButton} onPress={handleUpdateDare}>
                      <Text style={styles.menuButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.menuButton, styles.cancelButton]}
                      onPress={() => setEditMode(false)}
                    >
                      <Text style={styles.menuButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.menuTitle}>Dare Options</Text>
                    <TouchableOpacity style={styles.menuOption} onPress={() => startEditDare(selectedDareForMenu)}>
                      <Feather name="edit" size={20} color="#fff" style={styles.menuIcon} />
                      <Text style={styles.menuOptionText}>Edit Dare</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuOption} onPress={handleDeleteDare}>
                      <Feather name="trash-2" size={20} color="#ff6b6b" style={styles.menuIcon} />
                      <Text style={[styles.menuOptionText, styles.deleteText]}>Delete Dare</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuButton, styles.closeButton]}
                      onPress={() => setMenuVisible(false)}
                    >
                      <Text style={styles.menuButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
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
              <TouchableOpacity style={styles.closeButton} onPress={() => setEvidenceModalVisible(false)}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>

              {selectedEvidence &&
                (selectedEvidence.type === "video" ? (
                  <View style={styles.videoContainer}>
                    <ActivityIndicator size="large" color="#ffffff" style={styles.loadingIndicator} />
                    <Video
                      source={{ uri: selectedEvidence.url }}
                      rate={1.0}
                      volume={1.0}
                      isMuted={false}
                      resizeMode="contain"
                      shouldPlay
                      useNativeControls
                      style={styles.fullScreenVideo}
                      onLoad={() => console.log("Video loaded successfully")}
                      onError={(error) => {
                        console.log("Video error:", error)
                        if (error) {
                          Alert.alert("Error", "Failed to load video. It may have expired.", [
                            {
                              text: "OK",
                              onPress: () => setEvidenceModalVisible(false),
                            },
                          ])
                        }
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.webViewContainer}>
                    <ActivityIndicator size="large" color="#ffffff" style={styles.loadingIndicator} />

                    {/* Use WebView to display authenticated images */}
                    {Platform.OS === "web" ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "black",
                        }}
                      >
                        <img
                          src={selectedEvidence.url || "/placeholder.svg"}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                          }}
                          alt="Evidence"
                        />
                      </div>
                    ) : (
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
                          console.log("WebView error:", e)
                          Alert.alert(
                            "Evidence Unavailable",
                            "This evidence could not be loaded. It may have expired.",
                            [
                              {
                                text: "OK",
                                onPress: () => setEvidenceModalVisible(false),
                              },
                            ],
                          )
                        }}
                      />
                    )}
                  </View>
                ))}
            </View>
          </Modal>
        </View>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Montserrat-SemiBold",
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 50,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: Platform.OS === "web" ? "row" : "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  mainButton: {
    backgroundColor: "#6A0DAD",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: Platform.OS === "web" ? 0.48 : 0.48,
    width: undefined,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
  },
  buttonIcon: {
    marginRight: 8,
  },
  list: {
    paddingBottom: 20,
  },
  dareItem: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    ...(isWeb && {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    }),
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  dareText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
  },
  statusText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    marginTop: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  likeContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: undefined,
    marginBottom: 0,
  },
  likeCount: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginRight: 10,
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  actionIcon: {
    marginRight: 5,
  },
  actionText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  acceptText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  rejectText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  uploadButtonText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 15,
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  uploadingText: {
    marginLeft: 10,
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
  },
  evidenceContainer: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  evidenceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
  },
  evidenceText: {
    fontSize: 14,
    marginBottom: 8,
    color: "#fff",
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  evidenceImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 5,
  },
  evidenceImagePlaceholder: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  viewFullText: {
    textAlign: "center",
    color: "#B788C4",
    marginTop: 8,
    fontFamily: "Montserrat-SemiBoldItalic",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 8,
  },
  viewButtonText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 14,
  },
  completedText: {
    marginTop: 8,
    fontStyle: "italic",
    color: "#4CAF50",
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  expiresText: {
    marginTop: 8,
    fontStyle: "italic",
    color: "#FF9800",
    fontSize: 12,
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  expiredContainer: {
    padding: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  expiredText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6A0DAD",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  logoutText: {
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 500,
    maxHeight: Platform.OS === "web" ? "80%" : "90%",
    backgroundColor: "#4B0082",
    borderRadius: 15,
    padding: 20,
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "Montserrat-SemiBold",
  },
  commentsList: {
    flexGrow: 1,
  },
  commentItem: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  commentAuthor: {
    fontWeight: "bold",
    color: "#B788C4",
    marginBottom: 5,
    fontFamily: "Montserrat-SemiBold",
  },
  commentText: {
    color: "#fff",
    fontFamily: "Montserrat-ExtraLightItalic",
  },
  commentInputContainer: {
    flexDirection: "row",
    marginTop: 15,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    fontFamily: "Montserrat-SemiBold",
  },
  addCommentButton: {
    backgroundColor: "#6A0DAD",
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    width: "80%",
    maxWidth: 350,
    backgroundColor: "#4B0082",
    borderRadius: 15,
    padding: 20,
    ...(isWeb && {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    maxHeight: Platform.OS === "web" ? "80vh" : "90%",
    overflow: "auto",
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
    fontFamily: "Montserrat-SemiBold",
  },
  menuInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    fontFamily: "Montserrat-SemiBold",
  },
  menuButton: {
    backgroundColor: "#6A0DAD",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  menuButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "Montserrat-SemiBold",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  closeButton: {
    marginTop: 5,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  menuIcon: {
    marginRight: 12,
  },
  menuOptionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-SemiBold",
  },
  deleteText: {
    color: "#ff6b6b",
  },
  evidenceModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 0,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  webViewContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "transparent",
  },
  videoContainer: {
    width: "90%",
    height: "80%",
  },
  fullScreenVideo: {
    width: "100%",
    height: "100%",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  loadingIndicator: {
    position: "absolute",
    zIndex: 1,
    alignSelf: "center",
    top: "50%",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
})
