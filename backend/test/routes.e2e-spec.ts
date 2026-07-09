import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

process.env.JWT_SECRET = 'e2e-test-secret';
process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';

describe('Routes (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authHeader: string;

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
    const token = await jwtService.signAsync({ sub: 7, username: 'Alice' });
    authHeader = `Bearer ${token}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validRouteBody = {
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

  describe('POST /routes/history', () => {
    it('201 — creates a route entry and returns the persisted record', async () => {
      const created = { id: 1, userId: 7, ...validRouteBody };
      prismaMock.route.create.mockResolvedValue(created);

      const { status, body } = await request(app.getHttpServer())
        .post('/routes/history')
        .set('Authorization', authHeader)
        .send(validRouteBody);

      expect(status).toBe(201);
      expect(body).toMatchObject({ id: 1, userId: 7 });
    });

    it('201 — creates a route with only the required coordinate fields', async () => {
      const minimalBody = {
        startLat: 48.2082,
        startLong: 16.3738,
        finishLat: 48.2101,
        finishLong: 16.3791,
        distance: 1500,
        duration: 900,
      };
      prismaMock.route.create.mockResolvedValue({
        id: 2,
        userId: 7,
        ...minimalBody,
      });

      const { status } = await request(app.getHttpServer())
        .post('/routes/history')
        .set('Authorization', authHeader)
        .send(minimalBody);

      expect(status).toBe(201);
    });

    it('401 — rejects a request without a JWT', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/routes/history')
        .send(validRouteBody);

      expect(status).toBe(401);
    });

    it('400 — rejects a body missing required coordinate fields', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/routes/history')
        .set('Authorization', authHeader)
        .send({ origin: 'Home', distance: 100, duration: 60 }); // missing coordinates

      expect(status).toBe(400);
    });

    it('400 — rejects extra unknown fields (forbidNonWhitelisted)', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/routes/history')
        .set('Authorization', authHeader)
        .send({ ...validRouteBody, unknownField: 'should-be-rejected' });

      expect(status).toBe(400);
    });
  });

  describe('GET /routes/history', () => {
    it('200 — returns paginated route list with metadata', async () => {
      const routes = [{ id: 2 }, { id: 1 }];
      prismaMock.$transaction.mockResolvedValue([routes, 2]);

      const { status, body } = await request(app.getHttpServer())
        .get('/routes/history')
        .set('Authorization', authHeader);

      expect(status).toBe(200);
      expect(body).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          totalPages: expect.any(Number),
          hasNextPage: expect.any(Boolean),
          hasPreviousPage: expect.any(Boolean),
        }),
      });
    });

    it('200 — accepts custom page and limit query params', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const { status } = await request(app.getHttpServer())
        .get('/routes/history?page=2&limit=5')
        .set('Authorization', authHeader);

      expect(status).toBe(200);
    });

    it('401 — rejects a request without a JWT', async () => {
      const { status } = await request(app.getHttpServer()).get(
        '/routes/history',
      );

      expect(status).toBe(401);
    });

    it('400 — rejects a non-numeric page param', async () => {
      const { status } = await request(app.getHttpServer())
        .get('/routes/history?page=abc')
        .set('Authorization', authHeader);

      expect(status).toBe(400);
    });
  });

  describe('DELETE /routes/history/:id', () => {
    it('200 — deletes the route and returns { deleted: true, id }', async () => {
      prismaMock.route.findFirst.mockResolvedValue({ id: 11 });
      prismaMock.route.delete.mockResolvedValue({ id: 11 });

      const { status, body } = await request(app.getHttpServer())
        .delete('/routes/history/11')
        .set('Authorization', authHeader);

      expect(status).toBe(200);
      expect(body).toEqual({ deleted: true, id: 11 });
    });

    it('404 — returns not found when the route does not exist', async () => {
      prismaMock.route.findFirst.mockResolvedValue(null);

      const { status } = await request(app.getHttpServer())
        .delete('/routes/history/999')
        .set('Authorization', authHeader);

      expect(status).toBe(404);
    });

    it('401 — rejects a request without a JWT', async () => {
      const { status } = await request(app.getHttpServer()).delete(
        '/routes/history/1',
      );

      expect(status).toBe(401);
    });

    it('400 — rejects a non-integer route id', async () => {
      const { status } = await request(app.getHttpServer())
        .delete('/routes/history/not-a-number')
        .set('Authorization', authHeader);

      expect(status).toBe(400);
    });
  });
});
