import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Required for Prisma Migrate in Prisma 7+
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
