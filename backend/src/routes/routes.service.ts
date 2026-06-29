import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';

@Injectable()
export class RoutesService {
  private static readonly BASE_PRICE = 4;
  private static readonly PRICE_PER_KM = 2;
  private static readonly PRICE_PER_MINUTE = 0.5;

  constructor(private readonly prisma: PrismaService) {}

  estimate(
    distanceMeters: number,
    durationSeconds: number,
  ): { estimatedPrice: number } {
    const price =
      RoutesService.BASE_PRICE +
      (distanceMeters / 1000) * RoutesService.PRICE_PER_KM +
      (durationSeconds / 60) * RoutesService.PRICE_PER_MINUTE;
    return { estimatedPrice: Math.round(price * 100) / 100 };
  }

  async create(userId: number, dto: CreateRouteDto) {
    try {
      const price =
        RoutesService.BASE_PRICE +
        (dto.distance / 1000) * RoutesService.PRICE_PER_KM +
        (dto.duration / 60) * RoutesService.PRICE_PER_MINUTE;

      return await this.prisma.route.create({
        data: {
          userId,
          origin: dto.origin,
          destination: dto.destination,
          startLat: dto.startLat,
          startLong: dto.startLong,
          finishLat: dto.finishLat,
          finishLong: dto.finishLong,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          finishAt: dto.finishAt ? new Date(dto.finishAt) : undefined,
          distance: dto.distance,
          duration: dto.duration,
          price,
        },
      });
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  async findAllForUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.route.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.route.count({ where: { userId } }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  async deleteForUser(userId: number, routeId: number) {
    try {
      const route = await this.prisma.route.findFirst({
        where: {
          id: routeId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!route) {
        throw new NotFoundException('Route not found');
      }

      await this.prisma.route.delete({
        where: { id: route.id },
      });

      return { deleted: true, id: route.id };
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  private throwDatabaseConnectionError(error: unknown): never {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      message.includes('database') ||
      message.includes('connect') ||
      message.includes('econnrefused')
    ) {
      throw new ServiceUnavailableException(
        'Database connection refused. Start PostgreSQL and check DATABASE_URL.',
      );
    }

    throw error;
  }
}
