import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    chat: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockReq = { user: { userId: 7, username: 'Alice' } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createOrGet', () => {
    it('throws BadRequestException when current user tries to chat with themselves', async () => {
      await expect(
        service.createOrGet(7, { userId: 7 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the other user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrGet(7, { userId: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.chat.create).not.toHaveBeenCalled();
    });

    it('returns existing chat without creating a new one', async () => {
      const existingChat = {
        id: 1,
        user1Id: 5,
        user2Id: 7,
        updatedAt: new Date(),
      };
      prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
      prismaMock.chat.findUnique.mockResolvedValue(existingChat);

      const result = await service.createOrGet(7, { userId: 5 });

      expect(result).toEqual(existingChat);
      expect(prismaMock.chat.create).not.toHaveBeenCalled();
    });

    it('creates and returns a new chat when none exists', async () => {
      const newChat = { id: 2, user1Id: 5, user2Id: 7, updatedAt: new Date() };
      prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
      prismaMock.chat.findUnique.mockResolvedValue(null);
      prismaMock.chat.create.mockResolvedValue(newChat);

      const result = await service.createOrGet(7, { userId: 5 });

      expect(result).toEqual(newChat);
      expect(prismaMock.chat.create).toHaveBeenCalledWith({
        data: { user1Id: 5, user2Id: 7 },
      });
    });

    it('always assigns the smaller id to user1Id regardless of argument order', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 5 });
      prismaMock.chat.findUnique.mockResolvedValue(null);
      prismaMock.chat.create.mockResolvedValue({
        id: 1,
        user1Id: 5,
        user2Id: 7,
      });

      await service.createOrGet(7, { userId: 5 });

      expect(prismaMock.chat.create).toHaveBeenCalledWith({
        data: { user1Id: 5, user2Id: 7 },
      });
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.user.findUnique.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(
        service.createOrGet(7, { userId: 5 }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('findAllForUser', () => {
    it('returns chats sorted by updatedAt with user info and last message', async () => {
      const chats = [
        {
          id: 2,
          updatedAt: new Date('2026-06-17T12:00:00.000Z'),
          lastMessageId: 10,
          user1: { id: 7, name: 'Alice' },
          user2: { id: 5, name: 'Bob' },
          messages: [
            { id: 10, content: 'hello', sentAt: new Date(), senderId: 7 },
          ],
        },
      ];
      prismaMock.chat.findMany.mockResolvedValue(chats);

      const result = await service.findAllForUser(7);

      expect(result).toEqual(chats);
      expect(prismaMock.chat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ user1Id: 7 }, { user2Id: 7 }] },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('returns an empty array when the user has no chats', async () => {
      prismaMock.chat.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser(7);

      expect(result).toEqual([]);
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.chat.findMany.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.findAllForUser(7)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('assertMembership', () => {
    it('resolves without error when the user is a member of the chat', async () => {
      prismaMock.chat.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.assertMembership(7, 1)).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when the user is not a member of the chat', async () => {
      prismaMock.chat.findFirst.mockResolvedValue(null);

      await expect(service.assertMembership(7, 99)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
