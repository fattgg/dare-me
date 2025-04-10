import { useNavigation } from 'expo-router';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';

export default function Home() {
  const navigation = useNavigation();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.3, // vetëm rritje
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate('login'); // kalon direkt pas animacionit
    });
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        android_ripple={null}
        style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
      >
        <Animated.Text style={[styles.title, { transform: [{ scale: scaleAnim }] }]}>
          DareMe
        </Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEDCF8', // vjollcë e lehtë
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#800080', // vjollce
  },
});
