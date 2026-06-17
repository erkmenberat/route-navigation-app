import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchUsersQueryDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  username!: string;
}
