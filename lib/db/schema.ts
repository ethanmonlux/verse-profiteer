import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const routesMirror = pgTable(
  "routes_mirror",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    idCommodity: bigint("id_commodity", { mode: "number" }),
    idTerminalOrigin: bigint("id_terminal_origin", { mode: "number" }),
    idTerminalDestination: bigint("id_terminal_destination", { mode: "number" }),
    idStarSystemOrigin: bigint("id_star_system_origin", { mode: "number" }),
    idStarSystemDestination: bigint("id_star_system_destination", {
      mode: "number",
    }),
    priceOrigin: numeric("price_origin"),
    priceDestination: numeric("price_destination"),
    profit: numeric("profit"),
    investment: numeric("investment"),
    distance: numeric("distance"),
    scuOrigin: numeric("scu_origin"),
    scuDestination: numeric("scu_destination"),
    scuReachable: numeric("scu_reachable"),
    statusOrigin: integer("status_origin"),
    statusDestination: integer("status_destination"),
    containerSizesOrigin: integer("container_sizes_origin").array(),
    containerSizesDestination: integer("container_sizes_destination").array(),
    gameVersionOrigin: text("game_version_origin"),
    gameVersionDestination: text("game_version_destination"),
    raw: jsonb("raw").notNull(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("routes_mirror_id_commodity_idx").on(table.idCommodity),
    index("routes_mirror_star_systems_idx").on(
      table.idStarSystemOrigin,
      table.idStarSystemDestination,
    ),
  ],
);

export const terminalsMirror = pgTable("terminals_mirror", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  isAutoLoad: integer("is_auto_load"),
  starSystemName: text("star_system_name"),
  planetName: text("planet_name"),
  moonName: text("moon_name"),
  outpostName: text("outpost_name"),
  isCargoCenter: integer("is_cargo_center"),
  hasFreightElevator: integer("has_freight_elevator"),
  hasLoadingDock: integer("has_loading_dock"),
  hasDockingPort: integer("has_docking_port"),
  raw: jsonb("raw").notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});
