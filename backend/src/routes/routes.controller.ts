import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRouteDto } from './dto/create-route.dto';
import { GetRouteEstimateQueryDto } from './dto/get-route-estimate-query.dto';
import { GetRoutesQueryDto } from './dto/get-routes-query.dto';
import { RoutesService } from './routes.service';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('estimate')
  getEstimate(@Query() query: GetRouteEstimateQueryDto) {
    return this.routesService.estimate(query.distance, query.duration);
  }

  @Post('history')
  createHistory(
    @Request() req: { user: { userId: number; username: string } },
    @Body() dto: CreateRouteDto,
  ) {
    return this.routesService.create(req.user.userId, dto);
  }

  @Get('history')
  getHistory(
    @Request() req: { user: { userId: number; username: string } },
    @Query() query: GetRoutesQueryDto,
  ) {
    return this.routesService.findAllForUser(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  @Delete('history/:id')
  deleteHistory(
    @Request() req: { user: { userId: number; username: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.routesService.deleteForUser(req.user.userId, id);
  }
}
