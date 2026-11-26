import { headers } from "next/headers";

/**
 * Small in-memory rate limiter for the AI server actions, which spend Groq quota.
 * App Hosting runs one instance (maxInstances: 1 in apphosting.yaml), so a per-process
 * window is enough; if you scale out, move this to a shared store.
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

async function clientIp() {
  const h = await headers();
  // App Hosting (Cloud Run) puts the real client first in x-forwarded-for
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns false when this client made `limit` calls to `bucket` within `windowMs`. */
export async function allow(bucket: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${bucket}:${await clientIp()}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const ok = recent.length < limit;
  if (ok) recent.push(now);
  hits.set(key, recent);

  // drop idle clients now and then so the map can't grow without bound
  if (now - lastSweep > 10 * 60_000) {
    lastSweep = now;
    for (const [k, ts] of hits) if (!ts.length || now - ts[ts.length - 1] > 60 * 60_000) hits.delete(k);
  }
  return ok;
}
