# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build application
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Run migrations and start app
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
