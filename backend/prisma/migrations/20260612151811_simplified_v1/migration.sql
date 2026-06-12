/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Dispute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Escrow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LedgerAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LedgerEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Nonce` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProvenanceReceipt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Publisher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Worker` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `walletAddress` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobEvent" DROP CONSTRAINT "JobEvent_jobId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_accountId_fkey";

-- DropForeignKey
ALTER TABLE "ProvenanceReceipt" DROP CONSTRAINT "ProvenanceReceipt_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Publisher" DROP CONSTRAINT "Publisher_userId_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_userId_fkey";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
DROP COLUMN "role",
ALTER COLUMN "walletAddress" SET NOT NULL;

-- DropTable
DROP TABLE "Dispute";

-- DropTable
DROP TABLE "Escrow";

-- DropTable
DROP TABLE "Job";

-- DropTable
DROP TABLE "JobEvent";

-- DropTable
DROP TABLE "LedgerAccount";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "Nonce";

-- DropTable
DROP TABLE "ProvenanceReceipt";

-- DropTable
DROP TABLE "Publisher";

-- DropTable
DROP TABLE "Worker";

-- DropEnum
DROP TYPE "DisputeStatus";

-- DropEnum
DROP TYPE "EscrowStatus";

-- DropEnum
DROP TYPE "JobStatus";

-- DropEnum
DROP TYPE "OutputFormat";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "VerificationMode";

-- DropEnum
DROP TYPE "WorkerStatus";

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "onchainId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "priceMicros" BIGINT NOT NULL DEFAULT 1000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlEvent" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "agentAddress" TEXT NOT NULL,
    "amountMicros" BIGINT NOT NULL,
    "publisherCut" BIGINT NOT NULL,
    "protocolCut" BIGINT NOT NULL,
    "txHash" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "userAgent" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiweNonce" (
    "value" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiweNonce_pkey" PRIMARY KEY ("value")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_onchainId_key" ON "Site"("onchainId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlEvent_txHash_key" ON "CrawlEvent"("txHash");

-- CreateIndex
CREATE INDEX "CrawlEvent_siteId_createdAt_idx" ON "CrawlEvent"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "SiweNonce_walletAddress_idx" ON "SiweNonce"("walletAddress");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlEvent" ADD CONSTRAINT "CrawlEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
