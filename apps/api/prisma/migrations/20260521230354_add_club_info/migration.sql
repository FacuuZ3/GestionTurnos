-- CreateTable
CREATE TABLE "club_info" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "address" VARCHAR(255) NOT NULL,
    "mapEmbedUrl" TEXT,
    "weekdayHours" VARCHAR(80) NOT NULL,
    "weekendHours" VARCHAR(80) NOT NULL,
    "holidayHours" VARCHAR(80) NOT NULL,
    "services" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_info_pkey" PRIMARY KEY ("id")
);
