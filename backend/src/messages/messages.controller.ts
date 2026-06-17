import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtRequest } from '../common/jwt-request.type';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  send(@Request() req: JwtRequest, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.user.userId, dto);
  }

  @Get(':chatId')
  findByChatId(
    @Request() req: JwtRequest,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.findByChatId(req.user.userId, chatId, query);
  }
}
