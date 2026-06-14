import { NotFoundException } from '@nestjs/common';
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

  it('returns the public profile fields for a user', async () => {
    const createdAt = new Date('2026-06-14T10:00:00.000Z');
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      name: 'Test User',
      createdAt,
    });

    await expect(service.findById(7)).resolves.toEqual({
      id: 7,
      email: 'test@example.com',
      name: 'Test User',
      createdAt,
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  });

  it('throws NotFoundException when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
