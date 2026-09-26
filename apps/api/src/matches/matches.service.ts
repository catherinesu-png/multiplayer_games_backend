import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameEngineError, GameEngineRegistry } from '@game-platform/game-engine';
import { GameRuntime, GameRuntimeError, RuntimeGameVersion } from '@game-platform/game-runtime';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/auth.types';
import { CreateMatchDto } from './match.dto';
import { SubmitMoveDto } from './move.dto';
import { GAME_ENGINE_REGISTRY } from './engine-registry.provider';

@Injectable()
export class MatchesService {
  private readonly runtime: GameRuntime;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GAME_ENGINE_REGISTRY) registry: GameEngineRegistry,
  ) {
    this.runtime = new GameRuntime(registry);
  }

  async create(currentUser: CurrentUser, dto: CreateMatchDto) {
    const version = await this.prisma.gameVersion.findUnique({
      where: { id: dto.gameVersionId },
      include: { game: true },
    });
    if (!version) throw new NotFoundException('Game version not found');
    if (version.status !== 'PUBLISHED') {
      throw new ConflictException('Only published game versions can create matches');
    }

    const runtimeVersion = this.toRuntimeVersion(version);
    const initialState = this.runtime.createInitialState(runtimeVersion, this.getRuntimeConfig(version.manifest));
    const match = await this.prisma.match.create({
      data: {
        gameVersionId: version.id,
        mode: dto.mode,
        joinPolicy: dto.joinPolicy ?? 'OPEN',
        status: 'LOBBY',
        version: 0,
        state: initialState as Prisma.InputJsonValue,
        initialState: initialState as Prisma.InputJsonValue,
        turnPlayerIndex: 0,
        ownerUserId: currentUser.id,
        players: {
          create: {
            playerIndex: 0,
            userId: currentUser.id,
            kind: 'HUMAN',
            status: 'JOINED',
            joinedAt: new Date(),
          },
        },
        events: {
          create: {
            sequence: 1,
            type: 'MATCH_CREATED',
            actorUserId: currentUser.id,
            versionBefore: 0,
            versionAfter: 0,
            payload: { gameVersionId: version.id },
          },
        },
      },
      include: this.matchInclude(),
    });
    return match;
  }

  async getById(id: string, currentUser: CurrentUser) {
    const match = await this.prisma.match.findUnique({ where: { id }, include: this.matchInclude() });
    if (!match) throw new NotFoundException('Match not found');
    if (match.hidden && match.ownerUserId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  me(currentUser: CurrentUser) {
    return this.prisma.match.findMany({
      where: {
        hidden: false,
        players: { some: { userId: currentUser.id, status: { not: 'LEFT' } } },
      },
      include: this.matchInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async join(id: string, currentUser: CurrentUser) {
    const match = await this.getById(id, currentUser);
    this.assertLobby(match);
    if (match.joinPolicy !== 'OPEN') throw new ForbiddenException('This match is invite-only');
    if (match.players.some((player) => player.userId === currentUser.id && player.status !== 'LEFT')) {
      throw new ConflictException('User is already in this match');
    }

    const maximumPlayers = this.getMaximumPlayers(match.gameVersion.manifest);
    const activePlayers = match.players.filter((player) => player.status !== 'LEFT');
    if (activePlayers.length >= maximumPlayers) throw new ConflictException('Match has no available seats');

    return this.prisma.matchPlayer.create({
      data: {
        matchId: id,
        playerIndex: activePlayers.length,
        userId: currentUser.id,
        kind: 'HUMAN',
        status: 'JOINED',
        joinedAt: new Date(),
      },
    });
  }

  async start(id: string, currentUser: CurrentUser) {
    const match = await this.getById(id, currentUser);
    this.assertOwner(match, currentUser);
    this.assertLobby(match);
    const requiredPlayers = this.getRequiredPlayers(match.gameVersion.manifest);
    const activePlayers = match.players.filter((player) => player.status !== 'LEFT');
    if (activePlayers.length !== requiredPlayers) {
      throw new ConflictException(`Match requires exactly ${requiredPlayers} players`);
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.matchPlayer.updateMany({ where: { matchId: id }, data: { status: 'ACTIVE' } });
      return transaction.match.update({
        where: { id },
        data: {
          status: 'ONGOING',
          startedAt: new Date(),
          turnPlayerIndex: 0,
          events: {
            create: {
              sequence: match.events.length + 1,
              type: 'MATCH_STARTED',
              actorUserId: currentUser.id,
              versionBefore: 0,
              versionAfter: 0,
              payload: { playerCount: activePlayers.length },
            },
          },
        },
        include: this.matchInclude(),
      });
    });
  }

  async submitMove(id: string, currentUser: CurrentUser, dto: SubmitMoveDto) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Match" WHERE "id" = ${id} FOR UPDATE`;

      const match = await transaction.match.findUnique({
        where: { id },
        include: this.matchInclude(),
      });
      if (!match) throw new NotFoundException('Match not found');

      const existingMove = await transaction.move.findUnique({
        where: { matchId_clientMoveId: { matchId: id, clientMoveId: dto.clientMoveId } },
      });
      if (existingMove) {
        return this.moveResponse(match, existingMove.playerIndex, existingMove.versionAfter, currentUser, existingMove.accepted);
      }

      if (match.status !== 'ONGOING') throw new ConflictException('Match is not ongoing');
      const player = match.players.find(
        (candidate) => candidate.userId === currentUser.id && candidate.status === 'ACTIVE',
      );
      if (!player) throw new ForbiddenException('User is not an active match player');
      if (match.turnPlayerIndex !== player.playerIndex) throw new ConflictException('It is not your turn');
      if (match.version !== dto.expectedVersion) {
        throw new ConflictException(`Expected match version ${dto.expectedVersion}, current version is ${match.version}`);
      }

      const runtimeVersion = this.toRuntimeVersion(match.gameVersion);
      let transition;
      try {
        this.runtime.validateAction(runtimeVersion, match.state, dto.move, player.playerIndex);
        transition = this.runtime.applyAction(runtimeVersion, match.state, dto.move, player.playerIndex);
      } catch (error) {
        if (error instanceof GameEngineError) {
          throw new BadRequestException({ message: error.message, code: error.code });
        }
        if (error instanceof GameRuntimeError) {
          throw new ConflictException(error.message);
        }
        throw error;
      }

      const nextVersion = match.version + 1;
      const nextStatus = transition.isGameOver ? 'OVER' : 'ONGOING';
      const nextTurn = transition.nextPlayerIndex;
      const stateAfter = transition.state as Prisma.InputJsonValue;
      const action = dto.move as Prisma.InputJsonValue;
      const result = transition.result as Prisma.InputJsonValue;
      const sequence = match.events.length + 1;

      await transaction.move.create({
        data: {
          matchId: id,
          sequence: nextVersion,
          versionBefore: match.version,
          versionAfter: nextVersion,
          playerIndex: player.playerIndex,
          userId: currentUser.id,
          clientMoveId: dto.clientMoveId,
          action,
          stateAfter,
          accepted: true,
        },
      });
      await transaction.matchEvent.create({
        data: {
          matchId: id,
          sequence,
          type: 'MOVE_ACCEPTED',
          actorUserId: currentUser.id,
          playerIndex: player.playerIndex,
          versionBefore: match.version,
          versionAfter: nextVersion,
          action,
          payload: result,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          type: 'MATCH_MOVE_ACCEPTED',
          aggregateType: 'MATCH',
          aggregateId: id,
          payload: {
            matchId: id,
            version: nextVersion,
            playerIndex: player.playerIndex,
            result,
          },
        },
      });
      const updatedMatch = await transaction.match.update({
        where: { id },
        data: {
          state: stateAfter,
          version: nextVersion,
          turnPlayerIndex: nextTurn,
          status: nextStatus,
          endedAt: transition.isGameOver ? new Date() : null,
        },
        include: this.matchInclude(),
      });

      return {
        accepted: true,
        version: nextVersion,
        state: transition.state,
        playerView: this.runtime.getPlayerView(runtimeVersion, transition.state, player.playerIndex),
        turn: nextTurn,
        status: nextStatus,
        result: transition.result,
        match: updatedMatch,
      };
    });
  }

  private moveResponse(
    match: any,
    playerIndex: number,
    version: number,
    currentUser: CurrentUser,
    accepted: boolean,
  ) {
    const runtimeVersion = this.toRuntimeVersion(match.gameVersion);
    return {
      accepted,
      version,
      state: match.state,
      playerView: this.runtime.getPlayerView(runtimeVersion, match.state, playerIndex),
      turn: match.turnPlayerIndex,
      status: match.status,
      result: this.runtime.getGameResult(runtimeVersion, match.state),
      matchId: match.id,
      userId: currentUser.id,
    };
  }

  async leave(id: string, currentUser: CurrentUser) {
    const match = await this.getById(id, currentUser);
    if (!match.players.some((player) => player.userId === currentUser.id && player.status !== 'LEFT')) {
      throw new ForbiddenException('User is not a match player');
    }
    if (match.status === 'OVER' || match.status === 'CANCELLED') {
      throw new ConflictException('Match is no longer active');
    }
    return this.prisma.matchPlayer.updateMany({
      where: { matchId: id, userId: currentUser.id },
      data: { status: 'LEFT', leftAt: new Date() },
    });
  }

  async cancel(id: string, currentUser: CurrentUser) {
    const match = await this.getById(id, currentUser);
    this.assertOwner(match, currentUser);
    if (match.status !== 'LOBBY' && match.status !== 'ONGOING') {
      throw new ConflictException('Only lobby or ongoing matches can be cancelled');
    }
    return this.prisma.match.update({
      where: { id },
      data: { status: 'CANCELLED', endedAt: new Date() },
      include: this.matchInclude(),
    });
  }

  async hide(id: string, currentUser: CurrentUser) {
    const match = await this.getById(id, currentUser);
    this.assertOwner(match, currentUser);
    return this.prisma.match.update({ where: { id }, data: { hidden: true } });
  }

  private assertLobby(match: { status: string }) {
    if (match.status !== 'LOBBY') throw new ConflictException('Match is not in the lobby');
  }

  private assertOwner(match: { ownerUserId: string | null }, currentUser: CurrentUser) {
    if (match.ownerUserId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Only the match owner can perform this action');
    }
  }

  private toRuntimeVersion(version: { id: string; gameId: string; status: string; engineKey: string; engineVersion: number; manifest: unknown }): RuntimeGameVersion {
    return {
      id: version.id,
      gameId: version.gameId,
      status: version.status as RuntimeGameVersion['status'],
      engineKey: version.engineKey,
      engineVersion: version.engineVersion,
      manifest: version.manifest,
    };
  }

  private getRuntimeConfig(manifest: Prisma.JsonValue): Record<string, unknown> {
    if (manifest && typeof manifest === 'object' && !Array.isArray(manifest) && 'config' in manifest) {
      const config = manifest.config;
      if (config && typeof config === 'object' && !Array.isArray(config)) return config as Record<string, unknown>;
    }
    return {};
  }

  private getRequiredPlayers(manifest: Prisma.JsonValue): number {
    const players = this.getManifestPlayers(manifest);
    const allowedCounts = players.allowedCounts;
    if (!Array.isArray(allowedCounts) || allowedCounts.length === 0) {
      throw new ConflictException('Game version does not define supported player counts');
    }
    const required = allowedCounts[0];
    if (typeof required !== 'number' || required < 1) throw new ConflictException('Invalid supported player count');
    return required;
  }

  private getMaximumPlayers(manifest: Prisma.JsonValue): number {
    const players = this.getManifestPlayers(manifest);
    const maximum = Math.max(...(Array.isArray(players.allowedCounts) ? players.allowedCounts.filter((count): count is number => typeof count === 'number') : []));
    if (!Number.isFinite(maximum)) throw new ConflictException('Game version does not define supported player counts');
    return maximum;
  }

  private getManifestPlayers(manifest: Prisma.JsonValue): Record<string, unknown> {
    if (manifest && typeof manifest === 'object' && !Array.isArray(manifest) && 'players' in manifest) {
      const players = manifest.players;
      if (players && typeof players === 'object' && !Array.isArray(players)) return players as Record<string, unknown>;
    }
    throw new ConflictException('Game version does not define players');
  }

  private matchInclude() {
    return {
      players: { orderBy: { playerIndex: 'asc' as const } },
      events: { orderBy: { sequence: 'asc' as const } },
      gameVersion: { include: { game: true } },
    };
  }
}
