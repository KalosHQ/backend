# Railway Deployment Guide

## 1. Create Services

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Add this backend service from your GitHub repository.

## 2. Configure Build/Start

This repo includes `nixpacks.toml`, so Railway will:

- Install with `pnpm install --frozen-lockfile`
- Build with `pnpm build`
- Start with `pnpm start:railway`

`start:railway` runs:

1. `pnpm prisma migrate deploy`
2. `node dist/main`

## 3. Required Environment Variables

Set these in Railway for the backend service:

- `NODE_ENV=production`
- `PORT=4000` (Railway sets `PORT` automatically; setting explicitly is optional)
- `DATABASE_URL` (from Railway Postgres service)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`

Recommended:

- `JWT_EXPIRES_IN=15m`
- `REFRESH_TOKEN_EXPIRES_IN=30d`
- `BCRYPT_SALT_ROUNDS=10`
- `APP_URL=<your-railway-public-url>`
- `GOOGLE_CALLBACK_URL=<your-railway-public-url>/v1/auth/google/callback`
- `FACEBOOK_CALLBACK_URL=<your-railway-public-url>/v1/auth/facebook/callback`

If you use storage:

- `STORAGE_PROVIDER=s3`
- `S3_BUCKET=<bucket-name>`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

## 4. Health Check

The app exposes:

- `GET /health` -> `{ status: "ok", ... }`

Use `/health` as Railway health check path.

## 5. Notes

- The server binds to `0.0.0.0`, required in container environments.
- If migrations fail on deploy, verify `DATABASE_URL` points to the Railway Postgres instance.
