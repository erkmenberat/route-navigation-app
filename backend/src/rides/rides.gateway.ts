import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Role } from '../generated/prisma/enums';
import type { RideRequestModel } from '../generated/prisma/models/RideRequest';
import { CreateRideDto } from './dto/create-ride.dto';
import { RideIdDto } from './dto/ride-id.dto';
import { RidesService } from './rides.service';

const DRIVERS_ROOM = 'drivers';

type RideSocketEvent =
  | 'ride:request'
  | 'ride:accept'
  | 'ride:start'
  | 'ride:cancel';
type RideErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT';
type CancelledBy = 'USER' | 'DRIVER';

interface RideErrorPayload {
  event: RideSocketEvent;
  code: RideErrorCode;
  message: string;
}

interface RideCancelledPayload extends RideRequestModel {
  cancelledBy: CancelledBy;
}

@WebSocketGateway({ cors: true })
export class RidesGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RidesGateway.name);

  constructor(
    private readonly ridesService: RidesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: number; role: Role }>(
        token,
      );
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      await client.join(`user:${payload.sub}`);

      if (payload.role === Role.DRIVER) {
        await client.join(DRIVERS_ROOM);
        this.logger.log(
          `[connect] DRIVER userId=${payload.sub} joined ${DRIVERS_ROOM}`,
        );
      }
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('ride:request')
  async handleRideRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    if (!this.requireRole(client, Role.USER, 'ride:request')) return;

    const dto = this.parsePayload(
      client,
      'ride:request',
      CreateRideDto,
      payload,
    );
    if (!dto) return;

    try {
      const userId = client.data.userId as number;
      const ride = await this.ridesService.create(userId, dto);
      client.emit('ride:requested', ride);
      this.server.to(DRIVERS_ROOM).emit('ride:new', ride);
      this.logger.log(`[ride:request] userId=${userId} rideId=${ride.id}`);
    } catch (error) {
      this.emitError(
        client,
        'ride:request',
        'CONFLICT',
        this.errorMessage(error),
      );
    }
  }

  @SubscribeMessage('ride:accept')
  async handleRideAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    if (!this.requireRole(client, Role.DRIVER, 'ride:accept')) return;

    const dto = this.parsePayload(client, 'ride:accept', RideIdDto, payload);
    if (!dto) return;

    try {
      const driverUserId = client.data.userId as number;
      const ride = await this.ridesService.accept(driverUserId, dto.rideId);
      this.emitRideAccepted(ride);
      this.server
        .to(DRIVERS_ROOM)
        .except(`user:${driverUserId}`)
        .emit('ride:taken', { rideId: ride.id });
      this.logger.log(
        `[ride:accept] driverUserId=${driverUserId} rideId=${ride.id}`,
      );
    } catch (error) {
      this.emitError(
        client,
        'ride:accept',
        'CONFLICT',
        this.errorMessage(error),
      );
    }
  }

  @SubscribeMessage('ride:start')
  async handleRideStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    if (!this.requireRole(client, Role.DRIVER, 'ride:start')) return;

    const dto = this.parsePayload(client, 'ride:start', RideIdDto, payload);
    if (!dto) return;

    try {
      const driverUserId = client.data.userId as number;
      const ride = await this.ridesService.start(driverUserId, dto.rideId);
      this.server.to(`user:${ride.userId}`).emit('ride:started', ride);
      if (ride.driverId) {
        this.server.to(`user:${ride.driverId}`).emit('ride:started', ride);
      }
      this.logger.log(
        `[ride:start] driverUserId=${driverUserId} rideId=${ride.id}`,
      );
    } catch (error) {
      this.emitError(
        client,
        'ride:start',
        'CONFLICT',
        this.errorMessage(error),
      );
    }
  }

  @SubscribeMessage('ride:cancel')
  async handleRideCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    if (!this.requireAnyRole(client, 'ride:cancel')) return;

    const dto = this.parsePayload(client, 'ride:cancel', RideIdDto, payload);
    if (!dto) return;

    try {
      const actorUserId = client.data.userId as number;
      const actorRole = client.data.role as Role;
      const ride = await this.ridesService.cancel(
        actorUserId,
        dto.rideId,
        actorRole,
      );
      this.emitRideCancelled(
        ride,
        actorRole === Role.DRIVER ? 'DRIVER' : 'USER',
      );
      this.logger.log(
        `[ride:cancel] actorUserId=${actorUserId} rideId=${ride.id}`,
      );
    } catch (error) {
      this.emitError(
        client,
        'ride:cancel',
        'CONFLICT',
        this.errorMessage(error),
      );
    }
  }

  private emitRideAccepted(ride: RideRequestModel): void {
    this.server.to(`user:${ride.userId}`).emit('ride:accepted', ride);
    if (ride.driverId) {
      this.server.to(`user:${ride.driverId}`).emit('ride:accepted', ride);
    }
  }

  private emitRideCancelled(
    ride: RideRequestModel,
    cancelledBy: CancelledBy,
  ): void {
    const payload: RideCancelledPayload = { ...ride, cancelledBy };
    this.server.to(`user:${ride.userId}`).emit('ride:cancelled', payload);

    if (ride.driverId) {
      this.server.to(`user:${ride.driverId}`).emit('ride:cancelled', payload);
      return;
    }

    this.server.to(DRIVERS_ROOM).emit('ride:cancelled', payload);
  }

  private requireRole(
    client: Socket,
    role: Role,
    event: RideSocketEvent,
  ): boolean {
    if (typeof client.data?.userId !== 'number') {
      this.emitError(client, event, 'UNAUTHORIZED', 'Unauthorized');
      return false;
    }

    if (client.data?.role !== role) {
      this.emitError(client, event, 'FORBIDDEN', 'Forbidden');
      return false;
    }

    return true;
  }

  private requireAnyRole(client: Socket, event: RideSocketEvent): boolean {
    if (typeof client.data?.userId !== 'number') {
      this.emitError(client, event, 'UNAUTHORIZED', 'Unauthorized');
      return false;
    }

    if (client.data?.role !== Role.USER && client.data?.role !== Role.DRIVER) {
      this.emitError(client, event, 'FORBIDDEN', 'Forbidden');
      return false;
    }

    return true;
  }

  private parsePayload<T extends object>(
    client: Socket,
    event: RideSocketEvent,
    dtoClass: new () => T,
    payload: unknown,
  ): T | null {
    const dto = plainToInstance(dtoClass, payload, {
      enableImplicitConversion: true,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.emitError(client, event, 'VALIDATION', 'Invalid ride payload');
      return null;
    }

    return dto;
  }

  private emitError(
    client: Socket,
    event: RideSocketEvent,
    code: RideErrorCode,
    message: string,
  ): void {
    const payload: RideErrorPayload = { event, code, message };
    client.emit('ride:error', payload);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Ride action failed';
  }
}
