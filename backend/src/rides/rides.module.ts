import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RidesService } from './rides.service';

@Module({
  imports: [PrismaModule],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
