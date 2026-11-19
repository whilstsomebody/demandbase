-- AlterTable
ALTER TABLE "item_files"
  ADD COLUMN "publicId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN "originalFilename" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "flaggedForReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "item_files" ALTER COLUMN "publicId" DROP DEFAULT;
ALTER TABLE "item_files" ALTER COLUMN "originalFilename" DROP DEFAULT;
