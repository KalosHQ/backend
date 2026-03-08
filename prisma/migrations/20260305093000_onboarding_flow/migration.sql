-- Create onboarding enums
CREATE TYPE "ModelCustomizationMethod" AS ENUM ('PHOTO', 'MEASUREMENTS');
CREATE TYPE "ModelGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "ModelBodyType" AS ENUM ('SLIM', 'ATHLETIC', 'PLUS_SIZE', 'CURVY');
CREATE TYPE "ModelGenerationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'COMPLETED', 'FAILED');

-- Extend User for onboarding/model generation lifecycle
ALTER TABLE "User"
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "modelGenerationStatus" "ModelGenerationStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- Store selected model customization settings
CREATE TABLE "UserModelProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "method" "ModelCustomizationMethod" NOT NULL,
  "gender" "ModelGender" NOT NULL,
  "bodyType" "ModelBodyType" NOT NULL,
  "heightCm" INTEGER NOT NULL,
  "weightKg" INTEGER NOT NULL,
  "photoPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserModelProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModelProfile_userId_key" ON "UserModelProfile"("userId");

ALTER TABLE "UserModelProfile"
ADD CONSTRAINT "UserModelProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
