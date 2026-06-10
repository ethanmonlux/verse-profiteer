// Thin async accessor for the spine tables (plans, legs, items, price_observations).
// All derivation — profit, carry-state, distance, duration, estimates — is done
// on read elsewhere (Spine Rule). This module stores and returns rows verbatim.
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plans, legs, items, priceObservations } from "@/lib/db/schema";

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Leg = typeof legs.$inferSelect;
export type NewLeg = typeof legs.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type PriceObservation = typeof priceObservations.$inferSelect;
export type NewPriceObservation = typeof priceObservations.$inferInsert;

// Plans

export async function createPlan(input: NewPlan): Promise<Plan> {
  const db = getDb();
  const rows = await db.insert(plans).values(input).returning();
  return rows[0];
}

export async function getPlan(id: number): Promise<Plan | null> {
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listPlans(tenantId: string): Promise<Plan[]> {
  const db = getDb();
  return db
    .select()
    .from(plans)
    .where(eq(plans.tenantId, tenantId))
    .orderBy(desc(plans.createdAt));
}

export async function updatePlanStatus(
  id: number,
  status: string,
): Promise<Plan | null> {
  const db = getDb();
  const rows = await db
    .update(plans)
    .set({ status, updatedAt: new Date() })
    .where(eq(plans.id, id))
    .returning();
  return rows[0] ?? null;
}

// Legs

export async function appendLeg(input: NewLeg): Promise<Leg> {
  const db = getDb();
  const rows = await db.insert(legs).values(input).returning();
  return rows[0];
}

export async function listLegsByPlan(planId: number): Promise<Leg[]> {
  const db = getDb();
  return db
    .select()
    .from(legs)
    .where(eq(legs.planId, planId))
    .orderBy(asc(legs.seq));
}

// Items

export async function appendItem(input: NewItem): Promise<Item> {
  const db = getDb();
  const rows = await db.insert(items).values(input).returning();
  return rows[0];
}

export async function listItemsByPlan(planId: number): Promise<Item[]> {
  const db = getDb();
  return db
    .select()
    .from(items)
    .where(eq(items.planId, planId))
    .orderBy(asc(items.occurredAt));
}

export async function listItemsByLeg(legId: number): Promise<Item[]> {
  const db = getDb();
  return db
    .select()
    .from(items)
    .where(eq(items.legId, legId))
    .orderBy(asc(items.occurredAt));
}

// Observations

export async function insertObservation(
  input: NewPriceObservation,
): Promise<PriceObservation> {
  const db = getDb();
  const rows = await db.insert(priceObservations).values(input).returning();
  return rows[0];
}

export async function getLatestObservation(
  idCommodity: number,
  idTerminal: number,
): Promise<PriceObservation | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(priceObservations)
    .where(
      and(
        eq(priceObservations.idCommodity, idCommodity),
        eq(priceObservations.idTerminal, idTerminal),
      ),
    )
    .orderBy(desc(priceObservations.observedAt))
    .limit(1);
  return rows[0] ?? null;
}
