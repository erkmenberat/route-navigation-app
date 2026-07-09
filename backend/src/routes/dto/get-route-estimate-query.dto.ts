import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class GetRouteEstimateQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration!: number;
}
