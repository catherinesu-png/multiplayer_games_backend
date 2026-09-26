import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/auth.types';
import { UpdateProfileDto } from './profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  async updateProfile(currentUser: CurrentUser, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: dto,
    });
    return this.toProfile(user);
  }

  private toProfile(user: { id: string; email: string; displayName: string; avatarUrl: string | null; role: string }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
