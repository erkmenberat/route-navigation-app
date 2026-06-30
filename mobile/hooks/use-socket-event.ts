import { socketService } from '@/services/socket';
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export function useSocketEvent<T>(event: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let activeSocket: Socket | null = null;
    let activeReconnectHandler: (() => void) | null = null;

    function stableHandler(data: T) {
      handlerRef.current(data);
    }

    function register(s: Socket): void {
      if (activeSocket === s) return;

      if (activeSocket) {
        activeSocket.off(event, stableHandler);
        if (activeReconnectHandler) activeSocket.off('connect', activeReconnectHandler);
      }

      activeSocket = s;

      function onReconnect() {
        s.off(event, stableHandler);
        s.on(event, stableHandler);
      }

      activeReconnectHandler = onReconnect;
      s.on(event, stableHandler);
      s.on('connect', onReconnect);
    }

    // register is called immediately if a socket exists, or once connect() creates one
    const unsubscribe = socketService.onSocket(register);

    return () => {
      unsubscribe();
      if (activeSocket) {
        activeSocket.off(event, stableHandler);
        if (activeReconnectHandler) activeSocket.off('connect', activeReconnectHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
