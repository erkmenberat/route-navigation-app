import { socketService } from '@/services/socket';
import type { RideClientEvent, RideClientEventPayloads, RidePayload } from '@/types/ride';

function emitRideEvent<EventName extends RideClientEvent>(
  event: EventName,
  payload: RideClientEventPayloads[EventName],
): void {
  const socket = socketService.getSocket();
  if (!socket) {
    throw new Error('Socket is not connected');
  }

  socket.emit(event, payload);
}

export function requestRide(payload: RidePayload): void {
  emitRideEvent('ride:request', payload);
}

export function acceptRide(rideId: number): void {
  emitRideEvent('ride:accept', { rideId });
}

export function startRide(rideId: number): void {
  emitRideEvent('ride:start', { rideId });
}

export function cancelRide(rideId: number): void {
  emitRideEvent('ride:cancel', { rideId });
}

export function requestActiveRide(): void {
  emitRideEvent('ride:active', {});
}
