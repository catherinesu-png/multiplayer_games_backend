import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { assertNoIdentityFields } from '../auth/assert-no-identity-fields';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateGameDto, UpdateGameDto } from './game.dto';
import { GamesService } from './games.service';
import { VersionsService } from './versions.service';
import { CreateGameVersionDto } from './version.dto';

@Controller('games')
@UseGuards(AuthGuard)
export class GamesController {
  constructor(
    @Inject(GamesService) private readonly gamesService: GamesService,
    @Inject(VersionsService) private readonly versionsService: VersionsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserType) {
    return this.gamesService.list(user);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateGameDto) {
    assertNoIdentityFields(dto, ['id', 'creatorUserId', 'ownerUserId']);
    return this.gamesService.create(user, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.gamesService.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateGameDto,
  ) {
    assertNoIdentityFields(dto, ['id', 'creatorUserId', 'ownerUserId']);
    return this.gamesService.update(id, user, dto);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.versionsService.listForGame(id, user);
  }

  @Post(':id/versions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  createVersion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateGameVersionDto,
  ) {
    assertNoIdentityFields(dto, ['id', 'gameId', 'creatorUserId']);
    return this.versionsService.create(id, user, dto);
  }
}
