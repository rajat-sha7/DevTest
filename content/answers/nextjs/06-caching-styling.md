=== n139 | H | How do you implement caching strategies in Next.js?
**Decide per piece of data how fresh it must be, then use the matching tool: prerender static content, cache shared data with `"use cache"` plus `cacheLife` and `cacheTag`, stream per-request data behind `<Suspense>`, deduplicate within a request with `React.cache`, and invalidate on writes with `updateTag` or `revalidateTag`. This describes Cache Components, the default for new apps in Next.js 16.4.**

### A practical decision table
| Data | Strategy |
|---|---|
| Marketing copy, docs | Static: no I/O, prerendered automatically |
| CMS content | `"use cache"` + `cacheLife("max")` + `cacheTag`, webhook calls `revalidateTag(tag, "max")` |
| Product catalog | `"use cache"` + `cacheLife("hours")` |
| User's own edits | `updateTag` in the Server Function for read-your-writes |
| Per-user dashboard | Request-time inside `<Suspense>`; cache per user with arguments or `"use cache: private"` |
| Live prices | Uncached, streamed; or client polling with SWR |

### Layers to know
1. **Request memoization:** `fetch` and `React.cache` dedupe within one render.
2. **`use cache` entries:** in-memory LRU per server by default; `"use cache: remote"` for a shared durable store (configure `cacheHandlers`).
3. **Prerendered output:** the static shell and ISR pages (served by a CDN).
4. **Client cache:** the router keeps RSC payloads for the `stale` time (minimum 30 seconds), and keeps visited pages in `<Activity>`.
5. **HTTP/CDN caching:** `Cache-Control` headers on Route Handlers and assets.

### Rules
- Pair every `"use cache"` with a `cacheLife`.
- Never cache per-user data under a shared key.
- Prefer tags over `revalidatePath`; they are precise.
- Keep request-time reads deep in the tree so the static shell is large.
- Cache entries are scoped to a deployment; use `fetch` cache or `unstable_cache` if data must survive deploys.

### Without Cache Components
`fetch` options (`force-cache`, `next.revalidate`, `next.tags`), `unstable_cache`, and segment config (`revalidate`, `dynamic`).
--- code
// lib/data.ts
import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

// Shared across users, revalidated on CMS publish
export async function getArticle(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(`article:${slug}`);
  return db.article.findUnique({ where: { slug } });
}

// Shared, time-based refresh
export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return db.category.findMany();
}

// Per user: user id is part of the cache key
export async function getUserStats(userId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`stats:${userId}`);
  return db.stats.findUnique({ where: { userId } });
}

// Per request dedupe for uncached reads
export const getCart = cache(async (cartId: string) => db.cart.findUnique({ where: { id: cartId } }));

=== n140 | H | What is the full route cache in the App Router?
**The Full Route Cache was the server-side cache of a route's rendered output (HTML plus RSC payload) produced at build time or during revalidation, so static routes could be served without rendering. In Next.js 16 with Cache Components, the same idea is the prerendered static shell, now produced for every route, with dynamic parts streamed into it.**

### Previous model
- At `next build`, static routes were rendered once and stored on disk (or the host's storage).
- Requests were served from that cache; ISR (`revalidate`) regenerated it in the background.
- Any dynamic API (`cookies()`, `headers()`, `searchParams`, uncached `fetch`) opted the **whole route** out, so it rendered on every request.
- Invalidation: `revalidatePath`, `revalidateTag` (via the Data Cache) or a new deployment.
- Opt out: `export const dynamic = 'force-dynamic'` or `revalidate = 0`.

### With Cache Components (Partial Prerendering)
- Every route gets a **static shell**: static content, `"use cache"` results and `<Suspense>` fallbacks, rendered to HTML and an RSC payload.
- Request-time parts stream into the shell; they no longer make the whole route dynamic.
- For dynamic params not listed in `generateStaticParams`, an **App Shell** (URL-independent shell) is served first and the concrete page is generated in the background and stored (ISR).
- Revalidation follows `cacheLife` (`revalidate`, `expire`) and on-demand `revalidateTag`, `updateTag` and `revalidatePath`.

### Where it lives
Self-hosted: on disk in `.next` plus in-memory caches. On platforms: their durable storage and CDN. All entries are scoped to a deployment.

### Interview framing
Explain the old name, then say Next.js 16 moved to per-component prerendering, so the "cache" is the static shell plus cached components rather than an all-or-nothing route cache.
--- code
// app/blog/[slug]/page.tsx (Cache Components)
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { Comments } from "./comments"; // reads cookies: streams at request time

async function Article({ slug }: { slug: string }) {
  "use cache"; // part of the prerendered static shell
  cacheLife("days");
  cacheTag(`post:${slug}`);
  const post = await fetch(`https://cms.example.com/posts/${slug}`).then((r) => r.json());
  return <article><h1>{post.title}</h1></article>;
}

export async function generateStaticParams() {
  return [{ slug: "launch" }]; // prerendered at build; others get the App Shell first
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <Article slug={slug} />
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments slug={slug} />
      </Suspense>
    </>
  );
}

=== n141 | H | What is the router cache in the App Router?
**The Router Cache (now called the Client Cache) is the in-memory browser cache of RSC payloads for route segments you visited or prefetched. It makes back and forward navigation instant and lets layouts be reused. How long entries stay fresh is set by `cacheLife`'s `stale` value (with a 30-second minimum) or by `staleTimes`.**

### What it stores
- Prefetched segments (App Shells or full payloads, depending on `prefetch`).
- Segments rendered during navigation.
- Shared layouts, deduplicated across routes since Next.js 16.

### Freshness
- **Cache Components:** each cached function's `stale` time travels in the `x-nextjs-stale-time` header. The client keeps the content for that long. A minimum of 30 seconds is enforced so prefetched links stay usable.
- **Previous model:** `staleTimes.dynamic` defaults to 0 since Next.js 15 (dynamic pages refetch on each navigation, though layouts and back/forward still reuse cache), and `staleTimes.static` defaults to 5 minutes.
- Back/forward navigation always reuses cached data to restore the previous view.

### Invalidation
- Calling `updateTag`, `revalidateTag`, `revalidatePath` or `refresh()` in a **Server Function** clears the whole client cache in that response.
- `router.refresh()` re-requests the current route from the server and merges it, keeping client state.
- Setting or deleting cookies in a Server Function also invalidates it.
- A full page reload clears it entirely.

### Related: Activity
With Cache Components, pages you navigate away from are kept mounted but hidden with React's `<Activity>`, so their state and DOM survive. That is separate from the data cache but makes Back feel instant.

### Pitfall
After a mutation done outside a Server Function (for example a direct API call), the UI may show stale data until you call `router.refresh()`.
--- code
// next.config.ts (previous model tuning)
// experimental: { staleTimes: { dynamic: 30, static: 180 } }

// lib/data.ts (Cache Components: stale time per function)
import { cacheLife } from "next/cache";
export async function getFeed() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 }); // browser reuses it for 60s
  return fetch("https://api.example.com/feed").then((r) => r.json());
}

// app/feed/refresh-button.tsx
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Re-render on the server and merge, keeping client state
  return <button disabled={pending} onClick={() => start(() => router.refresh())}>Refresh</button>;
}

=== n142 | H | What is the data cache in the App Router?
**The Data Cache is the persistent server-side cache for `fetch` responses in the previous caching model. Responses fetched with `cache: 'force-cache'` or `next: { revalidate }` were stored across requests and deployments and invalidated by time or tags. With Cache Components, `"use cache"` entries take over this role for any async function, not just `fetch`.**

### Previous model details
- Opt in per request: `fetch(url, { cache: 'force-cache' })` or `{ next: { revalidate: 3600, tags: ['posts'] } }`.
- Default since Next.js 15: **not cached** (`no-store` behavior). In Next.js 14 the default was cached.
- Persists across requests and, on Vercel and with a configured handler, across deployments.
- Invalidation: time-based (`revalidate`) or on-demand (`revalidateTag`, `revalidatePath`).
- `unstable_cache(fn, keys, { tags, revalidate })` gave the same caching to database calls.
- Separate from request memoization, which only lasts for one render.

### Cache Components equivalent
- `"use cache"` caches the return value of any async function or component.
- Cache key: build ID, function ID, serialized arguments and captured variables.
- Lifetime: `cacheLife` (`stale`, `revalidate`, `expire`).
- Tags: `cacheTag`; invalidate with `revalidateTag(tag, profile)` or `updateTag(tag)`.
- Storage: in-memory LRU per instance by default (`cacheMaxMemorySize`), `"use cache: remote"` with `cacheHandlers` for shared storage, `"use cache: private"` for browser-only per-user caching.
- Scope: entries are tied to the build, so a new deploy starts fresh. If data must survive deploys, keep using the `fetch` cache or `unstable_cache`, which still work.

