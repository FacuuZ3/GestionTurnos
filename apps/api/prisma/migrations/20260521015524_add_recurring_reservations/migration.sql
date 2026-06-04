-- CreateTable
CREATE TABLE "recurring_reservations" (
    "id" UUID NOT NULL,
    "courtId" UUID NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "startMinute" SMALLINT NOT NULL,
    "endMinute" SMALLINT NOT NULL,
    "notes" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_reservations_courtId_dayOfWeek_isActive_idx" ON "recurring_reservations"("courtId", "dayOfWeek", "isActive");

-- AddForeignKey
ALTER TABLE "recurring_reservations" ADD CONSTRAINT "recurring_reservations_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
