import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useSocketEvent } from '@/hooks/use-socket-event';
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

type MessageStatus = 'sending' | 'sent' | 'received' | 'read';
type LocalMessage = Message & { status: MessageStatus };

function toLocalMessage(msg: Message, myId: number): LocalMessage {
  if (msg.senderId !== myId) return { ...msg, status: 'received' };
  if (msg.readAt !== null) return { ...msg, status: 'read' };
  if (msg.deliveredAt !== null) return { ...msg, status: 'received' };
  return { ...msg, status: 'sent' };
}

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

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Prevents duplicate onEndReached triggers before state settles
  const isLoadingMoreRef = useRef(false);
  // Tracks message:delivered events that arrived before REST response (race condition)
  const deliveredIdsRef = useRef<Set<number>>(new Set());

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const [messagesResponse, profileResponse] = await Promise.all([
        api.get<Message[]>(`/messages/${numericChatId}`),
        api.get<{ id: number }>('/users/profile'),
      ]);

      const myId = profileResponse.data.id;
      setMessages(messagesResponse.data.map((m) => toLocalMessage(m, myId)));
      setCurrentUserId(myId);
      // Backend returns max 20 per page — if we got 20, there may be more
      setHasMore(messagesResponse.data.length === 20);
      socketService.getSocket()?.emit('message:read', { chatId: numericChatId });
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
      setMessages((prev) => [...older.map((m) => toLocalMessage(m, currentUserId!)), ...prev]);
      setHasMore(older.length === 20);
    } catch {
      // silently ignore — user can scroll back up to try again
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [hasMore, messages, numericChatId, currentUserId]);

  useSocketEvent<Message>('message:receive', (message) => {
    if (message.chatId !== numericChatId) return;

    console.log(`[chat:${numericChatId}] message:receive id=${message.id} from senderId=${message.senderId}`);

    setMessages((prev) => {
      // Guard against duplicate delivery (REST load races with WS push)
      if (prev.some((m) => m.id === message.id)) return prev;
      // Own messages echoed back via WS are 'sent', not 'received'
      const status: MessageStatus = message.senderId === currentUserId ? 'sent' : 'received';
      return [...prev, { ...message, status }];
    });

    if (message.senderId !== currentUserId) {
      console.log(`[chat:${numericChatId}] emitting message:ack for messageId=${message.id}`);
      socketService.getSocket()?.emit('message:ack', { messageId: message.id });
      socketService.getSocket()?.emit('message:read', { chatId: message.chatId });
    }
  });

  useSocketEvent<{ messageIds: number[]; deliveredAt: string }>(
    'message:delivered',
    ({ messageIds }) => {
      console.log(`[chat:${numericChatId}] message:delivered ids=[${messageIds.join(',')}] → status=received`);
      messageIds.forEach((id) => deliveredIdsRef.current.add(id));
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) ? { ...m, status: 'received' as MessageStatus } : m,
        ),
      );
    },
  );

  useSocketEvent<{ chatId: number; readBy: number; readAt: string }>(
    'message:read',
    ({ chatId, readBy }) => {
      if (chatId !== numericChatId || readBy === currentUserId) return;
      console.log(`[chat:${numericChatId}] message:read by userId=${readBy} → status=read`);
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId ? { ...m, status: 'read' as MessageStatus } : m,
        ),
      );
    },
  );

  async function sendMessage(): Promise<void> {
    const content = inputText.trim();
    if (!content || isSending) return;

    const tempId = -Date.now();
    const optimistic: LocalMessage = {
      id: tempId,
      chatId: numericChatId,
      senderId: currentUserId!,
      content,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      status: 'sending',
    };

    console.log(`[chat:${numericChatId}] sending message tempId=${tempId}`);
    setIsSending(true);
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await api.post<Message>('/messages/send', { chatId: numericChatId, content });
      console.log(`[chat:${numericChatId}] message sent → server id=${response.data.id} (tempId=${tempId})`);
      setMessages((prev) => {
        // WS was faster — real message already in list, correct its status and remove temp
        if (prev.some((m) => m.id === response.data.id)) {
          console.log(`[chat:${numericChatId}] WS was faster — removing tempId=${tempId}`);
          return prev
            .filter((m) => m.id !== tempId)
            .map((m) => {
              if (m.id !== response.data.id) return m;
              // Don't downgrade a status that already advanced (e.g. delivered while WS was in flight)
              if (m.status === 'received' || m.status === 'read') return m;
              return { ...m, status: 'sent' as MessageStatus };
            });
        }
        // message:delivered may have arrived before this REST response (race condition)
        const status: MessageStatus = deliveredIdsRef.current.has(response.data.id) ? 'received' : 'sent';
        return prev.map((m) => m.id === tempId ? { ...response.data, status } : m);
      });
      setInputText('');
    } catch {
      console.log(`[chat:${numericChatId}] send failed — removing tempId=${tempId}`);
      // Remove optimistic message — input stays so user can retry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
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
                  {isOwn && (
                    <>
                      {item.status === 'sending' && <Ionicons name="time-outline" size={14} color="#93c5fd" />}
                      {item.status === 'sent' && <Ionicons name="checkmark" size={14} color="#93c5fd" />}
                      {item.status === 'received' && <Ionicons name="checkmark-done-outline" size={14} color="#93c5fd" />}
                      {item.status === 'read' && <Ionicons name="checkmark-done-outline" size={14} color="rgb(57, 233, 227)" />}
                    </>
                  )}
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
            disabled={!inputText.trim() || isSending}
            style={[styles.sendButton, (!inputText.trim() || isSending) ? styles.sendButtonDisabled : null]}
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
