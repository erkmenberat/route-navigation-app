import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('returns public profile fields (id, email, name, createdAt) for a known user', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const user = {
        id: 7,
        email: 'alice@example.com',
        name: 'Alice',
        createdAt,
      };
      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(service.findById(7)).resolves.toEqual(user);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        select: { id: true, email: true, name: true, createdAt: true },
      });
    });

    it('throws NotFoundException when no user is found for the given id', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.user.findUnique.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.findById(7)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('searchByName', () => {
    it('returns matching users excluding the current user', async () => {
      const users = [{ id: 5, name: 'Bob' }];
      prismaMock.user.findMany.mockResolvedValue(users);

      const result = await service.searchByName(7, { username: 'Bob' });

      expect(result).toEqual(users);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'Bob', mode: 'insensitive' },
          NOT: { id: 7 },
        },
        select: { id: true, name: true },
        take: 10,
      });
    });

    it('returns an empty array when no users match', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.searchByName(7, { username: 'unknown' });

      expect(result).toEqual([]);
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.user.findMany.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(
        service.searchByName(7, { username: 'Bob' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
