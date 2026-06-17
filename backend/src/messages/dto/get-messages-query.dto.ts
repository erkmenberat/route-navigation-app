import { IsDateString, IsOptional } from 'class-validator';

export class GetMessagesQueryDto {
  @IsOptional()
  @IsDateString()
  before?: string;
}