### Self-hosting
With multiple instances, configure a custom cache handler (Redis or similar) so all instances share entries and revalidations.
--- code
// Previous model: Data Cache via fetch options and unstable_cache
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export async function getPosts() {
  const res = await fetch("https://cms.example.com/posts", {
    next: { revalidate: 3600, tags: ["posts"] },
  });
  return res.json();
}

export const getAuthors = unstable_cache(
  async () => db.author.findMany(),
  ["authors"],            // key parts
  { tags: ["authors"], revalidate: 3600 }
);

// Cache Components equivalent
import { cacheLife, cacheTag } from "next/cache";

export async function getAuthorsCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("authors");
  return db.author.findMany();
}

=== n143 | M | How do you opt out of caching in the App Router?
**With Cache Components, nothing is cached unless you add `"use cache"`, so opting out means simply not caching and putting request-time work inside `<Suspense>`. Use `await connection()` to force request-time execution for code that reads no request data. In the previous model, use `cache: 'no-store'`, `revalidate = 0` or `dynamic = 'force-dynamic'`.**

### Cache Components
- **Uncached data:** a plain `fetch` or database call is request-time; wrap the component in `<Suspense>`.
- **Request APIs** (`cookies()`, `headers()`, `searchParams`) are request-time automatically.
- **`await connection()`** before `Math.random()`, `Date.now()` or synchronous drivers to keep them out of the prerender.
- **Short `cacheLife`:** `revalidate: 0` or `expire` under 5 minutes turns a cache into a dynamic hole.
- **`navigation()` / `prefetch()`** (16.4) defer expensive subtrees out of the App Shell without making them uncached.
- **`prefetch = 'force-disabled'`** segment config stops prefetching a route.
- Draft Mode bypasses all `use cache` entries automatically.

### Previous model
- `fetch(url, { cache: 'no-store' })` or `{ next: { revalidate: 0 } }` for one request.
- `export const dynamic = 'force-dynamic'` or `export const revalidate = 0` for a whole route.
- `export const fetchCache = 'force-no-store'` for all fetches in a segment.
- `unstable_noStore()` (replaced by `connection()`).

### Client side
- `router.refresh()` to discard client cache for the current route.
- `staleTimes` or a short `cacheLife` `stale` value to shorten client reuse.

### Route Handlers and HTTP
Set `Cache-Control: private, no-store` on responses that CDNs must not cache.
--- code
// app/live/page.tsx (Cache Components)
import { Suspense } from "react";
import { connection } from "next/server";

async function LiveScore() {
  // Not cached: plain fetch, runs per request
  const score = await fetch("https://api.example.com/match/42").then((r) => r.json());
  return <p>{score.home} - {score.away}</p>;
}

async function Ticket() {
  await connection(); // request-time even though no request data is read
  return <p>Ticket #{crypto.randomUUID().slice(0, 8)}</p>;
}

export default function Page() {
  return (
    <main>
      <h1>Live match</h1>
      <Suspense fallback={<p>Loading score…</p>}>
        <LiveScore />
        <Ticket />
      </Suspense>
    </main>
  );
}

// Previous model equivalents:
// export const dynamic = "force-dynamic";
// await fetch(url, { cache: "no-store" });

=== n144 | M | What is revalidatePath and revalidateTag?
**Both invalidate cached data on demand. `revalidatePath(path, type?)` invalidates everything cached for a URL path. `revalidateTag(tag, profile)` invalidates every cache entry with a given tag, wherever it is used, using stale-while-revalidate. In Next.js 16, `revalidateTag` requires the second `cacheLife` profile argument, and `updateTag` was added for immediate expiry.**

### `revalidateTag(tag, profile)`
- Tags come from `cacheTag()` inside `"use cache"` or `fetch(url, { next: { tags } })`.
- Stale-while-revalidate: the next visitor may get the stale version once while fresh content is generated in the background.
- The profile controls how long stale content can be served: `'max'` (recommended), `'hours'`, `'days'`, a custom profile, or `{ expire: seconds }`.
- The one-argument form is deprecated and is a TypeScript error.
- Callable from Server Functions and Route Handlers (webhooks).

### `updateTag(tag)`
- Immediately expires the tag; the next read waits for fresh data.
- Server Functions only. Use it when the user must see their own change right away.

### `revalidatePath(path, type?)`
- Invalidates data and output for a specific path: `revalidatePath("/blog/hello")`.
- For dynamic segments, pass the route pattern with a type: `revalidatePath("/blog/[slug]", "page")` or `revalidatePath("/dashboard", "layout")` (includes nested routes).
- `revalidatePath("/", "layout")` invalidates everything.
- Less precise; prefer tags.

### Client effect
Called from a Server Function, any of these also clears the client router cache in the same response, so the UI updates immediately.

### Pages Router
`res.revalidate("/path")` in an API route.
--- code
// app/api/cms-webhook/route.ts
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(req: Request) {
  if (req.headers.get("x-secret") !== process.env.CMS_SECRET) return new Response(null, { status: 401 });
  const { type, slug } = await req.json();

  if (type === "post") revalidateTag(`post:${slug}`, "max"); // background refresh
  if (type === "menu") revalidatePath("/", "layout");          // everything under the root layout
  return Response.json({ ok: true });
}

// app/posts/actions.ts
// "use server";
// import { updateTag } from "next/cache";
// export async function rename(slug: string, title: string) {
//   await db.post.update({ where: { slug }, data: { title } });
//   updateTag(`post:${slug}`); // author sees the new title immediately
// }

=== n145 | M | How do you use cache tags in Next.js?
**Attach tags to cached data, then invalidate by tag after changes. With Cache Components, call `cacheTag("posts", "post:42")` inside a `"use cache"` scope; in the previous model, pass `next: { tags: [...] }` to `fetch` or `tags` to `unstable_cache`. Invalidate with `revalidateTag(tag, "max")` or `updateTag(tag)`.**

### Designing tags
- **Collection tags:** `"posts"` for any list of posts.
- **Entity tags:** `"post:42"` for one record.
- **Relationship tags:** `"user:7:posts"` for one user's posts.
- One cached function can have several tags, so updating post 42 can invalidate both `"post:42"` and `"posts"`.

### Rules
- Tags are case-sensitive strings, up to 256 characters each.
- A single `cacheTag()` call accepts up to 128 tags; extra or too-long tags are dropped with a warning.
- `cacheTag` only works inside a cache scope. Calling it at module scope or in Proxy throws.
- Tags can be computed from arguments or fetched data, for example tagging a product list with each product ID.

### Choosing the invalidation function
- `updateTag` in Server Functions when the user who made the change should see it immediately.
- `revalidateTag(tag, "max")` from webhooks, cron jobs or for changes where a moment of staleness is fine.

### Why tags beat paths
Data appears on many pages (a product shows up on its page, category lists, search and the home page). Invalidating by tag refreshes every place it is used without listing paths.

### Debugging
In dev, logging the tags returned by your data functions helps. Platforms like Vercel show cache tag hits and purges in their dashboards.
--- code
// lib/products.ts
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

export async function getProduct(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("products", `product:${id}`);
  return db.product.findUnique({ where: { id } });
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  const products = await db.product.findMany({ where: { category: slug } });
  // Tag the list with every product it contains
  cacheTag(`category:${slug}`, ...products.map((p) => `product:${p.id}`));
  return products;
}

// app/admin/actions.ts
// "use server";
// export async function updateProduct(id: string, data: { price: number }) {
//   await db.product.update({ where: { id }, data });
//   updateTag(`product:${id}`); // refreshes the product page AND every category list containing it
// }

=== n146 | E | How do you use Tailwind CSS in Next.js?
**`create-next-app` sets up Tailwind CSS v4 by default. Manually, install `tailwindcss` and `@tailwindcss/postcss`, add the plugin to `postcss.config.mjs`, put `@import "tailwindcss";` in `app/globals.css`, and import that file in the root layout. Tailwind works in Server and Client Components with no runtime cost.**

### Tailwind v4 setup
1. `npm install tailwindcss @tailwindcss/postcss postcss`
2. `postcss.config.mjs`: `export default { plugins: { "@tailwindcss/postcss": {} } }`
3. `app/globals.css`: `@import "tailwindcss";`
4. `app/layout.tsx`: `import "./globals.css";`

No `tailwind.config.js` and no `content` paths are needed: v4 detects source files automatically.

### Customization in CSS
- `@theme { --color-brand: #4f46e5; --font-sans: var(--font-geist-sans); }` creates `bg-brand`, `font-sans` and similar utilities.
- `@custom-variant dark (&:where(.dark, .dark *));` for class-based dark mode.
- `@plugin "@tailwindcss/typography";` to load plugins.
- `@source "../packages/ui";` to scan extra folders, such as monorepo packages.

### Tailwind v3
Still supported (the docs keep a v3 guide): `tailwind.config.js` with `content` globs and `@tailwind base; @tailwind components; @tailwind utilities;`.

