-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('running', 'stopped', 'expired');

-- CreateTable
CREATE TABLE "Timer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activityId" TEXT,
    "durationMin" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "status" "TimerStatus" NOT NULL DEFAULT 'running',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timer_groupId_status_endsAt_idx" ON "Timer"("groupId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Timer_createdById_status_idx" ON "Timer"("createdById", "status");

-- CreateIndex
CREATE INDEX "Feedback_groupId_createdAt_idx" ON "Feedback"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
