import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('users')
  listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, displayName: true, role: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
