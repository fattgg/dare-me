import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',      // Ikonat aktive të bardha
        tabBarInactiveTintColor: '#8E8E93',    // Gri e butë si në iOS
        tabBarStyle: {
          backgroundColor: '#1C1C1E',          // Gri e errët në stilin e iPhone
          borderTopColor: '#1C1C1E',
          height: 60,
          paddingBottom: 15,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="challenges"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <Ionicons name="flash" size={30} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create-dare"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle" size={30} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="my-dares"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <Ionicons name="checkmark-done" size={30} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={30} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={30} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
