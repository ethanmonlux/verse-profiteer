CREATE TABLE "items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"plan_id" bigint NOT NULL,
	"leg_id" bigint,
	"id_commodity" bigint NOT NULL,
	"movement" text NOT NULL,
	"disposition" text,
	"scu" integer NOT NULL,
	"unit_price" numeric,
	"fee" numeric,
	"id_terminal" bigint,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "legs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"plan_id" bigint NOT NULL,
	"seq" integer NOT NULL,
	"id_terminal_origin" bigint NOT NULL,
	"id_terminal_destination" bigint NOT NULL,
	"source_activity" text DEFAULT 'trade' NOT NULL,
	"id_commodity" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text DEFAULT 'operator' NOT NULL,
	"title" text,
	"ship_capacity_scu" integer NOT NULL,
	"allowed_systems" text[] NOT NULL,
	"start_terminal_id" bigint,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_observations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_observations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"tenant_id" text DEFAULT 'operator' NOT NULL,
	"id_commodity" bigint NOT NULL,
	"id_terminal" bigint NOT NULL,
	"price_buy" numeric,
	"price_sell" numeric,
	"scu_available" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"plan_id" bigint,
	"leg_id" bigint
);
--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_leg_id_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."legs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legs" ADD CONSTRAINT "legs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_leg_id_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."legs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_plan_idx" ON "items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "items_leg_idx" ON "items" USING btree ("leg_id");--> statement-breakpoint
CREATE INDEX "items_commodity_idx" ON "items" USING btree ("id_commodity");--> statement-breakpoint
CREATE INDEX "legs_plan_seq_idx" ON "legs" USING btree ("plan_id","seq");--> statement-breakpoint
CREATE INDEX "price_obs_commodity_terminal_observed_idx" ON "price_observations" USING btree ("id_commodity","id_terminal","observed_at");