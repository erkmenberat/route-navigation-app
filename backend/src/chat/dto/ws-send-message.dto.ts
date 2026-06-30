import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class WsSendMessageDto {
  @IsInt()
  @IsPositive()
  chatId!: number;

  @IsNotEmpty()
  @IsString()
  content!: string;
}
