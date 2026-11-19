-- AlterTable
ALTER TABLE "users" ADD COLUMN "optedOutCategoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BROADCAST_OFFER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_CANCELLED';

-- CreateTable
CREATE TABLE "feed_messages" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRequest" BOOLEAN NOT NULL DEFAULT false,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feed_messages_requestId_key" ON "feed_messages"("requestId");
CREATE INDEX "feed_messages_authorId_idx" ON "feed_messages"("authorId");

ALTER TABLE "feed_messages" ADD CONSTRAINT "feed_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feed_messages" ADD CONSTRAINT "feed_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
