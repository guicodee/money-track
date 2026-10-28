ALTER TABLE "account" DROP CONSTRAINT "accounts_user_name_unique";--> statement-breakpoint
DROP INDEX "accounts_user_id_index";--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "accounts_user_id_unique" UNIQUE("user_id");