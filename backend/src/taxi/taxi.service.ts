import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.taxi.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        kennzeichen: true,
        model: true,
      },
    });
  }

  async setActive(userId: number, isActive: boolean) {
    return this.prisma.taxi.update({
      where: { userId },
      data: { isActive },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        kennzeichen: true,
        model: true,
      },
    });
  }

  async updateLocation(userId: number, lat: number, lng: number) {
    return this.prisma.taxi.update({
      where: { userId },
      data: { latitude: lat, longitude: lng },
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        kennzeichen: true,
        model: true,
      },
    });
  }
}
