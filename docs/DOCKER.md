# Docker Quick Start Guide

This guide helps you get started with Docker for Kalos Backend development and deployment.

## Development with Docker

### Quick Start

Start all services (app + PostgreSQL):

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f app
```

Stop services:

```bash
docker-compose down
```

### Access Services

- **API**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Prisma Studio**: http://localhost:5555 (see below)

### Running Prisma Studio

Start Prisma Studio to view and edit your database:

```bash
docker-compose --profile tools up prisma-studio
```

Or run it directly:

```bash
pnpm prisma studio
```

### Common Commands

```bash
# Rebuild containers
docker-compose up -d --build

# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# Execute commands in app container
docker-compose exec app pnpm test

# Access database
docker-compose exec postgres psql -U postgres -d kalos

# Restart specific service
docker-compose restart app

# Clean everything (including volumes)
docker-compose down -v
```

### Database Migrations

```bash
# Run migrations
docker-compose exec app pnpm prisma migrate dev

# Reset database (destructive!)
docker-compose exec app pnpm prisma migrate reset

# Generate Prisma Client
docker-compose exec app pnpm prisma generate
```

## Production Deployment

### Using Docker Compose

1. **Copy production compose file:**

   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and start:**

   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

3. **Check health:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

### Using Docker Only

1. **Build image:**

   ```bash
   docker build -t kalos-backend:latest .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     --name kalos-backend \
     -p 4000:4000 \
     -e DATABASE_URL="postgresql://..." \
     -e JWT_SECRET="your-secret" \
     -e JWT_REFRESH_SECRET="your-refresh-secret" \
     -e COOKIE_SECRET="your-cookie-secret" \
     kalos-backend:latest
   ```

### Environment Variables

Create a `.env.production` file with all required variables:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/kalos?schema=public
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-refresh-secret
COOKIE_SECRET=your-cookie-secret
# ... add all other variables
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 4000
lsof -ti:4000 | xargs kill -9

# Or use different port in .env
PORT=4001
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Connect to database to debug
docker-compose exec postgres psql -U postgres -d kalos
```

### Container Won't Start

```bash
# View detailed logs
docker-compose logs app

# Check container status
docker-compose ps

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Prisma Issues

```bash
# Regenerate Prisma Client
docker-compose exec app pnpm prisma generate

# Reset and recreate database
docker-compose exec app pnpm prisma migrate reset

# Check migration status
docker-compose exec app pnpm prisma migrate status
```

### Volume Permissions

If you encounter permission issues with volumes:

```bash
# Remove volumes and recreate
docker-compose down -v
docker-compose up -d
```

## Docker Compose Profiles

We use profiles to organize optional services:

```bash
# Start with Prisma Studio
docker-compose --profile tools up -d

# Production with Nginx
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

## Best Practices

### Development

- Use `docker-compose.yml` for local development
- Mount source code as volumes for hot reload
- Keep containers running during development

### Production

- Use `docker-compose.prod.yml` or custom orchestration
- Never mount source code volumes
- Use specific image tags (not `latest`)
- Use secrets management for sensitive data
- Enable health checks
- Set resource limits
- Use multi-stage builds (already configured)

## Performance Tips

1. **Layer Caching**: Order Dockerfile commands from least to most frequently changing
2. **Multi-stage Builds**: Reduce final image size (already implemented)
3. **Volume Mounts**: Use volumes for node_modules in development
4. **Resource Limits**: Set memory and CPU limits in production

## Security Considerations

- Never commit `.env` files
- Use Docker secrets for sensitive data in production
- Keep base images updated
- Scan images for vulnerabilities
- Run containers as non-root user (TODO)
- Use read-only file systems where possible

## Monitoring

### View Resource Usage

```bash
# Container stats
docker stats

# Specific container
docker stats kalos-backend
```

### Health Checks

Check if services are healthy:

```bash
docker-compose ps
```

## Cleanup

### Remove Unused Resources

```bash
# Remove stopped containers
docker-compose down

# Remove volumes too
docker-compose down -v

# Remove all unused images
docker image prune -a

# Remove everything (system-wide)
docker system prune -a --volumes
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/prisma#docker)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-elastic-beanstalk)

---

For questions, ask the team! 🚀
