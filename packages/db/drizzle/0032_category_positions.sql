ALTER TABLE "categories" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_position_nonnegative_check" CHECK ("categories"."position" >= 0);--> statement-breakpoint
-- Existing categories keep the alphabetical order they were shown in, within each type and parent.
UPDATE "categories" AS "c" SET "position" = "o"."position"
FROM (
	SELECT "id", (row_number() OVER (PARTITION BY "user_id", "type", "parent_id" ORDER BY "name", "id") - 1)::integer AS "position"
	FROM "categories"
) AS "o"
WHERE "c"."id" = "o"."id";
