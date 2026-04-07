ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "name" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'fullName'
  ) THEN
    EXECUTE 'UPDATE "User" SET "name" = "fullName" WHERE "name" IS NULL AND "fullName" IS NOT NULL';
  END IF;
END $$;
