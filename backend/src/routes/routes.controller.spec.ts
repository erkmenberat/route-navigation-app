import { Test, TestingModule } from '@nestjs/testing';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';

describe('RoutesController', () => {
  let controller: RoutesController;

  const routesServiceMock = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    deleteForUser: jest.fn(),
  };

  const mockReq = { user: { userId: 7, username: 'Alice' } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesController],
      providers: [{ provide: RoutesService, useValue: routesServiceMock }],
    }).compile();

    controller = module.get<RoutesController>(RoutesController);
  });

  describe('createHistory', () => {
    it('delegates to RoutesService.create with the authenticated userId', async () => {
      const dto: CreateRouteDto = {
        startLat: 48.2,
        startLong: 16.3,
        finishLat: 48.21,
        finishLong: 16.38,
        distance: 500,
        duration: 120,
      };
      const created = { id: 1, userId: 7, ...dto };
      routesServiceMock.create.mockResolvedValue(created);

      await expect(controller.createHistory(mockReq, dto)).resolves.toEqual(
        created,
      );
      expect(routesServiceMock.create).toHaveBeenCalledWith(7, dto);
    });
  });

  describe('getHistory', () => {
    it('delegates to RoutesService.findAllForUser with default pagination', async () => {
      const paginatedResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      routesServiceMock.findAllForUser.mockResolvedValue(paginatedResult);

      await expect(
        controller.getHistory(mockReq, { page: 1, limit: 20 }),
      ).resolves.toEqual(paginatedResult);
      expect(routesServiceMock.findAllForUser).toHaveBeenCalledWith(7, 1, 20);
    });

    it('delegates to RoutesService.findAllForUser with custom pagination values', async () => {
      routesServiceMock.findAllForUser.mockResolvedValue({
        data: [],
        meta: {},
      });

      await controller.getHistory(mockReq, { page: 3, limit: 5 });

      expect(routesServiceMock.findAllForUser).toHaveBeenCalledWith(7, 3, 5);
    });
  });

  describe('deleteHistory', () => {
    it('delegates to RoutesService.deleteForUser with the authenticated userId and parsed route id', async () => {
      routesServiceMock.deleteForUser.mockResolvedValue({
        deleted: true,
        id: 11,
      });

      await expect(controller.deleteHistory(mockReq, 11)).resolves.toEqual({
        deleted: true,
        id: 11,
      });
      expect(routesServiceMock.deleteForUser).toHaveBeenCalledWith(7, 11);
    });
  });
});
