import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';

describe('RoutesService', () => {
  let service: RoutesService;

  const prismaMock = {
    route: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
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

  it('creates a route history entry for the user', async () => {
    const dto: CreateRouteDto = {
      origin: 'Aktueller Standort',
      destination: 'Zieladresse',
      startLat: 48.2082,
      startLong: 16.3738,
      finishLat: 48.2101,
      finishLong: 16.3791,
      startAt: '2026-06-14T10:00:00.000Z',
      finishAt: '2026-06-14T10:10:00.000Z',
      distance: 1500,
      duration: 600,
    };
    const createdRoute = { id: 11, userId: 7, ...dto };
    prismaMock.route.create.mockResolvedValue(createdRoute);

    await expect(service.create(7, dto)).resolves.toEqual(createdRoute);
    expect(prismaMock.route.create).toHaveBeenCalledWith({
      data: {
        userId: 7,
        origin: dto.origin,
        destination: dto.destination,
        startLat: dto.startLat,
        startLong: dto.startLong,
        finishLat: dto.finishLat,
        finishLong: dto.finishLong,
        startAt: new Date(dto.startAt as string),
        finishAt: new Date(dto.finishAt as string),
        distance: dto.distance,
        duration: dto.duration,
      },
    });
  });

  it('returns all routes for a user ordered newest first', async () => {
    const routes = [{ id: 11 }, { id: 10 }];
    prismaMock.route.findMany.mockResolvedValue(routes);

    await expect(service.findAllForUser(7)).resolves.toEqual(routes);
    expect(prismaMock.route.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deletes a route that belongs to the user', async () => {
    prismaMock.route.findFirst.mockResolvedValue({ id: 11 });
    prismaMock.route.delete.mockResolvedValue({ id: 11 });

    await expect(service.deleteForUser(7, 11)).resolves.toEqual({
      deleted: true,
      id: 11,
    });
    expect(prismaMock.route.findFirst).toHaveBeenCalledWith({
      where: {
        id: 11,
        userId: 7,
      },
      select: {
        id: true,
      },
    });
    expect(prismaMock.route.delete).toHaveBeenCalledWith({
      where: { id: 11 },
    });
  });

  it('throws NotFoundException when deleting a missing or foreign route', async () => {
    prismaMock.route.findFirst.mockResolvedValue(null);

    await expect(service.deleteForUser(7, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.route.delete).not.toHaveBeenCalled();
  });
});
