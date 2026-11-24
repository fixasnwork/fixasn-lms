BEGIN;

CREATE TABLE "questionTopics" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questionTopics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "questionTopics_category_check" CHECK ("category" IN ('TWK', 'TIU', 'TKP')),
    CONSTRAINT "questionTopics_name_check" CHECK (length(trim("name")) > 0)
);

CREATE UNIQUE INDEX "questionTopics_id_category_key" ON "questionTopics"("id", "category");
CREATE UNIQUE INDEX "questionTopics_category_name_key" ON "questionTopics"("category", "name");

ALTER TABLE "questions" ADD COLUMN "topicId" INTEGER;
CREATE INDEX "questions_topicId_category_idx" ON "questions"("topicId", "category");
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_category_fkey"
    FOREIGN KEY ("topicId", "category") REFERENCES "questionTopics"("id", "category")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
