-- Create enums for job orchestration
CREATE TYPE "JobType" AS ENUM (
  'AVATAR_GENERATION',
  'CLOTHING_PROCESSING',
  'METADATA_EXTRACTION',
  'VIRTUAL_TRYON',
  'STYLIST_RECOMMENDATION'
);

CREATE TYPE "JobStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'RETRYING'
);

-- Create Job table
CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "JobType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "priority" INTEGER NOT NULL DEFAULT 50,
  "idempotencyKey" TEXT NOT NULL,
  "dedupKey" TEXT NOT NULL,
  "input" JSONB,
  "metadata" JSONB,
  "resultUrl" TEXT,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "maxRetries" INTEGER NOT NULL DEFAULT 5,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_dedupKey_key" ON "Job"("dedupKey");
CREATE UNIQUE INDEX "Job_userId_idempotencyKey_key" ON "Job"("userId", "idempotencyKey");
CREATE INDEX "Job_status_type_createdAt_idx" ON "Job"("status", "type", "createdAt");
CREATE INDEX "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt");

ALTER TABLE "Job"
ADD CONSTRAINT "Job_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
