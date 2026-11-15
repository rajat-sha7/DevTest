/**
 * Worked content for the coding round: what to build, how long it should take,
 * what a good answer must contain, hints, and a reference solution.
 * Keyed by the challenge title (the "(Challenge #n)" suffix is ignored).
 */

export interface Requirement {
  text: string;
  /** regular expression (case-insensitive) that auto-detects this in the user's code */
  pattern?: string;
}

export interface ChallengeContent {
  minutes: number;
  requirements: Requirement[];
  hints: string[];
  starter: string;
  solution: string;
  lookFor: string[];
}

export const cleanTitle = (q: string) => q.replace(/\s*\(Challenge #\d+\)\s*$/, "");

const C: Record<string, ChallengeContent> = {
  /* ------------------------------ Next.js ------------------------------ */
  "Implement a dynamic route segment that fetches data with a cache tag.": {
    minutes: 20,
    requirements: [
      { text: "Reads the dynamic segment (params is a Promise in Next 15)", pattern: "await\\s+params|params:\\s*Promise" },
      { text: "Tags the fetch so it can be revalidated", pattern: "tags\\s*:\\s*\\[" },
      { text: "Handles a missing record with notFound()", pattern: "notFound\\(" },
      { text: "Pre-renders known pages or sets a revalidate window", pattern: "generateStaticParams|revalidate" },
    ],
    hints: [
      "In Next 15 the route params are async, so await them before use.",
      "fetch accepts { next: { tags: [...] } }. Pick a tag name you can target later, like product-<id>.",
      "notFound() from next/navigation renders the closest not-found UI.",
    ],
    starter: `// app/products/[id]/page.tsx
type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {
  // TODO: load the product, tag the request, handle "not found"
}
`,
    solution: `import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const ids: string[] = await fetch("https://api.example.com/products").then((r) => r.json());
  return ids.map((id) => ({ id }));
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const res = await fetch("https://api.example.com/products/" + id, {
    next: { tags: ["product-" + id], revalidate: 3600 },
  });
  if (res.status === 404) notFound();
  const product = await res.json();
  return <h1>{product.name}</h1>;
}

// elsewhere, after an admin edit:
// revalidateTag("product-" + id)
`,
    lookFor: ["A tag per record, so one edit invalidates one page", "Awaiting params (Next 15 change)", "A real not-found path, not a crash"],
  },

  "Build a Server Action for a secure contact form with revalidation.": {
    minutes: 25,
    requirements: [
      { text: "Marked as a server action", pattern: "['\"]use server['\"]" },
      { text: "Validates input on the server (zod or manual checks)", pattern: "safeParse|z\\.object|\\.trim\\(\\)|typeof " },
      { text: "Returns a typed result instead of throwing for user errors", pattern: "return\\s*\\{" },
      { text: "Revalidates affected data after a write", pattern: "revalidatePath|revalidateTag" },
      { text: "Wired to a form with useActionState", pattern: "useActionState" },
    ],
    hints: [
      "Never trust the client: validate again inside the action.",
      "Return { ok: false, errors } for validation problems so the UI can show them.",
      "useActionState(action, initialState) gives you the last result and a pending flag.",
    ],
    starter: `// app/contact/actions.ts
export async function sendMessage(prev: unknown, formData: FormData) {
  // TODO
}
`,
    solution: `"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const Schema = z.object({
  email: z.string().email(),
  message: z.string().trim().min(10).max(1000),
});

export type State = { ok: boolean; errors?: Record<string, string[] | undefined> };

export async function sendMessage(_prev: State, formData: FormData): Promise<State> {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  await db.messages.insert(parsed.data);
  revalidatePath("/admin/messages");
  return { ok: true };
}

// client: const [state, action, pending] = useActionState(sendMessage, { ok: false });
`,
    lookFor: ["Server-side validation, not just HTML attributes", "Expected failures returned, unexpected ones thrown", "Revalidating only what changed"],
  },

  "Configure a Parallel Route for a Dashboard with team and analytics slots.": {
    minutes: 20,
    requirements: [
      { text: "Layout receives the slots as props", pattern: "team\\s*[,:}]|analytics\\s*[,:}]" },
      { text: "Renders children plus both slots", pattern: "\\{team\\}|\\{analytics\\}" },
      { text: "Uses @slot folder naming (shown in comments or paths)", pattern: "@team|@analytics" },
      { text: "Provides a default.tsx fallback for unmatched slots", pattern: "default" },
    ],
    hints: [
      "Slots are folders that start with @, like app/dashboard/@team/page.tsx.",
      "The layout gets each slot as a prop with the same name as the folder (without @).",
      "Add default.tsx to each slot so a hard refresh on a nested URL does not 404.",
    ],
    starter: `// app/dashboard/layout.tsx
export default function DashboardLayout() {
  // TODO: render children, the team slot and the analytics slot
  return null;
}
`,
    solution: `// folders: app/dashboard/@team/page.tsx, app/dashboard/@analytics/page.tsx
// plus app/dashboard/@team/default.tsx and @analytics/default.tsx returning null

export default function DashboardLayout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <main className="md:col-span-3">{children}</main>
      <section aria-label="Team">{team}</section>
      <section aria-label="Analytics" className="md:col-span-2">{analytics}</section>
    </div>
  );
}
`,
    lookFor: ["Knowing slots are props, not routes", "default.tsx for refresh safety", "Independent loading and error states per slot"],
  },

  "Implement an Error Boundary specifically for a nested Route Group.": {
    minutes: 15,
    requirements: [
      { text: "Client component (error.tsx must be one)", pattern: "['\"]use client['\"]" },
      { text: "Receives error and reset props", pattern: "error[\\s\\S]*reset" },
      { text: "Offers a retry that calls reset()", pattern: "reset\\(\\)" },
      { text: "Logs the error in an effect", pattern: "useEffect" },
    ],
    hints: [
      "error.tsx wraps the segment below it, so put it inside the route group folder, e.g. app/(shop)/error.tsx.",
      "It must be a Client Component.",
      "reset() re-renders the segment to try again.",
    ],
    starter: `// app/(shop)/error.tsx
export default function ShopError() {
  // TODO
  return null;
}
`,
    solution: `"use client";
import { useEffect } from "react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("shop segment failed", error.digest, error);
  }, [error]);

  return (
    <div role="alert">
      <h2>Something went wrong in the shop</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
`,
    lookFor: ["Scoped to the group, so the rest of the app stays up", "A retry path", "Not leaking error details to users"],
  },

  "Optimize an image gallery using Next.js Image with responsive sizes.": {
    minutes: 15,
    requirements: [
      { text: "Uses next/image", pattern: "from ['\"]next/image['\"]" },
      { text: "Provides a sizes attribute that matches the layout", pattern: "sizes\\s*=" },
      { text: "Prioritises only the first (above the fold) image", pattern: "priority" },
      { text: "Reserves space (width/height or fill) to avoid layout shift", pattern: "width\\s*=|fill" },
      { text: "Gives every image alt text", pattern: "alt\\s*=" },
    ],
    hints: [
      "sizes tells the browser how wide the image will be so it can pick a srcset entry.",
      "Use priority on the LCP image only, lazy loading handles the rest.",
      "Without width/height (or fill + a sized parent) you get layout shift.",
    ],
    starter: `// components/Gallery.tsx
type Photo = { src: string; alt: string };

export function Gallery({ photos }: { photos: Photo[] }) {
  // TODO
  return null;
}
`,
    solution: `import Image from "next/image";

type Photo = { src: string; alt: string };

export function Gallery({ photos }: { photos: Photo[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {photos.map((p, i) => (
        <li key={p.src} className="relative aspect-square overflow-hidden rounded-lg">
          <Image
            src={p.src}
            alt={p.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            priority={i === 0}
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
`,
    lookFor: ["sizes that mirror the CSS grid", "priority used once", "No layout shift"],
  },

  "Setup Middleware to handle multi-tenant subdomains.": {
    minutes: 25,
    requirements: [
      { text: "Reads the host header", pattern: "headers\\.get\\(['\"]host['\"]\\)|nextUrl\\.hostname" },
      { text: "Extracts the tenant from the subdomain", pattern: "split\\(['\"]\\.['\"]\\)|subdomain|tenant" },
      { text: "Rewrites (not redirects) to a tenant route", pattern: "NextResponse\\.rewrite" },
      { text: "Limits the matcher so static assets are skipped", pattern: "matcher" },
    ],
    hints: [
      "request.headers.get('host') includes the port in dev, strip it.",
      "rewrite keeps the URL the user sees; redirect changes it.",
      "Use config.matcher to exclude _next, images and api routes.",
    ],
    starter: `// middleware.ts
import { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // TODO
}
`,
    solution: `import { NextRequest, NextResponse } from "next/server";

const ROOT = "example.com";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const tenant = host.endsWith("." + ROOT) ? host.slice(0, -(ROOT.length + 1)) : null;

  if (!tenant || tenant === "www") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/tenants/" + tenant + url.pathname;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\\\..*).*)"],
};
`,
    lookFor: ["Rewrite vs redirect", "Matcher keeps the hot path cheap", "Handles www and the bare domain"],
  },

  "Create a Partial Prerendering (PPR) layout for an e-commerce page.": {
    minutes: 25,
    requirements: [
      { text: "Static shell renders without waiting for dynamic data", pattern: "<Suspense" },
      { text: "Gives Suspense a meaningful fallback", pattern: "fallback\\s*=" },
      { text: "Dynamic parts read cookies/headers or fetch no-store", pattern: "cookies\\(|headers\\(|no-store" },
      { text: "Product info stays static/cached", pattern: "use cache|revalidate|generateStaticParams" },
    ],
    hints: [
      "PPR serves a static shell and streams the dynamic holes in.",
      "Wrap anything personalised (cart, recommendations) in Suspense.",
      "Keep the product details cacheable so the shell is instant.",
    ],
    starter: `// app/products/[id]/page.tsx
export default async function Page() {
  // TODO: static product block + dynamic cart/recommendations
  return null;
}
`,
    solution: `import { Suspense } from "react";
import { cookies } from "next/headers";

async function Cart() {
  const id = (await cookies()).get("cart")?.value;
  const cart = id ? await fetch("https://api.example.com/cart/" + id, { cache: "no-store" }).then((r) => r.json()) : { items: [] };
  return <p>{cart.items.length} items in your cart</p>;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetch("https://api.example.com/products/" + id, { next: { revalidate: 3600 } }).then((r) => r.json());

  return (
    <>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <Suspense fallback={<p>Loading your cart...</p>}>
        <Cart />
      </Suspense>
    </>
  );
}
`,
    lookFor: ["Knows what makes a component dynamic", "Boundaries placed tightly around the dynamic part", "A fallback that does not shift layout"],
  },

  "Implement intercepting routes for a social media photo feed.": {
    minutes: 25,
    requirements: [
      { text: "Uses the (.) intercept convention in a folder name (comment or path)", pattern: "\\(\\.\\)|\\(\\.\\.\\)" },
      { text: "Renders the photo in an accessible dialog", pattern: "role=['\"]dialog|<dialog" },
      { text: "Closes the modal by going back", pattern: "router\\.back\\(\\)|useRouter" },
      { text: "Clicking inside the dialog does not close it", pattern: "stopPropagation" },
    ],
    hints: [
      "app/@modal/(.)photo/[id]/page.tsx intercepts /photo/[id] from the same level.",
      "The same URL still has a normal page at app/photo/[id]/page.tsx for refreshes and sharing.",
      "router.back() closes the modal and restores the feed URL.",
    ],
    starter: `// the intercepting route that shows a photo from the feed
export default function PhotoView() {
  // TODO
  return null;
}
`,
    solution: `"use client";
import { useRouter } from "next/navigation";
import { use } from "react";

// intercepts /photo/[id] while staying on the feed (folder: app/@modal/(.)photo/[id])
export default function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/60" onClick={() => router.back()}>
      <div className="rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <img src={"/photos/" + id + ".jpg"} alt="" />
        <button onClick={() => router.back()}>Close</button>
      </div>
    </div>
  );
}

// the same URL as a full page: app/photo/[id]/page.tsx (PhotoPage) for refresh and sharing
`,
    lookFor: ["Understands the soft vs hard navigation split", "A real page behind the modal", "Accessible dialog"],
  },

  "Configure dynamic metadata based on an asynchronous DB lookup.": {
    minutes: 15,
    requirements: [
      { text: "Exports generateMetadata", pattern: "export\\s+(async\\s+)?function\\s+generateMetadata" },
      { text: "Awaits params before using them", pattern: "await\\s+params" },
      { text: "Sets title, description and openGraph", pattern: "openGraph" },
      { text: "Dedupes the lookup with cache()", pattern: "cache\\(" },
    ],
    hints: [
      "generateMetadata and the page both need the record. React's cache() makes the lookup run once.",
      "Return a Metadata object with title, description and openGraph.images.",
      "Handle a missing record by returning minimal metadata (or calling notFound()).",
    ],
    starter: `// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

// TODO: add metadata for this page, built from the post in the database

export default async function Page() {
  return null;
}
`,
    solution: `import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

const getPost = cache(async (slug: string) => {
  const res = await fetch("https://api.example.com/posts/" + slug);
  return res.ok ? res.json() : null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.summary,
    openGraph: { title: post.title, description: post.summary, images: [post.cover] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return <article>{post.title}</article>;
}
`,
    lookFor: ["One lookup shared by metadata and page", "Graceful missing-record handling", "Social tags, not just a title"],
  },

  "Build a streaming search component using Suspense and useDeferredValue.": {
    minutes: 25,
    requirements: [
      { text: "Defers the query so typing stays responsive", pattern: "useDeferredValue" },
      { text: "Wraps the results in Suspense", pattern: "<Suspense" },
      { text: "Shows stale results while loading (isStale styling)", pattern: "deferred\\s*!==|!==\\s*deferred|isStale" },
      { text: "Results component reads data with use() or an async server component", pattern: "\\buse\\(|async function" },
    ],
    hints: [
      "const deferred = useDeferredValue(query) lags behind query while React renders.",
      "Compare query !== deferred to dim the old results during the update.",
      "Pass a promise keyed by the deferred value and read it with use() under Suspense.",
    ],
    starter: `"use client";
export function Search() {
  // TODO: input + streaming results
  return null;
}
`,
    solution: `"use client";
import { Suspense, use, useDeferredValue, useState } from "react";

const cache = new Map<string, Promise<string[]>>();
function search(q: string) {
  if (!cache.has(q)) cache.set(q, fetch("/api/search?q=" + encodeURIComponent(q)).then((r) => r.json()));
  return cache.get(q)!;
}

function Results({ query }: { query: string }) {
  const items = use(search(query));
  return <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>;
}

export function Search() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const isStale = query !== deferred;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <Suspense fallback={<p>Searching...</p>}>
          <Results query={deferred} />
        </Suspense>
      </div>
    </>
  );
}
`,
    lookFor: ["Input never blocks on the network", "Stale UI instead of a flashing spinner", "Cache so the same promise is reused"],
  },

  /* ------------------------------- React ------------------------------- */
  "Create a custom useDebounce hook with TypeScript generics.": {
    minutes: 10,
    requirements: [
      { text: "Clears the timer on change and unmount", pattern: "clearTimeout" },
      { text: "Returns the debounced value", pattern: "return\\s+debounced" },
      { text: "Re-runs when value or delay change", pattern: "\\[\\s*value\\s*,\\s*delay\\s*\\]" },
      { text: "Starts with the initial value", pattern: "useState(<T>)?\\(value\\)" },
    ],
    hints: ["Store the debounced value in state.", "Schedule setDebounced in an effect and return the cleanup.", "delay should be a dependency too."],
    starter: `export function useDebounce<T>(value: T, delay = 300): T {
  // TODO
}
`,
    solution: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
`,
    lookFor: ["Cleanup of the timer", "Correct dependencies", "No stale closure"],
  },

  "Implement a Compound Component pattern for a Select dropdown.": {
    minutes: 25,
    requirements: [
      { text: "Shares state through a Context", pattern: "createContext" },
      { text: "Exposes sub-components (Select.Option, Select.Trigger...)", pattern: "Select\\.\\w+\\s*=" },
      { text: "Throws a helpful error when used outside the parent", pattern: "throw new Error" },
      { text: "Marks the selected option for accessibility", pattern: "aria-selected|aria-expanded|role=" },
    ],
    hints: ["Parent owns value and open state and provides them via context.", "Attach children as static properties: Select.Option = Option.", "Add a useSelect() hook that throws when the context is missing."],
    starter: `export function Select() {
  // TODO: Select, Select.Trigger, Select.Option
  return null;
}
`,
    solution: `import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { value: string | null; open: boolean; setOpen: (o: boolean) => void; choose: (v: string) => void };
const SelectContext = createContext<Ctx | null>(null);

function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select.* must be used inside <Select>");
  return ctx;
}

export function Select({ children, onChange }: { children: ReactNode; onChange?: (v: string) => void }) {
  const [value, setValue] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const choose = (v: string) => { setValue(v); setOpen(false); onChange?.(v); };
  return <SelectContext.Provider value={{ value, open, setOpen, choose }}><div>{children}</div></SelectContext.Provider>;
}

function Trigger({ placeholder = "Choose" }: { placeholder?: string }) {
  const { value, open, setOpen } = useSelect();
  return <button aria-expanded={open} onClick={() => setOpen(!open)}>{value ?? placeholder}</button>;
}

function Options({ children }: { children: ReactNode }) {
  const { open } = useSelect();
  return open ? <ul role="listbox">{children}</ul> : null;
}

function Option({ value, children }: { value: string; children: ReactNode }) {
  const { value: current, choose } = useSelect();
  return <li role="option" aria-selected={current === value} onClick={() => choose(value)}>{children}</li>;
}

Select.Trigger = Trigger;
Select.Options = Options;
Select.Option = Option;
`,
    lookFor: ["Flexible composition instead of prop soup", "Context misuse guarded", "Accessible roles"],
  },

  "Build an HOC for Role-Based Access Control (RBAC).": {
    minutes: 15,
    requirements: [
      { text: "Takes a component and the allowed roles", pattern: "allowed|roles" },
      { text: "Returns a new component that forwards props", pattern: "\\.\\.\\.props" },
      { text: "Renders a fallback when the role is not allowed", pattern: "fallback|return null|Navigate|Forbidden" },
      { text: "Sets a displayName for debugging", pattern: "displayName" },
    ],
    hints: ["Read the current user from a hook or context inside the wrapper.", "Generic over the wrapped component's props: <P extends object>.", "Set displayName so DevTools shows withRole(Page)."],
    starter: `export function withRole() {
  // TODO
}
`,
    solution: `import type { ComponentType } from "react";

type Role = "admin" | "editor" | "viewer";
declare function useAuth(): { user: { role: Role } | null };

export function withRole<P extends object>(Wrapped: ComponentType<P>, allowed: Role[], Fallback: ComponentType = () => <p>Not allowed</p>) {
  function WithRole(props: P) {
    const { user } = useAuth();
    if (!user || !allowed.includes(user.role)) return <Fallback />;
    return <Wrapped {...props} />;
  }
  WithRole.displayName = "withRole(" + (Wrapped.displayName || Wrapped.name || "Component") + ")";
  return WithRole;
}

// const AdminPage = withRole(Page, ["admin"]);
`,
    lookFor: ["Props typed through the HOC", "UI gating is not security (the server must check too)", "displayName"],
  },

  "Optimize a large list using React Virtualization logic (manual).": {
    minutes: 30,
    requirements: [
      { text: "Tracks scrollTop", pattern: "scrollTop" },
      { text: "Computes the visible range from item height", pattern: "Math\\.floor|itemHeight" },
      { text: "Adds overscan so fast scrolls do not flash blank", pattern: "overscan" },
      { text: "Positions the window with an offset or padding", pattern: "translateY|paddingTop|top\\s*:" },
      { text: "Renders only the slice", pattern: "\\.slice\\(" },
    ],
    hints: ["start = floor(scrollTop / itemHeight) - overscan, end = start + visibleCount + 2 * overscan.", "Give the scroll container a fixed height and an inner spacer of total height.", "Translate the rendered slice by start * itemHeight."],
    starter: `export function VirtualList({ items }: { items: string[] }) {
  // TODO: only render what is visible
  return null;
}
`,
    solution: `import { useState } from "react";

const ITEM = 40;
const HEIGHT = 400;
const OVERSCAN = 5;

export function VirtualList({ items }: { items: string[] }) {
  const [scrollTop, setScrollTop] = useState(0);

  const start = Math.max(0, Math.floor(scrollTop / ITEM) - OVERSCAN);
  const visible = Math.ceil(HEIGHT / ITEM) + OVERSCAN * 2;
  const end = Math.min(items.length, start + visible);

  return (
    <div style={{ height: HEIGHT, overflow: "auto" }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * ITEM, position: "relative" }}>
        <ul style={{ position: "absolute", top: 0, left: 0, right: 0, transform: "translateY(" + start * ITEM + "px)" }}>
          {items.slice(start, end).map((it, i) => (
            <li key={start + i} style={{ height: ITEM }}>{it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
`,
    lookFor: ["Constant DOM size however long the list", "Overscan", "Stable keys"],
  },

  "Implement an Optimistic UI update using React 19's useOptimistic.": {
    minutes: 20,
    requirements: [
      { text: "Uses useOptimistic with a reducer", pattern: "useOptimistic" },
      { text: "Applies the optimistic change before awaiting the server", pattern: "addOptimistic|setOptimistic" },
      { text: "Runs inside a form action or transition", pattern: "action\\s*=|startTransition" },
      { text: "Rolls back naturally on failure (state comes from real data)", pattern: "await\\s" },
    ],
    hints: ["const [items, addOptimistic] = useOptimistic(real, (state, next) => [...state, next]).", "Call addOptimistic(...) first, then await the server call.", "When the action settles React discards the optimistic state and shows the real one."],
    starter: `"use client";
export function Comments({ comments }: { comments: string[] }) {
  // TODO
  return null;
}
`,
    solution: `"use client";
import { useOptimistic } from "react";

declare function saveComment(text: string): Promise<void>;

export function Comments({ comments }: { comments: string[] }) {
  const [shown, addOptimistic] = useOptimistic(comments, (state, text: string) => [...state, text + " (sending...)"]);

  async function action(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    addOptimistic(text);
    await saveComment(text);
  }

  return (
    <>
      <ul>{shown.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <form action={action}>
        <input name="text" />
        <button>Post</button>
      </form>
    </>
  );
}
`,
    lookFor: ["Instant feedback", "Automatic rollback", "Pending items visibly marked"],
  },

  "Build a custom hook for handling WebSocket connections with retry logic.": {
    minutes: 30,
    requirements: [
      { text: "Opens a WebSocket in an effect", pattern: "new WebSocket" },
      { text: "Retries with exponential backoff", pattern: "Math\\.pow|\\*\\*|backoff|attempt" },
      { text: "Cleans up the socket and timers", pattern: "\\.close\\(\\)|clearTimeout" },
      { text: "Stops retrying after unmount", pattern: "cancelled|closed|unmounted|active" },
      { text: "Exposes connection status", pattern: "status|readyState" },
    ],
    hints: ["Keep attempt count in a ref so retries do not re-trigger the effect.", "delay = Math.min(30000, 500 * 2 ** attempt).", "A flag set in cleanup prevents reconnecting after unmount."],
    starter: `export function useSocket(url: string) {
  // TODO: return { status, lastMessage, send }
}
`,
    solution: `import { useCallback, useEffect, useRef, useState } from "react";

export function useSocket(url: string) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(url);
      ws.current = socket;
      socket.onopen = () => { attempt = 0; setStatus("open"); };
      socket.onmessage = (e) => setLastMessage(String(e.data));
      socket.onclose = () => {
        setStatus("closed");
        if (cancelled) return;
        const delay = Math.min(30000, 500 * 2 ** attempt++);
        timer = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ws.current?.close();
    };
  }, [url]);

  const send = useCallback((data: string) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(data), []);
  return { status, lastMessage, send };
}
`,
    lookFor: ["Backoff with a cap", "No reconnect after unmount", "No effect loop from state in deps"],
  },

  "Implement a recursive tree component for a file explorer.": {
    minutes: 20,
    requirements: [
      { text: "Component renders itself for children", pattern: "<FileTree\\b[^>]*node=" },
      { text: "Tracks expanded state per node", pattern: "useState" },
      { text: "Distinguishes folders from files", pattern: "node\\.children" },
      { text: "Uses accessible tree roles/aria-expanded", pattern: "aria-expanded|role=['\"]tree|treeitem" },
    ],
    hints: ["Model: { name, children?: Node[] }. A node with children is a folder.", "Each folder owns its open/closed state with useState.", "Add role=tree / treeitem and aria-expanded for screen readers."],
    starter: `type Node = { name: string; children?: Node[] };

export function FileTree({ node }: { node: Node }) {
  // TODO
  return null;
}
`,
    solution: `import { useState } from "react";

type Node = { name: string; children?: Node[] };

export function FileTree({ node }: { node: Node }) {
  const [open, setOpen] = useState(false);
  const isFolder = !!node.children;

  return (
    <li role="treeitem" aria-expanded={isFolder ? open : undefined}>
      <button onClick={() => isFolder && setOpen((o) => !o)}>
        {isFolder ? (open ? "v " : "> ") : "- "}
        {node.name}
      </button>
      {isFolder && open && (
        <ul role="group" style={{ paddingLeft: 16 }}>
          {node.children!.map((c) => (
            <FileTree key={c.name} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

// <ul role="tree"><FileTree node={root} /></ul>
`,
    lookFor: ["Recursion with a clear base case", "State kept per node", "Accessible semantics"],
  },

  "Create a form manager using useReducer for complex validation.": {
    minutes: 25,
    requirements: [
      { text: "Uses useReducer with typed actions", pattern: "useReducer" },
      { text: "Validates per field", pattern: "validate" },
      { text: "Tracks touched fields so errors show at the right time", pattern: "touched" },
      { text: "Blocks submit while invalid", pattern: "isValid|disabled|preventDefault" },
    ],
    hints: ["State: { values, errors, touched }. Actions: change, blur, reset.", "Derive errors from values with one pure validate(values) function.", "Only show an error when the field is touched."],
    starter: `export function SignupForm() {
  // TODO
  return null;
}
`,
    solution: `import { useReducer } from "react";

type Values = { email: string; password: string };
type State = { values: Values; touched: Partial<Record<keyof Values, boolean>> };
type Action =
  | { type: "change"; field: keyof Values; value: string }
  | { type: "blur"; field: keyof Values }
  | { type: "reset" };

const initial: State = { values: { email: "", password: "" }, touched: {} };

function validate(v: Values) {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (!/^\\S+@\\S+\\.\\S+$/.test(v.email)) errors.email = "Enter a valid email";
  if (v.password.length < 8) errors.password = "At least 8 characters";
  return errors;
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "change": return { ...s, values: { ...s.values, [a.field]: a.value } };
    case "blur": return { ...s, touched: { ...s.touched, [a.field]: true } };
    case "reset": return initial;
  }
}

export function SignupForm() {
  const [state, dispatch] = useReducer(reducer, initial);
  const errors = validate(state.values);
  const isValid = Object.keys(errors).length === 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (isValid) console.log(state.values); }}>
      {(["email", "password"] as const).map((f) => (
        <label key={f}>
          {f}
          <input value={state.values[f]} onChange={(e) => dispatch({ type: "change", field: f, value: e.target.value })} onBlur={() => dispatch({ type: "blur", field: f })} />
          {state.touched[f] && errors[f] && <span role="alert">{errors[f]}</span>}
        </label>
      ))}
      <button disabled={!isValid}>Sign up</button>
    </form>
  );
}
`,
    lookFor: ["Errors derived, not stored", "Touched logic", "Exhaustive reducer"],
  },

  "Optimize component rendering using React.memo and custom comparators.": {
    minutes: 20,
    requirements: [
      { text: "Wraps the child in React.memo", pattern: "memo\\(" },
      { text: "Custom comparator that checks only relevant props", pattern: "prev|next|areEqual" },
      { text: "Stabilises callbacks with useCallback", pattern: "useCallback" },
      { text: "Keeps object props stable with useMemo", pattern: "useMemo" },
    ],
    hints: ["memo skips re-render only when props are shallow-equal.", "Inline functions and objects are new every render, so stabilise them.", "A custom comparator can compare just id and updatedAt."],
    starter: `export function Parent() {
  // TODO: a list whose rows do not re-render when unrelated state changes
  return null;
}
`,
    solution: `import { memo, useCallback, useMemo, useState } from "react";

type Row = { id: number; label: string; updatedAt: number };

const RowView = memo(
  function RowView({ row, onSelect }: { row: Row; onSelect: (id: number) => void }) {
    return <li onClick={() => onSelect(row.id)}>{row.label}</li>;
  },
  (prev, next) => prev.row.id === next.row.id && prev.row.updatedAt === next.row.updatedAt && prev.onSelect === next.onSelect
);

export function Parent({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const onSelect = useCallback((id: number) => setSelected(id), []);
  const visible = useMemo(() => rows.filter((r) => r.label.includes(filter)), [rows, filter]);

  return (
    <>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <p>Selected: {selected}</p>
      <ul>{visible.map((r) => <RowView key={r.id} row={r} onSelect={onSelect} />)}</ul>
    </>
  );
}
`,
    lookFor: ["Measures before optimising", "Stable references", "Comparator that cannot hide real changes"],
  },

  "Implement a Theme Provider using Context API with persistent storage.": {
    minutes: 20,
    requirements: [
      { text: "Context with a custom hook", pattern: "createContext|useTheme" },
      { text: "Persists the choice in localStorage", pattern: "localStorage" },
      { text: "Reads storage after mount (no SSR mismatch)", pattern: "useEffect" },
      { text: "Applies the theme to the document", pattern: "documentElement|data-theme|classList" },
      { text: "Respects the system preference by default", pattern: "prefers-color-scheme" },
    ],
    hints: ["Read localStorage in an effect so server and client first render match.", "Default to matchMedia('(prefers-color-scheme: dark)').", "Set data-theme on document.documentElement."],
    starter: `export function ThemeProvider() {
  // TODO: ThemeProvider + useTheme
  return null;
}
`,
    solution: `import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const system: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved ?? system);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
`,
    lookFor: ["No hydration mismatch", "Storage failures handled", "System preference respected"],
  },
};

const GENERIC: ChallengeContent = {
  minutes: 25,
  requirements: [
    { text: "Clear separation of concerns" },
    { text: "Typed props and return values" },
    { text: "Handles loading, empty and error states" },
  ],
  hints: ["Start with the data shape.", "Write the happy path first, then edge cases.", "Say your trade-offs out loud."],
  starter: "// Write your solution here\n",
  solution: "// No reference solution for this challenge yet.\n",
  lookFor: ["Clean structure", "Edge cases", "Communication"],
};

export function contentFor(question: string): ChallengeContent {
  return C[cleanTitle(question)] ?? GENERIC;
}