### Tips
- Use `clsx` and `tailwind-merge` (often combined as a `cn()` helper) for conditional classes.
- Combine with `next/font` by exposing the font as a CSS variable.
- Production CSS includes only the classes you use.
- Do not build class names dynamically from strings (`bg-${color}-500`); Tailwind cannot detect them.
--- code
// postcss.config.mjs
// export default { plugins: { "@tailwindcss/postcss": {} } };

/* app/globals.css */
// @import "tailwindcss";
// @theme {
//   --color-brand: oklch(0.55 0.2 270);
//   --font-sans: var(--font-geist-sans);
// }
// @custom-variant dark (&:where(.dark, .dark *));

// app/page.tsx
import { cn } from "@/lib/cn"; // clsx + tailwind-merge

export default function Home({ active = true }: { active?: boolean }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Hello</h1>
      <button
        className={cn(
          "rounded-lg px-4 py-2 font-medium transition",
          active ? "bg-brand text-white hover:opacity-90" : "bg-slate-200 text-slate-600"
        )}
      >
        Get started
      </button>
    </main>
  );
}

=== n147 | M | How do you use styled-components in Next.js?
**styled-components works in the App Router only inside Client Components, with a style registry that collects styles during server rendering and injects them with `useServerInsertedHTML`. Enable the SWC transform with `compiler.styledComponents: true` for SSR-safe class names and better debugging.**

### Setup (App Router)
1. `npm install styled-components` (v6).
2. `next.config.ts`: `compiler: { styledComponents: true }`.
3. Create `lib/registry.tsx` (`"use client"`) that creates a `ServerStyleSheet`, uses `useServerInsertedHTML` to flush styles into the HTML stream, and wraps children in `StyleSheetManager` on the server.
4. Wrap `{children}` in the root layout with `<StyledComponentsRegistry>`.
5. Any component that uses `styled` must be a Client Component.

### Pages Router
Use `_document.tsx` with `getInitialProps` and `ServerStyleSheet.collectStyles`, plus the same compiler option.

### Trade-offs
- Runtime styling adds JavaScript and work during rendering, and cannot be used in Server Components.
- Styles are injected during streaming; misconfiguration leads to unstyled flashes or hydration mismatches.
- The library maintainers have said styled-components is in maintenance mode and do not recommend it for new projects.

### Recommendation for new projects
Prefer zero-runtime options that work in Server Components: Tailwind CSS, CSS Modules, or compile-time CSS-in-JS such as vanilla-extract, Panda CSS, StyleX or Kuma UI. Keep styled-components for existing codebases while migrating.
--- code
// lib/registry.tsx
"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== "undefined") return <>{children}</>;
  return <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>;
}

// app/layout.tsx
// <body><StyledComponentsRegistry>{children}</StyledComponentsRegistry></body>

// app/button.tsx
// "use client";
// import styled from "styled-components";
// export const Button = styled.button`padding: 8px 16px; border-radius: 8px;`;

// next.config.ts: compiler: { styledComponents: true }

=== n148 | H | What are the challenges of CSS-in-JS in the App Router?
**Runtime CSS-in-JS libraries generate styles while components render in the browser, but Server Components never run in the browser and React streams HTML in chunks. So these libraries only work in Client Components, need a registry to inject styles during streaming, add JavaScript and render cost, and some are not fully compatible with concurrent rendering.**

### The specific problems
1. **No Server Component support:** `styled` and `css` props rely on context and hooks, so every styled component becomes client code.
2. **Streaming SSR:** styles must be emitted before the HTML that uses them in each streamed chunk. Libraries need `useServerInsertedHTML` integration, or users see unstyled content.
3. **Runtime cost:** serializing styles, hashing class names and inserting `<style>` tags during render hurt INP and hydration time.
4. **Concurrent rendering:** style injection in render conflicts with React's concurrent features; React recommends `useInsertionEffect` for libraries.
5. **Bundle size:** the runtime ships to the browser.
6. **Library support:** Emotion still lacks full App Router support at the time of the current docs; styled-components works with a registry but is in maintenance mode.

### Supported options (per Next.js docs)
In Client Components: Ant Design, Chakra UI, Fluent UI, Kuma UI, MUI (with its App Router integration), Panda CSS, styled-jsx, styled-components, StyleX, Tamagui, tss-react and vanilla-extract.

### Recommended direction
- **Zero-runtime, compile-time** solutions (vanilla-extract, Panda CSS, StyleX, Kuma UI, Pigment CSS) extract static CSS at build time and work in Server Components.
- **Tailwind CSS** and **CSS Modules** are the defaults the Next.js docs lean on.
- Keep dynamic values in CSS variables set via `style={{ "--x": value }}` rather than generating new classes at runtime.
--- code
// Problem: runtime CSS-in-JS forces a client boundary
// "use client";
// import styled from "@emotion/styled";
// export const Card = styled.div`padding: 16px;`;

// Zero-runtime alternative: vanilla-extract (compiled to static CSS at build time)
// app/card.css.ts
// import { style } from "@vanilla-extract/css";
// export const card = style({ padding: 16, borderRadius: 12, background: "var(--surface)" });

// app/card.tsx - works as a Server Component
import { card } from "./card.css";

export function Card({ children, accent }: { children: React.ReactNode; accent: string }) {
  // Dynamic values through CSS variables, no runtime style generation
  return (
    <div className={card} style={{ "--accent": accent } as React.CSSProperties}>
      {children}
    </div>
  );
}

=== n149 | E | How do you use Sass in Next.js?
**Install the `sass` package and import `.scss` or `.sass` files directly: global stylesheets in the root layout, and `.module.scss` files in components for scoped styles. Configure shared variables or options with `sassOptions` in `next.config.ts`.**

### Setup
1. `npm install --save-dev sass`
2. Global: `import "./globals.scss"` in `app/layout.tsx`.
3. Scoped: `import styles from "./button.module.scss"`.

### `sassOptions`
- `additionalData: '@use "@/styles/tokens" as *;'` to inject variables or mixins into every file.
- `includePaths` or `loadPaths` for import resolution.
- `implementation: "sass-embedded"` to use the faster embedded compiler.
- `silenceDeprecations` to quiet known warnings during migration.

### Modern Sass
- Use `@use` and `@forward` instead of the deprecated `@import`.
- Next.js 16 upgraded to `sass-loader` v16 with the modern Sass API.
- **Turbopack does not support the `~` prefix** for `node_modules` imports. Write `@use "bootstrap/scss/bootstrap"` instead of `~bootstrap/...`, or add a `turbopack.resolveAlias`.

### Exporting variables to JavaScript
CSS Modules support `:export { primary: $primary; }`, so you can import Sass values in TypeScript.

### Sass vs native CSS
Native CSS now has nesting, custom properties, `color-mix()` and container queries. Many teams use plain CSS (or Tailwind) for new projects, and keep Sass for existing design systems.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  sassOptions: {
    additionalData: `@use "@/styles/tokens" as *;`, // tokens available everywhere
    implementation: "sass-embedded",
  },
};
export default nextConfig;

/* styles/_tokens.scss */
// $brand: #4f46e5;
// @mixin card { border-radius: 12px; padding: 1rem; }

/* app/components/card.module.scss */
// .card {
//   @include card;
//   border: 1px solid rgba($brand, 0.2);
//   &:hover { border-color: $brand; }
// }
// :export { brand: $brand; }

// app/components/card.tsx
import styles from "./card.module.scss";
export function Card({ children }: { children: React.ReactNode }) {
  return <div className={styles.card} data-brand={styles.brand}>{children}</div>;
}

=== n150 | E | What is the globals.css file?
**`app/globals.css` is the conventional global stylesheet in a Next.js App Router project, created by `create-next-app` and imported in the root layout. It holds the Tailwind import, CSS resets, design tokens as CSS variables, base element styles and dark mode variables that apply to every page.**

### What usually goes in it
- `@import "tailwindcss";` (Tailwind v4) and `@theme` tokens.
- CSS custom properties: `:root { --background: #fff; --foreground: #111; }` and a dark variant.
- Base styles: `body` font, background, `color-scheme`.
- Small global utilities and third-party CSS imports.

### Rules
- The name is a convention, not special. What matters is importing it in `app/layout.tsx`.
- In the App Router, global CSS can be imported anywhere, but importing it once in the root layout keeps ordering predictable.
- Styles are global: keep component-specific styles in CSS Modules or Tailwind classes to avoid conflicts.
- In the Pages Router, global CSS can only be imported in `pages/_app.tsx`.

### Performance
It loads on every route, so keep it lean. Large component libraries' CSS can be imported only in the layouts or pages that need them, since CSS is chunked per route.

