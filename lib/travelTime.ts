import { CommodityRoute } from "@/lib/uex";

// CALIBRATE — seed guess. Effective quantum speed in Gm/min; absorbs sublight ends + obstruction reroutes, NOT drive spec speed. Calibrate against wall-clock.
export const QT_SPEED_GM_PER_MIN = 20;

// CALIBRATE — seed guess. Flat quantum spool/calibrate time per jump.
export const SPOOL_CALIBRATE_MIN = 0.5;

// CALIBRATE — seed guess. Landing + ASOP + walk-to-terminal. PILOT-SKILL DEPENDENT and operator-specific — this calibrates to the operator's piloting, not a universal value.
export const TERMINAL_OVERHEAD_MIN = 5;

// CALIBRATE — seed guess. Assumes AUTO cargo-elevator loading, NOT hand-loading. ~7 min for 696 SCU.
export const LOAD_UNLOAD_MIN_PER_SCU = 0.01;

// CALIBRATE — seed guess. +/- band on the point estimate, expressing model uncertainty. Flat band for now; see range model v2 in TODO.
export const ESTIMATE_BAND_PCT = 0.15;

export function estimateTravelMinutes(route: CommodityRoute): number {
  return (
    SPOOL_CALIBRATE_MIN +
    route.distance / QT_SPEED_GM_PER_MIN +
    TERMINAL_OVERHEAD_MIN +
    LOAD_UNLOAD_MIN_PER_SCU * route.scu_origin
  );
}

export function estimateTravelRange(route: CommodityRoute): { min: number; max: number } {
  const point = estimateTravelMinutes(route);
  return {
    min: Math.round(point * (1 - ESTIMATE_BAND_PCT)),
    max: Math.round(point * (1 + ESTIMATE_BAND_PCT)),
  };
}
