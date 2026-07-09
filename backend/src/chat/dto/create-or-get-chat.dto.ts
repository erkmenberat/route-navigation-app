import { IsInt, IsPositive } from 'class-validator';

export class CreateOrGetChatDto {
  @IsInt()
  @IsPositive()
  userId!: number;
}
