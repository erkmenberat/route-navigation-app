import { api } from '@/services/api';
import { useSocketEvent } from '@/hooks/use-socket-event';
import { socketService } from '@/services/socket';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

const STACK_SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: '#121212' },
  headerTintColor: 'white' as const,
  headerTitleStyle: { color: 'white' },
  headerBackTitle: '',
};

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
  const [inputText, setInputText] = useState('');

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
      // silently ignore — user can scroll back up to try again
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasMore, messages, numericChatId]);

  useSocketEvent<Message>('message:receive', (message) => {
    if (message.chatId !== numericChatId) return;

    setMessages((prev) => {
      // Guard against duplicate delivery (REST load races with WS push)
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  });

  function sendMessage() {
    const content = inputText.trim();
    if (!content) return;

    const socket = socketService.getSocket();
    if (!socket?.connected) return;

    // Fire-and-forget — backend emits message:receive back to the room,
    // which the useSocketEvent handler picks up and appends to the list
    socket.emit('message:send', { chatId: numericChatId, content });
    setInputText('');
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ ...STACK_SCREEN_OPTIONS, title: partnerName ?? 'Chat' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#60a5fa" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ ...STACK_SCREEN_OPTIONS, title: partnerName ?? 'Chat' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
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

        <View style={styles.inputBar}>
          <TextInput
            multiline
            maxLength={1000}
            placeholder="Nachricht schreiben..."
            placeholderTextColor="#6b7280"
            scrollEnabled
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
          />
          <Pressable
            disabled={!inputText.trim()}
            style={[styles.sendButton, !inputText.trim() ? styles.sendButtonDisabled : null]}
            onPress={sendMessage}
          >
            <Ionicons color="white" name="send" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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

  // Input bar
  inputBar: {
    alignItems: 'flex-end',
    backgroundColor: '#0e0e0e',
    borderTopColor: '#1e1e1e',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    borderRadius: 20,
    borderWidth: 1,
    color: 'white',
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
});