### Smooth scrolling note (Next.js 16)
If you set `scroll-behavior: smooth` on `html` here, Next.js no longer overrides it during navigation. Add `data-scroll-behavior="smooth"` to `<html>` if you want Next.js to switch to instant scrolling during route changes, as it did before.
--- code
/* app/globals.css */
// @import "tailwindcss";
//
// :root {
//   --background: #ffffff;
//   --foreground: #0b1020;
//   color-scheme: light;
// }
//
// .dark {
//   --background: #0b1020;
//   --foreground: #f8fafc;
//   color-scheme: dark;
// }
//
// @theme inline {
//   --color-background: var(--background);
//   --color-foreground: var(--foreground);
// }
//
// body { background: var(--background); color: var(--foreground); }

// app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

=== n151 | E | How do you use CSS variables in Next.js?
**Define custom properties in `globals.css` (for example on `:root` and a `.dark` class), use them with `var(--name)` in any CSS, CSS Module or Tailwind theme, and set dynamic values from React with the `style` prop. `next/font` can also expose fonts as CSS variables.**

### Where to use them
- **Design tokens:** colors, spacing, radii, shadows, defined once in `:root`.
- **Theming:** redefine tokens under `.dark` or `[data-theme="brand"]`.
- **Tailwind v4:** map tokens into `@theme` (or `@theme inline`) so utilities like `bg-background` use them.
- **Fonts:** `Inter({ variable: "--font-inter" })` adds a class that defines `--font-inter`.
- **Dynamic values from data:** `style={{ "--progress": "40%" }}` in a Server Component, with CSS doing the rest, without client JavaScript.

### Why they suit the App Router
They work in Server Components because they are plain CSS. Changing a theme only requires changing a class or attribute on `<html>`, and no component re-renders.

### TypeScript
`style` objects do not know custom properties by default. Cast: `{ "--x": value } as React.CSSProperties`, or extend `CSSProperties` with a module declaration.

### Tips
- Inherit naturally: set a variable on a parent and children use it.
- Fallbacks: `var(--accent, #4f46e5)`.
- Use `@property` to type variables and animate them.
--- code
/* app/globals.css */
// :root { --radius: 12px; --brand: #4f46e5; --surface: #fff; }
// [data-theme="dark"] { --surface: #0f172a; }
// .progress { height: 8px; border-radius: var(--radius); background: #e2e8f0; }
// .progress > span { display: block; height: 100%; width: var(--value, 0%); background: var(--brand); }

// app/goals/page.tsx - Server Component, no client JS needed
import { getGoals } from "@/lib/goals";

export default async function Goals() {
  const goals = await getGoals();
  return (
    <ul>
      {goals.map((g) => (
        <li key={g.id}>
          {g.name}
          <div className="progress">
            <span style={{ "--value": `${g.percent}%` } as React.CSSProperties} />
          </div>
        </li>
      ))}
    </ul>
  );
}

=== n152 | M | What is the recommended styling approach for Server Components?
**Use styling that is resolved at build time, so it needs no JavaScript in the browser: Tailwind CSS, CSS Modules, global CSS with CSS variables, Sass, or zero-runtime CSS-in-JS (vanilla-extract, Panda CSS, StyleX). Avoid runtime CSS-in-JS in Server Components, because it needs client hooks and context.**

### Why build-time styling fits
- Server Components render once on the server; there is no client runtime to inject styles.
- Static CSS files are cacheable, chunked per route and loaded in parallel with HTML.
- Zero JavaScript cost keeps hydration and INP fast.

### Options compared
| Approach | Works in Server Components | Runtime JS |
|---|---|---|
| Tailwind CSS | Yes | None |
| CSS Modules / Sass Modules | Yes | None |
| Global CSS + variables | Yes | None |
| vanilla-extract, Panda, StyleX, Kuma | Yes | None or minimal |
| styled-components, Emotion | No (Client only + registry) | Yes |

### Dynamic styling without runtime CSS-in-JS
- Toggle classes based on props: `className={cn("btn", variant === "primary" && "btn-primary")}`.
- Use `data-*` attributes with CSS selectors: `[data-state="open"]`.
- Pass values via CSS variables in `style`.
- Use variant helpers like `class-variance-authority` (pure functions, fine on the server).

### Component libraries
Headless or Tailwind-based libraries (shadcn/ui, Radix, React Aria) work well because the styling is plain classes; interactive parts are Client Components but styles are still static CSS.
--- code
// components/badge.tsx - Server Component with variants, zero runtime styling
import { cva, type VariantProps } from "class-variance-authority";

const badge = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      success: "bg-green-100 text-green-800",
      warning: "bg-amber-100 text-amber-800",
      danger: "bg-red-100 text-red-800",
    },
  },
  defaultVariants: { tone: "success" },
});

type Props = VariantProps<typeof badge> & { children: React.ReactNode };

export function Badge({ tone, children }: Props) {
  return (
    <span className={badge({ tone })} data-tone={tone}>
      {children}
    </span>
  );
}

// Usage in any Server Component: <Badge tone="warning">Pending</Badge>

=== n153 | M | How do you handle dark mode in Next.js?
**Define light and dark tokens as CSS variables, switch them with a class or `data-theme` attribute on `<html>`, respect `prefers-color-scheme` as the default, and persist the user's choice. The hard part is avoiding a flash of the wrong theme before hydration, solved with a cookie read on the server or a tiny inline script.**

### Approaches
1. **System only:** `@media (prefers-color-scheme: dark)` in CSS. No JavaScript, no flash, but no user toggle.
2. **Cookie-based (server-aware):** store the choice in a cookie, read it in the root layout with `cookies()`, and render `<html className="dark">`. No flash, but reading cookies in the root layout makes it request-time; with Cache Components, it is often better to keep the layout static and use approach 3.
3. **Inline script (`next-themes`):** a small blocking script in `<head>` reads `localStorage` and sets the class before paint. `next-themes` does this and handles system preference, multiple themes and tab syncing. Add `suppressHydrationWarning` to `<html>` because the class differs from the server HTML.

### Tailwind v4
`@custom-variant dark (&:where(.dark, .dark *));` makes `dark:` utilities follow the class instead of the media query.

### Details
- Set `color-scheme: light dark` so form controls and scrollbars match.
- Use the `theme-color` meta via `generateViewport` for browser UI.
- Images: `<picture>` with `prefers-color-scheme` sources, or CSS filters for icons.
- `global-error` pages render their own document and do not get your theme class.
--- code
// app/layout.tsx
import { ThemeProvider } from "next-themes";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets the class before paint, so the server HTML differs
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// app/components/theme-toggle.tsx
// "use client";
// import { useTheme } from "next-themes";
// export function ThemeToggle() {
//   const { resolvedTheme, setTheme } = useTheme();
//   return <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Toggle theme</button>;
// }

/* app/globals.css */
// @import "tailwindcss";
// @custom-variant dark (&:where(.dark, .dark *));
// :root { color-scheme: light; } .dark { color-scheme: dark; }

=== n154 | M | How do you use PostCSS in Next.js?
**Next.js runs PostCSS on all CSS automatically. Add a `postcss.config.mjs` (or `.js`/`.json`) at the project root to customize plugins. Tailwind v4 is itself a PostCSS plugin (`@tailwindcss/postcss`), and when you provide a config, it replaces Next.js's defaults entirely.**

### Defaults (no config file)
Next.js uses Autoprefixer and `postcss-flexbugs-fixes`, with `postcss-preset-env` features such as targeting your `browserslist`. CSS nesting and modern syntax are handled for supported browsers.

### Custom config
- Write plugin names as **strings**, not imported functions: `{ plugins: { "@tailwindcss/postcss": {} } }`. Next.js loads them itself so it can cache the work.
- Once you add a config, Next.js does **not** merge in its defaults. Add `autoprefixer` back if you still need it (Tailwind v4 already handles vendor prefixes through Lightning CSS).
- Browser targets come from `browserslist` in `package.json`.

### Turbopack
Turbopack supports PostCSS configs. Since 16.4, `experimental.turbopackLocalPostcssConfig` allows per-directory configs, and plugin execution can run in worker threads with `turbopackPluginRuntimeStrategy`.

### Alternatives
- `experimental.useLightningcss: true` swaps in Lightning CSS (Rust) for faster CSS processing.
- Native CSS nesting and modern color functions reduce the need for many PostCSS plugins.

### Common plugins
`@tailwindcss/postcss`, `autoprefixer`, `postcss-preset-env`, `postcss-nesting` and `cssnano` (Next.js already minifies CSS in production).
--- code
// postcss.config.mjs - Tailwind v4 only
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;

// postcss.config.mjs - without Tailwind, restoring defaults explicitly
// export default {
//   plugins: {
//     "postcss-flexbugs-fixes": {},
//     "postcss-preset-env": {
//       autoprefixer: { flexbox: "no-2009" },
//       stage: 3,
//       features: { "custom-properties": false },
//     },
//   },
// };

// package.json
// "browserslist": ["chrome 111", "edge 111", "firefox 111", "safari 16.4"]

