# Game Platform Backend + BackOffice

This monorepo contains a NestJS API, Prisma/PostgreSQL data layer, Redis/BullMQ queue support, a pluggable game-engine package, and a Next.js BackOffice dashboard for the shared turn-based game platform.

## Repository structure

- apps/api — NestJS backend API
- apps/backoffice — Next.js admin frontend
- packages/contracts — shared API contract types
- packages/game-runtime — generic runtime layer for game execution
- packages/game-engine — engine abstraction and registry
- packages/example-engines/tictactoe — developer-authored reference implementation
- prisma — Prisma schema and seed script
- infra/docker-compose.yml — PostgreSQL, Redis, and MinIO
- docs — architecture and operational docs

## Architectural distinction

### Developer code
- Game runtime and engine interfaces
- Match runtime and move processing
- Notification infrastructure
- Reference/example engines such as Tic-Tac-Toe

### Runtime data
- Users
- Games
- GameVersions
- Matches
- MatchPlayers
- Moves
- MatchEvents
- Notifications
- Generated game packages and artifacts

User-created games are stored as runtime records in PostgreSQL and associated object-storage artifacts. They do not require new repository directories or application code changes.

## Quick start

1. Install dependencies:
   pnpm install
2. Configure the API environment:
   cp apps/api/.env.example apps/api/.env
3. Start infrastructure:
   docker compose -f infra/docker-compose.yml up -d
4. Prepare the database:
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
5. Start the API and BackOffice:
   pnpm dev

## Demo credentials

- Admin: admin@demo.local
- Player A: player-a@demo.local
- Player B: player-b@demo.local

## Local URLs

- API: http://localhost:3000
- BackOffice: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO: http://localhost:9001

## Architecture diagram

```text
                   GAMEBUILDER
                       │
                       │ creates package
                       ▼
             ┌────────────────────┐
             │      BACKEND       │
             │                    │
             │ Game / GameVersion │
             │ Match / Move       │
             │ Sync / Events      │
             └─────────┬──────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
         PostgreSQL        Object Storage
              │
              │
              ▼
         Match Runtime
              │
              ▼
       Web / Android /
       iOS / React Native

Developer-owned source:

packages/
├── contracts/
├── game-runtime/
├── game-engine/
└── example-engines/
    └── tictactoe/
```

This project keeps Tic-Tac-Toe as a developer-authored reference engine rather than the only or implicit model of a game.
