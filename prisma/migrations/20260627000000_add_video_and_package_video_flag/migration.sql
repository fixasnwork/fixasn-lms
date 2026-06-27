-- Add Video table for the video-pembelajaran catalog (TWK/TIU/TKP YouTube embeds).
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "durationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdIP" TEXT,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedIP" TEXT,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- Composite index supports the user-facing list query: published videos
-- grouped by category and ordered by sortOrder.
CREATE INDEX "videos_category_isPublished_sortOrder_idx" ON "videos"("category", "isPublished", "sortOrder");

-- Flag on Package: when true, an active (non-rejected, non-expired)
-- UserPurchase on this package grants access to the /video catalog.
-- Defaults to false so existing rows are unaffected.
ALTER TABLE "packages" ADD COLUMN "includesVideoPembelajaran" BOOLEAN NOT NULL DEFAULT false;