=== n155 | H | What is the order of CSS precedence in Next.js?
**CSS precedence follows normal cascade rules: specificity first, then source order. In Next.js, source order is determined by import order: stylesheets imported earlier are inserted earlier, and later imports win at equal specificity. Layouts load before their pages, so page and component styles can override layout and global styles.**

### How Next.js orders CSS
1. CSS imported in the **root layout** (usually `globals.css`).
2. CSS imported in **nested layouts**, from outer to inner.
3. CSS imported by the **page**.
4. CSS imported by **components**, in the order they are imported within each file.

In production, CSS is bundled into chunks per route, keeping this relative order. In development, styles are injected as `<style>` tags and hot-reloaded, so order can differ slightly; always verify with `next build && next start`.

### Making order predictable
- Import global styles first in the root layout, before any component imports.
- Keep global CSS small and component CSS scoped with CSS Modules or Tailwind.
- Avoid importing the same CSS file from many places with different neighbors.
- Use **cascade layers** (`@layer reset, base, components, utilities;`) to make precedence explicit regardless of load order. Tailwind v4 relies on layers.
- `experimental.cssChunking` controls how CSS files are merged into chunks (`true` by default, `'strict'` keeps import order exact at the cost of more files).

### Specificity still wins
A class in a CSS Module does not beat an ID selector in global CSS. `!important` overrides everything except other `!important` rules with higher precedence; avoid it.

### Debugging
Use the browser DevTools "Styles" panel to see which rule wins and which file it came from.
--- code
// app/layout.tsx
import "./globals.css";          // 1st: resets, tokens (@layer base)
import "@acme/ui/styles.css";    // 2nd: library styles

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

// app/shop/layout.tsx
// import "./shop.css";           // 3rd: section styles

// app/shop/page.tsx
// import styles from "./page.module.css"; // 4th: page styles override earlier rules

/* app/globals.css - explicit cascade layers */
// @layer reset, base, components, utilities;
// @layer base { button { border-radius: 4px; } }
// @layer components { .btn { border-radius: 9999px; } }  /* wins over base regardless of file order */

// next.config.ts: experimental: { cssChunking: "strict" } // keep exact import order

=== n156 | H | What is the React Server Component payload (RSC payload)?
**The RSC payload is the compact, streamed data format React produces when rendering Server Components. It contains the rendered output of Server Components, references to Client Component modules with their props, and placeholders for content still suspended. Next.js uses it to build HTML on first load and to update the UI on client navigations.**

### What it contains
- The rendered tree of Server Components (elements and text), not their code.
- For each Client Component: a reference to its JavaScript chunk and its serialized props.
- Promises and Suspense boundaries that resolve later in the stream.
- Server Function references, as encrypted IDs.

### How Next.js uses it
1. **Initial load:** the server renders the payload and HTML together. The payload is inlined in the HTML (in script tags) so React can hydrate Client Components without refetching.
2. **Client navigation:** the router fetches only the payload for changed segments (`RSC: 1` requests, `?_rsc=` query) and merges it into the live tree, keeping layouts and state.
3. **Prefetching:** `<Link>` prefetches payloads, App Shells or segments into the client cache.
4. **Server Functions:** responses carry the updated payload along with the return value.
5. **Caching:** `"use cache"` serializes outputs into this format, which can be stored in prerendered HTML, a server store or the browser.

### Performance notes
- Large props to Client Components inflate it (sent once as HTML and again in the payload).
- Next.js 16.2 made payload deserialization up to 350% faster via a React change.

### Interview tip
Explain it as "JSON-like instructions for building the UI tree", distinct from HTML. HTML is for the first paint; the payload is for React.
--- code
// app/page.tsx
import { LikeButton } from "./like-button"; // "use client"

export default async function Page() {
  const post = { id: "42", title: "RSC payload explained", likes: 7 };
  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton postId={post.id} initial={post.likes} />
    </article>
  );
}

// Simplified idea of the payload streamed for this page:
// 1:I["app/like-button.js", ["chunk-abc.js"], "LikeButton"]   <- client module reference
// 0:["$","article",null,{"children":[
//      ["$","h1",null,{"children":"RSC payload explained"}],
//      ["$","$L1",null,{"postId":"42","initial":7}]            <- client component + props
//   ]}]
// Inspect real payloads: DevTools Network tab, filter by "_rsc" or the RSC request header.

=== n157 | H | How does Next.js handle partial prerendering (PPR)?
**Partial Prerendering serves every route as a prerendered static shell, containing static content, cached content and `<Suspense>` fallbacks, and streams the dynamic parts into it in the same response. In Next.js 16 it is not a separate flag: it is the default behavior when `cacheComponents: true` is enabled, replacing the experimental `ppr` option from Next.js 14 and 15.**

### How it works
1. At build, Next.js renders each route until it reaches request-time work (cookies, headers, `searchParams`, uncached I/O, `connection()`).
2. Everything rendered so far, plus the nearest `<Suspense>` fallbacks, becomes the **static shell** (HTML and RSC payload), served instantly from a CDN.
3. At request time, the server renders only the dynamic holes and streams them into the shell over the same HTTP response.
4. `"use cache"` content is part of the shell as long as its lifetime is not too short.

### Requirements Next.js enforces
Request-time work must be inside `<Suspense>` or cached; otherwise the dev overlay and build report a "blocking route" with suggested fixes. Random values and timestamps need either `"use cache"` or `connection()`/`io()`.

### History
- **14:** experimental `ppr` flag.
- **15:** `experimental.ppr: 'incremental'` with `export const experimental_ppr = true` per route.
- **16:** flag and route export removed. Enable `cacheComponents` instead. The model differs from the 15 canaries.
- **16.3/16.4:** Partial Prefetching (`partialPrefetching: true`) prefetches App Shells, and `ensureStatic` can require parts of a route to stay static.

### Benefits
Static-site speed for the first bytes, dynamic personalization where needed, and no all-or-nothing choice per route.

### Caveat
Some bots cannot handle streamed metadata. Next.js detects them (`htmlLimitedBots`) and renders the full page for them.
--- code
// next.config.ts
// const nextConfig = { cacheComponents: true, partialPrefetching: true };

// app/product/[id]/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

async function Product({ id }: { id: string }) {
  "use cache";
  cacheLife("hours");
  const p = await fetch(`https://api.example.com/p/${id}`).then((r) => r.json());
  return <h1>{p.name}</h1>; // static shell
}

async function Cart() {
  const cart = (await cookies()).get("cart")?.value; // dynamic hole
  return <p>Cart: {cart ? JSON.parse(cart).length : 0} items</p>;
}

export default async function Page({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  return (
    <>
      <header>Acme Store</header>                     {/* static shell */}
      <Product id={id} />                              {/* static shell (cached) */}
      <Suspense fallback={<p>Cart: …</p>}>             {/* fallback in shell */}
        <Cart />                                       {/* streamed per request */}
      </Suspense>
    </>
  );
}

=== n158 | M | What are Server Actions and how do they differ from API routes?
**Server Actions (Server Functions) are `"use server"` functions you call directly from React, mainly for mutations from your own UI. Route Handlers and API routes are explicit HTTP endpoints you design and call with `fetch`. Actions trade HTTP control for tight React and caching integration.**

### Server Actions
- Called like a function: `<form action={createPost}>` or `await createPost(data)` in a transition.
- Always POST, with an encrypted, build-specific ID; no stable URL.
- Progressive enhancement: forms work before JavaScript loads.
- Return data and updated UI in one round-trip; integrate with `updateTag`, `revalidateTag`, `refresh()` and `redirect()`.
- Pair with `useActionState`, `useFormStatus`, `useOptimistic`.
- Type-safe end to end with TypeScript.
- Executed sequentially per client, so they are a poor fit for parallel reads.

### Route Handlers / API routes
- Explicit URL and HTTP method (`GET /api/posts`).
- Full control of status codes, headers, streaming, content types and CORS.
- Callable by anyone: mobile apps, webhooks, third parties, other services.
- `GET` can be prerendered or cached.
- You handle request parsing, validation and client-side fetching yourself.

### Choosing
| Need | Use |
|---|---|
| Form submit, button mutation in your app | Server Action |
| Public or versioned API, mobile clients | Route Handler |
| Webhook (Stripe, CMS) | Route Handler |
| File download, RSS, streaming response | Route Handler |
| Read data for a page | Server Component |

### Shared rule
Both are public network entry points. Authenticate, authorize and validate in each.
--- code
// Server Action: called directly from the form
// app/notes/actions.ts
"use server";
import { updateTag } from "next/cache";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

export async function addNote(formData: FormData) {
  const { userId } = await verifySession();
  await db.note.create({ data: { userId, text: String(formData.get("text")) } });
  updateTag(`notes:${userId}`);
}
// <form action={addNote}><input name="text" /><button>Add</button></form>

// Route Handler: explicit HTTP API for other clients
// app/api/notes/route.ts
// export async function POST(req: Request) {
//   const user = await authenticateBearer(req.headers.get("authorization"));
//   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
//   const { text } = await req.json();
//   const note = await db.note.create({ data: { userId: user.id, text } });
//   return Response.json(note, { status: 201, headers: { Location: `/api/notes/${note.id}` } });
// }

=== n159 | M | How do you handle form submissions with Server Actions?
**Pass a Server Function to `<form action={fn}>`. The function receives `FormData`; validate it, perform the mutation, revalidate cached data, and either `redirect()` or return a state object. Wrap it with `useActionState` in a Client Component to show errors and pending state.**

### Step by step
1. Define an action in a `"use server"` file. With `useActionState`, its signature is `(prevState, formData) => newState`.
2. Authenticate and authorize.
3. Parse with Zod (`Object.fromEntries(formData)` or `formData.get(...)`); return field errors as data.
4. Mutate the database.
5. `updateTag(...)` (or `revalidatePath`) so lists show the change.
6. `redirect("/somewhere")` or return `{ ok: true }`.

### Client UX
- `useActionState(action, initialState)` returns `[state, formAction, isPending]`.
- `useFormStatus()` inside a child component gives `pending` for the submit button.
- `useOptimistic` shows the expected result immediately.
- Use `defaultValue` from returned state to keep user input after a validation error.
- Forms reset after a successful action in React 19; return the values if you need to keep them.

### Progressive enhancement
Because `action` is a real form submission, it works before hydration. With `useActionState`, pass a `permalink` (third argument) for full progressive enhancement across pages.

### Extra arguments
Bind values with `action.bind(null, id)`, or use hidden inputs. Bound arguments are visible to the client, so still authorize on the server.

### `next/form`
For search forms that navigate with GET, use `<Form action="/search">` from `next/form`; it prefetches and navigates client-side.
--- code
// app/signup/actions.ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const Schema = z.object({ email: z.string().email(), name: z.string().min(2) });
export type State = { errors?: Record<string, string[]>; values?: Record<string, string> };

export async function signup(_prev: State, formData: FormData): Promise<State> {
  const values = Object.fromEntries(formData) as Record<string, string>;
  const parsed = Schema.safeParse(values);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, values };

  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return { errors: { email: ["Email already registered"] }, values };
  }
  await db.user.create({ data: parsed.data });
  redirect("/welcome");
}

