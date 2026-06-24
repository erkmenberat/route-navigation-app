import { getAuthToken } from '@/services/auth-token';
import { socketService } from '@/services/socket';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

export default function TabsLayout() {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    let isMounted = true;

    async function checkAuthToken() {
      const token = await getAuthToken();

      if (isMounted) {
        if (token) {
          socketService.connect(token);
          console.log("Websocket ist connected!");
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      }
    }

    checkAuthToken();

    return () => {
      isMounted = false;
      console.log("socket ist nicht connected.")
    };
  }, []);

  const prevAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (authState !== 'authenticated') return;

    async function handleAppStateChange(next: AppStateStatus) {
      const prev = prevAppState.current;
      prevAppState.current = next;

      const goingToBackground =
        prev === 'active' && (next === 'inactive' || next === 'background');
      const comingToForeground =
        (prev === 'inactive' || prev === 'background') && next === 'active';

      if (goingToBackground) {
        const sock = socketService.getSocket();
        if (sock?.connected) {
          console.log('[AppState] background → pause socket');
          sock.disconnect();
        }
      } else if (comingToForeground) {
        console.log('[AppState] foreground → resume socket');
        const token = await getAuthToken();
        if (!token) return;
        const sock = socketService.getSocket();
        if (sock) {
          sock.auth = { token };
          sock.connect();
        } else {
          socketService.connect(token);
        }
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [authState]);

  if (authState === 'checking') {
    console.log("checking auth state.");
    return null;
  }

  if (authState === 'unauthenticated') {
    console.log("unauthenticated");
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
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" color={color} size={size} />
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
