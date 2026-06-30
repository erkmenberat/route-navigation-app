import { forwardRef, Inject, Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { WsSendMessageDto } from './dto/ws-send-message.dto';

interface PushedMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        this.logger.warn(`[connect] socket=${client.id} rejected — no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: number }>(token);
      client.data.userId = payload.sub;

      await client.join(`user:${payload.sub}`);

      const chats = await this.prisma.chat.findMany({
        where: { OR: [{ user1Id: payload.sub }, { user2Id: payload.sub }] },
        select: { id: true },
      });

      for (const chat of chats) {
        await client.join(`chat:${chat.id}`);
      }

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { isOnline: true },
      });

      const chatIds = chats.map((c) => c.id);
      this.logger.log(
        `[connect] userId=${payload.sub} socket=${client.id} joined rooms: user:${payload.sub}, chats=[${chatIds.join(',')}]`,
      );

      if (chatIds.length > 0) {
        const undelivered = await this.prisma.message.findMany({
          where: {
            chatId: { in: chatIds },
            senderId: { not: payload.sub },
            deliveredAt: null,
          },
          orderBy: { sentAt: 'asc' },
          select: {
            id: true,
            chatId: true,
            senderId: true,
            content: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
          },
        });

        if (undelivered.length > 0) {
          this.logger.log(
            `[connect] pushing ${undelivered.length} undelivered message(s) to userId=${payload.sub}`,
          );
          for (const message of undelivered) {
            client.emit('message:receive', message);
          }
        }
      }

      await this.broadcastUserStatus(payload.sub, true);
    } catch {
      this.logger.warn(
        `[connect] socket=${client.id} rejected — invalid token`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId as number | undefined;
    if (!userId) return;

    this.logger.log(`[disconnect] userId=${userId} socket=${client.id}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    await this.broadcastUserStatus(userId, false);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleMessageSend(
    client: Socket,
    payload: WsSendMessageDto,
  ): Promise<void> {
    try {
      const userId = client.data.userId as number;
      this.logger.log(
        `[message:send] userId=${userId} → chatId=${payload.chatId}`,
      );
      await this.messagesService.send(userId, {
        chatId: payload.chatId,
        content: payload.content,
      });
    } catch {
      // Errors (e.g. not a member) are silently dropped — no HTTP context here
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:read')
  async handleMessageRead(
    client: Socket,
    payload: { chatId: number },
  ): Promise<void> {
    const userId = client.data.userId as number;
    this.logger.log(`[message:read] userId=${userId} chatId=${payload.chatId}`);
    const now = new Date();

    await this.prisma.message.updateMany({
      where: {
        chatId: payload.chatId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: now },
    });

    this.server.to(`chat:${payload.chatId}`).emit('message:read', {
      chatId: payload.chatId,
      readBy: userId,
      readAt: now,
    });
  }

  async pushMessage(chatId: number, message: PushedMessage): Promise<void> {
    this.logger.log(
      `[push] messageId=${message.id} → chat:${chatId} (sender=${message.senderId})`,
    );
    this.server.to(`chat:${chatId}`).emit('message:receive', message);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:ack')
  async handleMessageAck(
    client: Socket,
    payload: { messageId: number },
  ): Promise<void> {
    const userId = client.data.userId as number;
    this.logger.log(
      `[message:ack] userId=${userId} acks messageId=${payload.messageId}`,
    );
    const now = new Date();

    const message = await this.prisma.message.findFirst({
      where: {
        id: payload.messageId,
        senderId: { not: userId },
        deliveredAt: null,
      },
    });

    if (!message) {
      this.logger.debug(
        `[message:ack] messageId=${payload.messageId} skipped — already delivered or not found`,
      );
      return;
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: { deliveredAt: now },
    });

    this.logger.log(
      `[message:ack] messageId=${message.id} marked delivered → notifying sender userId=${message.senderId}`,
    );

    this.server.to(`user:${message.senderId}`).emit('message:delivered', {
      messageIds: [message.id],
      deliveredAt: now,
    });
  }

  async joinChatRoom(client: Socket, chatId: number): Promise<void> {
    this.logger.log(`[joinChatRoom] socket=${client.id} → chat:${chatId}`);
    await client.join(`chat:${chatId}`);
  }

  joinUsersToRoom(user1Id: number, user2Id: number, chatId: number): void {
    this.logger.log(
      `[joinUsersToRoom] chatId=${chatId} users=[${user1Id},${user2Id}]`,
    );
    this.server.in(`user:${user1Id}`).socketsJoin(`chat:${chatId}`);
    this.server.in(`user:${user2Id}`).socketsJoin(`chat:${chatId}`);
  }

  private async broadcastUserStatus(
    userId: number,
    isOnline: boolean,
  ): Promise<void> {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });

    this.logger.log(
      `[user:status] userId=${userId} isOnline=${isOnline} → broadcasting to ${chats.length} chat(s)`,
    );

    for (const chat of chats) {
      this.server.to(`chat:${chat.id}`).emit('user:status', {
        userId,
        isOnline,
      });
    }
  }
}
