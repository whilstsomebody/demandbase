# Resource Sharing & Borrow Platform

A community platform for lending and borrowing belongings — physical (bat, racket, laptop) or digital (notes, study guides) — either by searching the catalog and messaging an owner directly, or by posting `I need {requirement}, is anyone up for it?` to the community feed to broadcast the request to matching item owners.

## Stack

- **Backend**: NestJS (TypeScript, ESM) + Prisma + PostgreSQL
- **Queues/scheduling**: Redis + BullMQ (delayed jobs), RabbitMQ (inter-module event bus)
- **Files**: Cloudinary (item photos + digital item files, signed/expiring URLs)
- **Email**: Resend
- **Frontend**: Next.js (TypeScript)

## Project structure

```
backend/    NestJS API (modules: auth, catalog, community-feed, matching, request-offer-loan, reviews, moderation)
frontend/   Next.js web app
docker-compose.yml   Local Postgres, Redis, RabbitMQ
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres/Redis/RabbitMQ)

## Setup

1. Start local infrastructure:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd backend
   cp .env.example .env   # fill in CLOUDINARY_* and RESEND_API_KEY if testing those features
   npm install
   npx prisma migrate dev
   npm run start:dev
   ```
   API runs on `http://localhost:3001`.
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App runs on `http://localhost:3000`.

## Status

Phase 0 (foundations) in progress: monorepo scaffolded, Postgres/Redis/RabbitMQ running locally, Prisma schema v1 (users, categories, category_synonyms, items, item_photos, item_files, availabilities) migrated.
