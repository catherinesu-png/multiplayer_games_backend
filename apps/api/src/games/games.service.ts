import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/auth.types';
import { CreateGameDto, UpdateGameDto } from './game.dto';

@Injectable()
export class GamesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(currentUser: CurrentUser, dto: CreateGameDto) {
    return this.prisma.game.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        creatorUserId: currentUser.id,
        status: 'DRAFT',
      },
    });
  }

  async getById(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async update(id: string, currentUser: CurrentUser, dto: UpdateGameDto) {
    const game = await this.getById(id);
    if (game.creatorUserId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('You do not own this game');
    }
    return this.prisma.game.update({ where: { id }, data: dto });
  }
}
