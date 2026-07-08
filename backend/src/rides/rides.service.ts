import { ConflictException, Injectable } from '@nestjs/common';
import { RideStatus, Role } from '../generated/prisma/enums';
import { throwIfDatabaseError } from '../common/db-error.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';

@Injectable()
export class RidesService {
  private static readonly BASE_PRICE = 4;
  private static readonly PRICE_PER_KM = 2;
  private static readonly PRICE_PER_MINUTE = 0.5;

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateRideDto) {
    try {
      return await this.prisma.rideRequest.create({
        data: {
          userId,
          status: RideStatus.PENDING,
          origin: dto.origin,
          destination: dto.destination,
          startLat: dto.startLat,
          startLong: dto.startLong,
          finishLat: dto.finishLat,
          finishLong: dto.finishLong,
          distance: dto.distance,
          duration: dto.duration,
          price: this.calculatePrice(dto.distance, dto.duration),
        },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async accept(driverUserId: number, rideId: number) {
    try {
      const acceptedAt = new Date();
      const result = await this.prisma.rideRequest.updateMany({
        where: {
          id: rideId,
          status: RideStatus.PENDING,
        },
        data: {
          driverId: driverUserId,
          status: RideStatus.ACCEPTED,
          acceptedAt,
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Ride is already taken or not pending');
      }

      return await this.prisma.rideRequest.findUniqueOrThrow({
        where: { id: rideId },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async start(driverUserId: number, rideId: number) {
    try {
      const startedAt = new Date();
      const result = await this.prisma.rideRequest.updateMany({
        where: {
          id: rideId,
          driverId: driverUserId,
          status: RideStatus.ACCEPTED,
        },
        data: {
          status: RideStatus.STARTED,
          startedAt,
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Ride cannot be started by this driver or is not accepted',
        );
      }

      return await this.prisma.rideRequest.findUniqueOrThrow({
        where: { id: rideId },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async cancel(actorUserId: number, rideId: number, actorRole: Role) {
    try {
      const cancelledAt = new Date();
      const where =
        actorRole === Role.USER
          ? {
              id: rideId,
              userId: actorUserId,
              status: { in: [RideStatus.PENDING, RideStatus.ACCEPTED] },
            }
          : {
              id: rideId,
              driverId: actorUserId,
              status: { in: [RideStatus.ACCEPTED, RideStatus.STARTED] },
            };
      const result = await this.prisma.rideRequest.updateMany({
        where,
        data: {
          status: RideStatus.CANCELLED,
          cancelledAt,
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Ride cannot be cancelled by this user or is no longer active',
        );
      }

      return await this.prisma.rideRequest.findUniqueOrThrow({
        where: { id: rideId },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  async findActiveForUser(userId: number) {
    return this.findActiveForActor(userId, Role.USER);
  }

  async findActiveForActor(userId: number, role: Role) {
    try {
      const where =
        role === Role.DRIVER
          ? {
              driverId: userId,
              status: {
                in: [RideStatus.ACCEPTED, RideStatus.STARTED],
              },
            }
          : {
              userId,
              status: {
                in: [
                  RideStatus.PENDING,
                  RideStatus.ACCEPTED,
                  RideStatus.STARTED,
                ],
              },
            };

      return await this.prisma.rideRequest.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throwIfDatabaseError(error);
    }
  }

  private calculatePrice(distanceMeters: number, durationSeconds: number) {
    const price =
      RidesService.BASE_PRICE +
      (distanceMeters / 1000) * RidesService.PRICE_PER_KM +
      (durationSeconds / 60) * RidesService.PRICE_PER_MINUTE;

    return Math.round(price * 100) / 100;
  }
}
