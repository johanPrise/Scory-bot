-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('private', 'group', 'supergroup', 'channel');

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('user', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('member', 'admin', 'creator');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('game', 'sport', 'education', 'creative', 'other');

-- CreateEnum
CREATE TYPE "ScoreContext" AS ENUM ('individual', 'team', 'group');

-- CreateEnum
CREATE TYPE "ScoreStatus" AS ENUM ('pending', 'approved', 'rejected', 'disputed', 'deleted');

-- CreateEnum
CREATE TYPE "RankingScope" AS ENUM ('individual', 'team');

-- CreateEnum
CREATE TYPE "RankingPeriod" AS ENUM ('day', 'week', 'month', 'year', 'all');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('created', 'approved', 'rejected', 'deleted', 'updated');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "telegramId" TEXT,
    "telegramUser" TEXT,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "GlobalRole" NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramGroup" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "chatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'group',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'member',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActivityType" NOT NULL DEFAULT 'other',
    "createdById" TEXT NOT NULL,
    "teamId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubActivity" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "joinCode" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "activityId" TEXT NOT NULL,
    "subActivityId" TEXT,
    "value" INTEGER NOT NULL,
    "maxPossible" INTEGER NOT NULL,
    "normalizedScore" INTEGER NOT NULL,
    "context" "ScoreContext" NOT NULL,
    "status" "ScoreStatus" NOT NULL DEFAULT 'approved',
    "awardedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "comments" TEXT,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ScoreEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupStats" (
    "groupId" TEXT NOT NULL,
    "totalScores" INTEGER NOT NULL DEFAULT 0,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "totalTeams" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupStats_pkey" PRIMARY KEY ("groupId")
);

-- CreateTable
CREATE TABLE "UserGroupStats" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "normalizedTotal" INTEGER NOT NULL DEFAULT 0,
    "scoreCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "lastScoreAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGroupStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamGroupStats" (
    "teamId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "normalizedTotal" INTEGER NOT NULL DEFAULT 0,
    "scoreCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "lastScoreAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamGroupStats_pkey" PRIMARY KEY ("teamId")
);

-- CreateTable
CREATE TABLE "ActivityStats" (
    "activityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSubmissionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityStats_pkey" PRIMARY KEY ("activityId")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "scope" "RankingScope" NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "activityId" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mongoId_key" ON "User"("mongoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroup_mongoId_key" ON "TelegramGroup"("mongoId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroup_chatId_key" ON "TelegramGroup"("chatId");

-- CreateIndex
CREATE INDEX "TelegramGroup_isActive_updatedAt_idx" ON "TelegramGroup"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "GroupMember_userId_lastSeen_idx" ON "GroupMember"("userId", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_mongoId_key" ON "Activity"("mongoId");

-- CreateIndex
CREATE INDEX "Activity_groupId_isActive_createdAt_idx" ON "Activity"("groupId", "isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_groupId_name_key" ON "Activity"("groupId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubActivity_mongoId_key" ON "SubActivity"("mongoId");

-- CreateIndex
CREATE UNIQUE INDEX "SubActivity_activityId_name_key" ON "SubActivity"("activityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_mongoId_key" ON "Team"("mongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");

-- CreateIndex
CREATE INDEX "Team_groupId_createdAt_idx" ON "Team"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_groupId_name_key" ON "Team"("groupId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_mongoId_key" ON "Score"("mongoId");

-- CreateIndex
CREATE INDEX "Score_groupId_status_context_createdAt_idx" ON "Score"("groupId", "status", "context", "createdAt");

-- CreateIndex
CREATE INDEX "Score_groupId_status_context_userId_createdAt_idx" ON "Score"("groupId", "status", "context", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Score_groupId_status_context_teamId_createdAt_idx" ON "Score"("groupId", "status", "context", "teamId", "createdAt");

-- CreateIndex
CREATE INDEX "Score_groupId_status_activityId_createdAt_idx" ON "Score"("groupId", "status", "activityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Score_groupId_userId_activityId_subActivityId_key" ON "Score"("groupId", "userId", "activityId", "subActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_groupId_teamId_activityId_subActivityId_key" ON "Score"("groupId", "teamId", "activityId", "subActivityId");

-- CreateIndex
CREATE INDEX "ScoreEvent_scoreId_createdAt_idx" ON "ScoreEvent"("scoreId", "createdAt");

-- CreateIndex
CREATE INDEX "UserGroupStats_groupId_rank_idx" ON "UserGroupStats"("groupId", "rank");

-- CreateIndex
CREATE INDEX "UserGroupStats_groupId_normalizedTotal_idx" ON "UserGroupStats"("groupId", "normalizedTotal");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupStats_groupId_userId_key" ON "UserGroupStats"("groupId", "userId");

-- CreateIndex
CREATE INDEX "TeamGroupStats_groupId_rank_idx" ON "TeamGroupStats"("groupId", "rank");

-- CreateIndex
CREATE INDEX "TeamGroupStats_groupId_normalizedTotal_idx" ON "TeamGroupStats"("groupId", "normalizedTotal");

-- CreateIndex
CREATE INDEX "ActivityStats_groupId_totalSubmissions_idx" ON "ActivityStats"("groupId", "totalSubmissions");

-- CreateIndex
CREATE INDEX "RankingSnapshot_groupId_scope_period_idx" ON "RankingSnapshot"("groupId", "scope", "period");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSnapshot_groupId_scope_period_activityId_key" ON "RankingSnapshot"("groupId", "scope", "period", "activityId");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubActivity" ADD CONSTRAINT "SubActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_subActivityId_fkey" FOREIGN KEY ("subActivityId") REFERENCES "SubActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "Score"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStats" ADD CONSTRAINT "GroupStats_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroupStats" ADD CONSTRAINT "UserGroupStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGroupStats" ADD CONSTRAINT "TeamGroupStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityStats" ADD CONSTRAINT "ActivityStats_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
