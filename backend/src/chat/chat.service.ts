import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { throwIfDatabaseError } from '../common/db-error.helper';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrGetChatDto } from './dto/create-or-get-chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createOrGet(currentUserId: number, dto: CreateOrGetChatDto) {
    if (currentUserId === dto.userId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }

    const user1Id = Math.min(currentUserId, dto.userId);
    const user2Id = Math.max(currentUserId, dto.userId);

    try {
      const otherUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });

      if (!otherUser) {
        throw new NotFoundException('User not found');
      }

      const existing = await this.prisma.chat.findUnique({
        where: { user1Id_user2Id: { user1Id, user2Id } },
      });

      if (existing) return existing;

      const chat = await this.prisma.chat.create({
        data: { user1Id, user2Id },
      });

      this.chatGateway.joinUsersToRoom(user1Id, user2Id, chat.id);

      return chat;
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async findAllForUser(userId: number) {
    try {
      return await this.prisma.chat.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        select: {
          id: true,
          updatedAt: true,
          lastMessageId: true,
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              sentAt: true,
              senderId: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async assertMembership(userId: number, chatId: number): Promise<void> {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: { id: true },
    });

    if (!chat) {
      throw new ForbiddenException('You are not a member of this chat');
    }
  }
}
