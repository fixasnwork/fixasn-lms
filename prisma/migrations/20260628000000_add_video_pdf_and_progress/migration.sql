-- Optional PDF module attachment on Video: storage path of the original
-- PDF (private) + count of successfully rasterized pages.
ALTER TABLE "videos" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "videos" ADD COLUMN "pdfPageCount" INTEGER;

-- Per-user video playback resume state. Composite (userId, videoId) PK
-- so saves collapse to a single row per pair. Cascades on User delete.
CREATE TABLE "videoProgress" (
    "userId" UUID NOT NULL,
    "videoId" INTEGER NOT NULL,
    "lastSecond" INTEGER NOT NULL DEFAULT 0,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videoProgress_pkey" PRIMARY KEY ("userId","videoId")
);

-- Lookup support for per-video aggregate queries (admin dashboards etc).
CREATE INDEX "videoProgress_videoId_idx" ON "videoProgress"("videoId");

-- FK to users: cascade on hard delete so progress dies with the account.
ALTER TABLE "videoProgress" ADD CONSTRAINT "videoProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- FK to videos: cascade on hard delete so progress dies with the video.
ALTER TABLE "videoProgress" ADD CONSTRAINT "videoProgress_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
