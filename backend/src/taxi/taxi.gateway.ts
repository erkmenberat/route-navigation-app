import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { TaxiService } from './taxi.service';
import { WsDriverGuard } from './guards/ws-driver.guard';
import { UpdateLocationDto } from './dto/update-location.dto';

const TAXI_MAP_ROOM = 'taxi-map';

@WebSocketGateway({ cors: true })
export class TaxiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TaxiGateway.name);

  constructor(
    private readonly taxiService: TaxiService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: number; role: string }>(
        token,
      );
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      await client.join(TAXI_MAP_ROOM);

      if (payload.role === 'DRIVER') {
        const taxi = await this.taxiService.setActive(payload.sub, true);
        client.data.taxiId = taxi.id;
        client.to(TAXI_MAP_ROOM).emit('taxiConnected', taxi);
        this.logger.log(
          `[connect] DRIVER userId=${payload.sub} taxiId=${taxi.id} is now active`,
        );
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    if (client.data?.role !== 'DRIVER') return;

    const userId = client.data.userId as number | undefined;
    const taxiId = client.data.taxiId as number | undefined;
    if (!userId || !taxiId) return;

    await this.taxiService.setActive(userId, false);
    this.server.to(TAXI_MAP_ROOM).emit('driverDisconnected', { taxiId });
    this.logger.log(
      `[disconnect] DRIVER userId=${userId} taxiId=${taxiId} is now inactive`,
    );
  }

  @SubscribeMessage('joinTaxiMap')
  async handleJoinTaxiMap(@ConnectedSocket() client: Socket): Promise<void> {
    const activeTaxis = await this.taxiService.findAllActive();
    client.emit('initialTaxiData', activeTaxis);
    this.logger.log(
      `[joinTaxiMap] socket=${client.id} userId=${client.data?.userId} received ${activeTaxis.length} active taxi(s): [${activeTaxis.map((t) => t.id).join(', ')}]`,
    );
  }

  @UseGuards(WsDriverGuard)
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateLocationDto,
  ): Promise<void> {
    const userId = client.data.userId as number;
    const updated = await this.taxiService.updateLocation(
      userId,
      payload.lat,
      payload.lng,
    );
    client.to(TAXI_MAP_ROOM).emit('locationUpdated', {
      taxiId: updated.id,
      lat: updated.latitude,
      lng: updated.longitude,
    });
  }
}
