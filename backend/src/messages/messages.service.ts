import {
  forwardRef,
  Inject,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { throwIfDatabaseError } from '../common/db-error.helper';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

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
        this.logger.warn(
          `[send] userId=${userId} → chatId=${dto.chatId} forbidden — not a member`,
        );
        throw new ForbiddenException('You are not a member of this chat');
      }

      const message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            chatId: dto.chatId,
            senderId: userId,
            content: dto.content,
          },
        });

        await tx.chat.update({
          where: { id: dto.chatId },
          data: { lastMessageId: created.id },
        });

        return created;
      });

      this.logger.log(
        `[send] messageId=${message.id} saved (userId=${userId} → chatId=${dto.chatId})`,
      );

      await this.chatGateway.pushMessage(dto.chatId, message);

      return message;
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
        this.logger.warn(
          `[findByChatId] userId=${userId} → chatId=${chatId} forbidden — not a member`,
        );
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

      this.logger.log(
        `[findByChatId] userId=${userId} chatId=${chatId} fetched ${messages.length} message(s)${query.before ? ` before=${query.before}` : ''}`,
      );

      const undelivered = messages.filter(
        (m) => m.senderId !== userId && m.deliveredAt === null,
      );

      if (undelivered.length > 0) {
        const now = new Date();
        await this.prisma.message.updateMany({
          where: { id: { in: undelivered.map((m) => m.id) } },
          data: { deliveredAt: now },
        });

        this.logger.log(
          `[findByChatId] catch-up delivery: ${undelivered.length} message(s) marked delivered for userId=${userId} in chatId=${chatId}`,
        );

        const senderIds = [...new Set(undelivered.map((m) => m.senderId))];
        for (const senderId of senderIds) {
          const ids = undelivered
            .filter((m) => m.senderId === senderId)
            .map((m) => m.id);
          this.logger.log(
            `[findByChatId] notifying sender userId=${senderId} → message:delivered ids=[${ids.join(',')}]`,
          );
          this.chatGateway.server
            .to(`user:${senderId}`)
            .emit('message:delivered', {
              messageIds: ids,
              deliveredAt: now,
            });
        }
      }

      return messages.reverse();
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }
}