// app/signup/form.tsx
// "use client";
// import { useActionState } from "react";
// export function SignupForm() {
//   const [state, action, pending] = useActionState(signup, {});
//   return (
//     <form action={action}>
//       <input name="email" defaultValue={state.values?.email} /> {state.errors?.email?.[0]}
//       <input name="name" defaultValue={state.values?.name} /> {state.errors?.name?.[0]}
//       <button disabled={pending}>{pending ? "Creating…" : "Sign up"}</button>
//     </form>
//   );
// }

=== n160 | M | What is useFormState and useFormStatus?
**`useFormState` was the React DOM hook for reading the result of a form action. In React 19 it was renamed to `useActionState`, moved to the `react` package, and gained an `isPending` value. `useFormStatus` (from `react-dom`) gives a component the pending status of the `<form>` it is rendered inside.**

### `useActionState` (formerly `useFormState`)
- `const [state, formAction, isPending] = useActionState(action, initialState, permalink?)`.
- `action(prevState, formData)` returns the next state, such as validation errors or a success message.
- Pass `formAction` to `<form action>` or `<button formAction>`.
- `isPending` is true while the action runs.
- Import from `react`. `useFormState` from `react-dom` is deprecated and logs a warning.

### `useFormStatus`
- `const { pending, data, method, action } = useFormStatus()` from `react-dom`.
- Must be called in a component **inside** the `<form>`, not in the component that renders the form.
- Ideal for reusable submit buttons and inline spinners.

### Choosing between them
- Need the action's **result**: `useActionState`.
- Need only "is this form submitting" deep in the tree: `useFormStatus`.
- They are often combined: `useActionState` in the form component, `useFormStatus` in the submit button.

### Related
`useOptimistic` for showing the expected result before the server responds, and `useTransition` for non-form actions.

### Interview tip
Mention the rename: answering with `useFormState` only signals an outdated knowledge base.
--- code
// app/feedback/form.tsx
"use client";

import { useActionState } from "react";       // was: useFormState from "react-dom"
import { useFormStatus } from "react-dom";
import { sendFeedback } from "./actions";     // (prev, formData) => { message: string }

function SubmitButton() {
  const { pending } = useFormStatus(); // reads the parent <form>'s status
  return <button disabled={pending}>{pending ? "Sending…" : "Send"}</button>;
}

