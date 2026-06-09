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

export const plans = pgTable("plans", {
  id: bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull().default("operator"),
  title: text("title"),
  shipCapacityScu: integer("ship_capacity_scu").notNull(),
  allowedSystems: text("allowed_systems").array().notNull(),
  startTerminalId: bigint("start_terminal_id", { mode: "number" }),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const legs = pgTable(
  "legs",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    planId: bigint("plan_id", { mode: "number" })
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    idTerminalOrigin: bigint("id_terminal_origin", { mode: "number" }).notNull(),
    idTerminalDestination: bigint("id_terminal_destination", {
      mode: "number",
    }).notNull(),
    sourceActivity: text("source_activity").notNull().default("trade"),
    idCommodity: bigint("id_commodity", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("legs_plan_seq_idx").on(table.planId, table.seq)],
);

export const items = pgTable(
  "items",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    planId: bigint("plan_id", { mode: "number" })
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    legId: bigint("leg_id", { mode: "number" }).references(() => legs.id, {
      onDelete: "set null",
    }),
    idCommodity: bigint("id_commodity", { mode: "number" }).notNull(),
    movement: text("movement").notNull(),
    disposition: text("disposition"),
    scu: integer("scu").notNull(),
    unitPrice: numeric("unit_price"),
    fee: numeric("fee"),
    idTerminal: bigint("id_terminal", { mode: "number" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
  },
  (table) => [
    index("items_plan_idx").on(table.planId),
    index("items_leg_idx").on(table.legId),
    index("items_commodity_idx").on(table.idCommodity),
  ],
);

export const priceObservations = pgTable(
  "price_observations",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    tenantId: text("tenant_id").notNull().default("operator"),
    idCommodity: bigint("id_commodity", { mode: "number" }).notNull(),
    idTerminal: bigint("id_terminal", { mode: "number" }).notNull(),
    priceBuy: numeric("price_buy"),
    priceSell: numeric("price_sell"),
    scuAvailable: integer("scu_available"),
    source: text("source").notNull().default("manual"),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    planId: bigint("plan_id", { mode: "number" }).references(() => plans.id, {
      onDelete: "set null",
    }),
    legId: bigint("leg_id", { mode: "number" }).references(() => legs.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("price_obs_commodity_terminal_observed_idx").on(
      table.idCommodity,
      table.idTerminal,
      table.observedAt,
    ),
  ],
);
