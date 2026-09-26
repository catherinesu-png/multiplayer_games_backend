ALTER TABLE "GameVersion"
ADD COLUMN "capabilities" JSONB,
ADD COLUMN "engineKey" TEXT,
ADD COLUMN "engineVersion" INTEGER;

UPDATE "GameVersion"
SET
  "capabilities" = COALESCE("manifest"->'capabilities', '{}'::jsonb),
  "engineKey" = COALESCE("manifest"->'engine'->>'key', 'unknown'),
  "engineVersion" = COALESCE(("manifest"->'engine'->>'version')::integer, 1);

ALTER TABLE "GameVersion"
ALTER COLUMN "capabilities" SET NOT NULL,
ALTER COLUMN "engineKey" SET NOT NULL,
ALTER COLUMN "engineVersion" SET NOT NULL;
