import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class RideIdDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  rideId!: number;
}
