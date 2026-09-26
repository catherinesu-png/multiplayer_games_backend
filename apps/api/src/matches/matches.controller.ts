import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './match.dto';
import { SubmitMoveDto } from './move.dto';

@Controller()
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(@Inject(MatchesService) private readonly matchesService: MatchesService) {}

  @Post('matches')
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateMatchDto) {
    return this.matchesService.create(user, dto);
  }

  @Get('matches/:id')
  getById(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.getById(id, user);
  }

  @Get('me/matches')
  me(@CurrentUser() user: CurrentUserType) {
    return this.matchesService.me(user);
  }

  @Post('matches/:id/join')
  join(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.join(id, user);
  }

  @Post('matches/:id/moves')
  submitMove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: SubmitMoveDto,
  ) {
    return this.matchesService.submitMove(id, user, dto);
  }

  @Post('matches/:id/start')
  start(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.start(id, user);
  }

  @Post('matches/:id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.leave(id, user);
  }

  @Post('matches/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.cancel(id, user);
  }

  @Post('matches/:id/hide')
  hide(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.matchesService.hide(id, user);
  }
}
