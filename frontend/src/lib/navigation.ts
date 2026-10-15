/** Only same-site paths, so a crafted ?next= can't send people to another site after login. */
export function safeNext(next: string | null, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
