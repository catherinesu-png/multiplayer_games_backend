import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { assertNoIdentityFields } from '../auth/assert-no-identity-fields';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { UpdateProfileDto } from './profile.dto';
import { UsersService } from './users.service';

@Controller('users/me')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateProfileDto) {
    assertNoIdentityFields(dto, ['id', 'userId', 'role']);
    return this.usersService.updateProfile(user, dto);
  }
}
