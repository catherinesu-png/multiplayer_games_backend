import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { RolesGuard } from './auth/roles.guard';
import { AdminController } from './admin/admin.controller';
import { GamesController } from './games/games.controller';
import { GamesService } from './games/games.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { GameVersionsController } from './games/game-versions.controller';
import { VersionsService } from './games/versions.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, AuthController, UsersController, GamesController, GameVersionsController, AdminController],
  providers: [AppService, AuthService, AuthGuard, RolesGuard, UsersService, GamesService, VersionsService],
})
export class AppModule {}
