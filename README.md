# E-Learning Platform Backend

A production-style REST API for an e-learning platform built with NestJS, TypeScript, PostgreSQL, Prisma and Redis.

> Portfolio project. Performance metrics are not claimed unless they are measured and reproducible.

## Features

- JWT authentication with access/refresh tokens
- Role-based access control (Student, Instructor, Admin)
- Course, section and lesson management
- Enrollment and progress tracking
- Course reviews and ratings
- Redis caching and notification cache invalidation
- BullMQ background notification jobs backed by Redis
- Rate limiting with NestJS Throttler
- Swagger/OpenAPI documentation
- PostgreSQL + Prisma migrations and seed data
- Docker Compose for app, PostgreSQL and Redis
- Unit-test foundation and GitHub Actions CI
- Helmet, CORS, validation and centralized guards

## Architecture

The application is intentionally modular rather than prematurely split into multiple deployables. Each domain is isolated into a NestJS module and communicates through services/repositories. Redis is used for caching and BullMQ-backed background notification jobs.

Domains:

- Auth
- Users/Admin
- Courses
- Enrollments
- Progress
- Reviews
- Notifications

## Tech Stack

Node.js, TypeScript, NestJS, PostgreSQL, Prisma, Redis, Docker, JWT, Swagger, Jest, GitHub Actions.

## Project Structure

```text
src/
  common/
    decorators/
    guards/
    prisma.service.ts
    redis.service.ts
  modules/
    auth/
    courses/
    enrollments/
    progress/
    reviews/
    notifications/
    users/
prisma/
test/
.github/workflows/
```

## Database Design

Core relations:

- User -> Courses (instructor)
- User -> Enrollments -> Course
- Course -> Sections -> Lessons
- User -> LessonProgress -> Lesson
- User -> Review -> Course
- User -> Notifications
- User -> RefreshTokens

Indexes are included for common access patterns such as role/status, course publication, enrollment lookups and progress queries.

## Getting Started

### 1. Clone and install

```bash
npm install
cp .env.example .env
```

### 2. Run infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Generate Prisma client and migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 4. Start the API

```bash
npm run start:dev
```

API: `http://localhost:3000/api`

Swagger: `http://localhost:3000/docs`

## Docker

Run the complete stack:

```bash
docker compose up --build
```

The container entrypoint deploys committed migrations before starting the API.

## Seed Accounts

The seed creates local development accounts:

- admin@example.com
- instructor@example.com
- student@example.com

Password for all seed accounts: `Password123!`

Use these credentials for local development only.

## API Examples

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","firstName":"Demo","lastName":"User","password":"Password123!"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"Password123!"}'
```

## Testing

```bash
npm test
npm run test:cov
npm run build
```

For a full end-to-end test suite, run the database and Redis and then execute the e2e configuration in `test/`.

## Performance Notes

The schema contains targeted indexes and the course list API uses pagination. Course details and notifications use Redis caching with invalidation on writes.

No throughput, user-count, latency-improvement or delivery-success claims are included without reproducible benchmarks.

## Future Improvements

- Extract notification processing into a dedicated queue worker using BullMQ
- Add object storage for course media
- Add payment integration
- Add advanced search
- Add observability (OpenTelemetry + metrics)
- Add complete e2e coverage
