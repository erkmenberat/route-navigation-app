import { useSocketEvent } from '@/hooks/use-socket-event';
import type { RideServerEvent, RideServerEventPayload } from '@/types/ride';

export function useRideSocketEvent<EventName extends RideServerEvent>(
  event: EventName,
  handler: (data: RideServerEventPayload<EventName>) => void,
): void {
  useSocketEvent<RideServerEventPayload<EventName>>(event, handler);
}
