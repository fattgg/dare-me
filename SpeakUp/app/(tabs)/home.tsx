"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Animated,
  Share,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Easing,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")
const isTablet = screenWidth > 768

type Language = {
  code: string
  name: string
  flag: string
  gradient: string[]
}

type VocabularyItem = {
  id: string
  word: string
  translations: { [key: string]: string }
  category: "Greetings" | "Thanks" | "Farewell" | "Others" | "Numbers" | "Colors" | "Food" | "Family"
  audioUrl?: string
  viewCount?: number
  playCount?: number
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸", gradient: ["#FF6B6B", "#FF8E53"] },
  { code: "al", name: "Albanian", flag: "🇦🇱", gradient: ["#4ECDC4", "#44A08D"] },
  { code: "es", name: "Spanish", flag: "🇪🇸", gradient: ["#FFD93D", "#FF6B6B"] },
  { code: "fr", name: "French", flag: "🇫🇷", gradient: ["#667eea", "#764ba2"] },
  { code: "de", name: "German", flag: "🇩🇪", gradient: ["#f093fb", "#f5576c"] },
  { code: "it", name: "Italian", flag: "🇮🇹", gradient: ["#4facfe", "#00f2fe"] },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", gradient: ["#43e97b", "#38f9d7"] },
  { code: "ru", name: "Russian", flag: "🇷🇺", gradient: ["#fa709a", "#fee140"] },
  { code: "zh", name: "Chinese", flag: "🇨🇳", gradient: ["#a8edea", "#fed6e3"] },
  { code: "ja", name: "Japanese", flag: "🇯🇵", gradient: ["#ff9a9e", "#fecfef"] },
  { code: "ar", name: "Arabic", flag: "🇸🇦", gradient: ["#ffecd2", "#fcb69f"] },
  { code: "hi", name: "Hindi", flag: "🇮🇳", gradient: ["#ff8a80", "#ff80ab"] },
]

const INITIAL_VOCAB: VocabularyItem[] = [
  {
    id: "1",
    word: "Hello",
    translations: {
      al: "Përshëndetje",
      es: "Hola",
      fr: "Bonjour",
      de: "Hallo",
      it: "Ciao",
      pt: "Olá",
      ru: "Привет",
      zh: "你好",
      ja: "こんにちは",
      ar: "مرحبا",
      hi: "नमस्ते",
    },
    category: "Greetings",
    audioUrl: "https://ssl.gstatic.com/dictionary/static/sounds/oxford/hello--_gb_1.mp3",
  },
  {
    id: "2",
    word: "Thank you",
    translations: {
      al: "Faleminderit",
      es: "Gracias",
      fr: "Merci",
      de: "Danke",
      it: "Grazie",
      pt: "Obrigado",
      ru: "Спасибо",
      zh: "谢谢",
      ja: "ありがとう",
      ar: "شكرا",
      hi: "धन्यवाद",
    },
    category: "Thanks",
  },
  {
    id: "3",
    word: "Goodbye",
    translations: {
      al: "Mirupafshim",
      es: "Adiós",
      fr: "Au revoir",
      de: "Auf Wiedersehen",
      it: "Arrivederci",
      pt: "Tchau",
      ru: "До свидания",
      zh: "再见",
      ja: "さようなら",
      ar: "وداعا",
      hi: "अलविदा",
    },
    category: "Farewell",
  },
  {
    id: "4",
    word: "Please",
    translations: {
      al: "Të lutem",
      es: "Por favor",
      fr: "S'il vous plaît",
      de: "Bitte",
      it: "Per favore",
      pt: "Por favor",
      ru: "Пожалуйста",
      zh: "请",
      ja: "お願いします",
      ar: "من فضلك",
      hi: "कृपया",
    },
    category: "Others",
  },
  {
    id: "5",
    word: "Love",
    translations: {
      al: "Dashuri",
      es: "Amor",
      fr: "Amour",
      de: "Liebe",
      it: "Amore",
      pt: "Amor",
      ru: "Любовь",
      zh: "爱",
      ja: "愛",
      ar: "حب",
      hi: "प्रेम",
    },
    category: "Others",
  },
  {
    id: "6",
    word: "Red",
    translations: {
      al: "I kuq",
      es: "Rojo",
      fr: "Rouge",
      de: "Rot",
      it: "Rosso",
      pt: "Vermelho",
      ru: "Красный",
      zh: "红色",
      ja: "赤",
      ar: "أحمر",
      hi: "लाल",
    },
    category: "Colors",
  },
  {
    id: "7",
    word: "Water",
    translations: {
      al: "Ujë",
      es: "Agua",
      fr: "Eau",
      de: "Wasser",
      it: "Acqua",
      pt: "Água",
      ru: "Вода",
      zh: "水",
      ja: "水",
      ar: "ماء",
      hi: "पानी",
    },
    category: "Food",
  },
  {
    id: "8",
    word: "Mother",
    translations: {
      al: "Nënë",
      es: "Madre",
      fr: "Mère",
      de: "Mutter",
      it: "Madre",
      pt: "Mãe",
      ru: "Мать",
      zh: "母亲",
      ja: "母",
      ar: "أم",
      hi: "माँ",
    },
    category: "Family",
  },
]