export function FeedbackForm() {
  const [state, formAction, isPending] = useActionState(sendFeedback, { message: "" });

  return (
    <form action={formAction} aria-busy={isPending}>
      <textarea name="text" required />
      <SubmitButton />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}

=== n161 | H | How do you handle optimistic updates with Server Actions?
**Use React's `useOptimistic` hook: render an optimistic copy of the state, update it immediately when the user acts (inside a transition or form action), then call the Server Function. When the action finishes and the server re-renders with real data, React replaces the optimistic state automatically; if the action throws, the optimistic change is discarded.**

### How `useOptimistic` works
- `const [optimistic, addOptimistic] = useOptimistic(serverState, (current, input) => next)`.
- `serverState` comes from props (data rendered by a Server Component).
- Call `addOptimistic(input)` inside an action or `startTransition`.
- While the transition is pending, React shows `optimistic`. When it settles, it shows the new `serverState`.

### Flow with Server Actions
1. The user submits a form or clicks.
2. `addOptimistic` updates the UI instantly (for example a new message marked "sending").
3. The Server Function writes to the database and calls `updateTag` or `revalidatePath`.
4. The response carries the fresh RSC payload; the parent re-renders with real data, and the optimistic state is dropped.

### Handling errors
- If the action throws, the optimistic state reverts. Show an error with `useActionState` state or a toast.
- For actions that return errors rather than throwing, keep the optimistic item but mark it failed, with a retry button.

### Good candidates
Likes, toggles, adding to lists, chat messages, reordering. Avoid it for operations users must trust exactly, such as payments.

### Pitfalls
- Optimistic items need temporary IDs for keys.
- Calling `addOptimistic` outside a transition logs a warning and has no effect.
--- code
// app/chat/thread.tsx
"use client";

import { useOptimistic, useRef } from "react";
import { sendMessage } from "./actions"; // "use server": saves, then updateTag("thread:1")

type Msg = { id: string; text: string; pending?: boolean };

export function Thread({ messages }: { messages: Msg[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [optimistic, addOptimistic] = useOptimistic(messages, (state: Msg[], text: string) => [
    ...state,
    { id: `temp-${crypto.randomUUID()}`, text, pending: true },
  ]);

  async function action(formData: FormData) {
    const text = String(formData.get("text"));
    addOptimistic(text);     // instant UI
    formRef.current?.reset();
    await sendMessage(text); // server re-renders with real data afterwards
  }

  return (
    <>
      <ul>
        {optimistic.map((m) => (
          <li key={m.id} style={{ opacity: m.pending ? 0.5 : 1 }}>{m.text}</li>
        ))}
      </ul>
      <form ref={formRef} action={action}>
        <input name="text" required />
        <button>Send</button>
      </form>
    </>
  );
}

=== n162 | M | What is the after function in Next.js?
**`after(callback)` from `next/server` schedules work to run after the response (or prerender) has finished, so tasks like logging, analytics or cache warming do not delay the user. It was introduced as `unstable_after` in Next.js 15 and became stable in 15.1.**

### Where you can use it
Server Components (including `generateMetadata`), Server Functions, Route Handlers and Proxy.

### Behavior
- The callback runs after the response is sent, even if rendering threw an error or called `notFound()` or `redirect()`.
- It is not a request-time API, so calling it does not make a route dynamic. In a static page, the callback runs at build time or on revalidation.
- On serverless platforms, Next.js uses the platform's `waitUntil` to keep the function alive until the callback finishes, up to the route's max duration (`export const maxDuration`).
- Inside the callback in Server Functions and Route Handlers you can still call `cookies()` and `headers()`. In Server Components you cannot, because the response is already streamed; read them before and close over the values.
- `React.cache` deduplicates values computed during render that you reuse in the callback.

### Typical uses
- Sending analytics or audit logs.
- Recording a page view count.
- Notifying another service after a mutation.
- Flushing telemetry.

### Not for
Long-running jobs (video encoding, large imports). Use a queue or background job service; `after` is limited by the function timeout.
--- code
// app/blog/[slug]/page.tsx
import { after } from "next/server";
import { headers } from "next/headers";
import { getPost, recordView } from "@/lib/posts";

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  const ua = (await headers()).get("user-agent") ?? "unknown"; // read before after()

  after(async () => {
    // Runs after the HTML is sent: does not slow the page
    await recordView(slug, ua);
  });

  return <article><h1>{post.title}</h1></article>;
}

// app/orders/actions.ts
// "use server";
// export async function placeOrder(data: FormData) {
//   const order = await db.order.create({ ... });
//   after(() => fetch("https://hooks.example.com/order-created", { method: "POST", body: JSON.stringify(order) }));
//   redirect(`/orders/${order.id}`);
// }

=== n163 | M | What is the forbidden and unauthorized function in Next.js 15?
**`forbidden()` and `unauthorized()` from `next/navigation` (added in Next.js 15.1) stop rendering and show a 403 Forbidden or 401 Unauthorized page, rendered from `forbidden.tsx` and `unauthorized.tsx` files in `app/`. They are still experimental in Next.js 16 and require `experimental.authInterrupts: true`.**

### What they do
- **`unauthorized()`**: the user is not signed in. Renders `app/unauthorized.tsx` with a 401 status. Typical content: a login prompt.
- **`forbidden()`**: the user is signed in but lacks permission. Renders `app/forbidden.tsx` with a 403 status.
- Both throw special errors (like `notFound()`), so code after them does not run, and they add a `noindex` robots tag.

### Where you can call them
Server Components, Server Functions and Route Handlers. Not in the root layout.

### Why they exist
Before, apps either redirected to `/login` (losing the URL and status code) or used `notFound()` (wrong status). These give correct HTTP semantics with a customizable UI, similar to `not-found.tsx`.

### Setup
```
// next.config.ts
experimental: { authInterrupts: true }
```

### Usage tips
- Call them from your Data Access Layer helpers, for example `requireUser()` calls `unauthorized()` and `requireRole("admin")` calls `forbidden()`.
- In Server Functions, they throw and the client receives the error UI; returning a state object may be friendlier for forms.
- Pair with Proxy redirects for common cases, and keep these as the authoritative check.
--- code
// next.config.ts
// const nextConfig = { experimental: { authInterrupts: true } };

// lib/guards.ts
import "server-only";
import { forbidden, unauthorized } from "next/navigation";
import { verifySession } from "@/lib/dal";

export async function requireRole(role: "admin" | "editor") {
  const session = await verifySession();
  if (!session) unauthorized(); // 401 -> app/unauthorized.tsx
  if (session.role !== role) forbidden(); // 403 -> app/forbidden.tsx
  return session;
}

// app/admin/page.tsx
// export default async function Admin() {
//   await requireRole("admin");
//   return <h1>Admin</h1>;
// }

// app/forbidden.tsx
// import Link from "next/link";
// export default function Forbidden() {
//   return (<main><h1>403: No access</h1><p>Ask an admin for access.</p><Link href="/">Home</Link></main>);
// }

=== n164 | E | How does Next.js handle redirects in next.config.js?
**Define an async `redirects()` function in `next.config.ts` that returns an array of `{ source, destination, permanent }` rules. They run before Proxy and before routing, support path parameters, wildcards and regex, and can match on headers, cookies, query or host with `has` and `missing`.**

### Rule fields
- **`source`**: incoming path pattern, for example `/blog/:slug` or `/docs/:path*`.
- **`destination`**: target path or absolute URL, reusing params (`/news/:slug`).
- **`permanent`**: `true` sends **308**, `false` sends **307**. These preserve the HTTP method (unlike 301/302).
- **`statusCode`**: set an explicit code instead of `permanent` (rarely needed).
- **`basePath: false`**, **`locale: false`** for apps using those features.
- **`has` / `missing`**: conditions on `header`, `cookie`, `query` or `host`.

### Matching details
- `:param` matches one segment, `:path*` zero or more, `:path+` one or more.
- Regex: `/post/:id(\\d{1,})`.
- Query strings are passed through to the destination automatically.

### When to use something else
- Logic or lookups (auth, geo, A/B, CMS-driven redirects): Proxy.
- Thousands of redirects: keep them out of config (it slows startup and has platform limits); store them in a data source and check in Proxy.
- Redirect after a mutation or during render: `redirect()` from `next/navigation`.

### Order
Config `headers` run first, then config `redirects`, then Proxy.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Simple permanent move (308)
      { source: "/about-us", destination: "/about", permanent: true },
      // Params and wildcards
      { source: "/blog/:slug", destination: "/news/:slug", permanent: true },
      { source: "/docs/v1/:path*", destination: "/docs/:path*", permanent: false }, // 307
      // Regex on params
      { source: "/post/:id(\\d{1,})", destination: "/articles/:id", permanent: true },
      // Conditional: only when a cookie is missing
      {
        source: "/dashboard/:path*",
        missing: [{ type: "cookie", key: "session" }],
        destination: "/login",
        permanent: false,
      },
      // Host-based redirect to the canonical domain
      { source: "/:path*", has: [{ type: "host", value: "www.acme.com" }], destination: "https://acme.com/:path*", permanent: true },
    ];
  },
};

export default nextConfig;

=== n165 | E | How does Next.js handle rewrites?
**Rewrites map an incoming path to a different destination while the browser keeps the original URL. Define them with `rewrites()` in `next.config.ts` (static rules) or with `NextResponse.rewrite()` in `proxy.ts` (logic-based). Destinations can be internal routes or external URLs, in which case Next.js proxies the request.**

### Config shape
`rewrites()` can return an array (treated as `afterFiles`) or an object with three phases:
- **`beforeFiles`**: checked after headers, redirects and Proxy, before files and pages. Can override existing routes.
- **`afterFiles`**: checked after pages and `public/` files, before dynamic routes.
- **`fallback`**: checked last, after dynamic routes. Useful for proxying unknown paths to a legacy app during migration.

### Uses
- Clean URLs: `/docs` to `/docs/intro`.
- **Incremental migration:** fall back to an old site for routes not yet moved (`fallback` to `https://legacy.example.com/:path*`).
- **Proxying APIs:** `/api/backend/:path*` to `https://api.internal.example.com/:path*`, avoiding CORS.
- Hiding third-party analytics endpoints behind your domain.
- Multi-zones: serving several Next.js apps under one domain.

### Same syntax as redirects
`:param`, `:path*`, regex, `has`/`missing` conditions, `basePath: false`, `locale: false`.

### Rewrite vs redirect
A redirect changes the URL and costs a round-trip. A rewrite is invisible to the user and has no extra round-trip.

### Caveats
External rewrites add latency through your server. They are not supported with `output: 'export'`. Prefer Proxy when the target depends on cookies, headers or user data.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Serve /docs from the intro page without changing the URL
        { source: "/docs", destination: "/docs/intro" },
      ],
      afterFiles: [
        // Proxy API calls to a backend: same origin for the browser, no CORS
        { source: "/api/backend/:path*", destination: "https://api.internal.acme.com/:path*" },
        // Analytics endpoint behind our domain
        { source: "/stats/script.js", destination: "https://plausible.io/js/script.js" },
      ],
      fallback: [
        // During migration: anything not handled by Next.js goes to the old app
        { source: "/:path*", destination: "https://legacy.acme.com/:path*" },
      ],
    };
  },
};

export default nextConfig;

=== n166 | E | What are headers in next.config.js?
**`headers()` in `next.config.ts` returns rules that add HTTP response headers to matching paths, such as security headers, caching rules or CORS for static paths. Each rule has a `source` pattern and a list of `{ key, value }` headers, with optional `has`/`missing` conditions.**

