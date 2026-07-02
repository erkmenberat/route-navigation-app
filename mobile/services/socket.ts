import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { getRefreshToken, saveAuthToken, saveRefreshToken } from './auth-token';

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
      // Request the current taxi snapshot on every (re)connect — the server
      // only pushes it once at connect-time, which screens can easily miss
      // if they mount after that push already happened.
      instance.emit('joinTaxiMap');
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

        try {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            console.log('[socket] server disconnect — no refresh token, cannot recover');
            return;
          }

          const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
            `${BASE_URL}/auth/refresh`,
            { refreshToken },
          );

          await saveAuthToken(data.access_token);
          await saveRefreshToken(data.refresh_token);

          console.log('[socket] token refreshed after server disconnect → reconnecting');
          instance.auth = { token: data.access_token };
          instance.connect();
        } catch {
          console.log('[socket] token refresh failed after server disconnect — session expired');
        }
      }
    });

    socket.on('connect_error', async (err) => {
      console.log(`[socket] connect_error ${err.message}`);

      if (hasAttemptedRefresh) {
        console.log('[socket] refresh already attempted — session expired');
        return;
      }
      hasAttemptedRefresh = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return;

        const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
        );

        await saveAuthToken(data.access_token);
        await saveRefreshToken(data.refresh_token);

        console.log('[socket] token refreshed → reconnecting');
        instance.auth = { token: data.access_token };
        instance.connect();
      } catch {
        console.log('[socket] token refresh failed — session expired');
      }
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
