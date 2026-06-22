import { socketService } from '@/services/socket';
import { useEffect, useRef } from 'react';

/**
 * Subscribes to a Socket.IO event for the lifetime of the component.
 *
 * Uses a ref for the handler so the latest closure is always called
 * without needing to re-register the listener on every render.
 * The listener is removed on unmount.
 */
export function useSocketEvent<T>(event: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  // Always keep ref pointing to the latest handler (runs synchronously on every render)
  handlerRef.current = handler;

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    function stableHandler(data: T) {
      handlerRef.current(data);
    }

    socket.on(event, stableHandler);

    function onReconnect() {
      if (!socket) return;
      socket.off(event, stableHandler);
      socket.on(event, stableHandler);
    }

    socket.on('connect', onReconnect);

    return () => {
      socket.off(event, stableHandler);
      socket.off('connect', onReconnect);
    };
    // event is a constant string per call-site — intentionally omit handlerRef from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
