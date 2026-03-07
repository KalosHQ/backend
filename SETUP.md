# 🚀 Kalos Backend - Quick Setup Guide

Follow these steps to get the project running on your machine.

## ✅ Prerequisites Checklist

- [ ] Node.js v18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] PostgreSQL v14+ installed and running
- [ ] Git configured with your credentials

## 📝 Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kalos-app/backend.git
cd backend
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages (~2-3 minutes).

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set these **required** variables:

```bash
# Database (update with your credentials)
DATABASE_URL="postgresql://postgres:password@localhost:5432/kalos?schema=public"

# Security (generate random values for production)
JWT_SECRET="your-jwt-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
COOKIE_SECRET="your-cookie-secret-here"
```

💡 **Tip:** Generate secrets with: `openssl rand -base64 32`

### 4. Setup Database

```bash
# This runs: prisma generate + prisma migrate dev
pnpm db:setup
```

This will:

- Generate Prisma Client
- Create database tables
- Apply all migrations

### 5. Start Development Server

```bash
pnpm dev
```

You should see:

```
[Nest] Application is running on: http://localhost:4000
```

### 6. Verify Installation

Open another terminal and test:

```bash
curl http://localhost:4000
```

You should get a response from the API! 🎉

## 🧪 Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## 📚 Next Steps

Now that you're set up:

1. **Read the docs:**
   - `DEVELOPMENT.md` - Development workflows
   - `docs/ARCHITECTURE.md` - System architecture
   - `docs/API.md` - API endpoints

2. **Explore the codebase:**
   - Start with `src/app.module.ts`
   - Check out `src/modules/auth/v1/` for auth logic
   - Review `prisma/schema.prisma` for database models

3. **Create your first feature:**
   - Create a feature branch
   - Follow coding standards in `DEVELOPMENT.md`
   - Write tests
   - Submit a PR

## 🆘 Troubleshooting

### Port 4000 Already in Use

```bash
# Kill the process
lsof -ti:4000 | xargs kill -9

# Or change port in .env
PORT=4001
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
psql -U postgres -l

# On macOS with Homebrew
brew services start postgresql@15

# Check DATABASE_URL in .env is correct
```

### Prisma Issues

```bash
# Regenerate client
pnpm prisma generate

# Reset database (destructive!)
pnpm prisma migrate reset

# View database
pnpm prisma studio
```

### Clean Install

```bash
# Remove everything
pnpm clean

# Reinstall
pnpm install
pnpm db:setup
```

## 🔧 Useful Commands

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm start:prod       # Run production build

# Database
pnpm prisma studio    # Visual database editor
pnpm db:setup         # Setup from scratch

# Code Quality
pnpm lint             # Fix linting issues
pnpm format           # Format code
pnpm typecheck        # Check TypeScript types

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:e2e         # E2E tests
pnpm test:cov         # With coverage

```

## 📖 Documentation Index

- **README.md** - Project overview
- **DEVELOPMENT.md** - Team development guide
- **docs/ARCHITECTURE.md** - System architecture
- **docs/API.md** - API documentation
- **.env.example** - Environment variables reference

## 💬 Need Help?

- Check documentation first
- Ask in team Slack
- Schedule pair programming
- Review existing code for examples

## ✨ You're All Set!

Start coding and building amazing features! 🚀

---

**Quick Test Endpoint:**

```bash
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test User"
  }'
```

Happy coding! 💻
