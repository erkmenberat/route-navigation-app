import { io, Socket } from 'socket.io-client';
import { refreshAccessToken } from './auth-token';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';

let socket: Socket | null = null;
const subscribers = new Set<(s: Socket) => void>();

export const socketService = {
  connect(token: string): void {
    if (socket?.connected || socket?.active) return;

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
    });

    const instance = socket;
    let hasAttemptedRefresh = false;

    socket.on('connect', () => {
      hasAttemptedRefresh = false;
      console.log(`[socket] connected id=${socket?.id}`);
    });

    socket.on('disconnect', async (reason) => {
      console.log(`[socket] disconnected reason=${reason}`);

      if (reason === 'io server disconnect') {
        // Server explicitly kicked us — likely expired/invalid token.
        // Socket.io does NOT auto-reconnect on server-initiated disconnects,
        // so we refresh the token and reconnect manually.
        if (hasAttemptedRefresh) {
          console.log('[socket] server disconnect — refresh already attempted, giving up');
          return;
        }
        hasAttemptedRefresh = true;

        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          console.log('[socket] token refresh failed after server disconnect — session expired');
          return;
        }

        console.log('[socket] token refreshed after server disconnect → reconnecting');
        instance.auth = { token: accessToken };
        instance.connect();
      }
    });

    socket.on('connect_error', async (err) => {
      console.log(`[socket] connect_error ${err.message}`);

      if (hasAttemptedRefresh) {
        console.log('[socket] refresh already attempted — session expired');
        return;
      }
      hasAttemptedRefresh = true;

      const accessToken = await refreshAccessToken();
      if (!accessToken) {
        console.log('[socket] token refresh failed — session expired');
        return;
      }

      console.log('[socket] token refreshed → reconnecting');
      instance.auth = { token: accessToken };
      instance.connect();
    });

    const created = socket;
    subscribers.forEach((cb) => cb(created));
  },

  disconnect(): void {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  getSocket(): Socket | null {
    return socket;
  },

  // Calls cb immediately if a socket exists, and again whenever a new socket
  // is created. Returns an unsubscribe function.
  onSocket(cb: (s: Socket) => void): () => void {
    subscribers.add(cb);
    if (socket !== null) cb(socket);
    return () => {
      subscribers.delete(cb);
    };
  },
};
