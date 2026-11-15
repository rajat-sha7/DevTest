"use client";

import { usePathname } from "next/navigation";

/** Shows the path that was not found, inside the code sample on the 404 page. */
export function NotFoundPath() {
  const path = usePathname() || "/";
  const safe = path.length > 40 ? path.slice(0, 37) + "..." : path;
  return <span className="text-[#86efac]">&quot;{safe}&quot;</span>;
}
