=== n26 | M | How does prefetching work with the Link component?
**When a `<Link>` enters the viewport in production, Next.js downloads the destination route's data in the background so the click renders instantly. How much is prefetched depends on the `prefetch` prop, the route's static or dynamic parts and, since Next.js 16.3, Partial Prefetching.**

### Default behavior (`prefetch="auto"`)
- **Static routes:** the whole route payload is prefetched.
- **Dynamic routes without Partial Prefetching:** only the part down to the nearest `loading.tsx` boundary is prefetched, so the loading state shows instantly and the rest streams after the click.
- **With Partial Prefetching (`partialPrefetching: true`, default for new 16.4 apps):** the router prefetches each route's **App Shell**: its static and cached content plus `<Suspense>` fallbacks.

### Other values
- **`prefetch={true}`:** prefetch more. With Partial Prefetching, the server renders the route again with the link's URL resolved (`params`, `searchParams`), so cached content for that exact URL arrives before the click. This costs a server invocation per link.
- **`prefetch={false}`:** never prefetch, not even on hover.

### Next.js 16 improvements
- **Layout deduplication:** a shared layout is downloaded once even when many links point to routes under it.
- **Incremental prefetching:** only parts missing from the client cache are requested.
- **Prefetch inlining:** small segment responses are bundled into one request automatically (16.3).

### Controls on the destination
- Route segment config `export const prefetch = 'force-disabled'` stops prefetching a segment.
- `await prefetch()` and `await navigation()` from `next/cache` defer expensive subtrees to later navigation stages.

### Good to know
Prefetching is disabled in `next dev`, so test with `next build && next start`. Use `router.prefetch(href)` for manual prefetches.
--- code
// app/components/product-links.tsx
import Link from "next/link";

export function ProductLinks({ ids }: { ids: string[] }) {
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          {/* Default: App Shell prefetched when visible */}
          <Link href={`/products/${id}`}>Product {id}</Link>
        </li>
      ))}

      {/* Likely next step: also prefetch cached content for this exact URL */}
      <li>
        <Link href="/search?q=shoes" prefetch={true}>Popular: shoes</Link>
      </li>

      {/* Rarely visited, expensive page: skip prefetching */}
      <li>
        <Link href="/admin/reports" prefetch={false}>Reports</Link>
      </li>
    </ul>
  );
}

// next.config.ts
// const nextConfig = { cacheComponents: true, partialPrefetching: true };

=== n27 | E | What are route groups in the App Router?
**A route group is a folder wrapped in parentheses, such as `app/(marketing)`, that organizes routes or shares a layout without adding a segment to the URL. `app/(marketing)/pricing/page.tsx` is served at `/pricing`.**

### Why use them
- **Organization:** group routes by team, feature or section without changing URLs.
- **Different layouts at the same level:** `(shop)` routes get a cart header, `(auth)` routes get a centered card, while both live at the top level of the URL.
- **Opting some routes into a layout:** move only the routes that need a layout into a group with that `layout.tsx`.
- **Multiple root layouts:** remove the top-level `app/layout.tsx` and give each group its own root layout with `<html>` and `<body>`. Useful when sections have completely different designs.
- **Scoped loading states:** a `loading.tsx` inside a group applies only to routes in that group.

### Rules and pitfalls
- Two groups must not resolve to the same URL. `(a)/about/page.tsx` and `(b)/about/page.tsx` cause a build error.
- Navigating between routes that use **different root layouts** triggers a full page load, because the whole document changes.
- With multiple root layouts and no top-level `page.tsx`, define the home page inside one of the groups.
- Group names are only for developers; they never appear in URLs, `usePathname()` or `params`.
--- code
// app/
// ├── (marketing)/
// │   ├── layout.tsx        marketing header + footer
// │   ├── page.tsx          -> /
// │   └── pricing/page.tsx  -> /pricing
// ├── (shop)/
// │   ├── layout.tsx        header with cart
// │   ├── loading.tsx       applies only to shop routes
// │   └── products/page.tsx -> /products
// └── (auth)/
//     ├── layout.tsx        centered card layout
//     └── login/page.tsx    -> /login

// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">{children}</div>
    </div>
  );
}

=== n28 | H | What are parallel routes in Next.js?
**Parallel routes let one layout render several independent pages at the same time using named slots. A folder prefixed with `@`, such as `app/dashboard/@analytics`, becomes a prop (`analytics`) on the parent layout, alongside `children`.**

### How it works
- `app/dashboard/@team/page.tsx` and `app/dashboard/@analytics/page.tsx` are passed to `app/dashboard/layout.tsx` as `team` and `analytics` props.
- Slots do **not** change the URL. `children` is an implicit slot (`@children`).
- Each slot can have its own `loading.tsx` and `error.tsx`, so one panel can stream or fail independently.
- Slots can be shown conditionally, for example rendering `@admin` or `@user` depending on the role.

### `default.tsx` is required (Next.js 16)
On a full page load, Next.js needs a page for every slot for the current URL. If a slot has no match, it renders that slot's `default.tsx`. Since Next.js 16, **every slot must have an explicit `default.tsx`**, or the build fails. Return `null` or call `notFound()` to keep the old behavior.

On soft (client) navigation, a slot without a match keeps showing its previous page.

### Common uses
- Dashboards with independent panels.
- **Modals** combined with intercepting routes: `@modal/(.)photo/[id]` shows a modal on soft navigation, while a direct visit renders the full photo page.
- Split views and tabbed sub-navigation inside a slot.

### Pitfalls
- Forgetting `default.tsx` causes 404s on refresh or build failures.
- Slots are not route segments: `@analytics/page.tsx` does not create `/analytics`.
- Use `useSelectedLayoutSegment("analytics")` to read the active segment of a slot.
--- code
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  team,
  analytics,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <section className="col-span-2">{children}</section>
      <section>{team}</section>      {/* app/dashboard/@team/page.tsx */}
      <section>{analytics}</section> {/* app/dashboard/@analytics/page.tsx */}
    </div>
  );
}

// app/dashboard/@analytics/loading.tsx - streams independently
// export default function Loading() { return <p>Loading charts…</p>; }

// app/dashboard/@analytics/default.tsx - REQUIRED since Next.js 16
export function Default() {
  return null; // or notFound()
}

// app/dashboard/@team/page.tsx
// export default async function Team() {
//   const members = await getMembers();
//   return <ul>{members.map((m) => <li key={m.id}>{m.name}</li>)}</ul>;
// }

