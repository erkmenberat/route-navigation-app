import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
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
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

  describe('register', () => {
    it('creates a new user and returns an access + refresh token pair', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: 'hashed',
      });
      prismaMock.refreshToken.create.mockResolvedValue({});
      jest.mocked(bcrypt.genSalt).mockResolvedValue('salt' as never);
      jest.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      jwtMock.signAsync.mockResolvedValue('access-token');

      const result = await service.register({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'plaintext',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 'salt');
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { email: 'alice@example.com', name: 'Alice', password: 'hashed' },
      });
      expect(jwtMock.signAsync).toHaveBeenCalledWith({
        sub: 1,
        username: 'Alice',
      });
      expect(result).toMatchObject({ access_token: 'access-token' });
      expect(typeof result.refresh_token).toBe('string');
      expect(result.refresh_token.length).toBeGreaterThan(0);
    });

    it('throws ConflictException when the email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
      });

      await expect(
        service.register({
          email: 'alice@example.com',
          name: 'Alice',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.user.findUnique.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(
        service.register({
          email: 'alice@example.com',
          name: 'Alice',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('login', () => {
    it('returns an access + refresh token pair for valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: 'hashed',
      });
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prismaMock.refreshToken.create.mockResolvedValue({});
      jwtMock.signAsync.mockResolvedValue('access-token');

      const result = await service.login({
        email: 'alice@example.com',
        password: 'correct',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('correct', 'hashed');
      expect(jwtMock.signAsync).toHaveBeenCalledWith({
        sub: 1,
        username: 'Alice',
      });
      expect(result).toMatchObject({ access_token: 'access-token' });
      expect(typeof result.refresh_token).toBe('string');
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: 'hashed',
      });
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtMock.signAsync).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.user.findUnique.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(
        service.login({ email: 'alice@example.com', password: 'pw' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('refresh', () => {
    const futureDate = new Date(Date.now() + 60_000);
    const pastDate = new Date(Date.now() - 60_000);

    it('rotates the refresh token and returns a new token pair', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 99,
        expiresAt: futureDate,
        user: { id: 1, name: 'Alice' },
      });
      prismaMock.refreshToken.delete.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});
      jwtMock.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
      expect(result).toMatchObject({ access_token: 'new-access-token' });
      expect(typeof result!.refresh_token).toBe('string');
    });

    it('throws UnauthorizedException and deletes the record for an expired token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 99,
        expiresAt: pastDate,
        user: { id: 1, name: 'Alice' },
      });
      prismaMock.refreshToken.delete.mockResolvedValue({});

      await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });

    it('throws UnauthorizedException for an unknown token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(prismaMock.refreshToken.delete).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.refreshToken.findUnique.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.refresh('any-token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('logout', () => {
    it('deletes the refresh token by hash', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.logout('some-refresh-token'),
      ).resolves.toBeUndefined();

      expect(prismaMock.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });

    it('succeeds silently when the token is already gone (idempotent)', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.logout('already-gone-token'),
      ).resolves.toBeUndefined();
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.refreshToken.deleteMany.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.logout('any-token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
