-- CreateEnum
CREATE TYPE "StatsSnapshotScope" AS ENUM ('report');

-- CreateEnum
CREATE TYPE "StatsSnapshotPeriod" AS ENUM ('seven_days', 'thirty_days', 'all');

-- CreateTable
CREATE TABLE "StatsSnapshot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "scope" "StatsSnapshotScope" NOT NULL,
    "period" "StatsSnapshotPeriod" NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "StatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatsSnapshot_groupId_scope_period_key" ON "StatsSnapshot"("groupId", "scope", "period");

-- CreateIndex
CREATE INDEX "StatsSnapshot_groupId_scope_period_idx" ON "StatsSnapshot"("groupId", "scope", "period");

-- CreateIndex
CREATE INDEX "StatsSnapshot_expiresAt_idx" ON "StatsSnapshot"("expiresAt");

-- AddForeignKey
ALTER TABLE "StatsSnapshot" ADD CONSTRAINT "StatsSnapshot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
