import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { ChatGateway } from './chat.gateway';

const makeClient = (token?: string): jest.Mocked<Socket> =>
  ({
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }) as unknown as jest.Mocked<Socket>;

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockEmit = jest.fn();
  const mockServer = {
    to: jest.fn().mockReturnValue({ emit: mockEmit }),
    in: jest.fn().mockReturnValue({ emit: mockEmit }),
    emit: mockEmit,
  };

  const prismaMock = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    chat: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    verify: jest.fn(),
  };

  const messagesServiceMock = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockServer.to.mockReturnValue({ emit: mockEmit });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: MessagesService, useValue: messagesServiceMock },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer as never;
  });

  describe('handleConnection', () => {
    it('disconnects the client when no token is provided', async () => {
      const client = makeClient(undefined);

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('disconnects the client when the token is invalid', async () => {
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });
      const client = makeClient('bad-token');

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('sets userId on socket data on successful auth', async () => {
      jwtServiceMock.verify.mockReturnValue({ sub: 7 });
      prismaMock.chat.findMany.mockResolvedValue([]);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.message.findMany.mockResolvedValue([]);

      const client = makeClient('valid-token');
      await gateway.handleConnection(client);

      expect(client.data.userId).toBe(7);
    });

    it('joins the personal room and all chat rooms on connect', async () => {
      jwtServiceMock.verify.mockReturnValue({ sub: 7 });
      prismaMock.chat.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.message.findMany.mockResolvedValue([]);

      const client = makeClient('valid-token');
      await gateway.handleConnection(client);

      expect(client.join).toHaveBeenCalledWith('user:7');
      expect(client.join).toHaveBeenCalledWith('chat:1');
      expect(client.join).toHaveBeenCalledWith('chat:2');
    });

    it('marks the user as online in the database on connect', async () => {
      jwtServiceMock.verify.mockReturnValue({ sub: 7 });
      prismaMock.chat.findMany.mockResolvedValue([]);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.message.findMany.mockResolvedValue([]);

      const client = makeClient('valid-token');
      await gateway.handleConnection(client);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { isOnline: true },
      });
    });

    it('emits pending undelivered messages to the client on connect', async () => {
      jwtServiceMock.verify.mockReturnValue({ sub: 7 });
      prismaMock.chat.findMany.mockResolvedValue([{ id: 1 }]);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.message.findMany.mockResolvedValue([
        { id: 10, senderId: 5, chatId: 1 },
      ]);
      prismaMock.message.updateMany.mockResolvedValue({});

      const client = makeClient('valid-token');
      await gateway.handleConnection(client);

      expect(prismaMock.message.updateMany).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'message:delivered',
        expect.objectContaining({ messageIds: [10] }),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('does nothing when the socket was never authenticated', async () => {
      const client = makeClient();

      await gateway.handleDisconnect(client);

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('marks the user as offline and sets lastSeenAt on disconnect', async () => {
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.chat.findMany.mockResolvedValue([]);

      const client = makeClient();
      client.data.userId = 7;

      await gateway.handleDisconnect(client);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ isOnline: false }),
      });
    });
  });

  describe('handleMessageSend', () => {
    it('delegates to MessagesService.send with the authenticated userId', async () => {
      messagesServiceMock.send.mockResolvedValue({ id: 10 });

      const client = makeClient();
      client.data.userId = 7;

      await gateway.handleMessageSend(client, {
        chatId: 1,
        content: 'ZW5jcnlwdGVk',
      });

      expect(messagesServiceMock.send).toHaveBeenCalledWith(7, {
        chatId: 1,
        content: 'ZW5jcnlwdGVk',
      });
    });

    it('silently drops errors (e.g. user not a member)', async () => {
      messagesServiceMock.send.mockRejectedValue(
        new ForbiddenException('Not a member'),
      );

      const client = makeClient();
      client.data.userId = 7;

      await expect(
        gateway.handleMessageSend(client, { chatId: 99, content: 'x' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleMessageRead', () => {
    it('marks all unread messages from others as read', async () => {
      prismaMock.message.updateMany.mockResolvedValue({});

      const client = makeClient();
      client.data.userId = 7;

      await gateway.handleMessageRead(client, { chatId: 1 });

      expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
        where: {
          chatId: 1,
          senderId: { not: 7 },
          readAt: null,
        },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });

    it('emits message:read to the chat room', async () => {
      prismaMock.message.updateMany.mockResolvedValue({});

      const client = makeClient();
      client.data.userId = 7;

      await gateway.handleMessageRead(client, { chatId: 1 });

      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockEmit).toHaveBeenCalledWith(
        'message:read',
        expect.objectContaining({ chatId: 1, readBy: 7 }),
      );
    });
  });

  describe('pushMessage', () => {
    const message = {
      id: 10,
      chatId: 1,
      senderId: 7,
      content: 'ZW5jcnlwdGVk',
      sentAt: new Date(),
      deliveredAt: null,
      readAt: null,
    };

    it('emits message:receive to the chat room', async () => {
      prismaMock.chat.findUnique.mockResolvedValue({ user1Id: 5, user2Id: 7 });
      prismaMock.user.findUnique.mockResolvedValue({ isOnline: false });

      await gateway.pushMessage(1, message);

      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockEmit).toHaveBeenCalledWith('message:receive', message);
    });

    it('sets deliveredAt and notifies sender when recipient is online', async () => {
      prismaMock.chat.findUnique.mockResolvedValue({ user1Id: 5, user2Id: 7 });
      prismaMock.user.findUnique.mockResolvedValue({ isOnline: true });
      prismaMock.message.update.mockResolvedValue({});

      await gateway.pushMessage(1, message);

      expect(prismaMock.message.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ deliveredAt: expect.any(Date) }),
      });
      expect(mockServer.to).toHaveBeenCalledWith('user:7');
      expect(mockEmit).toHaveBeenCalledWith(
        'message:delivered',
        expect.objectContaining({ messageIds: [10] }),
      );
    });

    it('does not set deliveredAt when recipient is offline', async () => {
      prismaMock.chat.findUnique.mockResolvedValue({ user1Id: 5, user2Id: 7 });
      prismaMock.user.findUnique.mockResolvedValue({ isOnline: false });

      await gateway.pushMessage(1, message);

      expect(prismaMock.message.update).not.toHaveBeenCalled();
    });
  });
});
