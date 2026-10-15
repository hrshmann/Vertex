/** True for a MariaDB unique-key violation (e.g. a concurrent insert won the race). */
export function isDuplicateKeyError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "ER_DUP_ENTRY";
}
