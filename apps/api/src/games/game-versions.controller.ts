import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VersionsService } from './versions.service';

@Controller('game-versions')
@UseGuards(AuthGuard)
export class GameVersionsController {
  constructor(@Inject(VersionsService) private readonly versionsService: VersionsService) {}

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.versionsService.getById(id, user);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  publish(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.versionsService.publish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  archive(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.versionsService.archive(id, user);
  }
}