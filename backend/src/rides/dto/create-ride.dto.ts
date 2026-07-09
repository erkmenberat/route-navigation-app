import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRideDto {
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

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

  @IsNumber()
  @IsNotEmpty()
  distance!: number;

  @IsInt()
  @IsNotEmpty()
  duration!: number;
}
