-- Create wardrobe metadata table
CREATE TABLE "WardrobeItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originalPath" TEXT NOT NULL,
  "processedPath" TEXT,
  "segmentedPath" TEXT,
  "category" TEXT,
  "color" TEXT,
  "metadata" JSONB,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "sourceJobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WardrobeItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WardrobeItem_userId_createdAt_idx" ON "WardrobeItem"("userId", "createdAt");

ALTER TABLE "WardrobeItem"
ADD CONSTRAINT "WardrobeItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create avatar metadata table
CREATE TABLE "Avatar" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "modelPath" TEXT,
  "previewPath" TEXT,
  "metadata" JSONB,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "sourceJobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Avatar_userId_createdAt_idx" ON "Avatar"("userId", "createdAt");

ALTER TABLE "Avatar"
ADD CONSTRAINT "Avatar_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create outfit result table
CREATE TABLE "Outfit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "avatarId" TEXT,
  "wardrobeItemId" TEXT,
  "resultPath" TEXT,
  "metadata" JSONB,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "sourceJobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Outfit_userId_createdAt_idx" ON "Outfit"("userId", "createdAt");

ALTER TABLE "Outfit"
ADD CONSTRAINT "Outfit_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
