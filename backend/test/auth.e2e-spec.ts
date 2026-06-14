import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Must be set before AppModule is compiled so ConfigService picks it up
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const prismaMock = {
    user: { create: jest.fn(), findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    route: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService, { strict: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to sign a test JWT
  const signToken = (userId: number, username: string) =>
    jwtService.signAsync({ sub: userId, username });

  describe('POST /auth/register', () => {
    it('201 — creates a user and returns token pair', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: 'hashed',
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const { status, body } = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
          password: 'secret123',
        });

      expect(status).toBe(201);
      expect(body).toMatchObject({ access_token: expect.any(String) });
      expect(typeof body.refresh_token).toBe('string');
    });

    it('409 — rejects a duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
      });

      const { status } = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          name: 'Alice',
          password: 'secret123',
        });

      expect(status).toBe(409);
    });

    it('400 — rejects an invalid email', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', name: 'Alice', password: 'secret123' });

      expect(status).toBe(400);
    });

    it('400 — rejects a missing required field', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'alice@example.com', password: 'secret123' }); // name missing

      expect(status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('201 — returns token pair for valid credentials', async () => {
      // bcrypt is not mocked in E2E — use a pre-hashed password
      // We use the real bcrypt so we need to test with a pre-known hash.
      // Strategy: mock the user with a bcrypt hash of 'secret123'
      // hash for 'secret123' with 10 rounds (pre-computed)
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('secret123', 1);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: hash,
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const { status, body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'secret123' });

      expect(status).toBe(201);
      expect(body).toMatchObject({ access_token: expect.any(String) });
      expect(typeof body.refresh_token).toBe('string');
    });

    it('401 — rejects a wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 1);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'alice@example.com',
        name: 'Alice',
        password: hash,
      });

      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'wrong' });

      expect(status).toBe(401);
    });

    it('401 — rejects an unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@example.com', password: 'secret123' });

      expect(status).toBe(401);
    });

    it('400 — rejects a missing password field', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com' });

      expect(status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('200 — rotates tokens and returns a new pair', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 99,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: 1, name: 'Alice' },
      });
      prismaMock.refreshToken.delete.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const { status, body } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-value' });

      expect(status).toBe(200);
      expect(body).toMatchObject({ access_token: expect.any(String) });
    });

    it('401 — rejects an unknown refresh token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      const { status } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'unknown-token' });

      expect(status).toBe(401);
    });

    it('400 — rejects a missing refreshToken field', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({});

      expect(status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('204 — invalidates the refresh token and returns no body', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const { status, body } = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'some-refresh-token' });

      expect(status).toBe(204);
      expect(body).toEqual({});
    });

    it('204 — succeeds even when the token is already gone (idempotent)', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const { status } = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'already-gone' });

      expect(status).toBe(204);
    });
  });

  describe('GET /auth/me', () => {
    it('200 — returns userId and username for a valid JWT', async () => {
      const token = await signToken(1, 'Alice');

      const { status, body } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(status).toBe(200);
      expect(body).toEqual({ userId: 1, username: 'Alice' });
    });

    it('401 — rejects a request with no Authorization header', async () => {
      const { status } = await request(app.getHttpServer()).get('/auth/me');

      expect(status).toBe(401);
    });

    it('401 — rejects a request with a tampered JWT', async () => {
      const { status } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature');

      expect(status).toBe(401);
    });
  });
});
