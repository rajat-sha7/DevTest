import type { Buffers, Mode } from "./content";

export const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** A relative link that opens the playground with the given code loaded. */
export function playgroundLink(mode: Mode, buf: Partial<Buffers>) {
  return `/playground#s=${toB64(JSON.stringify({ m: mode, b: buf }))}`;
}
