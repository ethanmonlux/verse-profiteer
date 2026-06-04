CREATE TABLE "routes_mirror" (
	"id" bigint PRIMARY KEY NOT NULL,
	"id_commodity" bigint,
	"id_terminal_origin" bigint,
	"id_terminal_destination" bigint,
	"id_star_system_origin" bigint,
	"id_star_system_destination" bigint,
	"price_origin" numeric,
	"price_destination" numeric,
	"profit" numeric,
	"investment" numeric,
	"distance" numeric,
	"scu_origin" numeric,
	"scu_destination" numeric,
	"scu_reachable" numeric,
	"status_origin" integer,
	"status_destination" integer,
	"container_sizes_origin" integer[],
	"container_sizes_destination" integer[],
	"game_version_origin" text,
	"game_version_destination" text,
	"raw" jsonb NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminals_mirror" (
	"id" bigint PRIMARY KEY NOT NULL,
	"is_auto_load" integer,
	"star_system_name" text,
	"planet_name" text,
	"moon_name" text,
	"outpost_name" text,
	"is_cargo_center" integer,
	"has_freight_elevator" integer,
	"has_loading_dock" integer,
	"has_docking_port" integer,
	"raw" jsonb NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "routes_mirror_id_commodity_idx" ON "routes_mirror" USING btree ("id_commodity");--> statement-breakpoint
CREATE INDEX "routes_mirror_star_systems_idx" ON "routes_mirror" USING btree ("id_star_system_origin","id_star_system_destination");