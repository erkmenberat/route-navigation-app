import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

describe('MessagesService', () => {
  let service: MessagesService;

  const prismaMock = {
    chat: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof prismaMock) => Promise<unknown>) =>
      fn(prismaMock),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('send', () => {
    const dto: SendMessageDto = { chatId: 1, content: 'ZW5jcnlwdGVk' };

    it('throws ForbiddenException when the user is not a member of the chat', async () => {
      prismaMock.chat.findFirst.mockResolvedValue(null);

      await expect(service.send(7, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('creates the message and updates chat.lastMessageId in a transaction', async () => {
      const mockMessage = {
        id: 10,
        chatId: 1,
        senderId: 7,
        content: dto.content,
        sentAt: new Date(),
        deliveredAt: null,
        readAt: null,
      };
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.create.mockResolvedValue(mockMessage);
      prismaMock.chat.update.mockResolvedValue({});

      const result = await service.send(7, dto);

      expect(result).toEqual(mockMessage);
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: { chatId: 1, senderId: 7, content: dto.content },
      });
      expect(prismaMock.chat.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastMessageId: 10 },
      });
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.chat.findFirst.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.send(7, dto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('findByChatId', () => {
    it('throws ForbiddenException when the user is not a member of the chat', async () => {
      prismaMock.chat.findFirst.mockResolvedValue(null);

      await expect(service.findByChatId(7, 1, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns messages in ascending order (oldest first)', async () => {
      const msg1 = { id: 1, sentAt: new Date('2026-01-01T10:00:00.000Z') };
      const msg2 = { id: 2, sentAt: new Date('2026-01-01T11:00:00.000Z') };
      const msg3 = { id: 3, sentAt: new Date('2026-01-01T12:00:00.000Z') };

      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.findMany.mockResolvedValue([msg3, msg2, msg1]);

      const result = await service.findByChatId(7, 1, {});

      expect(result).toEqual([msg1, msg2, msg3]);
    });

    it('applies the before cursor to filter older messages', async () => {
      const before = '2026-06-17T12:00:00.000Z';
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.findMany.mockResolvedValue([]);

      await service.findByChatId(7, 1, { before });

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId: 1, sentAt: { lt: new Date(before) } },
        }),
      );
    });

    it('omits the sentAt filter when no cursor is provided', async () => {
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.findMany.mockResolvedValue([]);

      await service.findByChatId(7, 1, {});

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId: 1 },
        }),
      );
    });

    it('returns an empty array when the chat has no messages', async () => {
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.findMany.mockResolvedValue([]);

      const result = await service.findByChatId(7, 1, {});

      expect(result).toEqual([]);
    });

    it('limits results to 20 messages', async () => {
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });
      prismaMock.message.findMany.mockResolvedValue([]);

      await service.findByChatId(7, 1, {});

      expect(prismaMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.chat.findFirst.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.findByChatId(7, 1, {})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
