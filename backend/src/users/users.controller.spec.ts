import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findById: jest.fn(),
    searchByName: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  const mockReq = { user: { userId: 7, username: 'Alice' } };

  describe('getProfile', () => {
    it('delegates to UsersService.findById with the authenticated userId', async () => {
      const profile = {
        id: 7,
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      usersServiceMock.findById.mockResolvedValue(profile);

      await expect(controller.getProfile(mockReq)).resolves.toEqual(profile);
      expect(usersServiceMock.findById).toHaveBeenCalledWith(7);
    });
  });

  describe('searchUsers', () => {
    it('delegates to UsersService.searchByName with the authenticated userId and query', async () => {
      const users = [{ id: 5, name: 'Bob' }];
      usersServiceMock.searchByName.mockResolvedValue(users);

      const query = { username: 'Bob' };
      const result = await controller.searchUsers(mockReq, query);

      expect(result).toEqual(users);
      expect(usersServiceMock.searchByName).toHaveBeenCalledWith(7, query);
    });
  });
});
