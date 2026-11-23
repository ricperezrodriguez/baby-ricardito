-- CreateEnum
CREATE TYPE "BreastSide" AS ENUM ('left', 'right');

-- CreateEnum
CREATE TYPE "DiaperType" AS ENUM ('wet', 'dirty', 'both');

-- CreateEnum
CREATE TYPE "StoolColor" AS ENUM ('yellow', 'green', 'brown', 'black', 'red', 'white');

-- CreateEnum
CREATE TYPE "StoolConsistency" AS ENUM ('liquid', 'soft', 'mucous', 'firm');

-- CreateEnum
CREATE TYPE "BottleMilkType" AS ENUM ('breast_milk', 'formula', 'mixed');

-- CreateEnum
CREATE TYPE "NailArea" AS ENUM ('hands', 'feet');

-- CreateEnum
CREATE TYPE "BathReaction" AS ENUM ('happy', 'neutral', 'sad');

-- CreateTable
CREATE TABLE "babies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "babies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baby_preferences" (
    "babyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "baby_preferences_pkey" PRIMARY KEY ("babyId","key")
);

-- CreateTable
CREATE TABLE "breastfeeding_sessions" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3),
    "notes" TEXT,
    "photoPath" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "breastfeeding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breastfeeding_segments" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "breast" "BreastSide" NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3),

    CONSTRAINT "breastfeeding_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diaper_changes" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "type" "DiaperType" NOT NULL,
    "stoolColor" "StoolColor",
    "stoolConsistency" "StoolConsistency",
    "hasRash" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(500),
    "photoPath" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diaper_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_sessions" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bottle_feeds" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "fedAt" TIMESTAMPTZ(3) NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "milkType" "BottleMilkType" NOT NULL,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bottle_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitamin_d_doses" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "givenAt" TIMESTAMPTZ(3) NOT NULL,
    "drops" INTEGER,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vitamin_d_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nail_trims" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "trimmedAt" TIMESTAMPTZ(3) NOT NULL,
    "areas" "NailArea"[],
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nail_trims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baths" (
    "id" UUID NOT NULL,
    "babyId" TEXT NOT NULL,
    "bathedAt" TIMESTAMPTZ(3) NOT NULL,
    "hairWashed" BOOLEAN NOT NULL,
    "reaction" "BathReaction",
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "baths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "breastfeeding_sessions_babyId_startTime_idx" ON "breastfeeding_sessions"("babyId", "startTime" DESC);

-- CreateIndex
CREATE INDEX "breastfeeding_segments_sessionId_startTime_idx" ON "breastfeeding_segments"("sessionId", "startTime");

-- CreateIndex
CREATE INDEX "diaper_changes_babyId_changedAt_idx" ON "diaper_changes"("babyId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "sleep_sessions_babyId_startTime_idx" ON "sleep_sessions"("babyId", "startTime" DESC);

-- CreateIndex
CREATE INDEX "bottle_feeds_babyId_fedAt_idx" ON "bottle_feeds"("babyId", "fedAt" DESC);

-- CreateIndex
CREATE INDEX "vitamin_d_doses_babyId_givenAt_idx" ON "vitamin_d_doses"("babyId", "givenAt" DESC);

-- CreateIndex
CREATE INDEX "nail_trims_babyId_trimmedAt_idx" ON "nail_trims"("babyId", "trimmedAt" DESC);

-- CreateIndex
CREATE INDEX "baths_babyId_bathedAt_idx" ON "baths"("babyId", "bathedAt" DESC);

-- AddForeignKey
ALTER TABLE "baby_preferences" ADD CONSTRAINT "baby_preferences_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breastfeeding_sessions" ADD CONSTRAINT "breastfeeding_sessions_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breastfeeding_segments" ADD CONSTRAINT "breastfeeding_segments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "breastfeeding_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diaper_changes" ADD CONSTRAINT "diaper_changes_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bottle_feeds" ADD CONSTRAINT "bottle_feeds_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitamin_d_doses" ADD CONSTRAINT "vitamin_d_doses_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nail_trims" ADD CONSTRAINT "nail_trims_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baths" ADD CONSTRAINT "baths_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rules Prisma cannot express: kept in the database so no code path can break them.

-- At most one open (running or paused) feed and one ongoing sleep per baby.
CREATE UNIQUE INDEX "breastfeeding_sessions_one_open_per_baby" ON "breastfeeding_sessions"("babyId") WHERE "endTime" IS NULL;
CREATE UNIQUE INDEX "sleep_sessions_one_ongoing_per_baby" ON "sleep_sessions"("babyId") WHERE "endTime" IS NULL;

ALTER TABLE "breastfeeding_sessions" ADD CONSTRAINT "breastfeeding_sessions_end_after_start" CHECK ("endTime" IS NULL OR "endTime" >= "startTime");
ALTER TABLE "breastfeeding_segments" ADD CONSTRAINT "breastfeeding_segments_end_after_start" CHECK ("endTime" IS NULL OR "endTime" >= "startTime");
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_end_after_start" CHECK ("endTime" IS NULL OR "endTime" > "startTime");

ALTER TABLE "diaper_changes" ADD CONSTRAINT "diaper_changes_stool_only_when_dirty" CHECK ("type" <> 'wet' OR ("stoolColor" IS NULL AND "stoolConsistency" IS NULL));
ALTER TABLE "bottle_feeds" ADD CONSTRAINT "bottle_feeds_amount_range" CHECK ("amountMl" BETWEEN 1 AND 500);
ALTER TABLE "vitamin_d_doses" ADD CONSTRAINT "vitamin_d_doses_drops_range" CHECK ("drops" IS NULL OR "drops" BETWEEN 1 AND 10);
ALTER TABLE "nail_trims" ADD CONSTRAINT "nail_trims_areas_not_empty" CHECK (cardinality("areas") > 0);