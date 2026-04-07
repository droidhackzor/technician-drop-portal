-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TECHNICIAN', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('CUT_DROP', 'TRAPPED_DROP', 'HAZARDOUS_DROP');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('FULFILLMENT', 'LINE', 'SUPERVISORS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "region" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ffo" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "houseAddress" TEXT NOT NULL,
    "metadataAddress" TEXT,
    "gpsLat" DECIMAL(10,7),
    "gpsLng" DECIMAL(10,7),
    "gpsText" TEXT,
    "capturedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedById" TEXT NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt" DESC);
CREATE INDEX "Submission_houseAddress_idx" ON "Submission"("houseAddress");
CREATE INDEX "Submission_metadataAddress_idx" ON "Submission"("metadataAddress");
CREATE INDEX "Submission_gpsText_idx" ON "Submission"("gpsText");
CREATE INDEX "Submission_region_state_ffo_idx" ON "Submission"("region", "state", "ffo");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
