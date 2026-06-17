import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export function throwIfDatabaseError(error: unknown): never {
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
