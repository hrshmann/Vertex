/** Parses a `?limit=` query value, falling back on missing/invalid input and capping at `max`. */
export function parseLimit(raw: unknown, fallback: number, max: number): number {
  const value = Number(raw ?? fallback);
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}
