import { ForbiddenException, Injectable } from '@nestjs/common';
import { throwIfDatabaseError } from '../common/db-error.helper';
import { PrismaService } from '../prisma/prisma.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async send(userId: number, dto: SendMessageDto) {
    try {
      const chat = await this.prisma.chat.findFirst({
        where: {
          id: dto.chatId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        select: { id: true },
      });

      if (!chat) {
        throw new ForbiddenException('You are not a member of this chat');
      }

      return await this.prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: {
            chatId: dto.chatId,
            senderId: userId,
            content: dto.content,
          },
        });

        await tx.chat.update({
          where: { id: dto.chatId },
          data: { lastMessageId: message.id },
        });

        return message;
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async findByChatId(
    userId: number,
    chatId: number,
    query: GetMessagesQueryDto,
  ) {
    try {
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

      const messages = await this.prisma.message.findMany({
        where: {
          chatId,
          ...(query.before ? { sentAt: { lt: new Date(query.before) } } : {}),
        },
        orderBy: { sentAt: 'desc' },
        take: 20,
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

      return messages.reverse();
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }
}
