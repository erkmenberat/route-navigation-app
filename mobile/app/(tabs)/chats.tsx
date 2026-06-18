import { api } from '@/services/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ChatUser = {
  id: number;
  name: string;
};

type ChatMessage = {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
};

type Chat = {
  id: number;
  updatedAt: string;
  lastMessageId: number | null;
  user1: ChatUser;
  user2: ChatUser;
  messages: ChatMessage[];
};

function formatTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  if (diffDays < 7) {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date);
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

export default function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadChats = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);

      setErrorMessage('');

      try {
        const [chatsResponse, profileResponse] = await Promise.all([
          api.get<Chat[]>('/chats'),
          api.get<{ id: number }>('/users/profile'),
        ]);

        setChats(chatsResponse.data);
        setCurrentUserId(profileResponse.data.id);
      } catch {
        setErrorMessage('Chats konnten nicht geladen werden.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadChats('initial');
    }, [loadChats]),
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#60a5fa" />
        <Text style={styles.loadingText}>Chats werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={chats.length ? styles.listContent : styles.emptyContent}
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#60a5fa"
            onRefresh={() => loadChats('refresh')}
          />
        }
        ListEmptyComponent={
          !errorMessage ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Sie haben noch keine Chats</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const otherUser = currentUserId === item.user1.id ? item.user2 : item.user1;
          const lastMessage = item.messages[0] ?? null;

          return (
            <View style={styles.chatRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {otherUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text numberOfLines={1} style={styles.chatName}>
                    {otherUser.name}
                  </Text>
                  {lastMessage ? (
                    <Text style={styles.chatTime}>{formatTime(lastMessage.sentAt)}</Text>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={styles.lastMessage}>
                  {lastMessage ? lastMessage.content : 'Noch keine Nachrichten'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    backgroundColor: '#121212',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
    paddingTop: 56,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#d1d5db',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  errorCard: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    marginHorizontal: 20,
    padding: 16,
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  chatRow: {
    alignItems: 'center',
    borderBottomColor: '#1e1e1e',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatName: {
    color: 'white',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  chatTime: {
    color: '#9ca3af',
    fontSize: 12,
  },
  lastMessage: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
