import { api } from '@/services/api';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Message = {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
};

function formatMessageTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function ChatDetailScreen() {
  const { chatId, partnerName } = useLocalSearchParams<{
    chatId: string;
    partnerName: string;
  }>();
  const numericChatId = Number(chatId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Prevents duplicate onEndReached triggers before state settles
  const isLoadingMoreRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const [messagesResponse, profileResponse] = await Promise.all([
        api.get<Message[]>(`/messages/${numericChatId}`),
        api.get<{ id: number }>('/users/profile'),
      ]);

      setMessages(messagesResponse.data);
      setCurrentUserId(profileResponse.data.id);
      // Backend returns max 20 per page — if we got 20, there may be more
      setHasMore(messagesResponse.data.length === 20);
    } catch {
      // keep empty state; user can navigate back
    } finally {
      setIsLoading(false);
    }
  }, [numericChatId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || messages.length === 0) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      // messages[0] is the oldest in the ASC-sorted array
      const response = await api.get<Message[]>(`/messages/${numericChatId}`, {
        params: { before: messages[0].sentAt },
      });

      const older = response.data;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === 20);
    } catch {
      // silently ignore — user can scroll back down and try again
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasMore, messages, numericChatId]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: partnerName ?? 'Chat',
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: 'white',
            headerTitleStyle: { color: 'white' },
            headerBackTitle: '',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#60a5fa" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: partnerName ?? 'Chat',
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: 'white',
          headerTitleStyle: { color: 'white' },
          headerBackTitle: '',
        }}
      />
      <View style={styles.container}>
        {/* inverted={true}: index 0 shown at bottom → pass newest-first so newest is at bottom */}
        <FlatList
          inverted
          contentContainerStyle={styles.listContent}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id.toString()}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreRow}>
                <ActivityIndicator color="#60a5fa" size="small" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {/* inverted list: this shows at the visual bottom */}
              <Text style={styles.emptyText}>Noch keine Nachrichten</Text>
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          renderItem={({ item }) => {
            const isOwn = item.senderId === currentUserId;
            return (
              <View style={[styles.messageRow, isOwn ? styles.messageRowRight : styles.messageRowLeft]}>
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  <Text style={styles.bubbleContent}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
                    {formatMessageTime(item.sentAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#121212',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingMoreRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1e1e1e',
    borderBottomLeftRadius: 4,
  },
  bubbleContent: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
  },
  bubbleTimeOwn: {
    color: '#93c5fd',
    textAlign: 'right',
  },
  bubbleTimeOther: {
    color: '#6b7280',
    textAlign: 'left',
  },
});