=== n29 | H | What are intercepting routes?
**Intercepting routes load a different route inside the current layout during client-side navigation, while a direct visit or refresh shows the route's normal page. The classic use is a photo feed where clicking a photo opens it in a modal but sharing the URL opens the full photo page.**

### Conventions
The folder prefix says where the intercepted route lives, relative to **route segments** (not the file system):
- `(.)photo` matches a segment at the **same** level.
- `(..)photo` matches **one level up**.
- `(..)(..)photo` matches **two levels up**.
- `(...)photo` matches from the **root** `app` directory.

Slots (`@modal`) and route groups do not count as segments when computing levels.

### Modal pattern
1. Create a parallel route slot `app/@modal` and render `{modal}` in the root layout.
2. Add `app/@modal/(.)photos/[id]/page.tsx` that renders the photo inside a modal.
3. Keep the real page at `app/photos/[id]/page.tsx`.
4. Add `app/@modal/default.tsx` returning `null` so the slot is empty when no modal is open.
5. Close with `router.back()`.

### What users get
- Clicking a link from the feed opens the modal, keeping the feed and its scroll position underneath.
- The URL changes to `/photos/123`, so it can be shared.
- Refreshing or opening the link directly shows the full page.
- Back closes the modal; Forward reopens it.

### Pitfalls
- Interception only happens on **soft navigation** (`<Link>`, `router.push`).
- Missing `default.tsx` in the slot breaks the build in Next.js 16.
- To close the modal when navigating elsewhere, add a catch-all `@modal/[...catchAll]/page.tsx` returning `null`.
--- code
// app/layout.tsx
export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}

// app/@modal/default.tsx
// export default function Default() { return null; }

// app/@modal/(.)photos/[id]/page.tsx - shown on soft navigation
import { Modal } from "@/components/modal"; // "use client", calls router.back() on close

export default async function PhotoModal({ params }: PageProps<"/photos/[id]">) {
  const { id } = await params;
  return (
    <Modal>
      <img src={`/photos/${id}.jpg`} alt={`Photo ${id}`} />
    </Modal>
  );
}

// app/photos/[id]/page.tsx - shown on direct visit or refresh
// export default async function PhotoPage({ params }) { ...full page... }

=== n30 | M | How do you create nested layouts in the App Router?
**Add a `layout.tsx` to any route folder. It wraps every page and layout below it, and layouts nest automatically: `app/layout.tsx` wraps `app/dashboard/layout.tsx`, which wraps `app/dashboard/settings/page.tsx`.**

### How nesting works
For `/dashboard/settings`, Next.js renders:
`RootLayout > DashboardLayout > SettingsLayout (if any) > Page`

Each layout receives `children` (the next level down), plus any parallel route slots and a `params` promise.

### Why nested layouts matter
- **Persistence:** on navigation between sibling routes, the shared layout stays mounted. Its state, scroll position and any open dropdowns survive, and it is not re-rendered on the server.
- **Partial rendering:** only the segments that changed are fetched and rendered.
- **Colocated boundaries:** add `loading.tsx` and `error.tsx` per level for granular streaming and error isolation.

