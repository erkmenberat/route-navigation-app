import { getAuthToken } from '@/services/auth-token';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

export default function TabsLayout() {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    let isMounted = true;

    async function checkAuthToken() {
      const token = await getAuthToken();

      if (isMounted) {
        setAuthState(token ? 'authenticated' : 'unauthenticated');
      }
    }

    checkAuthToken();

    return () => {
      isMounted = false;
    };
  }, []);

  if (authState === 'checking') {
    return null;
  }

  if (authState === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
