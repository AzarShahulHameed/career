-- CreateEnum
CREATE TYPE "ScreeningQuestionType" AS ENUM ('TEXT', 'YES_NO', 'MULTIPLE_CHOICE');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "atsAutoRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "atsBreakdown" JSONB,
ADD COLUMN     "atsScore" INTEGER;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "atsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "atsPassThreshold" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "ScreeningQuestion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "ScreeningQuestionType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "disqualifyingAnswer" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScreeningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningAnswer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "ScreeningAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreeningQuestion_jobId_idx" ON "ScreeningQuestion"("jobId");

-- CreateIndex
CREATE INDEX "ScreeningAnswer_applicationId_idx" ON "ScreeningAnswer"("applicationId");

-- CreateIndex
CREATE INDEX "ScreeningAnswer_questionId_idx" ON "ScreeningAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningAnswer" ADD CONSTRAINT "ScreeningAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningAnswer" ADD CONSTRAINT "ScreeningAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ScreeningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
