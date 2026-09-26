# Architecture

The backend uses a modular monolith pattern:

- HTTP controllers delegate to application services.
- Domain logic is kept in the engine layer and other services.
- Prisma persists state in PostgreSQL.
- Redis and BullMQ support notifications and background jobs.
- Next.js BackOffice reads the backend through authenticated API endpoints.

This keeps the core architecture universal while the game rules remain pluggable via the engine registry.
