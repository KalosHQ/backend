# Kalos Backend API

A modern NestJS backend application for Kalos, featuring authentication, user management, verification workflows, and file storage capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database](#database)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Local authentication (email/phone + password)
  - OAuth integration (Google, Facebook)
  - Role-based access control (USER, VENDOR, CREATOR, ADMIN)
  - Device tracking and management
- **User Management**
  - User registration and profile management
  - Email and phone verification
  - Style preferences
  - Profile pictures via S3 storage
- **Verification System**
  - Creator and vendor verification workflows
  - Document attachment support
  - Admin review functionality
- **Logging & Audit**
  - Authentication logging
  - Audit trail for admin actions
  - Device tracking
- **File Storage**
  - S3 integration for file uploads
  - Local storage fallback

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) 11.x with Fastify
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/) 7.x
- **Authentication**: Passport.js with JWT
- **Validation**: class-validator & class-transformer
- **Testing**: Jest
- **Package Manager**: pnpm

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher
- **pnpm**: v8.x or higher
- **PostgreSQL**: v14.x or higher
- **Git**: Latest version

You can install pnpm globally:

```bash
npm install -g pnpm
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/kalos-app/backend.git
cd backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. See [Configuration](#configuration) section for details.

### 4. Database Setup

```bash
# Generate Prisma Client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# (Optional) Seed the database
pnpm prisma db seed
```

### 5. Run the Application

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:4000` (or your configured PORT).

## 📁 Project Structure

```
kalos-backend/
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma           # Prisma schema definition
│   └── migrations/             # Migration history
├── src/
│   ├── config/                 # Configuration module
│   │   ├── config.module.ts
│   │   └── config.service.ts   # Centralized config management
│   ├── prisma/                 # Prisma service module
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/               # Authentication & authorization
│   │   │   └── v1/
│   │   │       ├── auth.controller.ts
│   │   │       ├── auth.service.ts
│   │   │       ├── auth.module.ts
│   │   │       ├── decorators/  # Custom decorators (@CurrentUser, etc.)
│   │   │       ├── dto/         # Data transfer objects
│   │   │       ├── guards/      # Auth guards (JWT, roles, etc.)
│   │   │       └── strategies/  # Passport strategies
│   │   ├── users/              # User management
│   │   │   └── v1/
│   │   ├── device/             # Device tracking
│   │   │   └── v1/
│   │   ├── verification/       # Verification workflows
│   │   │   └── v1/
│   │   ├── logging/            # Audit & auth logging
│   │   └── storage/            # File storage (S3/local)
│   ├── app.module.ts           # Root application module
│   └── main.ts                 # Application entry point
├── test/                       # E2E tests
├── generated/                  # Generated Prisma client (git ignored)
├── .env.example               # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

### Module Organization

- **Versioning**: APIs are versioned (v1, v2) for backward compatibility
- **Feature Modules**: Each feature is a self-contained module
- **Shared Modules**: Config, Prisma, and Storage are shared across features

## ⚙️ Configuration

The application uses environment variables for configuration. Key variables:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/kalos?schema=public"

# JWT Secrets
JWT_SECRET="your_jwt_access_secret"
JWT_REFRESH_SECRET="your_jwt_refresh_secret"

# Cookie Secret
COOKIE_SECRET="your_cookie_secret_key"
```

### Optional Variables

```bash
# Application
NODE_ENV="development"          # development | production | test
PORT=4000                       # Default: 3000

# JWT Expiration
JWT_EXPIRES_IN="15m"           # Access token expiration
REFRESH_TOKEN_EXPIRES_IN="30d" # Refresh token expiration

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# Email (for notifications)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM="no-reply@example.com"

# Storage
STORAGE_PROVIDER="s3"          # Options: 'local', 's3'
S3_BUCKET="your_s3_bucket_name"

# OAuth (optional)
FACEBOOK_CLIENT_ID="your_facebook_client_id"
FACEBOOK_CLIENT_SECRET="your_facebook_client_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

See `.env.example` for a complete list with descriptions.

## 🗄️ Database

### Schema Management

The database schema is managed by Prisma. Key models:

- **User**: Core user data with authentication info
- **Device**: Device tracking for refresh tokens
- **Style & UserStylePreference**: User style preferences
- **VerificationRequest**: Creator/vendor verification workflows
- **AuditLog & AuthLog**: System logging

### Common Database Commands

```bash
# Create a new migration
pnpm prisma migrate dev --name migration_name

