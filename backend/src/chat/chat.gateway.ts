import { forwardRef, Inject, UseGuards } from '@nestjs/common';
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

      await this.broadcastUserStatus(payload.sub, true);
      await this.deliverPendingMessages(payload.sub, client);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId as number | undefined;
    if (!userId) return;

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
    this.server.to(`chat:${chatId}`).emit('message:receive', message);

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { user1Id: true, user2Id: true },
    });

    if (!chat) return;

    const recipientId =
      chat.user1Id === message.senderId ? chat.user2Id : chat.user1Id;

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { isOnline: true },
    });

    if (recipient?.isOnline) {
      const now = new Date();

      await this.prisma.message.update({
        where: { id: message.id },
        data: { deliveredAt: now },
      });

      this.server.to(`user:${message.senderId}`).emit('message:delivered', {
        messageIds: [message.id],
        deliveredAt: now,
      });
    }
  }

  async joinChatRoom(client: Socket, chatId: number): Promise<void> {
    await client.join(`chat:${chatId}`);
  }

  private async broadcastUserStatus(
    userId: number,
    isOnline: boolean,
  ): Promise<void> {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });

    for (const chat of chats) {
      this.server.to(`chat:${chat.id}`).emit('user:status', {
        userId,
        isOnline,
      });
    }
  }

  private async deliverPendingMessages(
    userId: number,
    client: Socket,
  ): Promise<void> {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { id: true },
    });

    const chatIds = chats.map((c) => c.id);
    if (chatIds.length === 0) return;

    const undelivered = await this.prisma.message.findMany({
      where: {
        chatId: { in: chatIds },
        senderId: { not: userId },
        deliveredAt: null,
      },
    });

    if (undelivered.length === 0) return;

    const now = new Date();

    await this.prisma.message.updateMany({
      where: { id: { in: undelivered.map((m) => m.id) } },
      data: { deliveredAt: now },
    });

    client.emit('message:delivered', {
      messageIds: undelivered.map((m) => m.id),
      deliveredAt: now,
    });

    for (const message of undelivered) {
      this.server.to(`user:${message.senderId}`).emit('message:delivered', {
        messageIds: [message.id],
        deliveredAt: now,
      });
    }
  }
}