### Rules
- The **root layout** is required and must render `<html>` and `<body>`.
- Layouts can be async Server Components that fetch data. With Cache Components, cache that data with `"use cache"` or put request-time parts in `<Suspense>`, otherwise the layout blocks the static shell.
- Layouts do **not** receive `searchParams` and do not re-render on query changes. Use a Client Component with `useSearchParams` if a layout must react to the query.
- Data fetched in a layout and its page is not shared via props. Fetch it in both places; `fetch` memoization or `React.cache` deduplicates the request.
- Use `template.tsx` instead when you want a fresh instance on every navigation.
--- code
// app/layout.tsx - root layout (required)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>Acme</header>
        {children}
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx - wraps every /dashboard/* page
import { Suspense } from "react";
import { UserMenu } from "./user-menu"; // reads cookies, so it streams

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex">
      <nav className="w-56">
        <a href="/dashboard">Overview</a>
        <a href="/dashboard/settings">Settings</a>
        <Suspense fallback={<span>…</span>}>
          <UserMenu />
        </Suspense>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}

// app/dashboard/settings/page.tsx
// export default function Settings() { return <h1>Settings</h1>; }

=== n31 | E | What is the layout.js file in the App Router?
**`layout.js` (or `.tsx`) defines UI shared by a route segment and all its children. It wraps the segment's pages, stays mounted during navigation between them, and preserves state. The root `app/layout.tsx` is required and defines `<html>` and `<body>`.**

### Props
- **`children`**: the nested layout or page.
- **Slots**: one prop per parallel route (`@modal` becomes `modal`).
- **`params`**: a Promise of the dynamic params from the root down to this layout.

Use the generated `LayoutProps<'/dashboard'>` type for all of these.

### Behavior
- Server Component by default; can be `async` and fetch data.
- Does not re-render on navigation between its children, so it is cheap.
- Cannot read `searchParams` or the current pathname on the server; use `usePathname()` or `useSearchParams()` in a Client Component child.
- Cannot pass data to `children` via props. Fetch the same data in the page; `fetch` memoization and `React.cache` deduplicate it.

### Root layout specifics
- Must include `<html>` and `<body>`.
- Exports `metadata` or `generateMetadata` for site-wide SEO defaults.
- Is the right place for global CSS, fonts from `next/font` and providers.
- Do not add `<head>` tags manually; use the Metadata API.

### Performance note
Everything a layout awaits blocks the content below it. With Cache Components, keep request-time reads (cookies, user menus) inside small `<Suspense>` boundaries, or pass the `params` promise down instead of awaiting it at the top.
--- code
// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // "use client" context providers

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s | Acme" },
  description: "Acme dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

=== n32 | E | What is the page.js file in the App Router?
**`page.js` (or `.tsx`) defines the unique UI of a route and is what makes a folder publicly accessible. `app/blog/page.tsx` serves `/blog`. Without a `page` (or `route`) file, a folder is not a route.**

### Props
- **`params`**: a Promise of dynamic route params, for example `{ slug: string }`.
- **`searchParams`**: a Promise of the query string values (`string | string[] | undefined`).

Both must be awaited since Next.js 15; synchronous access was removed in 16. Use the generated `PageProps<'/blog/[slug]'>` type.

### Behavior
- A Server Component by default. It can be `async`, fetch data and call `notFound()` or `redirect()`.
- It renders inside every parent layout and is wrapped by the nearest `loading`, `error` and `not-found` boundaries.
- Pages are leaf nodes: they cannot wrap other routes.
- Can export `metadata` or `generateMetadata`, `generateStaticParams`, and route segment config such as `ensureStatic`, `instant` and `prefetch` (with Cache Components).

### Rendering
With Cache Components, the page is prerendered as far as possible. Parts that read `searchParams`, cookies or uncached data must sit inside `<Suspense>` or be cached with `"use cache"`. Accessing `searchParams` at the top of the page makes the whole page request-time, so read it in a child component instead.

### Client pages
You can add `"use client"` to a page, but you lose server data fetching and metadata exports for that page. In a Client Component page, read params with `useParams()` or React's `use(props.params)`.
--- code
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts"; // uses "use cache" internally

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post?.title ?? "Not found" };
}

export default async function BlogPost({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}

=== n33 | M | What is the template.js file and how does it differ from layout.js?
**`template.js` wraps its segment's children like a layout, but it creates a new instance on every navigation. State resets, effects re-run and DOM elements are recreated. A `layout.js` persists across navigations.**

### Rendering order
When both exist in a segment, the layout wraps the template:
`<Layout><Template key={routeParam}>{children}</Template></Layout>`

The template gets a unique key per route (based on its child segment), so React remounts it when that key changes.

### When to use a template
- **Enter animations** that must play on every page change (a CSS or Framer Motion fade-in).
- **Effects that should run per page**, such as logging a page view or resetting focus.
- **Resetting state on navigation**, for example clearing a feedback form when moving between articles.
- Resetting a `<Suspense>` boundary so its fallback shows on every navigation. Layouts only show the fallback the first time.

### When to use a layout
Almost always. Shared navigation, sidebars and anything that should keep state or avoid re-rendering belongs in a layout.

### Modern alternatives
- React View Transitions (stable in React 19.3, used by Next.js 16.4) can animate route changes without remounting, via `<ViewTransition>` and the `transitionTypes` prop on `<Link>`.
- With Cache Components, Next.js keeps previous pages alive in a hidden React `<Activity>`, so pages also keep state when you go back. A template is still the explicit way to force a reset.
--- code
// app/blog/template.tsx
"use client";

import { useEffect } from "react";

export default function BlogTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Runs on every navigation between blog posts (a layout would run once)
    window.scrollTo({ top: 0 });
    console.log("page view", window.location.pathname);
  }, []);

  return <div className="animate-[fadeIn_200ms_ease-out]">{children}</div>;
}

// app/blog/layout.tsx - persists, never remounts between posts
// export default function BlogLayout({ children }) {
//   return <section><aside>Categories</aside>{children}</section>;
// }

// Resulting tree for /blog/a -> /blog/b:
// <BlogLayout>               kept
//   <BlogTemplate key="b">   new instance, effect runs again
//     <Page />

=== n34 | E | What is the loading.js file used for?
**`loading.js` creates an instant loading UI for a route segment. Next.js wraps the segment's `page` (and nested children) in a React `<Suspense>` boundary with your loading component as the fallback, so users see feedback immediately while the content streams in.**

### How it works
- `app/dashboard/loading.tsx` wraps `app/dashboard/page.tsx` in `<Suspense fallback={<Loading />}>`.
- The fallback is part of the prerendered output, so it can be served instantly from a CDN and prefetched.
- On navigation, the shared layout stays interactive while the new page streams.
- It can be a Server Component; it receives no props.

### Prefetching
For dynamic routes without Partial Prefetching, the default `<Link>` prefetch goes down to the nearest `loading.tsx`. That is why adding a loading file makes navigation to a dynamic page feel instant.

### Limitations
- It covers the **page and below**, not the `layout.tsx` in the same segment. If the layout awaits data, the loading UI cannot show until the layout finishes. Put that data in its own `<Suspense>` boundary.
- A single loading file per segment is coarse. For finer control, use `<Suspense>` around specific slow components.
- Status codes: once streaming starts the response is already `200`, so a later `notFound()` adds a `noindex` tag instead of changing the status.

### Good practice
Use skeletons that match the final layout to avoid layout shift. Use `instant = true` (route segment config, Cache Components only) or the Navigation Inspector in Next.js DevTools to check that navigations show a loading state immediately.
--- code
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="h-8 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// app/dashboard/page.tsx - slow data streams behind the loading UI
export default async function Dashboard() {
  const stats = await fetch("https://api.example.com/stats").then((r) => r.json());
  return <h1>{stats.users} users</h1>;
}

// What Next.js effectively renders:
// <DashboardLayout>
//   <Suspense fallback={<Loading />}>
//     <Dashboard />
//   </Suspense>
// </DashboardLayout>

=== n35 | M | What is the error.js file used for?
**`error.js` defines an error boundary for a route segment. If anything in that segment's page or nested children throws while rendering, Next.js shows your error component instead, while the parent layouts keep working. It must be a Client Component.**

### Props
- **`error`**: the thrown value. Server errors arrive with a generic message in production and an `error.digest` hash you can match in server logs. Narrow it with `instanceof Error`.
- **`retry()`** (stable since 16.3): re-fetches and re-renders the boundary's children inside a transition. Use this in most cases, because it recovers from Server Component errors.
- **`reset()`**: only clears the error state and re-renders on the client without re-fetching.

### Scope
- `error.tsx` wraps `loading`, `not-found`, `page` and nested layouts in its segment, but **not the `layout.tsx` of the same segment**. An error in a layout is caught by the parent segment's error file.
- **`global-error.tsx`** in `app/` catches errors in the root layout. It replaces the whole document, so it must render `<html>` and `<body>`.
- `notFound()` and `redirect()` are not treated as errors.

### Component-level boundaries
`catchError` from `next/error` (stable in 16.3) creates an error boundary component you can wrap around any part of the tree, with the same `retry()` behavior and correct handling of `notFound()` and `redirect()`.

### Good practice
Report errors to monitoring in `useEffect`, or centrally with `onRequestError` in `instrumentation.ts`. Do not show raw error messages to users. Expected failures such as validation errors should be returned as values, not thrown.
--- code
// app/dashboard/error.tsx
"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Send to Sentry, Datadog, etc. digest matches the server log entry
    console.error("Dashboard failed", error.digest, error);
  }, [error]);

  return (
    <div role="alert">
      <h2>Something went wrong loading your dashboard.</h2>
      <button onClick={() => retry()}>Try again</button>
    </div>
  );
}

// Component-level boundary anywhere in the tree:
// "use client";
// import { catchError, type ErrorInfo } from "next/error";
// function Fallback(props: {}, { retry }: ErrorInfo) {
//   return <button onClick={() => retry()}>Reload widget</button>;
// }
// export default catchError(Fallback);

=== n36 | E | What is getStaticProps and when do you use it?
**`getStaticProps` is a Pages Router function that runs at build time (and during ISR revalidation) on the server to fetch data for a page. Next.js renders the page to static HTML plus JSON, served from a CDN. Use it when the data is the same for every visitor.**

### Key facts
- Export it from a page file in `pages/`. It never runs in the browser and is removed from the client bundle, so you can query databases directly.
- It receives a `context` with `params` (for dynamic routes), `locale`, `draftMode` and `preview` information.
- It returns one of:
  - `{ props }` for the page component,
  - `{ props, revalidate: 60 }` to enable ISR,
  - `{ notFound: true }` for a 404,
  - `{ redirect: { destination, permanent } }`.
- Dynamic routes also need `getStaticPaths`.
- In `next dev` it runs on every request.

### When to use it
Marketing pages, blog posts, docs and product catalogs: public content that changes rarely or can be revalidated.

### When not to
Per-user data (use `getServerSideProps` or client fetching) or data that must be fresh on every request.

### App Router equivalent
There is no `getStaticProps` in `app/`. Fetch in an async Server Component. With Cache Components, wrap the data function in `"use cache"` with `cacheLife('days')` or similar; content with no request data is prerendered automatically. `revalidate` maps to `cacheLife`, and `notFound` maps to `notFound()`.
--- code
// pages/blog/index.tsx
import type { GetStaticProps, InferGetStaticPropsType } from "next";

type Post = { id: number; title: string };

export const getStaticProps = (async () => {
  const res = await fetch("https://cms.example.com/posts");
  if (!res.ok) return { notFound: true };

  const posts: Post[] = await res.json();
  return {
    props: { posts },
    revalidate: 3600, // ISR: regenerate at most once per hour
  };
}) satisfies GetStaticProps<{ posts: Post[] }>;

export default function Blog({ posts }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

// App Router equivalent (Cache Components):
// async function getPosts() { "use cache"; cacheLife("hours"); return db.post.findMany(); }

=== n37 | E | What is getServerSideProps and when do you use it?
**`getServerSideProps` is a Pages Router function that runs on the server for every request to a page, before it renders. Use it when the page needs request-specific data such as cookies, the current user or always-fresh values.**

### Key facts
- Export it from a page in `pages/`. It runs only on the server, so secrets and database calls are safe.
- The `context` includes `req`, `res`, `params`, `query`, `resolvedUrl`, `locale` and `draftMode`.
- Return `{ props }`, `{ notFound: true }` or `{ redirect: { destination, permanent } }`.
- On client-side navigation, Next.js calls it via a JSON request, so the page still gets fresh data without a full reload.
- You can set caching headers on `res`, for example `Cache-Control: s-maxage=10, stale-while-revalidate=59`, to let a CDN cache the response.

### Costs
- Time to first byte includes your data fetching on every request.
- The whole page waits; there is no per-component streaming.
- Pages using it cannot be served from a static CDN cache by default.

### When to use it
Personalized dashboards, auth-gated pages, pages depending on headers (geo, A/B buckets) and data that must never be stale.

### App Router equivalent
Read `cookies()` or `headers()` in an async Server Component. With Cache Components, only the component that reads request data runs per request, inside `<Suspense>`; the rest of the page stays in the static shell. That is usually faster than whole-page SSR.
--- code
// pages/account.tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getSession } from "@/lib/session";

type User = { name: string; plan: string };

export const getServerSideProps = (async ({ req, res }) => {
  const session = await getSession(req.cookies.session);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // Private, per-user response: do not let shared caches store it
  res.setHeader("Cache-Control", "private, no-store");

  const user: User = await fetch(`https://api.example.com/users/${session.userId}`).then((r) =>
    r.json()
  );
  return { props: { user } };
}) satisfies GetServerSideProps<{ user: User }>;

export default function Account({ user }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <h1>Welcome {user.name} ({user.plan})</h1>;
}

=== n38 | M | What is getStaticPaths and when is it required?
**`getStaticPaths` tells the Pages Router which values of a dynamic route to prerender at build time. It is required when a dynamic page such as `pages/posts/[id].tsx` uses `getStaticProps`, because Next.js must know which pages to generate.**

### Return value
- **`paths`**: an array like `[{ params: { id: "1" } }, { params: { id: "2" } }]`. Param values must be strings (or string arrays for catch-alls).
- **`fallback`**: what to do with paths not in the list: `false`, `true` or `"blocking"`.

### Rules
- Only for dynamic routes that use `getStaticProps`. It cannot be used with `getServerSideProps`.
- Runs only at build time in production (and on every request in development).
- Must be exported from the same page file.

### Practical strategy
Prerender the most popular pages and let the rest generate on demand:
- Return the top 100 IDs with `fallback: "blocking"`.
- For huge sites, return `paths: []` with `fallback: "blocking"` to build nothing up front and generate every page on first visit, then cache it (with `revalidate` for ISR).

### App Router equivalent
`generateStaticParams` returns plain objects (`[{ id: "1" }]`) and can be used at multiple levels of a nested route. Unknown params are handled by default: with Cache Components, Next.js serves the App Shell and generates the page in the background. Without Cache Components, `export const dynamicParams = false` returns 404 for unknown params.
--- code
// pages/posts/[id].tsx
import type { GetStaticPaths, GetStaticProps } from "next";

export const getStaticPaths: GetStaticPaths = async () => {
  // Only prerender the 50 most viewed posts at build time
  const top: { id: number }[] = await fetch("https://api.example.com/posts?top=50").then((r) =>
    r.json()
  );

  return {
    paths: top.map((p) => ({ params: { id: String(p.id) } })), // must be strings
    fallback: "blocking", // other ids are rendered on first request, then cached
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const res = await fetch(`https://api.example.com/posts/${params!.id}`);
  if (!res.ok) return { notFound: true };
  return { props: { post: await res.json() }, revalidate: 600 };
};

export default function Post({ post }: { post: { title: string } }) {
  return <h1>{post.title}</h1>;
}

=== n39 | H | What is the difference between fallback: false, true, and blocking in getStaticPaths?
**`fallback` controls what happens when someone requests a dynamic path that was not prerendered: `false` returns a 404, `true` serves a loading version immediately and fills it in on the client, and `"blocking"` renders the page on the server before responding. With `true` and `"blocking"`, the generated page is cached for future visitors.**

### `fallback: false`
- Only the listed paths exist; anything else is a 404.
- Best for small, known sets (a few docs pages, fixed categories).
- New content requires a rebuild.

### `fallback: true`
- The first visitor gets a static "fallback" version of the page with empty props instantly.
- `router.isFallback` is `true`; you must render a loading state.
- Next.js runs `getStaticProps` in the background and the page swaps in the data.
- Later visitors get the fully generated page.
- Crawlers receive the complete page.
- Use it for very large sites where fast first byte matters, but it adds UI complexity.

### `fallback: "blocking"`
- The first visitor waits while the server renders the page, like SSR, then the result is cached.
- No loading state to handle, no `isFallback`.
- The most common choice and the closest to App Router behavior without Cache Components.

### Interaction with `notFound`
With `true` or `"blocking"`, return `{ notFound: true }` from `getStaticProps` for IDs that do not exist, otherwise any URL generates a page.

### App Router mapping
- `false` maps to `export const dynamicParams = false` (without Cache Components).
- `"blocking"` is the default without Cache Components.
- With Cache Components, unknown params get the App Shell first and the full page is generated in the background, which resembles `true` without the manual `isFallback` handling.
--- code
// pages/products/[id].tsx
import { useRouter } from "next/router";
import type { GetStaticPaths, GetStaticProps } from "next";

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { id: "1" } }, { params: { id: "2" } }],
  fallback: true, // try false | true | "blocking"
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const res = await fetch(`https://api.example.com/products/${params!.id}`);
  if (!res.ok) return { notFound: true }; // stop unknown ids becoming pages
  return { props: { product: await res.json() }, revalidate: 60 };
};

export default function Product({ product }: { product?: { name: string } }) {
  const router = useRouter();

  // Only needed with fallback: true
  if (router.isFallback) return <p>Loading product…</p>;

  return <h1>{product!.name}</h1>;
}

=== n40 | M | What is Incremental Static Regeneration (ISR)?
**ISR lets statically generated pages update after deployment without a full rebuild. Pages are served from cache, and after a time window or an on-demand trigger, Next.js regenerates them in the background using stale-while-revalidate, so visitors never wait for a rebuild.**

### How time-based ISR works
1. A page is generated at build time or on its first request.
2. Requests within the revalidation window get the cached page instantly.
3. The first request after the window still gets the cached (stale) page, and triggers a background regeneration.
4. Once regeneration succeeds, the new page replaces the cached one. If it fails, the old page keeps being served.

### Flavors
- **Time-based:** regenerate at most every N seconds.
- **On-demand:** regenerate when content changes, via `revalidateTag`, `updateTag` or `revalidatePath` (App Router) or `res.revalidate()` (Pages Router), usually from a CMS webhook.
- **New paths:** pages that were never built are generated on first request and then cached.

### In each router
- **Pages Router:** `return { props, revalidate: 60 }` from `getStaticProps`.
- **App Router with Cache Components:** `"use cache"` plus `cacheLife` sets the timing (`revalidate` and `expire` in the profile), and `cacheTag` enables on-demand updates. Params not in `generateStaticParams` serve the App Shell first, and the full page is generated and cached in the background.
- **App Router without Cache Components:** `export const revalidate = 60` or `fetch(url, { next: { revalidate: 60 } })`.

### Hosting
ISR needs a server (`next start`, a container or Vercel). It does not work with `output: 'export'`. When self-hosting several instances, configure a shared cache handler so instances do not serve different versions.
--- code
// app/blog/[slug]/page.tsx - ISR with Cache Components
import { cacheLife, cacheTag } from "next/cache";

async function getPost(slug: string) {
  "use cache";
  cacheLife("hours");          // background refresh at most hourly
  cacheTag(`post:${slug}`);    // allow on-demand refresh from a webhook
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.json() as Promise<{ title: string; body: string }>;
}

export async function generateStaticParams() {
  return [{ slug: "hello-world" }]; // others are generated on first visit
}

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article><h1>{post.title}</h1><p>{post.body}</p></article>;
}

// app/api/revalidate/route.ts - CMS webhook
// revalidateTag(`post:${slug}`, "max");

=== n41 | M | How do you set a revalidation time in ISR?
**With Cache Components, call `cacheLife` inside a `"use cache"` scope, using a preset profile such as `'hours'` or an object with `stale`, `revalidate` and `expire`. Without Cache Components, use `export const revalidate = N` or `fetch(url, { next: { revalidate: N } })`. In the Pages Router, return `revalidate: N` from `getStaticProps`.**

### Cache Components (Next.js 16+)
`cacheLife` profiles set three timings:
- **`stale`**: how long the browser may reuse the data without asking the server (minimum 30 seconds on the client).
- **`revalidate`**: after this, the next request serves cached content and regenerates in the background.
- **`expire`**: after this long with no traffic, the next request waits for fresh content.

Presets: `seconds`, `minutes`, `hours` (revalidate 1h), `days` (1d), `weeks` (1w), `max` (30d), and `default` (revalidate 15 minutes) if you call no `cacheLife`. Define custom named profiles in `next.config.ts` under `cacheLife`.

### Previous model
- `export const revalidate = 3600` on a page or layout sets the route default. It must be a literal number, not an expression like `60 * 60`.
- `fetch(url, { next: { revalidate: 3600 } })` sets it per request.
- The **lowest** value in a route wins.
- `revalidate = 0` makes the route dynamic.

### Choosing a value
Match the profile to how often content changes, and prefer a long lifetime plus on-demand `revalidateTag` for CMS content. That way pages update right after an edit instead of waiting for a timer.

### Short lifetimes
A `revalidate` of 0, or `expire` under 5 minutes (as in the `seconds` profile), excludes the cache from prerendering: it becomes a dynamic hole that needs `<Suspense>`.
--- code
// lib/data.ts - Cache Components
import { cacheLife } from "next/cache";

export async function getProducts() {
  "use cache";
  cacheLife("hours"); // stale 5m, revalidate 1h, expire 1d
  return fetch("https://api.example.com/products").then((r) => r.json());
}

export async function getExchangeRates() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 }); // custom inline profile
  return fetch("https://api.example.com/rates").then((r) => r.json());
}

// next.config.ts - reusable custom profile
// cacheLife: { editorial: { stale: 600, revalidate: 3600, expire: 86400 } }

// Previous model (no cacheComponents):
// export const revalidate = 3600;
// await fetch(url, { next: { revalidate: 3600 } });

// Pages Router:
// return { props, revalidate: 3600 };

=== n42 | M | What is on-demand revalidation?
**On-demand revalidation refreshes cached data as soon as it changes, instead of waiting for a timer. You tag cached data, then call `revalidateTag`, `updateTag` or `revalidatePath` from a Server Function or Route Handler, typically after a mutation or a CMS webhook.**

### The APIs (Next.js 16)
- **`revalidateTag(tag, profile)`**: marks tagged entries stale with stale-while-revalidate. Visitors get the old content once while fresh content is generated. The second argument is now required; `'max'` is recommended. Works in Server Functions and Route Handlers. Best for content where a short delay is fine.
- **`updateTag(tag)`**: immediately expires the entries so the next read waits for fresh data. **Server Functions only.** Use it for read-your-own-writes, so a user sees their change instantly.
- **`revalidatePath(path, type?)`**: invalidates everything for a path (`'page'` or `'layout'`). Less precise; prefer tags.
- **`refresh()`**: refreshes the client router from a Server Function without touching cached data.

Calling these from a Server Function also clears the browser's client cache, so the UI updates on the response.

### Tagging data
- Cache Components: `cacheTag('posts')` inside `"use cache"`.
- `fetch(url, { next: { tags: ['posts'] } })` (previous model).

### Webhook pattern
A CMS calls `/api/revalidate` with a secret. The Route Handler checks the secret and calls `revalidateTag('post:slug', 'max')`.

### Pages Router
`await res.revalidate('/blog/my-post')` inside an API route.
--- code
// app/api/revalidate/route.ts - CMS webhook
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-webhook-secret") !== process.env.CMS_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await request.json();
  revalidateTag(`post:${slug}`, "max"); // serve stale once, refresh in background
  return Response.json({ revalidated: true });
}

// app/posts/actions.ts - user edits their own post
// "use server";
// import { updateTag } from "next/cache";
// export async function savePost(formData: FormData) {
//   await db.post.update({ ... });
//   updateTag(`post:${formData.get("slug")}`); // user sees the change immediately
// }

=== n43 | E | How do you fetch data in Server Components (App Router)?
**Make the component `async` and `await` your data directly: `fetch`, an ORM, a database client or the file system. Server Components run only on the server, so secrets stay safe and no data-fetching code reaches the browser.**

### Patterns
- **Fetch where the data is used.** Each component fetches what it needs; duplicate `fetch` calls with the same URL and options are memoized within one render. Wrap ORM calls in `React.cache` for the same deduplication.
- **Parallel fetching.** Start independent requests together with `Promise.all`, or render separate components inside separate `<Suspense>` boundaries so each streams on its own.
- **Avoid waterfalls.** Awaiting requests one after another in the same component makes total time the sum of all requests.
- **Data access layer.** Put queries in `server-only` modules that check authorization, and return only the fields the UI needs.

### Caching (Next.js 16)
- With **Cache Components**, nothing is cached unless you opt in. Add `"use cache"` and `cacheLife` to a data function or component to cache it and include it in the static shell. Uncached reads must be inside `<Suspense>`, or the dev overlay reports a blocking route.
- **Without Cache Components**, `fetch` is not cached by default since Next.js 15; use `cache: 'force-cache'` or `next: { revalidate }`.

### Errors and empty states
Throw to reach the nearest `error.tsx`, call `notFound()` for missing data, and return values for expected cases.

### Client data
For data that updates after load (polling, infinite scroll), use SWR or TanStack Query in Client Components, optionally seeded with server data.
--- code
// app/dashboard/page.tsx
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";

async function getPlans() {
  "use cache"; // same for everyone: part of the static shell
  cacheLife("days");
  return db.plan.findMany();
}

async function RecentOrders() {
  // Uncached, fresh per request: streams behind Suspense
  const orders = await db.order.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  return <ul>{orders.map((o) => <li key={o.id}>{o.total}</li>)}</ul>;
}

export default async function Dashboard() {
  const plans = await getPlans();
  return (
    <main>
      <h1>{plans.length} plans</h1>
      <Suspense fallback={<p>Loading orders…</p>}>
        <RecentOrders />
      </Suspense>
    </main>
  );
}

=== n44 | M | What is the fetch API extension in Next.js?
**On the server, Next.js extends the native `fetch` so each request can declare caching behavior with `cache` and `next: { revalidate, tags }`, and identical requests are memoized within a render. The defaults changed over time, and with Cache Components the recommended way to cache is `"use cache"` instead of `fetch` options.**

### Request memoization
During a single render pass, `fetch` calls with the same URL and options run once and share the result, so a layout and page can both call `getUser()` without double requests. This applies to `GET` and `HEAD`, not to Route Handlers, and only lasts for that request.

### Caching options (previous model)
- `cache: 'force-cache'` caches the response in the Data Cache.
- `cache: 'no-store'` always fetches fresh data.
- `next: { revalidate: 60 }` caches with time-based revalidation.
- `next: { tags: ['posts'] }` lets `revalidateTag('posts', 'max')` invalidate it.

Since **Next.js 15**, the default is **not cached**. In Next.js 14 the default was `force-cache`, which surprised many developers.

### With Cache Components (Next.js 16)
- An uncached `fetch` is treated as request-time I/O: wrap the component in `<Suspense>`.
- To cache it, call `fetch` inside a function marked `"use cache"` and set `cacheLife` and `cacheTag`.
- `fetch` cache entries persist across deployments, while `use cache` entries are scoped to the build. Use the `fetch` cache or `unstable_cache` if data must survive deploys.

### Limits
`fetch` options have no caching effect in `proxy.ts`. Third-party SDKs that use their own HTTP client do not get these extensions; use `"use cache"` or `React.cache` around them.
--- code
// lib/api.ts

// Previous model: caching via fetch options
export async function getCategories() {
  const res = await fetch("https://api.example.com/categories", {
    next: { revalidate: 3600, tags: ["categories"] },
  });
  return res.json();
}

export async function getStockLevel(sku: string) {
  const res = await fetch(`https://api.example.com/stock/${sku}`, { cache: "no-store" });
  return res.json();
}

// Cache Components: plain fetch inside a cached function
import { cacheLife, cacheTag } from "next/cache";

export async function getCategoriesCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  const res = await fetch("https://api.example.com/categories");
  return res.json();
}

// Memoization: both calls in one render hit the network once
// await getCategories(); await getCategories();

=== n45 | M | How do you cache fetch requests in Next.js?
**With Cache Components, put the `fetch` inside a `"use cache"` function or component and set `cacheLife` and `cacheTag`. Without Cache Components, pass `cache: 'force-cache'` or `next: { revalidate, tags }` to `fetch`. Either way, invalidate on demand with `revalidateTag` or `updateTag`.**

### Cache Components approach (recommended)
1. Enable `cacheComponents: true` (default for new apps in Next.js 16.4).
2. Write a data function with `"use cache"` at the top.
3. Set a lifetime: `cacheLife('hours')`.
4. Tag it: `cacheTag('products')`.
5. Invalidate: `revalidateTag('products', 'max')` from a webhook, or `updateTag('products')` in a Server Function.

Arguments become part of the cache key, so `getProduct('a')` and `getProduct('b')` are separate entries. This also caches non-`fetch` work such as database queries.

### Previous model
- `fetch(url, { cache: 'force-cache' })` caches indefinitely.
- `fetch(url, { next: { revalidate: 600 } })` caches with ISR timing.
- `fetch(url, { next: { tags: ['products'] } })` adds tags.
- Route-wide defaults: `export const fetchCache = 'default-cache'` or `export const revalidate = 600`.

### Where cached data lives
- Build-time results are part of the prerendered static shell.
- Runtime `use cache` entries live in an in-memory LRU per server instance by default. On serverless they may not persist, so use `"use cache: remote"` with a cache handler for shared, durable caching.
- The browser keeps results for the `stale` time.

### Pitfalls
- Caching per-user data in a shared cache leaks it to other users. Pass the user ID as an argument (so it is part of the key) or use `"use cache: private"`.
- `POST` requests are not cached.
--- code
// lib/products.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

type Product = { id: string; name: string; price: number };

export async function getProducts(category: string): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `category:${category}`); // category is part of the cache key
  const res = await fetch(`https://api.example.com/products?category=${category}`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

// app/admin/actions.ts
// "use server";
// import { updateTag } from "next/cache";
// export async function updatePrice(id: string, price: number) {
//   await db.product.update({ where: { id }, data: { price } });
//   updateTag("products"); // every product list refreshes on next read
// }

// Previous model equivalent:
// fetch(url, { next: { revalidate: 3600, tags: ["products"] } });

=== n46 | M | What is cache: 'no-store' used for in fetch?
**`cache: 'no-store'` tells Next.js to fetch fresh data from the source on every request and never store the response in the Data Cache. It is how you opt a request out of caching in the previous caching model.**

### Behavior
- The request always goes to the network.
- In the previous model, using it makes the route **dynamic**: rendered per request instead of prerendered.
- Request memoization still applies within one render, so the same `no-store` URL is only called once per render.

### Is it still needed?
- **Next.js 15 and later:** `fetch` is not cached by default, so `no-store` mostly documents intent. It still matters when a route sets a caching default, for example `fetchCache = 'default-cache'`, or when you want to make dynamic rendering explicit.
- **Next.js 14 and earlier:** essential, because `fetch` defaulted to `force-cache`.
- **With Cache Components:** a plain `fetch` is already uncached request-time work; put the component behind `<Suspense>`. If you want to force request-time rendering for non-fetch work like `Math.random()` or `Date.now()`, use `await connection()` instead.

### Typical uses
Live stock levels, account balances, prices that must be exact, and anything per-user from an external API.

### Alternatives
- `next: { revalidate: 0 }` has the same effect.
- `export const dynamic = 'force-dynamic'` made the whole route dynamic in the previous model; remove it when adopting Cache Components.
--- code
// app/account/balance.tsx
import { cookies } from "next/headers";

export async function Balance() {
  const token = (await cookies()).get("token")?.value;

  // Always fresh: never cached, never shared between users
  const res = await fetch("https://bank.example.com/balance", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const { amount } = await res.json();

  return <p>Balance: ${amount}</p>;
}

// app/account/page.tsx
// import { Suspense } from "react";
// export default function Page() {
//   return (
//     <Suspense fallback={<p>Loading balance…</p>}>
//       <Balance />
//     </Suspense>
//   );
// }

=== n47 | M | What is next: { revalidate } in the fetch options?
**`next: { revalidate: N }` caches a `fetch` response in the Data Cache and refreshes it at most every N seconds with stale-while-revalidate. It is time-based ISR for a single request. `revalidate: 0` disables caching and `false` caches indefinitely.**

### Values
- **Positive number:** cache, then regenerate in the background after N seconds.
- **`0`:** never cache (same as `cache: 'no-store'`); the route becomes dynamic.
- **`false`:** cache indefinitely until on-demand revalidation (same as `Infinity`).

### Interactions
- The **lowest** `revalidate` among the fetches and segment configs of a route sets how often the whole prerendered route regenerates.
- Combine with `next: { tags: [...] }` for on-demand invalidation.
- Conflicting options such as `{ cache: 'no-store', next: { revalidate: 60 } }` log a warning, and `no-store` wins.

### Stale-while-revalidate in practice
With `revalidate: 60`, a request at second 61 still gets the cached response, and triggers a refresh. The next request gets the new data. If the refresh fails, the old data stays.

### With Cache Components
These `fetch` options belong to the previous model. With `cacheComponents: true`, the equivalent is a `"use cache"` function with `cacheLife({ revalidate: 60 })` or a preset profile. `cacheLife` also controls the browser `stale` time and the `expire` time, which `next.revalidate` cannot.
--- code
// app/weather/page.tsx - previous caching model
export default async function Weather() {
  const res = await fetch("https://api.example.com/weather?city=Delhi", {
    next: { revalidate: 600, tags: ["weather"] }, // at most every 10 minutes
  });
  const data: { tempC: number; updatedAt: string } = await res.json();

  return (
    <p>
      {data.tempC}°C (updated {data.updatedAt})
    </p>
  );
}

// Cache Components equivalent:
// import { cacheLife, cacheTag } from "next/cache";
// async function getWeather() {
//   "use cache";
//   cacheLife({ stale: 300, revalidate: 600, expire: 86400 });
//   cacheTag("weather");
//   return fetch("https://api.example.com/weather?city=Delhi").then((r) => r.json());
// }

=== n48 | M | How do you use React.cache in Next.js?
**`React.cache` wraps a function so that repeated calls with the same arguments during one server request return the same result. Use it to deduplicate database or SDK calls across components in a render. It is per-request memoization, not a persistent cache.**

### Why you need it
`fetch` calls are memoized automatically, but ORM queries and SDK calls are not. If a layout, page and `generateMetadata` all call `getUser(id)`, `React.cache` makes it one query.

### Rules
- Works only in **Server Components** (and functions they call).
- Arguments are compared by identity (`Object.is`), so pass primitives. Two different object literals with the same content are two cache misses.
- Define the cached function at **module level**. Creating it inside a component makes a new cache each render.
- The cache is discarded after the request, so nothing leaks between users.
- Inside a `"use cache"` scope, `React.cache` is isolated: values cached outside are not visible inside. Pass data as arguments instead.

### Compared to other caches
| Tool | Scope | Lifetime |
|---|---|---|
| `React.cache` | one request | that render |
| `"use cache"` | shared across requests | `cacheLife` |
| `useMemo` | one Client Component | while mounted |

### Preload pattern
Call a cached function early without awaiting (`void getUser(id)`) to start the request, then await it later in a child. The child gets the already in-flight promise.
--- code
// lib/user.ts
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

// Module level: one cache shared by every caller in the same request
export const getUser = cache(async (id: string) => {
  console.log("DB query for", id); // logs once per request, not three times
  return db.user.findUnique({ where: { id } });
});

export const preloadUser = (id: string) => {
  void getUser(id); // start early, await later
};

// app/users/[id]/layout.tsx -> await getUser(id)   (query runs)
// app/users/[id]/page.tsx   -> await getUser(id)   (deduplicated)
// generateMetadata          -> await getUser(id)   (deduplicated)

=== n49 | M | What is the difference between static and dynamic rendering in the App Router?
**Static rendering produces HTML and the RSC payload ahead of time, at build or revalidation, and serves it from cache. Dynamic rendering produces them per request. With Cache Components (Next.js 16) the choice is no longer per route: each route gets a static shell, and only the parts that need request data render dynamically inside `<Suspense>`.**

### Static
- Rendered at `next build` or in the background on revalidation.
- Served from a CDN, so it is fast and cheap.
- Same output for every visitor.
- Examples: marketing pages, docs, product pages with cached data.

### Dynamic
- Rendered on each request on the server.
- Needed for cookies, headers, `searchParams`, per-user data, or values like `Date.now()`.
- Examples: dashboards, carts, search results.

### Previous model: per route
A route was static unless something made the **whole route** dynamic: `cookies()`, `headers()`, `searchParams`, an uncached `fetch`, or `export const dynamic = 'force-dynamic'`. One `cookies()` call in a header could make every page dynamic.

### Cache Components: per component (Partial Prerendering)
- Static and `"use cache"` content goes into the **static shell**.
- Request-time content streams into `<Suspense>` holes.
- Next.js validates this in development and build: uncached work outside `<Suspense>` is flagged as a blocking route.
- `ensureStatic` (16.4) can enforce that a page stays static, and `instant` checks that navigations show UI immediately.

### How to check
`next build` marks routes in its output. In dev, the Next.js DevTools show route info and insights.
--- code
// app/product/[id]/page.tsx - static shell + dynamic hole (Cache Components)
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

async function Details({ id }: { id: string }) {
  "use cache"; // static: cached and prerendered
  cacheLife("hours");
  const p = await fetch(`https://api.example.com/products/${id}`).then((r) => r.json());
  return <h1>{p.name}</h1>;
}

async function Recommendations() {
  const userId = (await cookies()).get("uid")?.value; // dynamic: per request
  const recs = await fetch(`https://api.example.com/recs?u=${userId}`).then((r) => r.json());
  return <ul>{recs.map((r: { id: string; name: string }) => <li key={r.id}>{r.name}</li>)}</ul>;
}

export default async function Page({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  return (
    <>
      <Details id={id} />
      <Suspense fallback={<p>Loading recommendations…</p>}>
        <Recommendations />
      </Suspense>
    </>
  );
}

=== n50 | M | What makes a route dynamic in the App Router?
**A route (or, with Cache Components, a part of it) becomes dynamic when it needs information only available at request time: `cookies()`, `headers()`, `searchParams`, `connection()`, `draftMode()` in some cases, uncached data access, or unprerendered dynamic params.**

### Request-time triggers
- **Runtime APIs:** `cookies()`, `headers()`, the `searchParams` prop, and reading request properties in a Route Handler.
- **`connection()`:** explicitly waits for a real request.
- **Uncached I/O:** a `fetch` without caching, database queries, async file reads.
- **Non-deterministic values:** `Math.random()`, `Date.now()`, `crypto.randomUUID()`. With Cache Components you must choose: cache them with `"use cache"` or defer with `await connection()` or `await io()`.
- **Dynamic params** not returned by `generateStaticParams`.

### Previous model (no Cache Components)
Any trigger made the **entire route** dynamic. You could also force it with `export const dynamic = 'force-dynamic'`, `revalidate = 0`, or `fetch(url, { cache: 'no-store' })`. `useSearchParams` in a Client Component without a `<Suspense>` boundary made the page client-render up to the nearest boundary.

### With Cache Components
Only the component that uses the trigger is dynamic. Next.js requires it to be inside `<Suspense>` (or cached), and the rest of the route stays in the static shell. Options like `dynamic`, `revalidate`, `fetchCache` and `runtime` are not used with Cache Components.

### Tip
Push request-time reads as deep in the tree as possible. Pass the `params` or `searchParams` promise down instead of awaiting it at the top of a layout, so more of the page is prerendered.
--- code
// app/dashboard/page.tsx
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";

async function Greeting() {
  const name = (await cookies()).get("name")?.value; // dynamic trigger
  return <p>Hi {name ?? "there"}</p>;
}

async function Geo() {
  const country = (await headers()).get("x-vercel-ip-country"); // dynamic trigger
  return <p>Shipping to {country}</p>;
}

async function RequestId() {
  await connection(); // dynamic without reading request data
  return <p>Request {crypto.randomUUID()}</p>;
}

export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1> {/* static shell */}
      <Suspense fallback={<p>…</p>}>
        <Greeting />
        <Geo />
        <RequestId />
      </Suspense>
    </main>
  );
}
