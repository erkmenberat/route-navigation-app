import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtRequest } from '../common/jwt-request.type';
import { ChatService } from './chat.service';
import { CreateOrGetChatDto } from './dto/create-or-get-chat.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create-or-get')
  createOrGet(@Request() req: JwtRequest, @Body() dto: CreateOrGetChatDto) {
    return this.chatService.createOrGet(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: JwtRequest) {
    return this.chatService.findAllForUser(req.user.userId);
  }
}
