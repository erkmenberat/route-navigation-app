import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      this.throwDatabaseConnectionError(error);
    }
  }

  async searchByName(currentUserId: number, query: SearchUsersQueryDto) {
    try {
      return await this.prisma.user.findMany({
        where: {
          name: { contains: query.username, mode: 'insensitive' },
          NOT: { id: currentUserId },
        },
        select: { id: true, name: true },
        take: 10,
      });
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
