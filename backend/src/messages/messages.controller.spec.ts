import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

describe('MessagesController', () => {
  let controller: MessagesController;

  const messagesServiceMock = {
    send: jest.fn(),
    findByChatId: jest.fn(),
  };

  const mockReq = { user: { userId: 7, username: 'Alice' } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: messagesServiceMock }],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  describe('send', () => {
    it('delegates to MessagesService.send with the authenticated userId', async () => {
      const dto: SendMessageDto = { chatId: 1, content: 'ZW5jcnlwdGVk' };
      const message = { id: 10, chatId: 1, senderId: 7, content: dto.content };
      messagesServiceMock.send.mockResolvedValue(message);

      const result = await controller.send(mockReq, dto);

      expect(result).toEqual(message);
      expect(messagesServiceMock.send).toHaveBeenCalledWith(7, dto);
    });
  });

  describe('findByChatId', () => {
    it('delegates to MessagesService.findByChatId with the authenticated userId and parsed chatId', async () => {
      const messages = [{ id: 1 }, { id: 2 }];
      messagesServiceMock.findByChatId.mockResolvedValue(messages);

      const result = await controller.findByChatId(mockReq, 1, {});

      expect(result).toEqual(messages);
      expect(messagesServiceMock.findByChatId).toHaveBeenCalledWith(7, 1, {});
    });

    it('passes the before cursor query param through to the service', async () => {
      messagesServiceMock.findByChatId.mockResolvedValue([]);
      const query = { before: '2026-06-17T12:00:00.000Z' };

      await controller.findByChatId(mockReq, 1, query);

      expect(messagesServiceMock.findByChatId).toHaveBeenCalledWith(
        7,
        1,
        query,
      );
    });
  });
});
