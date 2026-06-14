import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getProfile', () => {
    it('delegates to UsersService.findById with the authenticated userId', async () => {
      const profile = {
        id: 7,
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      usersServiceMock.findById.mockResolvedValue(profile);

      const req = { user: { userId: 7, username: 'Alice' } };
      await expect(controller.getProfile(req)).resolves.toEqual(profile);
      expect(usersServiceMock.findById).toHaveBeenCalledWith(7);
    });
  });
});
