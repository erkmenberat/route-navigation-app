import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  kennzeichen!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;
}
