CREATE TYPE "public"."device_token_kind" AS ENUM('companion', 'n8n');--> statement-breakpoint
ALTER TABLE "device_tokens" ADD COLUMN "kind" "device_token_kind" DEFAULT 'companion' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN "integration_kind" "device_token_kind" DEFAULT 'companion' NOT NULL;