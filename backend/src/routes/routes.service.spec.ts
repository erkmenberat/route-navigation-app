import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';

describe('RoutesService', () => {
  let service: RoutesService;

  const prismaMock = {
    route: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const fullRouteDto: CreateRouteDto = {
    origin: 'Home',
    destination: 'Office',
    startLat: 48.2082,
    startLong: 16.3738,
    finishLat: 48.2101,
    finishLong: 16.3791,
    startAt: '2026-06-14T08:00:00.000Z',
    finishAt: '2026-06-14T08:15:00.000Z',
    distance: 1500,
    duration: 900,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
  });

  describe('create', () => {
    it('persists a route with all fields and returns the created record', async () => {
      const created = { id: 1, userId: 7, ...fullRouteDto };
      prismaMock.route.create.mockResolvedValue(created);

      await expect(service.create(7, fullRouteDto)).resolves.toEqual(created);
      expect(prismaMock.route.create).toHaveBeenCalledWith({
        data: {
          userId: 7,
          origin: fullRouteDto.origin,
          destination: fullRouteDto.destination,
          startLat: fullRouteDto.startLat,
          startLong: fullRouteDto.startLong,
          finishLat: fullRouteDto.finishLat,
          finishLong: fullRouteDto.finishLong,
          startAt: new Date(fullRouteDto.startAt!),
          finishAt: new Date(fullRouteDto.finishAt!),
          distance: fullRouteDto.distance,
          duration: fullRouteDto.duration,
        },
      });
    });

    it('persists a route without optional fields (startAt/finishAt/origin/destination undefined)', async () => {
      const dto: CreateRouteDto = {
        startLat: 48.2,
        startLong: 16.3,
        finishLat: 48.21,
        finishLong: 16.38,
        distance: 500,
        duration: 120,
      };
      prismaMock.route.create.mockResolvedValue({ id: 2, userId: 7, ...dto });

      await service.create(7, dto);

      expect(prismaMock.route.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startAt: undefined,
          finishAt: undefined,
        }),
      });
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.route.create.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.create(7, fullRouteDto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('findAllForUser', () => {
    it('returns the first page with correct pagination metadata', async () => {
      const routes = [{ id: 2 }, { id: 1 }];
      prismaMock.$transaction.mockResolvedValue([routes, 5]);

      const result = await service.findAllForUser(7, 1, 2);

      expect(result).toEqual({
        data: routes,
        meta: {
          total: 5,
          page: 1,
          limit: 2,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      });
    });

    it('sets hasPreviousPage=true and hasNextPage=true on a middle page', async () => {
      prismaMock.$transaction.mockResolvedValue([[{ id: 3 }], 5]);

      const result = await service.findAllForUser(7, 2, 2);

      expect(result!.meta.hasPreviousPage).toBe(true);
      expect(result!.meta.hasNextPage).toBe(true);
    });

    it('sets hasNextPage=false on the last page', async () => {
      prismaMock.$transaction.mockResolvedValue([[{ id: 1 }], 3]);

      const result = await service.findAllForUser(7, 2, 2);

      expect(result!.meta.hasNextPage).toBe(false);
    });

    it('returns empty data and zero-total metadata for a user with no routes', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAllForUser(7, 1, 20);

      expect(result!.data).toHaveLength(0);
      expect(result!.meta.total).toBe(0);
      expect(result!.meta.totalPages).toBe(0);
      expect(result!.meta.hasNextPage).toBe(false);
      expect(result!.meta.hasPreviousPage).toBe(false);
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.$transaction.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.findAllForUser(7, 1, 20)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('deleteForUser', () => {
    it('deletes a route that belongs to the user and returns confirmation', async () => {
      prismaMock.route.findFirst.mockResolvedValue({ id: 11 });
      prismaMock.route.delete.mockResolvedValue({ id: 11 });

      const result = await service.deleteForUser(7, 11);

      expect(result).toEqual({ deleted: true, id: 11 });
      expect(prismaMock.route.findFirst).toHaveBeenCalledWith({
        where: { id: 11, userId: 7 },
        select: { id: true },
      });
      expect(prismaMock.route.delete).toHaveBeenCalledWith({
        where: { id: 11 },
      });
    });

    it('throws NotFoundException when the route does not exist', async () => {
      prismaMock.route.findFirst.mockResolvedValue(null);

      await expect(service.deleteForUser(7, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaMock.route.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the route belongs to another user', async () => {
      // findFirst with userId:7 returns null because the route is owned by user 8
      prismaMock.route.findFirst.mockResolvedValue(null);

      await expect(service.deleteForUser(7, 42)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.route.findFirst.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.deleteForUser(7, 11)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
