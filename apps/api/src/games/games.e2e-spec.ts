import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

type User = { id: string; email: string; displayName: string; avatarUrl: null; role: 'CREATOR' | 'ADMIN'; status: 'active'; createdAt: Date };
type Game = { id: string; slug: string; name: string; description: string | null; creatorUserId: string; status: string; versions?: Version[] };
type Version = {
  id: string;
  gameId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  engineKey: string;
  engineVersion: number;
  manifest: Record<string, unknown>;
  capabilities: Record<string, unknown>;
  rulesArtifact: string | null;
  uiArtifact: string | null;
  assetArtifact: string | null;
  publishedAt: Date | null;
  game?: Game;
};

const users: User[] = [
  { id: 'creator-id', email: 'creator@versions.test', displayName: 'Creator', avatarUrl: null, role: 'CREATOR', status: 'active', createdAt: new Date(1) },
  { id: 'other-creator-id', email: 'other-creator@versions.test', displayName: 'Other Creator', avatarUrl: null, role: 'CREATOR', status: 'active', createdAt: new Date(2) },
  { id: 'admin-id', email: 'admin@versions.test', displayName: 'Admin', avatarUrl: null, role: 'ADMIN', status: 'active', createdAt: new Date(3) },
];
const games: Game[] = [];
const versions: Version[] = [];

const prismaMock = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $queryRaw: async () => [{ result: 1 }],
  user: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => users.find((user) => (where.id ? user.id === where.id : user.email === where.email)) ?? null,
  },
  game: {
    findMany: async () => games.map((game) => ({ ...game, versions: versions.filter((version) => version.gameId === game.id) })),
    findUnique: async ({ where }: { where: { id: string } }) => {
      const game = games.find((candidate) => candidate.id === where.id);
      return game ? { ...game, versions: versions.filter((version) => version.gameId === game.id) } : null;
    },
    create: async ({ data }: { data: Omit<Game, 'id' | 'versions'> }) => {
      const game = { ...data, id: `game-${games.length + 1}` };
      games.push(game);
      return game;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Game> }) => {
      const game = games.find((candidate) => candidate.id === where.id)!;
      Object.assign(game, data);
      return game;
    },
  },
  gameVersion: {
    findMany: async ({ where }: { where: { gameId: string } }) => versions.filter((version) => version.gameId === where.gameId),
    findFirst: async ({ where }: { where: { gameId: string } }) =>
      versions.filter((version) => version.gameId === where.gameId).sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null,
    findUnique: async ({ where }: { where: { id: string } }) => {
      const version = versions.find((candidate) => candidate.id === where.id);
      return version ? { ...version, game: games.find((game) => game.id === version.gameId) } : null;
    },
    create: async ({ data }: { data: Omit<Version, 'id' | 'publishedAt' | 'game'> }) => {
      const version = { ...data, id: `version-${versions.length + 1}`, publishedAt: null };
      versions.push(version);
      return version;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Version> }) => {
      const version = versions.find((candidate) => candidate.id === where.id)!;
      Object.assign(version, data);
      return version;
    },
  },
};

describe('Milestone 2 games and game versions HTTP flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_SECRET = 'versions-test-secret';
    process.env.DEV_AUTH_KEY = 'versions-test-key';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, developmentKey: 'versions-test-key' })
      .expect(201);
    return response.body.accessToken as string;
  }

  it('creates multiple games, versions, and enforces version lifecycle rules', async () => {
    const creatorToken = await login('creator@versions.test');
    const otherCreatorToken = await login('other-creator@versions.test');

    const first = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ slug: 'game-a', name: 'Game A' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ slug: 'game-b', name: 'Game B' })
      .expect(201);

    expect(first.body.id).not.toBe(second.body.id);
    await request(app.getHttpServer())
      .patch(`/games/${first.body.id}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ name: 'Game A Draft Edit' })
      .expect(200);

    const version = await request(app.getHttpServer())
      .post(`/games/${first.body.id}/versions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        engineKey: 'tic-tac-toe',
        engineVersion: 1,
        manifest: { name: 'Game A', rules: { boardSize: 3 } },
        capabilities: { bots: true, spectators: true },
        rulesArtifact: 'rules.game-a.json',
      })
      .expect(201);

    expect(version.body.status).toBe('DRAFT');
    expect(version.body.versionNumber).toBe(1);
    expect(version.body.engineKey).toBe('tic-tac-toe');

    await request(app.getHttpServer())
      .get(`/games/${first.body.id}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200)
      .expect((response) => expect(response.body.versions).toHaveLength(1));

    await request(app.getHttpServer())
      .get(`/games/${first.body.id}/versions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200)
      .expect((response) => expect(response.body[0].id).toBe(version.body.id));

    const published = await request(app.getHttpServer())
      .post(`/game-versions/${version.body.id}/publish`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(201);
    expect(published.body.status).toBe('PUBLISHED');

    await request(app.getHttpServer())
      .patch(`/game-versions/${version.body.id}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ engineKey: 'changed' })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/game-versions/${version.body.id}/publish`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(409);

    const archived = await request(app.getHttpServer())
      .post(`/game-versions/${version.body.id}/archive`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(201);
    expect(archived.body.status).toBe('ARCHIVED');

    await request(app.getHttpServer())
      .post(`/games/${first.body.id}/versions`)
      .set('Authorization', `Bearer ${otherCreatorToken}`)
      .send({
        engineKey: 'other',
        engineVersion: 1,
        manifest: {},
        capabilities: {},
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/games/${first.body.id}`)
      .set('Authorization', `Bearer ${otherCreatorToken}`)
      .send({ name: 'Unauthorized Edit' })
      .expect(403);
  });
});
