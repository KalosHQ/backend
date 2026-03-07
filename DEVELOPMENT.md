# Kalos Backend - Team Development Guide

This guide outlines development standards and workflows for the Kalos team.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## 🚀 Getting Started

### Prerequisites

- Node.js v18.x or higher
- pnpm v8.x or higher
- PostgreSQL v14.x or higher
- Git

### Initial Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/kalos-app/backend.git
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Setup environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Setup database:**

   ```bash
   pnpm db:setup
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   ```

## 🔄 Development Workflow

### Branch Strategy

We use Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Working on a Feature

1. **Pull latest changes:**

   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Write code
   - Add tests
   - Update documentation

4. **Test your changes:**

   ```bash
   pnpm lint
   pnpm test
   pnpm typecheck
   ```

5. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: add user profile update endpoint"
   ```

6. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub targeting `develop` branch.

### Branch Naming Conventions

- `feature/user-authentication` - New features
- `fix/login-bug` - Bug fixes
- `refactor/auth-service` - Code refactoring
- `docs/api-documentation` - Documentation updates
- `test/user-service` - Test improvements
- `chore/dependency-update` - Maintenance tasks

## 💻 Coding Standards

### TypeScript Guidelines

1. **Type Safety**
   - Use strict mode
   - Avoid `any` - use `unknown` if needed
   - Define proper interfaces for all data structures

2. **Naming Conventions**

   ```typescript
   // Classes & Interfaces
   class UserService {}
   interface IUserResponse {}

   // Functions & Methods
   getUserById()
   createNewUser()

   // Constants
   const MAX_RETRY_ATTEMPTS = 3;

   // Private members
   private refreshTokenHash: string;
   ```

3. **File Organization**

   ```typescript
   // 1. Imports
   import { Injectable } from '@nestjs/common';

   // 2. Types/Interfaces
   interface UserOptions {
     includeDeleted?: boolean;
   }

   // 3. Class/Functions
   @Injectable()
   export class UserService {
     // Implementation
   }
   ```

### NestJS Best Practices

1. **Controllers** - Keep thin, delegate to services

   ```typescript
   @Controller('v1/users')
   export class UsersController {
     constructor(private readonly usersService: UsersService) {}

     @Get(':id')
     async findOne(@Param('id') id: string) {
       return this.usersService.findById(id);
     }
   }
   ```

2. **Services** - Business logic lives here

   ```typescript
   @Injectable()
   export class UsersService {
     constructor(private readonly prisma: PrismaService) {}

     async findById(id: string): Promise<User> {
       // Business logic
     }
   }
   ```

3. **DTOs** - Always validate input
   ```typescript
   export class CreateUserDto {
     @IsEmail()
     email: string;

     @IsString()
     @MinLength(8)
     password: string;
   }
   ```

### Code Style

- Use Prettier (already configured)
- 2 spaces indentation
- Single quotes for strings
- Trailing commas in arrays/objects
- Max line length: 100 characters

Run formatters:

```bash
pnpm format      # Fix formatting
pnpm lint        # Fix linting issues
pnpm lint:check  # Check only
```

## 📝 Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Formatting changes
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Maintenance tasks
- `perf` - Performance improvements

### Examples

```bash
# Feature
feat(auth): add refresh token rotation

# Bug fix
fix(users): resolve duplicate email validation

# Breaking change
feat(auth)!: change JWT payload structure

BREAKING CHANGE: JWT payload now includes deviceId
```

### Rules

- Present tense: "add" not "added"
- Imperative mood: "move" not "moves"
- No period at end
- Keep subject under 72 characters
- Reference issues: "fixes #123"

## 🔀 Pull Request Process

### Before Creating PR

- [ ] All tests pass
- [ ] Code is formatted and linted
- [ ] No TypeScript errors
- [ ] Branch is up to date with develop
- [ ] Meaningful commit messages

### PR Guidelines

1. **Title:** Use conventional commit format

   ```
   feat(users): add profile picture upload
   ```

2. **Description:** Include:
   - What was changed and why
   - How to test the changes
   - Screenshots (if UI changes)
   - Related issues/tickets

3. **Request Review:** Tag relevant team members

### Review Process

1. At least one team member must approve
2. All CI checks must pass
3. Address all review comments
4. Squash and merge when approved

### After Merge

1. Delete your feature branch
2. Pull latest develop
   ```bash
   git checkout develop
   git pull origin develop
   ```

## 🧪 Testing Guidelines

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E tests
pnpm test:e2e
```

### Writing Tests

**Unit Test Example:**

```typescript
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedUser = { id: userId, email: 'test@example.com' };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(expectedUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
    });
  });
});
```

**E2E Test Example:**

```typescript
describe('Auth (e2e)', () => {
  it('/v1/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

### Test Coverage Goals

- Aim for >80% coverage
- Focus on critical paths
- Test edge cases and error scenarios

## 📚 Documentation

### When to Update Documentation

Update docs when you:

- Add new features or endpoints
- Change existing functionality
- Add configuration options
- Change environment variables

### Documentation Locations

1. **README.md** - Project overview and setup
2. **This file** - Development guidelines
3. **docs/ARCHITECTURE.md** - System architecture
4. **Code comments** - Complex logic explanation
5. **API docs** - Endpoint documentation (coming soon)

## 🆘 Getting Help

### Team Communication

- Ask in team Slack channel
- Schedule pair programming session
- Review existing code for patterns
- Check documentation first

### Common Issues

**Database issues:**

```bash
pnpm prisma:migrate:reset  # Reset database (destructive!)
pnpm prisma studio         # Visual database editor
```

**Port already in use:**

```bash
lsof -ti:4000 | xargs kill -9
```

**Clean start:**

```bash
pnpm clean
pnpm install
pnpm db:setup
```

## 🎯 Quick Reference

```bash
# Setup
pnpm install
pnpm db:setup

# Development
pnpm dev
pnpm prisma studio

# Code Quality
pnpm lint
pnpm format
pnpm typecheck

# Testing
pnpm test
pnpm test:e2e

# Database
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio

```

---

**Questions?** Ask the team! We're here to help. 🚀