# Apply migrations in production
pnpm prisma migrate deploy

# Reset database (⚠️ DESTRUCTIVE - dev only)
pnpm prisma migrate reset

# Open Prisma Studio (visual editor)
pnpm prisma studio

# Generate Prisma Client (after schema changes)
pnpm prisma generate
```

## 💻 Development

### Development Workflow

```bash
# Start with hot reload
pnpm run start:dev

# Run linting
pnpm run lint

# Format code
pnpm run format

# Build for production
pnpm run build
```

### Code Style

- Follow NestJS conventions
- Use TypeScript strict mode
- Leverage dependency injection
- Write meaningful commit messages
- Add JSDoc comments for complex functions

### Adding New Features

1. Create a feature module in `src/modules/`
2. Define DTOs with validation decorators
3. Implement service logic
4. Create controllers with proper guards
5. Write unit and E2E tests
6. Update Prisma schema if needed

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run unit tests in watch mode
pnpm run test:watch

# Run E2E tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov
```

Test files are colocated with source files (`*.spec.ts`).

## 📚 API Documentation

### Authentication Endpoints

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login with email/phone
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout user
- `GET /v1/auth/google` - Google OAuth
- `GET /v1/auth/facebook` - Facebook OAuth

### User Endpoints

- `GET /v1/users/profile` - Get current user profile
- `PATCH /v1/users/profile` - Update profile
- `GET /v1/users/:id` - Get user by ID (admin)

### Verification Endpoints

- `POST /v1/verification/request` - Submit verification request
- `GET /v1/verification/requests` - List user's requests
- `GET /v1/verification/admin/pending` - Admin: pending requests
- `PATCH /v1/verification/admin/:id` - Admin: review request

For detailed API documentation, consider adding Swagger/OpenAPI:

```bash
pnpm add @nestjs/swagger
```

## 🚢 Deployment

### Production Build

```bash
# Install dependencies
pnpm install --production=false

# Generate Prisma Client
pnpm prisma generate

# Build application
pnpm run build

# Run migrations
pnpm prisma migrate deploy

# Start production server
pnpm run start:prod
```

### Environment Variables in Production

- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, Vault, etc.)
- Ensure DATABASE_URL points to production database
- Use strong, unique secrets for JWT and cookies
- Set NODE_ENV=production

### Docker Deployment

See `Dockerfile` and `docker-compose.yml` for containerized deployment.

### Recommended Platforms

- **AWS**: EC2, ECS, or Elastic Beanstalk
- **Heroku**: Easy deployment with Postgres addon
- **DigitalOcean**: App Platform or Droplets
- **Railway**: Simple deployment with Postgres

For Railway-specific setup, see [docs/RAILWAY.md](./docs/RAILWAY.md).

## 👥 Team Development

This is an internal project for the Kalos team. For development guidelines, workflows, and coding standards, see [DEVELOPMENT.md](./DEVELOPMENT.md).

### Quick Commands

```bash
# Setup project
pnpm setup

# Development
pnpm dev

# Testing
pnpm test
pnpm test:e2e

# Database
pnpm prisma studio
pnpm db:setup
```

## 📚 Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Team development guide and workflows
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[.env.example](./.env.example)** - Environment variables reference

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For questions or issues:

- Ask in team Slack channel
- Schedule a pair programming session
- Check the documentation in `/docs`

---

Built with ❤️ by the Kalos team using [NestJS](https://nestjs.com/)
