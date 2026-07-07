export type RideStatus = 'PENDING' | 'ACCEPTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export interface RideRequest {
  id: number;
  userId: number;
  driverId: number | null;
  status: RideStatus;
  origin: string;
  destination: string;
  startLat: number;
  startLong: number;
  finishLat: number;
  finishLong: number;
  distance: number;
  duration: number;
  price: number;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RidePayload {
  origin: string;
  destination: string;
  startLat: number;
  startLong: number;
  finishLat: number;
  finishLong: number;
  distance: number;
  duration: number;
}

export interface RideIdPayload {
  rideId: number;
}

export type RideClientEvent = 'ride:request' | 'ride:accept' | 'ride:start' | 'ride:cancel';

export interface RideClientEventPayloads {
  'ride:request': RidePayload;
  'ride:accept': RideIdPayload;
  'ride:start': RideIdPayload;
  'ride:cancel': RideIdPayload;
}

export type RideErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT';

export interface RideErrorPayload {
  event: RideClientEvent;
  code: RideErrorCode;
  message: string;
}

export interface RideTakenPayload {
  rideId: number;
}

export interface RideCancelledPayload extends RideRequest {
  cancelledBy: 'USER' | 'DRIVER';
}

export type RideServerEvent =
  | 'ride:requested'
  | 'ride:new'
  | 'ride:accepted'
  | 'ride:taken'
  | 'ride:started'
  | 'ride:cancelled'
  | 'ride:error';

export interface RideServerEventPayloads {
  'ride:requested': RideRequest;
  'ride:new': RideRequest;
  'ride:accepted': RideRequest;
  'ride:taken': RideTakenPayload;
  'ride:started': RideRequest;
  'ride:cancelled': RideCancelledPayload;
  'ride:error': RideErrorPayload;
}

export type RideServerEventPayload<EventName extends RideServerEvent> =
  RideServerEventPayloads[EventName];
