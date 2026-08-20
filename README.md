# E-Learning Backend

A modular RESTful backend for an e-learning platform built with **NestJS, TypeScript, PostgreSQL, Prisma, Redis, and BullMQ**.

The project focuses on secure authentication, role-based access control, course management, enrollment, learning progress, reviews, caching, and asynchronous notifications.

## Features

### Authentication & Authorization

* User registration and login
* Password hashing with bcrypt
* JWT access and refresh tokens
* Refresh-token rotation and revocation
* Logout support
* Role-based access control
* Roles:

  * Student
  * Instructor
  * Admin
* Protected routes
* Startup environment validation

### Courses

* Create, update, publish, and delete courses
* Course ownership authorization
* Public access to published courses only
* Pagination
* Search
* Category filtering
* Sections and lessons management
* Section reordering
* Lesson reordering

### Enrollment

* Enroll in published courses
* Database-level duplicate enrollment protection
* User enrollment listing
* Enrollment ownership checks

### Progress Tracking

* Lesson progress updates
* Course completion calculation
* Enrollment validation before progress updates
* Progress cannot move backwards
* Course completion detection
* Course completion notifications

### Reviews

* Course reviews and ratings
* Review ownership validation
* Rating validation

### Redis

Redis is used for:

* Course caching
* Notification caching
* Cache invalidation

### Background Processing

BullMQ is used for asynchronous notification processing.

Notification jobs include:

* Retry support
* Exponential backoff
* Failed job handling
* Worker logging
* Completion and failure tracking

### Security

* Global request validation
* JWT authentication
* Role guards
* Rate limiting
* Helmet
* CORS
* Environment variable validation
* No hardcoded secrets

## Architecture

The application uses a modular NestJS architecture.

```text
src/
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── types/
│   ├── prisma.service.ts
│   └── redis.service.ts
│
├── config/
│   └── env.validation.ts
│
├── modules/
│   ├── auth/
│   ├── courses/
│   ├── enrollments/
│   ├── notifications/
│   ├── progress/
│   ├── reviews/
│   └── users/
│
└── main.ts
```

## Tech Stack

* Node.js
* TypeScript
* NestJS
* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* JWT
* Swagger / OpenAPI
* Jest
* Docker
* Docker Compose
* GitHub Actions

## Requirements

Before running the project locally, make sure you have:

* Node.js 20+
* npm
* PostgreSQL
* Redis
* Docker (optional if running PostgreSQL/Redis locally)

## Environment Variables

Create a `.env` file based on `.env.example`.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elearning?schema=public"

JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"

JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

REDIS_URL="redis://localhost:6379"
PORT=3000
```

Never commit `.env`.

## Installation

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Seed the database:

```bash
npm run prisma:seed
```

## Running with Docker

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Then run the application:

```bash
npm run start:dev
```

## Running the Application

Development:

```bash
npm run start:dev
```

Production build:

```bash
npm run build
```

Production:

```bash
npm run start:prod
```

## API Documentation

Swagger documentation is available at:

```text
http://localhost:3000/docs
```

## Testing

Run unit tests:

```bash
npm test
```

Run tests sequentially:

```bash
npx jest --runInBand
```

Run tests with coverage:

```bash
npm run test:cov
```

The current test suite covers critical flows including:

* Authentication
* Course access and ownership
* Enrollment
* Progress tracking
* Notifications

Current local verification:

* 5 test suites passing
* 10 tests passing
* TypeScript build passing
* ESLint passing

## Code Quality

Run ESLint:

```bash
npm run lint
```

Build the project:

```bash
npm run build
```

## Database

Prisma is used as the ORM with PostgreSQL.

The database contains entities for:

* Users
* Refresh tokens
* Courses
* Categories
* Sections
* Lessons
* Enrollments
* Lesson progress
* Reviews
* Notifications

The schema includes relationships, unique constraints, and indexes designed around the application's query patterns.

## CI

GitHub Actions is configured to validate the project automatically.

The CI pipeline is intended to run checks such as:

* Dependency installation
* TypeScript/build validation
* Automated tests

## Project Status

This is a backend portfolio project focused on demonstrating practical backend engineering patterns, including:

* Modular architecture
* Authentication and authorization
* Database design
* Caching
* Background processing
* Transactional business workflows
* Automated testing
* Containerized local infrastructure

Performance metrics and production-scale usage numbers are intentionally not claimed unless they have been measured through reproducible benchmarks.

## Future Improvements

Possible future improvements include:

* Full end-to-end test coverage
* Advanced search
* Observability and metrics
* Email notification adapters
* File/media storage integration
* Production deployment configuration
* Advanced analytics
* Payment integration
