import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/auth.types';
import { CreateGameVersionDto } from './version.dto';

@Injectable()
export class VersionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForGame(gameId: string, currentUser: CurrentUser) {
    await this.assertGameOwner(gameId, currentUser);
    return this.prisma.gameVersion.findMany({
      where: { gameId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async create(gameId: string, currentUser: CurrentUser, dto: CreateGameVersionDto) {
    await this.assertGameOwner(gameId, currentUser);
    const latest = await this.prisma.gameVersion.findFirst({
      where: { gameId },
      orderBy: { versionNumber: 'desc' },
    });

    return this.prisma.gameVersion.create({
      data: {
        gameId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        status: 'DRAFT',
        engineKey: dto.engineKey,
        engineVersion: dto.engineVersion,
        manifest: dto.manifest as Prisma.InputJsonValue,
        capabilities: dto.capabilities as Prisma.InputJsonValue,
        rulesArtifact: dto.rulesArtifact,
        uiArtifact: dto.uiArtifact,
        assetArtifact: dto.assetArtifact,
      },
    });
  }

  async getById(id: string, currentUser: CurrentUser) {
    const version = await this.prisma.gameVersion.findUnique({ where: { id }, include: { game: true } });
    if (!version) throw new NotFoundException('Game version not found');
    this.assertAccess(version.game.creatorUserId, currentUser);
    return version;
  }

  async publish(id: string, currentUser: CurrentUser) {
    const version = await this.getById(id, currentUser);
    if (version.status !== 'DRAFT') throw new ConflictException('Only draft versions can be published');
    return this.prisma.gameVersion.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async archive(id: string, currentUser: CurrentUser) {
    const version = await this.getById(id, currentUser);
    if (version.status !== 'PUBLISHED') throw new ConflictException('Only published versions can be archived');
    return this.prisma.gameVersion.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  private async assertGameOwner(gameId: string, currentUser: CurrentUser) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    this.assertAccess(game.creatorUserId, currentUser);
    return game;
  }

  private assertAccess(ownerId: string, currentUser: CurrentUser) {
    if (ownerId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('You do not own this game');
    }
  }
}