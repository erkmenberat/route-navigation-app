import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
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
});
