import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtRequest } from '../common/jwt-request.type';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req: JwtRequest) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('search')
  searchUsers(@Request() req: JwtRequest, @Query() query: SearchUsersQueryDto) {
    return this.usersService.searchByName(req.user.userId, query);
  }
}
