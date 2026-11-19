-- Full-text search over item title + description, used by catalog search
-- and by the community-feed broadcast matcher (Phase 2).
ALTER TABLE "items"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", ''))
  ) STORED;

CREATE INDEX "items_search_vector_idx" ON "items" USING GIN ("search_vector");
