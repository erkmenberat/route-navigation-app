-- AlterTable: Add updatedAt with a temporary default to backfill existing rows,
-- then drop the default so Prisma's @updatedAt trigger takes over.
ALTER TABLE "Route" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
ALTER TABLE "Route" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Route_userId_idx" ON "Route"("userId");

-- CreateIndex
CREATE INDEX "Route_createdAt_idx" ON "Route"("createdAt");
