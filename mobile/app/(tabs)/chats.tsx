import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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

type SearchUser = {
  id: number;
  name: string;
};

// Shape emitted by the backend 'message:receive' event (sentAt serialized as ISO string)
type IncomingMessage = {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [creatingForUserId, setCreatingForUserId] = useState<number | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChats = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadChats('initial');
    }, [loadChats]),
  );

  const searchUsers = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.get<SearchUser[]>('/users/search', {
        params: { username: query },
      });
      setSearchResults(response.data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleSearchChange(text: string) {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      void searchUsers(text.trim());
    }, 300);
  }

  function clearSearch() {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleSelectUser(user: SearchUser) {
    setIsCreatingChat(true);
    setCreatingForUserId(user.id);
    try {
      const response = await api.post<{ id: number }>('/chats/create-or-get', { userId: user.id });
      clearSearch();
      void loadChats('initial');
      router.push({ pathname: '/chats/[chatId]', params: { chatId: response.data.id, partnerName: user.name } });
    } catch {
      // silently fail — chat list reload will reflect actual state
    } finally {
      setIsCreatingChat(false);
      setCreatingForUserId(null);
    }
  }

  useSocketEvent<IncomingMessage>('message:receive', (message) => {
    socketService.getSocket()?.emit('message:ack', { messageId: message.id });

    setChats((prev) => {
      const index = prev.findIndex((c) => c.id === message.chatId);

      if (index === -1) {
        // Chat not yet in list (e.g. new chat created by the other party) — reload
        void loadChats('initial');
        return prev;
      }

      const preview: ChatMessage = {
        id: message.id,
        content: message.content,
        sentAt: message.sentAt,
        senderId: message.senderId,
      };

      const updated: Chat = { ...prev[index], messages: [preview] };

      // Move updated chat to top, keep all others in their relative order
      return [updated, ...prev.filter((_, i) => i !== index)];
    });
  });

  const isSearchActive = searchQuery.trim().length > 0;

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

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons color="#9ca3af" name="search-outline" size={18} style={styles.searchIcon} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Benutzer suchen..."
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {isSearchActive ? (
            <Pressable hitSlop={8} onPress={clearSearch}>
              <Ionicons color="#9ca3af" name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isSearchActive ? (
        <View style={styles.searchResults}>
          {isSearching ? (
            <View style={styles.searchLoadingRow}>
              <ActivityIndicator color="#60a5fa" size="small" />
              <Text style={styles.searchLoadingText}>Suchen...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <Text style={styles.noResultsText}>Kein Benutzer gefunden</Text>
          ) : (
            searchResults.map((user) => (
              <Pressable
                key={user.id}
                disabled={isCreatingChat}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  pressed && styles.searchResultRowPressed,
                ]}
                onPress={() => void handleSelectUser(user)}
              >
                <View style={styles.searchAvatar}>
                  <Text style={styles.searchAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.searchResultName}>{user.name}</Text>
                {creatingForUserId === user.id ? (
                  <ActivityIndicator color="#60a5fa" size="small" />
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <>
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
                <Pressable
                  style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
                  onPress={() =>
                    router.push({
                      pathname: '/chats/[chatId]',
                      params: { chatId: item.id, partnerName: otherUser.name },
                    })
                  }
                >
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
                </Pressable>
              );
            }}
          />
        </>
      )}
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
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#d1d5db',
    fontWeight: '600',
  },

  // Search
  searchRow: {
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  searchInputWrapper: {
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    color: 'white',
    flex: 1,
    fontSize: 15,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  searchLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
  },
  searchLoadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 15,
    paddingVertical: 16,
    textAlign: 'center',
  },
  searchResultRow: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  searchResultRowPressed: {
    backgroundColor: '#1e1e1e',
  },
  searchAvatar: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  searchAvatarText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  searchResultName: {
    color: 'white',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },

  // Chat list
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
  chatRowPressed: {
    backgroundColor: '#1a1a1a',
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
