import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  @IsPositive()
  chatId!: number;

  @IsNotEmpty()
  @IsString()
  content!: string;
}
