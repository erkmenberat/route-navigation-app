import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;

  const chatServiceMock = {
    createOrGet: jest.fn(),
    findAllForUser: jest.fn(),
  };

  const mockReq = { user: { userId: 7, username: 'Alice' } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatServiceMock }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  describe('createOrGet', () => {
    it('delegates to ChatService.createOrGet with the authenticated userId', async () => {
      const chat = { id: 1, user1Id: 5, user2Id: 7 };
      chatServiceMock.createOrGet.mockResolvedValue(chat);

      const dto = { userId: 5 };
      const result = await controller.createOrGet(mockReq, dto);

      expect(result).toEqual(chat);
      expect(chatServiceMock.createOrGet).toHaveBeenCalledWith(7, dto);
    });
  });

  describe('findAll', () => {
    it('delegates to ChatService.findAllForUser with the authenticated userId', async () => {
      const chats = [{ id: 1 }, { id: 2 }];
      chatServiceMock.findAllForUser.mockResolvedValue(chats);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual(chats);
      expect(chatServiceMock.findAllForUser).toHaveBeenCalledWith(7);
    });
  });
});
