generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  TECHNICIAN
  LEADERSHIP
}

enum Department {
  FULFILLMENT
  LINE
  SUPERVISORS
}

enum SubmissionType {
  CUT_DROP
  TRAPPED_DROP
  HAZARDOUS_DROP
}

enum SubmissionStatus {
  OPEN
  COMPLETE
  NOT_VALID
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String?
  role         UserRole     @default(TECHNICIAN)
  region       String?
  state        String?
  ffo          String?
  department   Department?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  submissions  Submission[]
}

model Submission {
  id                  String           @id @default(cuid())
  type                SubmissionType
  department          Department
  region              String
  state               String
  ffo                 String
  address             String?
  latitude            Float?
  longitude           Float?
  gpsText             String?
  capturedAt          DateTime?
  metadataJson        Json?
  notes               String?
  status              SubmissionStatus @default(OPEN)
  statusNote          String?
  statusUpdatedAt     DateTime?
  statusUpdatedById   String?
  statusUpdatedByName String?
  submittedById       String
  submittedBy         User             @relation(fields: [submittedById], references: [id], onDelete: Cascade)
  images              SubmissionImage[]
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@index([createdAt])
  @@index([region])
  @@index([state])
  @@index([ffo])
  @@index([department])
  @@index([type])
  @@index([status])
}

model SubmissionImage {
  id           String     @id @default(cuid())
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  fileName     String
  storedName   String
  filePath     String
  publicUrl    String
  mimeType     String?
  sizeBytes    Int?
  sortOrder    Int        @default(0)
  createdAt    DateTime   @default(now())

  @@index([submissionId])
}
