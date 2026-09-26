import 'dotenv/config';
import { PrismaClient } from '../apps/api/src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      email: 'admin@demo.local',
      displayName: 'Admin Demo User',
      role: 'ADMIN',
    },
  });

  const playerA = await prisma.user.upsert({
    where: { email: 'player-a@demo.local' },
    update: {},
    create: {
      email: 'player-a@demo.local',
      displayName: 'Player Demo User A',
      role: 'PLAYER',
    },
  });

  const playerB = await prisma.user.upsert({
    where: { email: 'player-b@demo.local' },
    update: {},
    create: {
      email: 'player-b@demo.local',
      displayName: 'Player Demo User B',
      role: 'PLAYER',
    },
  });

  const game = await prisma.game.upsert({
    where: { slug: 'tic-tac-toe' },
    update: {},
    create: {
      slug: 'tic-tac-toe',
      name: 'Tic-Tac-Toe',
      description: 'Classic 3x3 game',
      creatorUserId: admin.id,
      status: 'DRAFT',
    },
  });

  const publishedVersion = await prisma.gameVersion.upsert({
    where: { gameId_versionNumber: { gameId: game.id, versionNumber: 1 } },
    update: {},
    create: {
      gameId: game.id,
      versionNumber: 1,
      status: 'PUBLISHED',
      manifest: {
        gameKey: 'tic-tac-toe',
        version: 1,
        name: 'Tic-Tac-Toe',
        description: 'Classic 3x3 game',
        players: { allowedCounts: [2] },
        capabilities: {
          bots: true,
          midMatchJoin: false,
          spectators: true,
          passAndPlay: true,
          offline: true,
        },
        engine: { key: 'tictactoe', version: 1 },
        locales: ['en'],
      },
      rulesArtifact: 'rules.tictactoe.json',
      uiArtifact: 'ui.tictactoe.json',
      assetArtifact: 'assets.tictactoe.zip',
      publishedAt: new Date(),
    },
  });

  const match = await prisma.match.create({
    data: {
      gameVersionId: publishedVersion.id,
      status: 'LOBBY',
      mode: 'REAL_TIME',
      version: 0,
      state: { board: Array(9).fill(null) },
      initialState: { board: Array(9).fill(null) },
      turnPlayerIndex: 0,
      ownerUserId: admin.id,
      joinPolicy: 'OPEN',
      players: {
        create: [
          { playerIndex: 0, userId: playerA.id, kind: 'HUMAN', status: 'ACTIVE' },
          { playerIndex: 1, userId: playerB.id, kind: 'HUMAN', status: 'ACTIVE' },
        ],
      },
    },
  });

  await prisma.matchEvent.create({
    data: {
      matchId: match.id,
      sequence: 1,
      type: 'MATCH_CREATED',
      payload: { matchId: match.id },
    },
  });

  console.log('Seed complete:', { admin: admin.email, playerA: playerA.email, playerB: playerB.email, gameId: game.id });
}

main().finally(async () => {
  await prisma.$disconnect();
});