const ITEMS_PER_PAGE = 6

export default function VocabularyApp() {
  // States
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [sourceLanguage, setSourceLanguage] = useState("en")
  const [targetLanguage, setTargetLanguage] = useState("al")
  const [modalVisible, setModalVisible] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [languageModalVisible, setLanguageModalVisible] = useState(false)
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [audioVolume, setAudioVolume] = useState(0.7)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"All" | VocabularyItem["category"]>("All")
  const [sortBy, setSortBy] = useState<"word" | "meaning" | "category">("word")
  const [paginationPage, setPaginationPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(1))
  const [rotateAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(0))
  const [pulseAnim] = useState(new Animated.Value(1))
  const [flameAnim] = useState(new Animated.Value(0))
  const [sparkleAnim] = useState(new Animated.Value(0))

  const [editWordData, setEditWordData] = useState<Partial<VocabularyItem>>({
    word: "",
    translations: {},
    category: "Others",
    audioUrl: "",
  })

  const soundRef = useRef<Audio.Sound | null>(null)

  // Quiz states
  const [quizModalVisible, setQuizModalVisible] = useState(false)
  const [quizStep, setQuizStep] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<VocabularyItem[]>([])

  // Start animations on mount
  useEffect(() => {
    startFlameAnimation()
    startSparkleAnimation()
    startPulseAnimation()
  }, [])

  const startFlameAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(flameAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start()
  }

  const startSparkleAnimation = () => {
    Animated.loop(
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }

  const animateButton = (callback?: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback)
  }

  const animateModal = () => {
    slideAnim.setValue(screenHeight)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Load data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  // Save data when states change
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("@vocabulary", JSON.stringify(vocabulary))
    }
  }, [vocabulary, isLoading])

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("@favorites", JSON.stringify(favorites))
    }
  }, [favorites, isLoading])

  useEffect(() => {
    if (!isLoading) {
      saveSettings()
    }
  }, [soundOn, audioVolume, darkMode, sourceLanguage, targetLanguage, isLoading])

  const loadAllData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([loadVocabulary(), loadFavorites(), loadSettings(), loadSearchHistory()])
    } catch (error) {
      console.log("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVocabulary = async () => {
    try {
      const vocabString = await AsyncStorage.getItem("@vocabulary")
      if (vocabString) {
        setVocabulary(JSON.parse(vocabString))
      } else {
        setVocabulary(INITIAL_VOCAB)
      }
    } catch (e) {
      console.log("Error loading vocabulary:", e)
      setVocabulary(INITIAL_VOCAB)
    }
  }

  const loadFavorites = async () => {
    try {
      const favString = await AsyncStorage.getItem("@favorites")
      if (favString) setFavorites(JSON.parse(favString))
    } catch (e) {
      console.log("Error loading favorites:", e)
    }
  }

  const loadSettings = async () => {
    try {
      const [sound, vol, dark, source, target] = await Promise.all([
        AsyncStorage.getItem("@soundOn"),
        AsyncStorage.getItem("@audioVolume"),
        AsyncStorage.getItem("@darkMode"),
        AsyncStorage.getItem("@sourceLanguage"),
        AsyncStorage.getItem("@targetLanguage"),
      ])

      if (sound !== null) setSoundOn(sound === "true")
      if (vol !== null) setAudioVolume(Number.parseFloat(vol))
      if (dark !== null) setDarkMode(dark === "true")
      if (source !== null) setSourceLanguage(source)
      if (target !== null) setTargetLanguage(target)
    } catch (e) {
      console.log("Error loading settings:", e)
    }
  }

  const loadSearchHistory = async () => {
    try {
      const hist = await AsyncStorage.getItem("@searchHistory")
      if (hist) setSearchHistory(JSON.parse(hist))
    } catch (e) {
      console.log("Error loading search history:", e)
    }
  }

  const saveSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem("@soundOn", soundOn.toString()),
        AsyncStorage.setItem("@audioVolume", audioVolume.toString()),
        AsyncStorage.setItem("@darkMode", darkMode.toString()),
        AsyncStorage.setItem("@sourceLanguage", sourceLanguage),
        AsyncStorage.setItem("@targetLanguage", targetLanguage),
      ])
    } catch (e) {
      console.log("Error saving settings:", e)
    }
  }

  const toggleFavorite = (id: string) => {
    animateButton(() => {
      let newFavs: string[]
      if (favorites.includes(id)) {
        newFavs = favorites.filter((favId) => favId !== id)
        Alert.alert("✨ Removed from favorites")
      } else {
        newFavs = [...favorites, id]
        Alert.alert("⭐ Added to favorites")
      }
      setFavorites(newFavs)
    })
  }

  // Get current languages
  const sourceLanguageObj = LANGUAGES.find(l => l.code === sourceLanguage) || LANGUAGES[0]
  const targetLanguageObj = LANGUAGES.find(l => l.code === targetLanguage) || LANGUAGES[1]

  // Filter and sort vocabulary
  const filteredVocab = vocabulary.filter(({ word, translations, category }) => {
    if (selectedCategory !== "All" && category !== selectedCategory) return false
    const searchText = searchTerm.toLowerCase()
    const sourceText = sourceLanguage === "en" ? word : translations?.[sourceLanguage] || ""
    const targetText = targetLanguage === "en" ? word : translations?.[targetLanguage] || ""

    return sourceText.toLowerCase().includes(searchText) || targetText.toLowerCase().includes(searchText)
  })

  const sortedVocab = filteredVocab.sort((a, b) => {
    if (sortBy === "word") {
      const aText = sourceLanguage === "en" ? a.word : a.translations[sourceLanguage] || ""
      const bText = sourceLanguage === "en" ? b.word : b.translations[sourceLanguage] || ""
      return aText.localeCompare(bText)
    } else if (sortBy === "meaning") {
      const aText = targetLanguage === "en" ? a.word : a.translations[targetLanguage] || ""
      const bText = targetLanguage === "en" ? b.word : b.translations[targetLanguage] || ""
      return aText.localeCompare(bText)
    } else {
      return a.category.localeCompare(b.category)
    }
  })

  // Pagination
  const startIndex = (paginationPage - 1) * ITEMS_PER_PAGE
  const paginatedVocab = sortedVocab.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  const totalPages = Math.ceil(sortedVocab.length / ITEMS_PER_PAGE)

  const openModal = (item: VocabularyItem) => {
    setSelectedWord(item)
    setModalVisible(true)
    animateModal()
    incrementViewCount(item.id)
  }

  const incrementViewCount = (id: string) => {
    setVocabulary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, viewCount: (item.viewCount || 0) + 1 } : item)),
    )
  }

  const playSound = async (audioUrl?: string) => {
    if (!audioUrl || !soundOn) return
    animateButton()
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { volume: audioVolume })
      soundRef.current = sound
      await sound.playAsync()
      if (selectedWord) incrementPlayCount(selectedWord.id)
    } catch (e) {
      console.log("Error playing sound:", e)
      Alert.alert("Audio Error", "Could not play audio file")
    }
  }

  const incrementPlayCount = (id: string) => {
    setVocabulary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, playCount: (item.playCount || 0) + 1 } : item)),
    )
  }

  const shareWord = async (item: VocabularyItem) => {
    try {
      const sourceText = sourceLanguage === "en" ? item.word : item.translations[sourceLanguage] || ""
      const targetText = targetLanguage === "en" ? item.word : item.translations[targetLanguage] || ""
      await Share.share({
        message: `🌍 ${sourceText} → ${targetText}\n\nShared from PolyGlot! 🔥 Multi-Language Learning App`,
      })
    } catch {
      Alert.alert("Error", "Could not share word")
    }
  }

  const addNewWord = () => {
    if (!editWordData.word?.trim() || !editWordData.translations?.[targetLanguage]?.trim()) {
      Alert.alert("Missing Information", "Please fill in both source and target language")
      return
    }

    const newWord: VocabularyItem = {
      id: Date.now().toString(),
      word: editWordData.word!.trim(),
      translations: editWordData.translations!,
      category: editWordData.category as VocabularyItem["category"],
      audioUrl: editWordData.audioUrl?.trim() || undefined,
      viewCount: 0,
      playCount: 0,
    }

    setVocabulary([newWord, ...vocabulary])
    setEditWordData({ word: "", translations: {}, category: "Others", audioUrl: "" })
    setAddModalVisible(false)
    Alert.alert("✅ Word Added", "New word added successfully!")
  }

  const startQuiz = () => {
    animateButton(() => {
      const availableWords = sortedVocab.length >= 3 ? sortedVocab : INITIAL_VOCAB
      const shuffled = [...availableWords].sort(() => 0.5 - Math.random())
      setQuizQuestions(shuffled.slice(0, Math.min(5, shuffled.length)))
      setQuizStep(0)
      setQuizScore(0)
      setSelectedAnswer(null)
      setQuizModalVisible(true)
      animateModal()
    })
  }

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(answer)
    const currentQuestion = quizQuestions[quizStep]
    const correctAnswer = targetLanguage === "en" ? currentQuestion.word : currentQuestion.translations[targetLanguage] || ""

    if (answer === correctAnswer) {
      setQuizScore(quizScore + 1)
    }

    setTimeout(() => {
      if (quizStep + 1 < quizQuestions.length) {
        setQuizStep(quizStep + 1)
        setSelectedAnswer(null)
      } else {
        const finalScore = quizScore + (answer === correctAnswer ? 1 : 0)
        Alert.alert(
          "🎉 Quiz Complete!",
          `Your score: ${finalScore} / ${quizQuestions.length}\n${finalScore === quizQuestions.length ? "Perfect! 🌟" : finalScore >= quizQuestions.length * 0.7 ? "Great job! 👏" : "Keep practicing! 💪"}`,
        )
        setQuizModalVisible(false)
      }
    }, 1500)
  }

  const currentTheme = darkMode ? darkStyles : lightStyles

  // Flame gradient interpolation
  const flameGradient = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  if (isLoading) {
    return (
      <LinearGradient
        colors={darkMode ? ["#1a1a1a", "#2d2d2d", "#1a1a1a"] : ["#FF6B6B", "#FF8E53", "#FF6B6B"]}
        style={[styles.container, styles.loadingContainer]}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={[styles.loadingText, { color: "#ffffff" }]}>🔥 PolyGlot Loading... 🌍</Text>
        </Animated.View>
      </LinearGradient>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Animated Flame Background */}
      <Animated.View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={darkMode 
            ? ["#1a1a1a", "#2d2d2d", "#1a1a1a", "#2d2d2d"] 
            : ["#FF6B6B", "#FF8E53", "#FFD93D", "#FF6B6B"]
          }
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Flame effect overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: flameGradient,
            },
          ]}
        >
          <LinearGradient
            colors={darkMode 
              ? ["transparent", "#4a4a4a", "transparent"] 
              : ["transparent", "#FFD93D", "transparent"]
            }
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Sparkle effects */}
        <Animated.View
          style={[
            styles.sparkleContainer,
            {
              transform: [
                {
                  rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.sparkle,
                {
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                },
              ]}
            >
              <Text style={styles.sparkleText}>✨</Text>
            </View>
          ))}
        </Animated.View>
      </Animated.View>

      {/* Header */}
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "transparent"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Animated.View style={[styles.titleContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.title}>🔥 PolyGlot</Text>
            <Text style={styles.subtitle}>Multi-Language Learning</Text>
          </Animated.View>
          <View style={styles.headerControls}>
            <Text style={styles.themeLabel}>{darkMode ? "🌙" : "☀️"}</Text>
            <Switch
              value={darkMode}
              onValueChange={(value) => {
                animateButton(() => setDarkMode(value))
              }}
              trackColor={{ false: "#e0e0e0", true: "#4a90e2" }}
              thumbColor={darkMode ? "#ffffff" : "#f4f3f4"}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Selection */}
        <View style={styles.languageSwitchContainer}>
          <TouchableOpacity
            onPress={() => {
              animateButton(() => setLanguageModalVisible(true))
            }}
            style={[styles.languageSelector, { backgroundColor: "rgba(255,255,255,0.9)" }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={sourceLanguageObj.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]]}
              style={styles.languageGradient}
            >
              <Text style={styles.languageFlag}>{sourceLanguageObj.flag}</Text>
              <Text style={styles.languageName}>{sourceLanguageObj.name}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Animated.View style={[styles.arrowContainer, { transform: [{ rotate: rotateAnim }] }]}>
            <Text style={styles.arrow}>🔄</Text>
          </Animated.View>

          <TouchableOpacity
            onPress={() => {
              animateButton(() => setLanguageModalVisible(true))
            }}
            style={[styles.languageSelector, { backgroundColor: "rgba(255,255,255,0.9)" }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={targetLanguageObj.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]]}
              style={styles.languageGradient}
            >
              <Text style={styles.languageFlag}>{targetLanguageObj.flag}</Text>
              <Text style={styles.languageName}>{targetLanguageObj.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <Animated.View style={[styles.searchContainer, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
            style={styles.searchGradient}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder={`Search in ${sourceLanguageObj.name} or ${targetLanguageObj.name}...`}
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text)
                setPaginationPage(1)
              }}
              style={styles.searchInput}
              placeholderTextColor="#666"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => animateButton(() => setSearchTerm(""))}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollContainer}
          contentContainerStyle={styles.categoryContainer}
        >
          {["All", "Greetings", "Thanks", "Farewell", "Others", "Numbers", "Colors", "Food", "Family"].map((cat, index) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                animateButton(() => {
                  setSelectedCategory(cat as any)
                  setPaginationPage(1)
                })
              }}
              style={styles.categoryButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedCategory === cat 
                  ? ["#FF6B6B", "#FF8E53"] 
                  : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]
                }
                style={styles.categoryGradient}
              >
                <Text style={[
                  styles.categoryText,
                  { color: selectedCategory === cat ? "#ffffff" : "#333" }
                ]}>
                  {cat === "All" ? "📚 All" :
                   cat === "Greetings" ? "👋 Greetings" :
                   cat === "Thanks" ? "🙏 Thanks" :
                   cat === "Farewell" ? "👋 Farewell" :
                   cat === "Numbers" ? "🔢 Numbers" :
                   cat === "Colors" ? "🎨 Colors" :
                   cat === "Food" ? "🍽️ Food" :
                   cat === "Family" ? "👨‍👩‍👧‍👦 Family" :
                   "💬 Others"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
            style={styles.statsGradient}
          >
            <View style={styles.statItem}>
              <Animated.Text style={[styles.statNumber, { transform: [{ scale: pulseAnim }] }]}>
                {vocabulary.length}
              </Animated.Text>
              <Text style={styles.statLabel}>Total Words</Text>
            </View>
            <View style={styles.statItem}>
              <Animated.Text style={[styles.statNumber, { transform: [{ scale: pulseAnim }] }]}>
                {favorites.length}
              </Animated.Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statItem}>
              <Animated.Text style={[styles.statNumber, { transform: [{ scale: pulseAnim }] }]}>
                {sortedVocab.length}
              </Animated.Text>
              <Text style={styles.statLabel}>Filtered</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Vocabulary List */}
        <View style={styles.listContainer}>
          {paginatedVocab.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
                style={styles.emptyGradient}
              >
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyText}>No words found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </LinearGradient>
            </View>
          ) : (
            <FlatList
              data={paginatedVocab}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const isFavorite = favorites.includes(item.id)
                const sourceText = sourceLanguage === "en" ? item.word : item.translations[sourceLanguage] || ""
                const targetText = targetLanguage === "en" ? item.word : item.translations[targetLanguage] || ""
                
                return (
                  <TouchableOpacity
                    style={[styles.vocabItem, { marginBottom: index === paginatedVocab.length - 1 ? 0 : 12 }]}
                    onPress={() => openModal(item)}
                    onLongPress={() => toggleFavorite(item.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isFavorite 
                        ? ["#FFD93D", "#FF8E53"] 
                        : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]
                      }
                      style={styles.vocabGradient}
                    >
                      <View style={styles.vocabContent}>
                        <View style={styles.vocabTextContainer}>
                          <Text style={[styles.vocabWord, { color: isFavorite ? "#ffffff" : "#333" }]}>
                            {sourceText}
                          </Text>
                          <Text style={[styles.vocabMeaning, { color: isFavorite ? "#ffffff" : "#666" }]}>
                            {targetText}
                          </Text>
                          <View style={styles.vocabMeta}>
                            <View style={[styles.categoryTag, { backgroundColor: isFavorite ? "rgba(255,255,255,0.3)" : "#f0f0f0" }]}>
                              <Text style={[styles.categoryTagText, { color: isFavorite ? "#ffffff" : "#666" }]}>
                                {item.category}
                              </Text>
                            </View>
                            {(item.viewCount || 0) > 0 && (
                              <Text style={[styles.viewCount, { color: isFavorite ? "#ffffff" : "#666" }]}>
                                👁 {item.viewCount}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.vocabActions}>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(item.id)}
                            style={styles.favoriteButton}
                            activeOpacity={0.7}
                          >
                            <Animated.Text style={[styles.favoriteIcon, { transform: [{ scale: pulseAnim }] }]}>
                              {isFavorite ? "⭐" : "☆"}
                            </Animated.Text>
                          </TouchableOpacity>
                          {item.audioUrl && (
                            <TouchableOpacity
                              onPress={() => playSound(item.audioUrl)}
                              style={styles.audioButton}
                              activeOpacity={0.7}
                            >
                              <LinearGradient
                                colors={["#4a90e2", "#357abd"]}
                                style={styles.audioGradient}
                              >
                                <Text style={styles.audioIcon}>🔊</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
              style={styles.paginationGradient}
            >
              <TouchableOpacity
                onPress={() => animateButton(() => {
                  if (paginationPage > 1) setPaginationPage(paginationPage - 1)
                })}
                disabled={paginationPage === 1}
                style={[styles.paginationButton, paginationPage === 1 && styles.paginationButtonDisabled]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={paginationPage === 1 ? ["#cccccc", "#aaaaaa"] : ["#4a90e2", "#357abd"]}
                  style={styles.paginationButtonGradient}
                >
                  <Text style={styles.paginationButtonText}>← Previous</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>{paginationPage} of {totalPages}</Text>
              </View>

              <TouchableOpacity
                onPress={() => animateButton(() => {
                  if (paginationPage < totalPages) setPaginationPage(paginationPage + 1)
                })}
                disabled={paginationPage >= totalPages}
                style={[styles.paginationButton, paginationPage >= totalPages && styles.paginationButtonDisabled]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={paginationPage >= totalPages ? ["#cccccc", "#aaaaaa"] : ["#4a90e2", "#357abd"]}
                  style={styles.paginationButtonGradient}
                >
                  <Text style={styles.paginationButtonText}>Next →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => animateButton(() => setAddModalVisible(true))}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#4caf50", "#45a049"]} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonIcon}>➕</Text>
                <Text style={styles.actionButtonText}>Add Word</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={startQuiz}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#9c27b0", "#7b1fa2"]} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonIcon}>🧠</Text>
                <Text style={styles.actionButtonText}>Quiz</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => animateButton(() => {
                const favWords = vocabulary.filter((v) => favorites.includes(v.id))
                if (favWords.length === 0) {
                  Alert.alert("No Favorites", "Add some words to favorites first!")
                  return
                }
                Share.share({
                  message: `🔥 My Favorite Words from PolyGlot:\n\n${favWords.map((w) => {
                    const sourceText = sourceLanguage === "en" ? w.word : w.translations[sourceLanguage] || ""
                    const targetText = targetLanguage === "en" ? w.word : w.translations[targetLanguage] || ""
                    return `${sourceText} → ${targetText}`
                  }).join("\n")}\n\nShared from PolyGlot! 🌍`
                })
              })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#00bcd4", "#0097a7"]} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonIcon}>📤</Text>
                <Text style={styles.actionButtonText}>Share</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => animateButton(() => {
                Alert.alert("Reset Vocabulary", "This will restore default vocabulary. Continue?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                      setVocabulary(INITIAL_VOCAB)
                      setFavorites([])
                      setSearchTerm("")
                      setPaginationPage(1)
                      Alert.alert("✅ Reset Complete", "Default vocabulary restored")
                    },
                  },
                ])
              })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#f44336", "#d32f2f"]} style={styles.actionButtonGradient}>
                <Text style={styles.actionButtonIcon}>🔄</Text>
                <Text style={styles.actionButtonText}>Reset</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Controls */}
        <View style={styles.audioControlsContainer}>
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.85)"]}
            style={styles.audioControlsGradient}
          >
            <View style={styles.audioControlRow}>
              <Text style={styles.audioControlLabel}>🔊 Audio</Text>
              <Switch
                value={soundOn}
                onValueChange={(value) => animateButton(() => setSoundOn(value))}
                trackColor={{ false: "#e0e0e0", true: "#4a90e2" }}
                thumbColor={soundOn ? "#ffffff" : "#f4f3f4"}
              />
            </View>

            <View style={styles.volumeContainer}>
              <Text style={styles.volumeLabel}>Volume: {Math.round(audioVolume * 100)}%</Text>
              <View style={styles.volumeControls}>
                <TouchableOpacity
                  onPress={() => animateButton(() => setAudioVolume(Math.max(0, audioVolume - 0.1)))}
                  style={styles.volumeButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={["#4a90e2", "#357abd"]} style={styles.volumeButtonGradient}>
                    <Text style={styles.volumeButtonText}>−</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => animateButton(() => setAudioVolume(Math.min(1, audioVolume + 0.1)))}
                  style={styles.volumeButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={["#4a90e2", "#357abd"]} style={styles.volumeButtonGradient}>
                    <Text style={styles.volumeButtonText}>+</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={languageModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackground}>
          <Animated.View style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0.95)"]}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🌍 Select Languages</Text>
                <TouchableOpacity
                  onPress={() => setLanguageModalVisible(false)}
                  style={styles.modalCloseButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                <Text style={styles.languageSection}>Source Language (From):</Text>
                <View style={styles.languageGrid}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={`source-${lang.code}`}
                      onPress={() => animateButton(() => setSourceLanguage(lang.code))}
                      style={[
                        styles.languageOption,
                        sourceLanguage === lang.code && styles.languageOptionSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={
                          sourceLanguage === lang.code
                            ? (lang.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]])
                            : ["#f8f9fa", "#e9ecef"] as [import("react-native").ColorValue, import("react-native").ColorValue]
                        }
                        style={styles.languageOptionGradient}
                      >
                        <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                        <Text style={[
                          styles.languageOptionName,
                          { color: sourceLanguage === lang.code ? "#ffffff" : "#333" }
                        ]}>
                          {lang.name}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.languageSection}>Target Language (To):</Text>
                <View style={styles.languageGrid}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={`target-${lang.code}`}
                      onPress={() => animateButton(() => setTargetLanguage(lang.code))}
                      style={[
                        styles.languageOption,
                        targetLanguage === lang.code && styles.languageOptionSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={
                          targetLanguage === lang.code
                            ? (lang.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]])
                            : (["#f8f9fa", "#e9ecef"] as [import("react-native").ColorValue, import("react-native").ColorValue])
                        }
                        style={styles.languageOptionGradient}
                      >
                        <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                        <Text style={[
                          styles.languageOptionName,
                          { color: targetLanguage === lang.code ? "#ffffff" : "#333" }
                        ]}>
                          {lang.name}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Word Detail Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalBackground}>
          <Animated.View style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0.95)"]}
              style={styles.modalGradient}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Animated.Text style={[styles.modalWord, { transform: [{ scale: pulseAnim }] }]}>
                    {selectedWord?.word}
                  </Animated.Text>
                  
                  <View style={styles.translationsContainer}>
                    {LANGUAGES.filter(l => l.code !== "en").map((lang) => {
                      const translation = selectedWord?.translations[lang.code]
                      if (!translation) return null
                      
                      return (
                        <View key={lang.code} style={styles.translationItem}>
                          <LinearGradient
                            colors={lang.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]]}
                            style={styles.translationGradient}
                          >
                            <Text style={styles.translationFlag}>{lang.flag}</Text>
                            <Text style={styles.translationText}>{translation}</Text>
                          </LinearGradient>
                        </View>
                      )
                    })}
                  </View>

                  <View style={styles.modalStats}>
                    <LinearGradient
                      colors={["#f8f9fa", "#e9ecef"]}
                      style={styles.modalStatsGradient}
                    >
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatNumber}>{selectedWord?.viewCount || 0}</Text>
                        <Text style={styles.modalStatLabel}>Views</Text>
                      </View>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatNumber}>{selectedWord?.playCount || 0}</Text>
                        <Text style={styles.modalStatLabel}>Plays</Text>
                      </View>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatNumber}>{selectedWord?.category}</Text>
                        <Text style={styles.modalStatLabel}>Category</Text>
                      </View>
                    </LinearGradient>
                  </View>

                  <View style={styles.modalActions}>
                    {selectedWord?.audioUrl && (
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => playSound(selectedWord?.audioUrl)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient colors={["#4a90e2", "#357abd"]} style={styles.modalActionGradient}>
                          <Text style={styles.modalActionButtonText}>🔊 Play Audio</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => selectedWord && toggleFavorite(selectedWord.id)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={["#ffc107", "#ff8f00"]} style={styles.modalActionGradient}>
                        <Text style={styles.modalActionButtonText}>
                          {selectedWord && favorites.includes(selectedWord.id) ? "⭐ Remove Favorite" : "☆ Add Favorite"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => selectedWord && shareWord(selectedWord)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={["#00bcd4", "#0097a7"]} style={styles.modalActionGradient}>
                        <Text style={styles.modalActionButtonText}>📤 Share</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Add Word Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackground}>
          <Animated.View style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0.95)"]}
              style={styles.modalGradient}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>➕ Add New Word</Text>
                  <TouchableOpacity
                    onPress={() => setAddModalVisible(false)}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>English Word *</Text>
                    <TextInput
                      placeholder="Enter English word"
                      value={editWordData.word}
                      onChangeText={(text) => setEditWordData((prev) => ({ ...prev, word: text }))}
                      style={styles.textInput}
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{targetLanguageObj.name} Translation *</Text>
                    <TextInput
                      placeholder={`Enter ${targetLanguageObj.name} translation`}
                      value={editWordData.translations?.[targetLanguage] || ""}
                      onChangeText={(text) => setEditWordData((prev) => ({ 
                        ...prev, 
                        translations: { ...prev.translations, [targetLanguage]: text }
                      }))}
                      style={styles.textInput}
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.categorySelector}>
                      {["Greetings", "Thanks", "Farewell", "Others", "Numbers", "Colors", "Food", "Family"].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => animateButton(() =>
                            setEditWordData((prev) => ({ ...prev, category: cat as VocabularyItem["category"] }))
                          )}
                          style={styles.categorySelectorButton}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={editWordData.category === cat 
                              ? ["#7b68ee", "#6a5acd"] 
                              : ["#f8f9fa", "#e9ecef"]
                            }
                            style={styles.categorySelectorGradient}
                          >
                            <Text style={[
                              styles.categorySelectorText,
                              { color: editWordData.category === cat ? "#ffffff" : "#333" }
                            ]}>
                              {cat}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={styles.formButton}
                      onPress={() => animateButton(() => {
                        setAddModalVisible(false)
                        setEditWordData({ word: "", translations: {}, category: "Others", audioUrl: "" })
                      })}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={["#9e9e9e", "#757575"]} style={styles.formButtonGradient}>
                        <Text style={styles.formButtonText}>Cancel</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.formButton}
                      onPress={() => animateButton(addNewWord)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={["#4caf50", "#45a049"]} style={styles.formButtonGradient}>
                        <Text style={styles.formButtonText}>Add Word</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Quiz Modal */}
      <Modal visible={quizModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackground}>
          <Animated.View style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(255,255,255,0.95)"]}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  🧠 Quiz {quizStep + 1} / {quizQuestions.length}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuizModalVisible(false)}
                  style={styles.modalCloseButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quizContainer}>
                <View style={styles.quizProgress}>
                  <LinearGradient
                    colors={["#4caf50", "#45a049"]}
                    style={[styles.quizProgressBar, { width: `${((quizStep + 1) / quizQuestions.length) * 100}%` }]}
                  />
                </View>

                <Animated.Text style={[styles.quizScore, { transform: [{ scale: pulseAnim }] }]}>
                  Score: {quizScore} / {quizQuestions.length}
                </Animated.Text>

                {quizQuestions.length > 0 && (
                  <>
                    <Text style={styles.quizQuestion}>
                      What is the {targetLanguageObj.name} translation of:
                    </Text>

                    <View style={styles.quizWordContainer}>
                      <LinearGradient
                        colors={sourceLanguageObj.gradient as [import("react-native").ColorValue, import("react-native").ColorValue, ...import("react-native").ColorValue[]]}
                        style={styles.quizWordGradient}
                      >
                        <Text style={styles.quizWord}>
                          "{sourceLanguage === "en" ? quizQuestions[quizStep]?.word : quizQuestions[quizStep]?.translations[sourceLanguage] || ""}"
                        </Text>
                      </LinearGradient>
                    </View>

                    <View style={styles.quizOptions}>
                      {/* Correct answer */}
                      <TouchableOpacity
                        onPress={() => {
                          const correctAnswer = targetLanguage === "en" ? quizQuestions[quizStep]?.word : quizQuestions[quizStep]?.translations[targetLanguage] || ""
                          handleAnswer(correctAnswer)
                        }}
                        disabled={selectedAnswer !== null}
                        style={styles.quizOption}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={selectedAnswer === (targetLanguage === "en" ? quizQuestions[quizStep]?.word : quizQuestions[quizStep]?.translations[targetLanguage] || "")
                            ? ["#4caf50", "#45a049"]
                            : ["#f8f9fa", "#e9ecef"]
                          }
                          style={styles.quizOptionGradient}
                        >
                          <Text style={[
                            styles.quizOptionText,
                            { color: selectedAnswer === (targetLanguage === "en" ? quizQuestions[quizStep]?.word : quizQuestions[quizStep]?.translations[targetLanguage] || "") ? "#ffffff" : "#333" }
                          ]}>
                            {targetLanguage === "en" ? quizQuestions[quizStep]?.word : quizQuestions[quizStep]?.translations[targetLanguage] || ""}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Wrong answer (random from other questions) */}
                      {quizQuestions.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            const wrongAnswer = quizQuestions.find((_, i) => i !== quizStep)
                            if (wrongAnswer) {
                              const wrongText = targetLanguage === "en" ? wrongAnswer.word : wrongAnswer.translations[targetLanguage] || ""
                              handleAnswer(wrongText)
                            }
                          }}
                          disabled={selectedAnswer !== null}
                          style={styles.quizOption}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={selectedAnswer === (quizQuestions.find((_, i) => i !== quizStep) ? (targetLanguage === "en" ? quizQuestions.find((_, i) => i !== quizStep)?.word : quizQuestions.find((_, i) => i !== quizStep)?.translations[targetLanguage] || "") : "")
                              ? ["#f44336", "#d32f2f"]
                              : ["#f8f9fa", "#e9ecef"]
                            }
                            style={styles.quizOptionGradient}
                          >
                            <Text style={[
                              styles.quizOptionText,
                              { color: selectedAnswer === (quizQuestions.find((_, i) => i !== quizStep) ? (targetLanguage === "en" ? quizQuestions.find((_, i) => i !== quizStep)?.word : quizQuestions.find((_, i) => i !== quizStep)?.translations[targetLanguage] || "") : "") ? "#ffffff" : "#333" }
                            ]}>
                              {quizQuestions.find((_, i) => i !== quizStep)
                                ? targetLanguage === "en" 
                                  ? quizQuestions.find((_, i) => i !== quizStep)?.word 
                                  : quizQuestions.find((_, i) => i !== quizStep)?.translations[targetLanguage] || ""
                                : ""}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sparkleContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sparkle: {
    position: "absolute",
  },
  sparkleText: {
    fontSize: 16,
    opacity: 0.7,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 36 : 32,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: "500",
    color: "#ffffff",
    opacity: 0.9,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeLabel: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  languageSwitchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  languageSelector: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  languageGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  arrowContainer: {
    marginHorizontal: 16,
    padding: 8,
  },
  arrow: {
    fontSize: 24,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  searchContainer: {
    marginBottom: 20,
    borderRadius: 25,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  clearButton: {
    padding: 8,
    borderRadius: 15,
    backgroundColor: "#ff6b6b",
    marginLeft: 8,
  },
  clearButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  categoryScrollContainer: {
    marginBottom: 20,
  },
  categoryContainer: {
    paddingHorizontal: 0,
    gap: 12,
  },
  categoryButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  categoryGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statsGradient: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  listContainer: {
    marginBottom: 20,
  },
  emptyContainer: {
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  emptyGradient: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
  vocabItem: {
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  vocabGradient: {
    padding: 16,
  },
  vocabContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vocabTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  vocabWord: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  vocabMeaning: {
    fontSize: 16,
    marginBottom: 8,
  },
  vocabMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  vocabActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  audioButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  audioGradient: {
    padding: 8,
  },
  audioIcon: {
    fontSize: 16,
    color: "#ffffff",
  },
  paginationContainer: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  paginationGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  paginationButton: {
    borderRadius: 20,
    overflow: "hidden",
    minWidth: 80,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  paginationButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  paginationInfo: {
    alignItems: "center",
  },
  paginationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  actionButtonsContainer: {
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
    color: "#ffffff",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  audioControlsContainer: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  audioControlsGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  audioControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  audioControlLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  volumeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  volumeControls: {
    flexDirection: "row",
    gap: 8,
  },
  volumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  volumeButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  volumeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: isTablet ? 500 : screenWidth - 40,
    maxHeight: screenHeight * 0.85,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666666",
  },
  modalBody: {
    padding: 20,
  },
  modalWord: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  translationsContainer: {
    marginBottom: 20,
  },
  translationItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  translationGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  translationFlag: {
    fontSize: 20,
  },
  translationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
  },
  modalStats: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalStatsGradient: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  modalStatItem: {
    alignItems: "center",
  },
  modalStatNumber: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  modalStatLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  modalActions: {
    gap: 12,
  },
  modalActionButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  modalActionGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalActionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  languageList: {
    maxHeight: screenHeight * 0.6,
    paddingHorizontal: 20,
  },
  languageSection: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 16,
    color: "#333",
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  languageOption: {
    width: (screenWidth - 80) / 2,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  languageOptionSelected: {
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  languageOptionGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  languageOptionFlag: {
    fontSize: 18,
  },
  languageOptionName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#333",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categorySelectorButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 8,
  },
  categorySelectorGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  categorySelectorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  formButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  formButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  formButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  quizContainer: {
    padding: 20,
  },
  quizProgress: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  quizProgressBar: {
    height: "100%",
    borderRadius: 3,
  },
  quizScore: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  quizWordContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  quizWordGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  quizWord: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffffff",
  },
  quizOptions: {
    gap: 12,
  },
  quizOption: {
    borderRadius: 12,
    overflow: "hidden",
  },
  quizOptionGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  quizOptionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
})

// Light theme styles
const lightStyles = StyleSheet.create({
  // Add any light theme specific styles here if needed
})

// Dark theme styles  
const darkStyles = StyleSheet.create({
  // Add any dark theme specific styles here if needed
})