### Common uses
- **Security:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` or CSP `frame-ancestors`.
- **Caching:** long-lived `Cache-Control` for versioned files in `public/` (fonts, downloads).
- **CORS** for static assets used on other origins.
- **Custom headers** for monitoring or `X-Robots-Tag: noindex` on staging.

### Matching rules
- Same patterns as redirects: `/:path*`, `/fonts/:file`, regex, `has`/`missing` on headers, cookies, query and host.
- If several rules match, all apply; for the same key, the **last** matching rule wins.
- Headers run first in the routing order, before redirects and Proxy.

### Limits
- Values are static. For per-request values like a CSP nonce, set headers in `proxy.ts`.
- Do not set `Cache-Control` on pages or `/_next/static` here; Next.js manages those. Overriding page caching can break revalidation.
- `poweredByHeader: false` removes `X-Powered-By: Next.js`.

### Content Security Policy
A static CSP with `'unsafe-inline'` can live here. A strict nonce-based CSP must be generated per request in Proxy, which also makes pages request-time.
--- code
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/fonts/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "staging.acme.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;

=== n167 | M | How do you configure internationalization (i18n) in Next.js?
**The App Router has no built-in i18n config. You add a `[lang]` (or `[locale]`) dynamic segment at the root, detect the preferred locale in `proxy.ts` and redirect or rewrite to it, load translation dictionaries in Server Components, and prerender each locale with `generateStaticParams`. The Pages Router has a built-in `i18n` option in `next.config.js`.**

### App Router steps
1. **Routing:** move routes under `app/[lang]/` so URLs look like `/en/about` and `/fr/about`.
2. **Detection:** in `proxy.ts`, if the path has no locale, pick one from a cookie or `Accept-Language` (using `@formatjs/intl-localematcher` and `negotiator`) and redirect.
3. **Dictionaries:** `getDictionary(lang)` dynamically imports `dictionaries/fr.json` on the server; translations never ship to the client unless you pass them down.
4. **Static generation:** `generateStaticParams` returns `[{ lang: "en" }, { lang: "fr" }]`.
5. **`<html lang>`** set in `app/[lang]/layout.tsx`.
6. **Metadata:** localized titles and `alternates.languages` for hreflang tags.

### Reading the locale anywhere
`next/root-params` (16.3) exports a getter per root segment: `import { lang } from "next/root-params"; const l = await lang();`, usable in Server Components and inside `"use cache"`, avoiding prop drilling.

### Libraries
`next-intl` and `next-intlayer` (both listed in the Next.js docs) add message formatting, plurals, typed keys, client hooks and Proxy helpers.

### Pages Router
`i18n: { locales: ["en", "fr"], defaultLocale: "en", localeDetection: true }`, with `useRouter().locale` and `getStaticProps({ locale })`.

### Formatting
Use `Intl.DateTimeFormat`, `Intl.NumberFormat` and `Intl.PluralRules` with the active locale.
--- code
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "fr", "hi"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const languages = new Negotiator({ headers: { "accept-language": request.headers.get("accept-language") ?? "" } }).languages();
  const locale = request.cookies.get("NEXT_LOCALE")?.value ?? match(languages, locales, "en");
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}
export const config = { matcher: ["/((?!_next|api|.*\\..*).*)"] };

// app/[lang]/layout.tsx
// export async function generateStaticParams() { return locales.map((lang) => ({ lang })); }
// export default async function Layout({ children, params }: LayoutProps<"/[lang]">) {
//   const { lang } = await params;
//   return <html lang={lang}><body>{children}</body></html>;
// }

// app/[lang]/dictionaries.ts
// const dictionaries = { en: () => import("./dictionaries/en.json").then((m) => m.default), fr: ... };
// export const getDictionary = (lang: "en" | "fr") => dictionaries[lang]();

=== n168 | E | What is the next/headers module?
**`next/headers` provides server-only functions for reading request data: `cookies()` to read and (in Server Functions and Route Handlers) write cookies, `headers()` to read request headers, and `draftMode()` to check or toggle Draft Mode. All three return Promises since Next.js 15 and must be awaited.**

### The functions
- **`cookies()`**: `get`, `getAll`, `has`, and in Server Functions and Route Handlers also `set`, `delete`.
- **`headers()`**: a read-only `Headers` object (`get`, `has`, `entries`).
- **`draftMode()`**: `isEnabled`, `enable()`, `disable()` (toggle only in Route Handlers and Server Functions).

### Where they work
Server Components, Server Functions, Route Handlers, `generateMetadata`, and other server code that runs during a request. Not in Client Components, and not at module scope.

### Effect on rendering
They are request-time APIs:
- **Previous model:** using them made the whole route dynamic.
- **Cache Components:** the component using them is request-time and must be inside `<Suspense>`; the rest of the route stays in the static shell.
- They cannot be called inside `"use cache"`. Read outside and pass values as arguments, or use `"use cache: private"`, which allows `cookies()` and `headers()`.

### Async since Next.js 15
`const store = await cookies()`. Synchronous access was a temporary compatibility mode in 15 and was removed in 16. The codemod `npx @next/codemod@latest next-async-request-api .` migrates old code.

### Related
In Proxy, use `request.cookies` and `request.headers` instead. In Client Components, use `document.cookie` sparingly, or have the server pass values down.
--- code
// app/dashboard/greeting.tsx (Server Component)
import { cookies, headers, draftMode } from "next/headers";

export async function Greeting() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const { isEnabled: isDraft } = await draftMode();

  const name = cookieStore.get("name")?.value ?? "there";
  const lang = headerList.get("accept-language")?.split(",")[0] ?? "en";

  return (
    <p>
      {lang.startsWith("hi") ? "नमस्ते" : "Hello"} {name} {isDraft && "(draft)"}
    </p>
  );
}

// app/page.tsx
// <Suspense fallback={<p>Hello</p>}><Greeting /></Suspense>

// app/actions.ts - writing cookies is allowed here
// "use server";
// export async function setName(formData: FormData) {
//   (await cookies()).set("name", String(formData.get("name")), { path: "/", httpOnly: true });
// }

=== n169 | E | How do you read cookies on the server in the App Router?
**Call `const cookieStore = await cookies()` from `next/headers` in a Server Component, Server Function or Route Handler, then use `cookieStore.get("name")?.value`, `getAll()` or `has()`. In Route Handlers you can also use `request.cookies`, and in Proxy only `request.cookies`.**

### Reading
- `(await cookies()).get("theme")?.value`
- `(await cookies()).getAll()` returns `[{ name, value }]`
- `(await cookies()).has("session")`

### Writing (not in Server Components)
Setting cookies requires sending headers, which is not possible once a Server Component is streaming. Set or delete cookies in:
- Server Functions: `(await cookies()).set("theme", "dark")`
- Route Handlers: `cookies()` or `response.cookies.set()`
- Proxy: `response.cookies.set()`

Setting a cookie in a Server Function also refreshes the current route's data.

### Rendering impact
- Reading cookies is request-time. With Cache Components, wrap the reading component in `<Suspense>` so the rest of the page is prerendered.
- Do not read cookies at the top of the root layout unless you really need the whole app to be request-time.
- Inside `"use cache"`, cookies are not allowed; pass the value in as an argument, so the cache key includes it.

### Security
Cookies are user input. Verify signed or encrypted session cookies instead of trusting raw values, and keep sensitive ones `httpOnly`.
--- code
// app/settings/theme-label.tsx (Server Component)
import { cookies } from "next/headers";

export async function ThemeLabel() {
  const store = await cookies();
  const theme = store.get("theme")?.value ?? "system";
  const all = store.getAll().map((c) => c.name);
  return <p>Theme: {theme} (cookies: {all.join(", ")})</p>;
}

// app/settings/page.tsx
import { Suspense } from "react";
import { setTheme } from "./actions";

export default function Settings() {
  return (
    <main>
      <h1>Settings</h1>
      <Suspense fallback={<p>Theme: …</p>}>
        <ThemeLabel />
      </Suspense>
      <form action={setTheme}>
        <button name="theme" value="dark">Dark</button>
        <button name="theme" value="light">Light</button>
      </form>
    </main>
  );
}

// app/settings/actions.ts
// "use server";
// export async function setTheme(fd: FormData) {
//   (await cookies()).set("theme", String(fd.get("theme")), { path: "/", maxAge: 31536000 });
// }

=== n170 | M | What is the draftMode API in Next.js?
**Draft Mode lets editors preview unpublished CMS content on statically generated pages. A Route Handler calls `(await draftMode()).enable()`, which sets a bypass cookie; while it is present, pages render at request time and fetch draft content. `(await draftMode()).isEnabled` tells pages which content to load.**

### Flow
1. The CMS preview button opens `/api/draft?secret=...&slug=/blog/post`.
2. The Route Handler validates the secret and that the slug exists.
3. It calls `(await draftMode()).enable()` and redirects to the slug.
4. Pages check `isEnabled` and fetch drafts (for example with a preview API token).
5. A "Exit preview" link hits a handler that calls `disable()`.

### Caching behavior
- With Draft Mode on, routes render dynamically per request.
- With Cache Components, all `"use cache"` functions **re-execute** on every request and results are not saved, so drafts are always fresh with no code changes.
- You can read `isEnabled` inside a `"use cache"` scope, but other runtime APIs remain off-limits there.
- `enable()` and `disable()` work only in Route Handlers and Server Functions.

### Security
- Validate a secret token so random visitors cannot enable it.
- Validate the redirect target to avoid open redirects.
- The cookie is `__prerender_bypass`; it is `httpOnly` and specific to each build.

### Pages Router
Draft Mode replaced the older Preview Mode: `res.setDraftMode({ enable: true })` in an API route and `context.draftMode` in `getStaticProps`.
--- code
// app/api/draft/route.ts
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPostBySlug } from "@/lib/cms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") ?? "";

  if (secret !== process.env.CMS_PREVIEW_SECRET) return new Response("Invalid token", { status: 401 });
  const post = await getPostBySlug(slug, { preview: true });
  if (!post) return new Response("Invalid slug", { status: 404 });

  (await draftMode()).enable();
  redirect(`/blog/${post.slug}`); // only internal, validated paths
}

// app/blog/[slug]/page.tsx
// import { draftMode } from "next/headers";
// const { isEnabled } = await draftMode();
// const post = await getPostBySlug(slug, { preview: isEnabled });

// app/api/draft/disable/route.ts
// export async function GET() { (await draftMode()).disable(); redirect("/"); }
