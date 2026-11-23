ALTER TABLE "account" DROP CONSTRAINT "accounts_user_id_unique";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "current_balance" numeric(14, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "applied_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_pending_index" ON "transactions" USING btree ("occurred_at") WHERE "transactions"."deleted_at" IS NULL AND "transactions"."applied_at" IS NULL AND "transactions"."operationType" <> 'TRANSFER';--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "accounts_user_name_unique" UNIQUE("user_id","name");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_not_applied" CHECK ("transactions"."operationType" <> 'TRANSFER' OR "transactions"."applied_at" IS NULL);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_not_applied" CHECK ("transactions"."deleted_at" IS NULL OR "transactions"."applied_at" IS NULL);