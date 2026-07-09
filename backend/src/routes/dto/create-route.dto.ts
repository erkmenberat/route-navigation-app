import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRouteDto {
  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsNumber()
  @IsNotEmpty()
  startLat!: number;

  @IsNumber()
  @IsNotEmpty()
  startLong!: number;

  @IsNumber()
  @IsNotEmpty()
  finishLat!: number;

  @IsNumber()
  @IsNotEmpty()
  finishLong!: number;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  finishAt?: string;

  @IsNumber()
  @IsNotEmpty()
  distance!: number;

  @IsInt()
  @IsNotEmpty()
  duration!: number;
}
