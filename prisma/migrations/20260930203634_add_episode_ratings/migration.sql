-- CreateTable
CREATE TABLE "EpisodeRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpisodeRating_mediaItemId_episodeNumber_idx" ON "EpisodeRating"("mediaItemId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeRating_userId_mediaItemId_episodeNumber_key" ON "EpisodeRating"("userId", "mediaItemId", "episodeNumber");

-- AddForeignKey
ALTER TABLE "EpisodeRating" ADD CONSTRAINT "EpisodeRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeRating" ADD CONSTRAINT "EpisodeRating_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
