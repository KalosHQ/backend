-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('CREATOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "refreshTokenHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "adminId" TEXT,
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "identifier" TEXT,
    "outcome" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceId_key" ON "Device"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAttachment" ADD CONSTRAINT "VerificationAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthLog" ADD CONSTRAINT "AuthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
