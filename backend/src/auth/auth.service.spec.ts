import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a new user with a hashed password and returns a JWT', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
    });
    jwtMock.signAsync.mockResolvedValue('signed-token');
    jest.mocked(bcrypt.genSalt).mockResolvedValue('salt' as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

    const result = await service.register({
      email: 'test@example.com',
      name: 'Test User',
      password: 'plain-password',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
      },
    });
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 7,
      username: 'Test User',
    });
    expect(result).toEqual({ access_token: 'signed-token' });
  });

  it('rejects duplicate email registration', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
    });

    await expect(
      service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'plain-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('logs in a user with valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtMock.signAsync.mockResolvedValue('signed-token');

    const result = await service.login({
      email: 'test@example.com',
      password: 'plain-password',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password');
    expect(jwtMock.signAsync).toHaveBeenCalledWith({
      sub: 7,
      username: 'Test User',
    });
    expect(result).toEqual({ access_token: 'signed-token' });
  });

  it('rejects login when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'plain-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects login when the password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });
});
