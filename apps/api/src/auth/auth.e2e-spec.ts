import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

type TestUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'PLAYER' | 'CREATOR' | 'ADMIN';
  status: 'active';
  createdAt: Date;
};

type TestGame = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  creatorUserId: string;
  status: string;
};

const users: TestUser[] = [
  { id: 'player-id', email: 'player@test.local', displayName: 'Player', avatarUrl: null, role: 'PLAYER', status: 'active', createdAt: new Date(1) },
  { id: 'creator-id', email: 'creator@test.local', displayName: 'Creator', avatarUrl: null, role: 'CREATOR', status: 'active', createdAt: new Date(2) },
  { id: 'other-creator-id', email: 'other-creator@test.local', displayName: 'Other Creator', avatarUrl: null, role: 'CREATOR', status: 'active', createdAt: new Date(3) },
  { id: 'admin-id', email: 'admin@test.local', displayName: 'Admin', avatarUrl: null, role: 'ADMIN', status: 'active', createdAt: new Date(4) },
];
const games: TestGame[] = [];

const prismaMock = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $queryRaw: async () => [{ result: 1 }],
  user: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
      users.find((user) => (where.id ? user.id === where.id : user.email === where.email)) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<TestUser> }) => {
      const user = users.find((candidate) => candidate.id === where.id)!;
      Object.assign(user, data);
      return user;
    },
    findMany: async () => users,
  },
  game: {
    create: async ({ data }: { data: Omit<TestGame, 'id'> }) => {
      const game = { ...data, id: `game-${games.length + 1}` };
      games.push(game);
      return game;
    },
    findUnique: async ({ where }: { where: { id: string } }) => games.find((game) => game.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<TestGame> }) => {
      const game = games.find((candidate) => candidate.id === where.id)!;
      Object.assign(game, data);
      return game;
    },
  },
};

describe('Milestone 1 identity and authorization HTTP flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.DEV_AUTH_KEY = 'test-development-key';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, developmentKey: 'test-development-key' })
      .expect(201);
    return response.body.accessToken as string;
  }

  it('logs in and establishes current user server-side', async () => {
    const token = await login('player@test.local');
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe('player-id');
    expect(response.body.role).toBe('PLAYER');
  });

  it('rejects unauthenticated requests and invalid login credentials', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@test.local', developmentKey: 'wrong-key' })
      .expect(401);
  });

  it('allows a user to update only their own profile', async () => {
    const token = await login('player@test.local');
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated Player', userId: 'admin-id' })
      .expect(400);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated Player' })
      .expect(200);

    expect(response.body.id).toBe('player-id');
    expect(response.body.displayName).toBe('Updated Player');
  });

  it('enforces creator authorization and game ownership', async () => {
    const playerToken = await login('player@test.local');
    await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ slug: 'player-game', name: 'Player Game' })
      .expect(403);

    const creatorToken = await login('creator@test.local');
    const created = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ slug: 'creator-game', name: 'Creator Game', creatorUserId: 'admin-id' })
      .expect(400);

    expect(created.body).toBeDefined();

    const game = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ slug: 'creator-game', name: 'Creator Game' })
      .expect(201);

    expect(game.body.creatorUserId).toBe('creator-id');

    const otherCreatorToken = await login('other-creator@test.local');
    await request(app.getHttpServer())
      .patch(`/games/${game.body.id}`)
      .set('Authorization', `Bearer ${otherCreatorToken}`)
      .send({ name: 'Hijacked Game' })
      .expect(403);
  });

  it('allows admins to access admin endpoints and modify any game', async () => {
    const adminToken = await login('admin@test.local');
    const game = games[0];

    const usersResponse = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(usersResponse.body).toHaveLength(4);

    const updated = await request(app.getHttpServer())
      .patch(`/games/${game.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Updated Game' })
      .expect(200);
    expect(updated.body.name).toBe('Admin Updated Game');

    const creatorToken = await login('creator@test.local');
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(403);
  });
});
