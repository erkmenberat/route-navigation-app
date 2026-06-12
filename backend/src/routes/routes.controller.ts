import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('history')
  createHistory(
    @Request() req: { user: { userId: number; username: string } },
    @Body() dto: CreateRouteDto,
  ) {
    return this.routesService.create(req.user.userId, dto);
  }

  @Get('history')
  getHistory(@Request() req: { user: { userId: number; username: string } }) {
    return this.routesService.findAllForUser(req.user.userId);
  }
}
