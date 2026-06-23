import { io, Socket } from 'socket.io-client';

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
