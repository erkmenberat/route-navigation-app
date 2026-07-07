import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RideStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { RidesService } from './rides.service';

describe('RidesService', () => {
  let service: RidesService;

  const prismaMock = {
    rideRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const createRideDto: CreateRideDto = {
    origin: 'Home',
    destination: 'Airport',
    startLat: 48.2082,
    startLong: 16.3738,
    finishLat: 48.1103,
    finishLong: 16.5697,
    distance: 18000,
    duration: 1500,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RidesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<RidesService>(RidesService);
  });

  describe('create', () => {
    it('creates a pending ride and calculates the price like RoutesService', async () => {
      const created = {
        id: 1,
        userId: 7,
        status: RideStatus.PENDING,
        ...createRideDto,
        price: 52.5,
      };
      prismaMock.rideRequest.create.mockResolvedValue(created);

      await expect(service.create(7, createRideDto)).resolves.toEqual(created);
      expect(prismaMock.rideRequest.create).toHaveBeenCalledWith({
        data: {
          userId: 7,
          status: RideStatus.PENDING,
          origin: createRideDto.origin,
          destination: createRideDto.destination,
          startLat: createRideDto.startLat,
          startLong: createRideDto.startLong,
          finishLat: createRideDto.finishLat,
          finishLong: createRideDto.finishLong,
          distance: createRideDto.distance,
          duration: createRideDto.duration,
          price: 52.5,
        },
      });
    });

    it('throws ServiceUnavailableException when the database is unreachable', async () => {
      prismaMock.rideRequest.create.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.create(7, createRideDto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('accept', () => {
    it('atomically accepts a pending ride for the driver', async () => {
      const accepted = {
        id: 11,
        driverId: 22,
        status: RideStatus.ACCEPTED,
      };
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.rideRequest.findUniqueOrThrow.mockResolvedValue(accepted);

      await expect(service.accept(22, 11)).resolves.toEqual(accepted);
      expect(prismaMock.rideRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 11, status: RideStatus.PENDING },
        data: {
          driverId: 22,
          status: RideStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
      expect(prismaMock.rideRequest.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 11 },
      });
    });

    it('rejects a double accept when the atomic update touches no rows', async () => {
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept(23, 11)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.rideRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('starts an accepted ride assigned to the same driver', async () => {
      const started = {
        id: 11,
        driverId: 22,
        status: RideStatus.STARTED,
      };
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.rideRequest.findUniqueOrThrow.mockResolvedValue(started);

      await expect(service.start(22, 11)).resolves.toEqual(started);
      expect(prismaMock.rideRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: 11,
          driverId: 22,
          status: RideStatus.ACCEPTED,
        },
        data: {
          status: RideStatus.STARTED,
          startedAt: expect.any(Date),
        },
      });
    });

    it('does not let another driver start an accepted ride', async () => {
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.start(99, 11)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.rideRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels an active ride for the requesting user or assigned driver', async () => {
      const cancelled = {
        id: 11,
        userId: 7,
        driverId: 22,
        status: RideStatus.CANCELLED,
      };
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.rideRequest.findUniqueOrThrow.mockResolvedValue(cancelled);

      await expect(service.cancel(7, 11)).resolves.toEqual(cancelled);
      expect(prismaMock.rideRequest.updateMany).toHaveBeenCalledWith({
        where: {
          id: 11,
          OR: [{ userId: 7 }, { driverId: 7 }],
          status: {
            in: [RideStatus.PENDING, RideStatus.ACCEPTED, RideStatus.STARTED],
          },
        },
        data: {
          status: RideStatus.CANCELLED,
          cancelledAt: expect.any(Date),
        },
      });
    });

    it('rejects cancel when the actor is not part of the ride', async () => {
      prismaMock.rideRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel(99, 11)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prismaMock.rideRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('findActiveForUser', () => {
    it('returns the newest active ride for a user or driver', async () => {
      const ride = { id: 3, status: RideStatus.STARTED };
      prismaMock.rideRequest.findFirst.mockResolvedValue(ride);

      await expect(service.findActiveForUser(7)).resolves.toEqual(ride);
      expect(prismaMock.rideRequest.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: 7 }, { driverId: 7 }],
          status: {
            in: [RideStatus.PENDING, RideStatus.ACCEPTED, RideStatus.STARTED],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
