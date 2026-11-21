=== n51 | M | What is the unstable_noStore function?
**`unstable_noStore()` (usually imported as `noStore`) from `next/cache` opted a component out of static rendering and caching in the previous model. It is effectively superseded: use `await connection()` from `next/server` instead, and with Cache Components it is not needed at all.**

### What it did
Calling `noStore()` inside a Server Component told Next.js that the code after it must run per request, similar to `fetch(url, { cache: 'no-store' })` but for any code, including database queries made with an ORM. It was introduced in Next.js 14 because `fetch` options could not express "this database call is dynamic".

### Why it is outdated
- **Next.js 15** added `connection()`, which states the intent more clearly: "wait for an incoming request before continuing". The docs recommend it over `unstable_noStore`.
- **Cache Components (Next.js 16):** nothing is cached unless you add `"use cache"`, so there is nothing to opt out of. Remove `noStore()` calls. If a component must produce fresh output per request without reading request data (for example `Math.random()` or a synchronous database driver), call `await connection()` and wrap the component in `<Suspense>`.

### `connection()` vs `io()` (16.3)
- `connection()` waits for a real request and excludes the following code from prerendering and prefetching.
- `io()` marks a synchronous I/O read (`new Date()`, `node:sqlite`) so it suspends during prerendering and resolves immediately at request time and in cached scopes.

### Interview answer
"It was the escape hatch for marking non-fetch code dynamic. Today I use `connection()`, and with Cache Components I only cache what I mark with `use cache`."
--- code
// Before (Next.js 14)
// import { unstable_noStore as noStore } from "next/cache";
// export default async function Visitors() {
//   noStore();
//   const count = db.prepare("SELECT count(*) AS n FROM visits").get();
//   return <p>{count.n} visits</p>;
// }

// Now (Next.js 15+, and with Cache Components)
import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/sqlite"; // synchronous driver, e.g. better-sqlite3

async function Visitors() {
  await connection(); // run per request, not at build time
  const { n } = db.prepare("SELECT count(*) AS n FROM visits").get() as { n: number };
  return <p>{n} visits</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Counting…</p>}>
      <Visitors />
    </Suspense>
  );
}

=== n52 | E | How do you pass data from Server Components to Client Components?
**Fetch data in a Server Component and pass it to a Client Component as props. The props must be serializable by React (plain objects, arrays, strings, numbers, Dates, Maps, Sets, promises, JSX and Server Functions), because they travel to the browser inside the RSC payload.**

### Patterns
- **Props:** the simplest. `<Chart data={rows} />` where `Chart` is `"use client"`.
- **Pass a promise:** start the fetch on the server without awaiting it, pass the promise, and read it in the client with React's `use()` inside `<Suspense>`. The page streams instead of waiting.
- **Children / slots:** pass server-rendered JSX into a Client Component through `children`, so the server part never becomes client code.
- **Server Functions as props:** pass a `"use server"` function, for example `onSave`, and call it from the client.

### What you cannot pass
- Regular functions and event handlers (except Server Functions).
- Class instances (a database model object, `Decimal`), unless converted to plain data.
- Symbols, WeakMaps, DOM nodes.

### Security
Everything you pass is visible in the browser. Map database rows to a DTO with only the fields the UI needs, and never pass secrets. React's taint APIs (`experimental.taint` in `next.config`) can block specific objects or values from being sent.

### Shared data
For data many client components need, fetch on the server and pass it into a context provider rendered in the layout.
--- code
// app/sales/page.tsx (Server Component)
import { Suspense } from "react";
import { SalesChart } from "./sales-chart";
import { RecentTable } from "./recent-table";
import { getSales, getRecent } from "@/lib/sales";

export default async function SalesPage() {
  const sales = await getSales(); // awaited: passed as plain data
  const recentPromise = getRecent(); // not awaited: streamed as a promise

  return (
    <main>
      <SalesChart points={sales.map((s) => ({ day: s.day, total: Number(s.total) }))} />
      <Suspense fallback={<p>Loading recent orders…</p>}>
        <RecentTable ordersPromise={recentPromise} />
      </Suspense>
    </main>
  );
}

// app/sales/recent-table.tsx
// "use client";
// import { use } from "react";
// export function RecentTable({ ordersPromise }: { ordersPromise: Promise<Order[]> }) {
//   const orders = use(ordersPromise); // suspends until the server resolves it
//   return <table>{orders.map((o) => <tr key={o.id}><td>{o.total}</td></tr>)}</table>;
// }

=== n53 | M | Can Client Components fetch data directly?
**Yes. Client Components can fetch data in the browser with a library such as SWR or TanStack Query, with React's `use()` on a promise passed from the server, or with `fetch` in an effect. But in the App Router the default should be fetching in Server Components, and client fetching should be reserved for data that changes after the page loads.**

### When client fetching makes sense
- Polling or real-time data (notifications, live prices).
- Infinite scroll, autocomplete and search-as-you-type.
- Data that depends on browser-only state (geolocation, local storage).
- Highly interactive dashboards where the client owns the cache.

### Options
- **SWR / TanStack Query:** caching, deduplication, revalidation on focus, retries. Recommended for most client fetching.
- **`use(promise)`:** the server starts the request and passes the promise; the client suspends until it resolves. No waterfall, no client-side cache needed.
- **`useEffect` + `fetch`:** works but needs manual loading, error and race-condition handling. Avoid it for anything non-trivial.

### What client code should not do
- Call your database or use secrets. Client code is public.
- Call your own Route Handler just to read data you could have fetched in a Server Component; that adds a network round-trip.

### Where to fetch from
Client components call public APIs, Route Handlers (`app/api/...`) or Server Functions. Server Functions are designed for mutations; for reads, a Route Handler or server-provided promise is usually better because Server Function calls run one at a time.

### Hybrid
Fetch the first page on the server, pass it as `fallbackData` (SWR) or `initialData` (TanStack Query), then let the client keep it fresh.
--- code
// app/notifications/bell.tsx
"use client";

import useSWR from "swr";

type Notification = { id: string; text: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Bell({ initial }: { initial: Notification[] }) {
  // Seeded with server data, then refreshed every 15s in the browser
  const { data, error, isLoading } = useSWR<Notification[]>("/api/notifications", fetcher, {
    fallbackData: initial,
    refreshInterval: 15_000,
  });

  if (error) return <span>!</span>;
  return (
    <button aria-label="Notifications">
      🔔 {isLoading ? "…" : data?.length}
    </button>
  );
}

// app/layout.tsx (Server Component)
// const initial = await getNotifications(userId);
// <Bell initial={initial} />

=== n54 | M | What is SWR and how is it used with Next.js?
**SWR (stale-while-revalidate) is Vercel's React hooks library for client-side data fetching. `useSWR(key, fetcher)` returns cached data immediately, revalidates in the background, and updates the UI, with deduplication, focus revalidation, polling and mutation helpers built in.**

### Core API
- `const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, options)`.
- The **key** (usually the URL) identifies the cache entry. Components using the same key share data and a single request.
- Pass `null` as the key to skip fetching (conditional fetching).
- `mutate()` refreshes or optimistically updates the data.
- `useSWRInfinite` for pagination, `useSWRMutation` for remote mutations.

### Useful options
`refreshInterval`, `revalidateOnFocus`, `revalidateOnReconnect`, `dedupingInterval`, `fallbackData`, `keepPreviousData`.

### With the App Router
- Use it only in Client Components.
- **Seed from the server:** fetch in a Server Component and pass `fallbackData`, or provide a `fallback` map through `<SWRConfig>` in a client provider. The page renders with data on first load and SWR keeps it fresh.
- You can also pass an unresolved promise as the fallback value, and SWR suspends until the server resolves it.

### When to choose it
Polling, dashboards, live counters and anything that must update after load. For static or per-request data, a Server Component is simpler and ships less JavaScript.

### SWR vs TanStack Query
SWR is smaller and simpler. TanStack Query has richer mutation, cache and devtools features. Both work the same way with Next.js.
--- code
// app/providers.tsx
"use client";

import { SWRConfig } from "swr";

export function Providers({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: Record<string, unknown>;
}) {
  return (
    <SWRConfig value={{ fetcher: (url: string) => fetch(url).then((r) => r.json()), fallback }}>
      {children}
    </SWRConfig>
  );
}

// app/stats/views.tsx
"use client";
import useSWR from "swr";

export function Views({ slug }: { slug: string }) {
  const { data } = useSWR<{ views: number }>(`/api/views/${slug}`, { refreshInterval: 10_000 });
  return <span>{data?.views ?? 0} views</span>;
}

// app/stats/page.tsx (Server Component)
// const initial = await getViews("intro");
// <Providers fallback={{ "/api/views/intro": initial }}><Views slug="intro" /></Providers>

=== n55 | M | What is React Query and how does it integrate with Next.js?
**React Query, now TanStack Query, is a client-side server-state library that caches, deduplicates, refetches and mutates async data. In the App Router you add a `QueryClientProvider` in a Client Component, optionally prefetch on the server, and hand the cache to the client with `HydrationBoundary`.**

### Setup
1. Create a `providers.tsx` Client Component that creates one `QueryClient` per browser session (with `useState` or a singleton) and renders `QueryClientProvider`.
2. Wrap `children` with it in the root layout.
3. Use `useQuery`, `useSuspenseQuery`, `useMutation` and `useInfiniteQuery` in Client Components.

### Server prefetch + hydration
1. In a Server Component, create a new `QueryClient`, run `await queryClient.prefetchQuery({ queryKey, queryFn })`.
2. Render `<HydrationBoundary state={dehydrate(queryClient)}>` around the client component.
3. On the client, `useQuery` with the same key finds the data immediately.

Set a non-zero `staleTime` (for example 60 seconds) so the client does not refetch right after hydration.

### Streaming
TanStack Query v5 can dehydrate pending queries, so you can prefetch without awaiting and let the client suspend on the in-flight promise.

### When to use it with Next.js
- Complex client interactions: optimistic mutations, infinite lists, polling, offline support.
- Apps migrating from a client-rendered SPA.

### When not to
If data is only displayed, a Server Component is simpler. Mixing both for the same data creates two sources of truth. A common split: Server Components and Server Functions for most pages, TanStack Query for interactive widgets.
--- code
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// app/todos/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { TodoList } from "./todo-list"; // "use client", useQuery({ queryKey: ["todos"], ... })
import { getTodos } from "@/lib/todos";

export default async function TodosPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ["todos"], queryFn: getTodos });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TodoList />
    </HydrationBoundary>
  );
}

=== n56 | E | How do you handle loading states during data fetching?
**Use `loading.tsx` for route-level loading UI and `<Suspense fallback>` boundaries for individual slow components, so the page streams. For client interactions, use `useTransition`, `useFormStatus`, `useActionState` pending flags, `useLinkStatus` for links, or a data library's `isLoading`.**

### Server-rendered data
- **`loading.tsx`**: an automatic `<Suspense>` boundary around a segment's page. Shows instantly on navigation.
- **`<Suspense>`** around each slow component: the rest of the page renders while it waits. Several boundaries stream independently, so a slow widget never blocks the header.
- **Skeletons** that match the final layout avoid layout shift.
- With **Cache Components**, fallbacks become part of the static shell and can be prefetched, so the loading UI appears with no network wait.

### Client-side state
- **Navigation:** `useLinkStatus()` inside a `<Link>` shows a subtle pending indicator; `useTransition` around `router.push`.
- **Forms:** `useFormStatus()` gives `pending` inside a `<form>`; `useActionState` returns `isPending`.
- **Optimistic UI:** `useOptimistic` shows the expected result immediately.
- **Client fetching:** SWR or TanStack Query provide `isLoading` and `isFetching`.

### Good practice
- Do not wrap the whole page in a single spinner; place boundaries around independent pieces.
- Avoid flashes: very fast content does not need a fallback.
- Announce loading to screen readers with `aria-busy` or `aria-live`.
- Test in production mode or with the Navigation Inspector in DevTools; dev has no prefetching.
--- code
// app/dashboard/page.tsx
import { Suspense } from "react";
import { Revenue, LatestInvoices, Cards } from "./widgets"; // async Server Components

export default function Dashboard() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<div className="h-24 animate-pulse bg-slate-200" />}>
        <Cards />
      </Suspense>
      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<p>Loading revenue…</p>}>
          <Revenue />
        </Suspense>
        <Suspense fallback={<p>Loading invoices…</p>}>
          <LatestInvoices />
        </Suspense>
      </div>
    </main>
  );
}

// app/components/submit.tsx
// "use client";
// import { useFormStatus } from "react-dom";
// export function Submit() {
//   const { pending } = useFormStatus();
//   return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
// }

=== n57 | M | What is Suspense and how does it work in Next.js?
**`<Suspense>` is a React component that shows a `fallback` while its children are waiting for something, such as data or code. In Next.js it powers streaming: the server sends the fallback in the initial HTML, keeps rendering the suspended part, and streams the finished HTML into place when it is ready.**

### How a component suspends
- An async Server Component that `await`s data.
- A Client Component calling `use(promise)` on an unresolved promise.
- A lazy-loaded component (`React.lazy`, `next/dynamic`).
- Suspense-enabled libraries such as `useSuspenseQuery`.

### In Next.js specifically
- `loading.tsx` is shorthand for a `<Suspense>` boundary around a page.
- **Streaming:** each boundary resolves independently and is streamed in order of completion, so time to first byte stays low.
- **Partial Prerendering (Cache Components):** everything outside `<Suspense>` boundaries plus the fallbacks form the static shell; the content inside streams at request time. Next.js requires request-time work to be inside a boundary or cached.
- **Selective hydration:** React hydrates the parts that have arrived and prioritizes the area the user interacts with.

### Rules of thumb
- Place boundaries around independent, slow pieces, not around the whole page.
- Boundaries nest: the nearest one above a suspending component shows its fallback.
- Inside a transition (`startTransition`, Link navigation), React keeps showing existing content instead of falling back again. Give a boundary a `key` to force the fallback on change.
- Suspense does not catch errors; pair it with `error.tsx` or `catchError`.
- A component doing only synchronous work never suspends, even inside `<Suspense>`.
--- code
// app/movie/[id]/page.tsx
import { Suspense } from "react";

async function Reviews({ id }: { id: string }) {
  const reviews = await fetch(`https://api.example.com/movies/${id}/reviews`).then((r) => r.json());
  return <ul>{reviews.map((r: { id: string; text: string }) => <li key={r.id}>{r.text}</li>)}</ul>;
}

async function Cast({ id }: { id: string }) {
  const cast = await fetch(`https://api.example.com/movies/${id}/cast`).then((r) => r.json());
  return <p>{cast.map((c: { name: string }) => c.name).join(", ")}</p>;
}

export default async function Movie({ params }: PageProps<"/movie/[id]">) {
  const { id } = await params;
  return (
    <main>
      <h1>Movie {id}</h1>
      {/* Two boundaries: whichever finishes first streams first */}
      <Suspense fallback={<p>Loading cast…</p>}>
        <Cast id={id} />
      </Suspense>
      <Suspense fallback={<p>Loading reviews…</p>}>
        <Reviews id={id} />
      </Suspense>
    </main>
  );
}

=== n58 | H | How do you stream data with Suspense boundaries?
**Split the page into components that fetch their own data and wrap each slow one in `<Suspense>`. Next.js sends the static parts and fallbacks right away, then streams each component's HTML and RSC data over the same HTTP response as it resolves, with no extra requests.**

### Mechanics
1. The server renders until it hits suspended components and sends the HTML with fallbacks (the shell).
2. The connection stays open. When a component's data resolves, React sends a chunk containing its HTML and a small inline script that swaps it into the fallback's place.
3. The RSC payload streams in parallel, so client navigation uses the same data.
4. React hydrates each piece as it arrives (selective hydration).

### Design rules
- **Start work early, await late.** Kick off fetches in parallel; awaiting one after another in a parent creates a waterfall that streaming cannot fix.
- **Push awaits down.** Pass the `params` promise or a data promise into child components instead of awaiting at the top.
- **Granularity:** one boundary per independent region. Too many tiny boundaries cause popcorn-like loading; too few delay everything.
- **Promise to client:** pass an unresolved promise to a Client Component and read it with `use()` inside its own boundary.

### Status codes and SEO
Once streaming starts, the status is already 200. Call `notFound()` or `redirect()` before the first boundary when you need correct status codes. Next.js detects bots that cannot handle streamed metadata (`htmlLimitedBots`) and renders the full page for them.

### Infrastructure
Streaming needs a host that does not buffer responses. Some proxies (nginx with buffering on) break it; set `X-Accel-Buffering: no` or disable buffering. Next.js 16.3 switched App Router SSR to native Node.js streams for higher throughput.
--- code
// app/orders/page.tsx
import { Suspense } from "react";
import { OrdersTable } from "./orders-table"; // "use client", reads the promise with use()
import { getOrders, getSummary } from "@/lib/orders";

async function Summary({ summaryPromise }: { summaryPromise: ReturnType<typeof getSummary> }) {
  const s = await summaryPromise;
  return <p>{s.count} orders, ${s.total} total</p>;
}

export default function OrdersPage() {
  // Start both requests immediately, in parallel
  const summaryPromise = getSummary();
  const ordersPromise = getOrders();

  return (
    <main>
      <h1>Orders</h1>
      <Suspense fallback={<p>Calculating totals…</p>}>
        <Summary summaryPromise={summaryPromise} />
      </Suspense>
      <Suspense fallback={<p>Loading orders…</p>}>
        <OrdersTable ordersPromise={ordersPromise} />
      </Suspense>
    </main>
  );
}

=== n59 | M | What are Server Actions in Next.js?
**Server Actions are async functions marked with `"use server"` that run on the server but can be called from the client, typically from a `<form action>` or an event handler. React docs now call them Server Functions; "Server Action" refers to one used for a mutation via forms or transitions.**

### How they work
- Next.js gives each action an encrypted ID and creates a hidden POST endpoint on the page that uses it.
- Calling the action from the client sends a POST with serialized arguments; the result returns in the same response as updated UI (the RSC payload), so one round-trip gives both data and fresh UI.
- Unused actions are removed from the client bundle and get no endpoint.

### Features
- **Progressive enhancement:** a `<form action={serverAction}>` works before JavaScript loads.
- **Integrated caching:** call `updateTag`, `revalidateTag`, `revalidatePath` or `refresh()` inside the action and the client cache updates in the same response.
- **`redirect()`** after the mutation.
- **React hooks:** `useActionState` for results and errors, `useFormStatus` for pending state, `useOptimistic` for instant UI.

### Security essentials
- Every action is a **public HTTP endpoint**. Authenticate and authorize inside each one; hiding the button is not protection.
- Validate inputs (Zod) and return only what the UI needs.
- Built-in CSRF protection compares `Origin` with `Host`. Configure `serverActions.allowedOrigins` behind proxies.
- Default body limit is 1MB (`serverActions.bodySizeLimit`).
- Self-hosted multi-instance apps should set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

### Limits
Actions run one at a time per client (queued), so they are a poor fit for parallel data reads. Use Server Components or Route Handlers to read data.
--- code
// app/todos/actions.ts
"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

const Todo = z.object({ title: z.string().min(1).max(200) });

export async function addTodo(_prev: { error?: string }, formData: FormData) {
  const user = await verifySession(); // authorize every call
  const parsed = Todo.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { error: "Title is required" };

  await db.todo.create({ data: { title: parsed.data.title, userId: user.id } });
  updateTag(`todos:${user.id}`); // user sees the new todo immediately
  return {};
}

// app/todos/form.tsx
// "use client";
// import { useActionState } from "react";
// const [state, action, pending] = useActionState(addTodo, {});
// <form action={action}><input name="title" /><button disabled={pending}>Add</button>{state.error}</form>

=== n60 | M | How do you use use server directive?
**`"use server"` marks functions as Server Functions that the client can call over the network. Put it at the top of a file to mark every export, or as the first line inside an async function to mark just that function. It does not mark a component as a Server Component.**

### Two placements
- **File level** (`actions.ts` starting with `"use server"`): every exported function becomes a Server Function and must be `async`. Client Components can import these.
- **Inline** (first statement in an async function inside a Server Component): defines a Server Function inline. It can close over variables from the component; Next.js encrypts captured values before sending them to the client.

### Rules
- Functions must be **async**.
- Arguments and return values must be React-serializable (FormData, plain objects, primitives, Dates, Maps, Sets).
- A Client Component cannot define an inline Server Function; it must import one from a `"use server"` file or receive one as a prop.
- `"use server"` files should export only async functions. Do not export constants or objects from them.

### Common misconception
Components are Server Components **by default** in the App Router; you never need `"use server"` for that. `"use server"` is only for functions exposed to the client. To keep a module off the client, use the `server-only` package instead.

### Security
Each Server Function is reachable by anyone who has its ID. Check the session and permissions inside the function, validate input, and avoid passing sensitive values through closures even though they are encrypted.

### Where they run
In Server Components, forms, event handlers, `useEffect`, and passed as props. Proxy does not apply directive transforms, so `"use server"` has no effect there.
--- code
// app/lib/actions.ts - file-level: every export is a Server Function
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function deletePost(id: string) {
  const user = await verifySession();
  await db.post.delete({ where: { id, authorId: user.id } });
  revalidatePath("/posts");
}

// app/posts/[id]/page.tsx - inline Server Function inside a Server Component
// export default async function Page({ params }: PageProps<"/posts/[id]">) {
//   const { id } = await params;
//
//   async function publish() {
//     "use server"; // captures `id` (encrypted when sent to the client)
//     const user = await verifySession();
//     await db.post.update({ where: { id, authorId: user.id }, data: { published: true } });
//   }
//
//   return <form action={publish}><button>Publish</button></form>;
// }

=== n61 | M | What are React Server Components (RSC)?
**React Server Components are components that render only on the server, ahead of time or per request. Their code never ships to the browser; instead, React sends a serialized description of the rendered UI (the RSC payload). They can be async and read data directly, and they compose with Client Components that handle interactivity.**

### Key properties
- **Zero client JavaScript** for the component itself; only Client Components it renders are bundled.
- **Direct backend access:** databases, file system, secrets, internal services.
- **Async/await** in the component body.
- **No state or effects:** `useState`, `useEffect`, event handlers and browser APIs are not available.
- Can render Client Components and pass them serializable props or server-rendered `children`.

### How they reach the browser
1. On the server, React renders Server Components into the **RSC payload**: a streamed format with rendered elements, references to Client Component modules and their props.
2. Next.js uses it to produce HTML for the first load.
3. In the browser, React uses the payload to build the tree and hydrate Client Components.
4. On navigation, only the RSC payload for changed segments is fetched.

### Benefits
Smaller bundles, faster first load, no client-server waterfalls, secrets stay server-side, and large dependencies (markdown parsers, date libraries) stay on the server.

### In Next.js
Every component in `app/` is a Server Component unless its module (or an importing module) starts with `"use client"`. With Cache Components, Server Component output can be cached with `"use cache"` and included in the static shell.

### Interview tip
They are not the same as SSR. SSR turns any component into HTML; RSC changes where components run and what ships to the client. Client Components still get SSR'd.
--- code
// app/blog/[slug]/page.tsx - Server Component
import { marked } from "marked"; // large library: stays on the server
import { readFile } from "node:fs/promises";
import { CopyLink } from "./copy-link"; // Client Component

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const md = await readFile(`content/${slug}.md`, "utf8"); // file system access
  const html = await marked.parse(md);

  return (
    <article>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyLink slug={slug} /> {/* only this ships JavaScript */}
    </article>
  );
}

// app/blog/[slug]/copy-link.tsx
// "use client";
// export function CopyLink({ slug }: { slug: string }) {
//   return <button onClick={() => navigator.clipboard.writeText(location.href)}>Copy link</button>;
// }

=== n62 | E | What is the difference between Server and Client Components?
**Server Components run only on the server and send no JavaScript for themselves; they are for data fetching and static UI. Client Components (marked with `"use client"`) are pre-rendered on the server and then hydrated in the browser; they are for state, effects, event handlers and browser APIs.**

### Comparison
| | Server Component | Client Component |
|---|---|---|
| Default in `app/` | Yes | No, needs `"use client"` |
| Runs in browser | Never | Yes (and SSR'd on the server) |
| `async` component | Yes | No |
| State, effects, event handlers | No | Yes |
| Browser APIs | No | Yes (in effects or handlers) |
| Database and secrets | Yes | No |
| Adds to client bundle | No | Yes |

### Choosing
- **Server:** fetching data, accessing backend resources, keeping secrets, large dependencies, static content.
- **Client:** interactivity (`onClick`, `onChange`), `useState`, `useEffect`, context consumers, browser APIs like `localStorage`, and hooks-based libraries.

### Composition rules
- Server Components can import and render Client Components.
- Client Components cannot import Server Components, but can receive them as `children` or other props.
- Props from server to client must be serializable.
- `"use client"` marks a **boundary**: everything that module imports becomes client code too.

### Best practice
Keep client boundaries small and at the leaves: make the search input a Client Component, not the whole page. Use the `server-only` and `client-only` packages to get build errors when code is imported on the wrong side.
--- code
// app/products/page.tsx - Server Component (default)
import { db } from "@/lib/db";
import { AddToCart } from "./add-to-cart";

export default async function Products() {
  const products = await db.product.findMany(); // server-only access
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} - ${p.price}
          <AddToCart id={p.id} />
        </li>
      ))}
    </ul>
  );
}

// app/products/add-to-cart.tsx - Client Component
// "use client";
// import { useState } from "react";
// export function AddToCart({ id }: { id: string }) {
//   const [added, setAdded] = useState(false);
//   return <button onClick={() => setAdded(true)}>{added ? "Added" : "Add to cart"}</button>;
// }

=== n63 | E | When should you use the 'use client' directive?
**Add `"use client"` at the top of a file when the component needs interactivity or browser-only features: state, effects, event handlers, context, browser APIs, or a library that relies on them. Place it as low in the tree as possible, because it turns that module and everything it imports into client code.**

### You need it for
- `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useRef` for DOM work.
- Event handlers: `onClick`, `onChange`, `onSubmit` with client logic.
- Context providers and consumers (`createContext`, `useContext`).
- Browser APIs: `window`, `localStorage`, `IntersectionObserver`, geolocation.
- Client hooks from Next.js: `useRouter`, `usePathname`, `useSearchParams`, `useParams`, `useLinkStatus`.
- React hooks like `useActionState`, `useOptimistic`, `useFormStatus`.
- Third-party UI libraries that use hooks but lack the directive (wrap them in your own `"use client"` file).

### You do not need it for
- Fetching data, reading cookies or headers, or rendering static markup.
- Calling a Server Function from a `<form action>`; forms work in Server Components.
- Every child of a Client Component; only the entry point needs the directive.

### What it actually does
It marks a **module boundary**. The file and its imports are bundled for the browser. Components are still server-side rendered to HTML on first load, then hydrated.

### Pitfalls
- Adding it to `app/layout.tsx` or a page out of habit makes the whole subtree client-side.
- Props crossing the boundary must be serializable; you cannot pass a regular function from a Server Component.
- Secrets read in a client module are `undefined` (or leaked if prefixed `NEXT_PUBLIC_`).
--- code
// app/components/theme-toggle.tsx
"use client"; // needs state, an event handler and localStorage

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return <button onClick={toggle}>{dark ? "🌙" : "☀️"}</button>;
}

// app/layout.tsx stays a Server Component and just renders <ThemeToggle />

=== n64 | E | Can Server Components use hooks?
**Server Components cannot use stateful or effect hooks such as `useState`, `useEffect`, `useReducer`, `useContext` or `useRef`, because they render once on the server and never re-render in the browser. They can use React's `use()` and `cache()`, and Next.js server functions like `cookies()` and `headers()`.**

### Not allowed
- `useState`, `useReducer`: no state on the server.
- `useEffect`, `useLayoutEffect`: no lifecycle after render.
- `useContext`: Server Components cannot read React context.
- Custom hooks that call any of those, and Next.js client hooks (`useRouter`, `usePathname`, `useSearchParams`).

Using them gives an error such as "You're importing a component that needs useState. This React Hook only works in a Client Component."

### Allowed
- **`async`/`await`** directly in the component, which replaces most data hooks.
- **`use(promise)`**, though awaiting is simpler in a Server Component.
- **`React.cache()`** for per-request memoization.
- **Next.js functions:** `cookies()`, `headers()`, `draftMode()`, `connection()`, `after()`, `notFound()`, `redirect()`, `cacheLife()`, `cacheTag()`.
- **`useId`** works, since it is pure.

### Replacements
| Client pattern | Server pattern |
|---|---|
| `useEffect` + `fetch` | `await fetch()` in the component |
| `useContext` for config | import a module or pass props |
| `useState` for form result | Server Function + `useActionState` in a small Client Component |

### Tip
Need interactivity in one part of a server-rendered page? Extract just that part into a Client Component.
--- code
// app/profile/page.tsx - Server Component
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { EditNameButton } from "./edit-name-button"; // "use client": uses useState

const getProfile = cache(async (id: string) => db.user.findUnique({ where: { id } }));

export default async function Profile() {
  // const [x, setX] = useState(0); // Error: hooks need a Client Component
  const userId = (await cookies()).get("uid")?.value; // allowed: server function
  const profile = userId ? await getProfile(userId) : null; // allowed: await + cache

  if (!profile) return <p>Please sign in.</p>;
  return (
    <section>
      <h1>{profile.name}</h1>
      <EditNameButton initialName={profile.name} />
    </section>
  );
}

=== n65 | M | Can Client Components be async?
**No. Client Components cannot be `async` functions; React does not support async components in the browser and logs an error. Only Server Components can be async. In a Client Component, read async data with React's `use(promise)` inside `<Suspense>`, a data library, or an effect.**

### Why
An async component returns a Promise. On the server, React can await it once and stream the result. In the browser, components re-render often, and creating a new promise on every render would cause infinite suspension and refetching.

### What to do instead
1. **Pass a promise from a Server Component** and call `use(promise)` in the Client Component. The promise is created once on the server, so it is stable.
2. **Use SWR or TanStack Query** (`useSWR`, `useSuspenseQuery`), which cache the promise for you.
3. **`useEffect` + state** for simple cases, with cleanup to avoid race conditions.
4. **Restructure:** move the data fetching into a parent Server Component and pass the data as props.

### Pitfall with `use()`
Do not create the promise inside the Client Component during render, such as `use(fetch(url))`. Each render creates a new promise and the component suspends forever. The promise must come from a cache, a parent, or a library.

### Related
Client Components can call Server Functions (which are async) from event handlers or transitions. That is a function call, not an async component.
--- code
// app/comments/page.tsx - Server Component creates the promise once
import { Suspense } from "react";
import { Comments } from "./comments";
import { getComments } from "@/lib/comments";

export default function Page() {
  const commentsPromise = getComments(); // not awaited
  return (
    <Suspense fallback={<p>Loading comments…</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// app/comments/comments.tsx
// "use client";
// import { use, useState } from "react";
//
// // export default async function Comments() {}  <- not allowed in a Client Component
// export function Comments({ commentsPromise }: { commentsPromise: Promise<{ id: string; text: string }[]> }) {
//   const comments = use(commentsPromise); // suspends until resolved
//   const [open, setOpen] = useState(true);
//   return open ? <ul onClick={() => setOpen(false)}>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul> : null;
// }

=== n66 | M | How do you use context in the App Router?
**React context only works in Client Components. Create the context and its provider in a `"use client"` file, render the provider in a layout (a Server Component), and pass server-fetched data into it as props. Server Components cannot read context; they pass data via props or call cached functions directly.**

### Steps
1. `app/providers.tsx` with `"use client"`: create the context and export a provider component.
2. Render `<Providers>` in `app/layout.tsx` around `children`. The layout can stay a Server Component.
3. Consume with `useContext` (or React 19's `use(Context)`) in Client Components.
4. Server-rendered `children` passed through the provider stay Server Components.

### Tips
- **Render providers as deep as possible.** Wrapping only the part that needs it helps Next.js optimize the static parts.
- **Seed from the server:** fetch the user or settings in the layout and pass them to the provider.
- **Pass a promise** to the provider and read it with `use()` in consumers, so the layout does not block on the data.
- With React 19 you can render `<ThemeContext value={...}>` directly instead of `<ThemeContext.Provider>`.

### For Server Components
- Need the same data in many Server Components? Call a `React.cache`-wrapped function in each one; it runs once per request.
- Root-level params like a locale segment can be read anywhere with `next/root-params` (16.3) instead of prop drilling.

### Pitfall
Context changes re-render every consumer. For frequently changing global state, consider Zustand, Jotai or splitting contexts.
--- code
// app/providers.tsx
"use client";

import { createContext, use } from "react";

type User = { id: string; name: string } | null;
const UserContext = createContext<Promise<User> | null>(null);

export function UserProvider({ userPromise, children }: { userPromise: Promise<User>; children: React.ReactNode }) {
  return <UserContext value={userPromise}>{children}</UserContext>;
}

export function useUser() {
  const promise = use(UserContext);
  if (!promise) throw new Error("useUser must be used inside UserProvider");
  return use(promise); // suspends until the server resolves the user
}

// app/layout.tsx (Server Component)
// import { getCurrentUser } from "@/lib/auth";
// export default function RootLayout({ children }) {
//   return (
//     <html lang="en"><body>
//       <UserProvider userPromise={getCurrentUser()}>{children}</UserProvider>
//     </body></html>
//   );
// }

=== n67 | H | What is the component tree boundary between server and client?
**The boundary is the first module marked `"use client"`. Everything above it in the import graph runs on the server; that module and everything it imports is bundled for the client. Server Components can still appear inside the client part of the tree, but only when passed in as props such as `children`.**

### Two trees to keep apart
- **Module graph (imports):** decides which code ships to the browser. `"use client"` cuts the graph: a Client Component's imports are client code.
- **Render tree (JSX nesting):** decides what renders inside what. A Server Component can be rendered inside a Client Component if a Server Component parent created it and passed it down.

### What crosses the boundary
- **Props** from server to client must be serializable: data, JSX, promises, Server Functions.
- **Children/slots** let server-rendered UI sit inside client UI without becoming client code.
- **Server Functions** let client code call back into the server.

### Placement strategy
- Keep the boundary at the leaves: an interactive button, a form, a chart.
- Wrap non-boundary third-party components (libraries using hooks without `"use client"`) in your own small client file.
- Shared utilities without hooks or browser APIs can be imported on both sides; they get duplicated into both bundles.

### Guardrails
- `import "server-only"` in modules with secrets or database access: importing them from client code fails the build.
- `import "client-only"` for modules that touch `window`.
- Use the Next.js DevTools and the bundle analyzer (`next analyze`) to see what crossed the boundary.

### Pitfall
`"use client"` in a layout or page makes every component that module imports a client component, even ones that did not need it.
--- code
// app/page.tsx (server)
import { Tabs } from "./tabs";            // "use client" boundary
import { ServerStats } from "./server-stats"; // async Server Component

export default function Page() {
  return (
    // ServerStats is created here on the server and passed through
    <Tabs stats={<ServerStats />}>
      <p>Rendered on the server, displayed inside a client component</p>
    </Tabs>
  );
}

// app/tabs.tsx
// "use client";
// import { useState } from "react";
// import { formatDate } from "@/lib/format"; // imported here => bundled for the client
// export function Tabs({ stats, children }: { stats: React.ReactNode; children: React.ReactNode }) {
//   const [tab, setTab] = useState<"a" | "b">("a");
//   return (
//     <div>
//       <button onClick={() => setTab("a")}>Info</button>
//       <button onClick={() => setTab("b")}>Stats</button>
//       {tab === "a" ? children : stats}
//     </div>
//   );
// }

=== n68 | M | How do you pass server data as props to Client Components?
**Fetch or compute the data in a Server Component, shape it into plain serializable values, and pass it as props to the Client Component. React serializes the props into the RSC payload, so only include what the client needs.**

### Steps
1. Load data in an async Server Component (database, API, file).
2. Convert to plain data: map ORM models to objects, turn `Decimal` or `BigInt` into numbers or strings, and pick only the needed fields.
3. Render `<ClientThing data={plain} />`.
4. Optionally pass a promise instead of awaited data to stream it, and read it with `use()`.

### Serializable types
Strings, numbers, booleans, `null`, `undefined`, arrays, plain objects, `Date`, `Map`, `Set`, typed arrays, `BigInt`, promises, React elements, and Server Functions. Not allowed: regular functions, class instances, symbols.

### Size and privacy
- Props are embedded in the HTML and RSC payload. A 2MB product list is sent twice in effect (as HTML and as payload). Paginate or summarize.
- Everything is readable in the browser's view-source. Never pass password hashes, tokens or internal IDs you do not want public.
- Create a Data Transfer Object (DTO) layer that returns safe shapes.

### Updating after load
Props are a snapshot. To refresh them, call `router.refresh()`, revalidate in a Server Function, or let SWR/TanStack Query take over using the props as initial data.
--- code
// app/team/page.tsx (Server Component)
import { db } from "@/lib/db";
import { TeamTable } from "./team-table"; // "use client"

export default async function TeamPage() {
  const users = await db.user.findMany({ include: { role: true } });

  // DTO: only safe, serializable fields cross the boundary
  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role.name,
    joinedAt: u.createdAt, // Date is serializable
    // passwordHash: u.passwordHash  <- never send
  }));

  return <TeamTable members={members} />;
}

// app/team/team-table.tsx
// "use client";
// export function TeamTable({ members }: { members: { id: string; name: string; role: string; joinedAt: Date }[] }) {
//   const [query, setQuery] = useState("");
//   const visible = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
//   ...
// }

=== n69 | M | What are the limitations of Server Components?
**Server Components cannot hold state, run effects, handle browser events or use browser APIs, and they cannot read React context. Their props to Client Components must be serializable, and their output is only updated by a new server render.**

### Functional limits
- **No interactivity:** no `onClick`, `onChange` or other handlers (except passing Server Functions to forms).
- **No state or lifecycle:** `useState`, `useReducer`, `useEffect`, `useRef` for DOM.
- **No context:** cannot call `useContext`.
- **No browser APIs:** `window`, `document`, `localStorage`.
- **Not re-rendered on the client:** updates require navigation, `router.refresh()`, or revalidation from a Server Function.

### Composition limits
- Client Components cannot import Server Components; they must receive them as props or `children`.
- Props passed to Client Components must be serializable.
- A Server Component inside a `"use client"` module's import graph becomes a Client Component.

### Library limits
- Libraries that rely on hooks or browser APIs must be wrapped in a Client Component.
- Runtime CSS-in-JS libraries that inject styles at render time need a client registry, or do not work in Server Components at all.

### Caching and request limits (Cache Components)
- Inside `"use cache"`, you cannot read `cookies()`, `headers()` or `searchParams`. Pass values as arguments or use `"use cache: private"`.
- Request-time work must be inside `<Suspense>` or cached, or the route is flagged as blocking.

### Testing
Async Server Components are not fully supported by Jest or Vitest renderers; test them end-to-end with Playwright or test their data functions separately.
--- code
// app/cart/page.tsx (Server Component)
import { cookies } from "next/headers";
import { QuantityPicker } from "./quantity-picker"; // "use client"
import { getCart } from "@/lib/cart";

export default async function Cart() {
  const cartId = (await cookies()).get("cart")?.value;
  const cart = await getCart(cartId);

  // Not possible here:
  // const [qty, setQty] = useState(1);
  // <button onClick={() => setQty(qty + 1)} />
  // window.localStorage.getItem("coupon");

  return (
    <ul>
      {cart.items.map((item) => (
        <li key={item.id}>
          {item.name}
          {/* interactivity is delegated to a Client Component */}
          <QuantityPicker itemId={item.id} initial={item.qty} />
        </li>
      ))}
    </ul>
  );
}

=== n70 | E | Can you import a Client Component inside a Server Component?
**Yes. This is the normal pattern: a Server Component imports a `"use client"` component and renders it with serializable props. The Client Component is server-side rendered to HTML for the first load and hydrated in the browser.**

### What happens
- Next.js does not bundle the Server Component, but it does bundle the imported Client Component and its imports for the browser.
- In the RSC payload, the Client Component appears as a reference to its JavaScript module plus its props.
- On the client, React downloads that module and hydrates the HTML.

### Rules
- Props must be serializable. You cannot pass `onClick={() => ...}` from a Server Component; pass data, JSX or a Server Function instead.
- The Client Component file must have `"use client"` at the top (or be imported by a file that does).
- Named and default exports both work.

### Third-party components
Many UI libraries ship components that use hooks. If a library lacks the directive, importing it directly into a Server Component fails with a hooks error. Re-export it from your own file:

`"use client"; export { Carousel } from "some-carousel";`

### Good practice
Import Client Components at the leaves and keep data fetching in the Server Component parent. A large interactive widget can be loaded lazily with `next/dynamic` inside a Client Component.
--- code
// app/page.tsx - Server Component
import { Counter } from "./counter";       // "use client"
import { Carousel } from "./carousel";     // re-exported third-party client component
import { getSlides } from "@/lib/slides";

export default async function Home() {
  const slides = await getSlides();
  return (
    <main>
      <Counter start={5} />            {/* serializable prop */}
      <Carousel slides={slides} />
      {/* <Counter onChange={() => {}} />  Error: functions are not serializable */}
    </main>
  );
}

// app/counter.tsx
// "use client";
// import { useState } from "react";
// export function Counter({ start }: { start: number }) {
//   const [n, setN] = useState(start);
//   return <button onClick={() => setN(n + 1)}>{n}</button>;
// }

// app/carousel.tsx
// "use client";
// export { Carousel } from "acme-carousel";

=== n71 | M | Can you import a Server Component inside a Client Component?
**No, not directly. Anything imported by a `"use client"` module becomes client code, so an imported "Server Component" would run in the browser and lose server-only abilities, or fail if it uses server APIs. Instead, pass Server Components to Client Components as `children` or other props from a Server Component parent.**

### What goes wrong if you import it
- An async component cannot render in the browser.
- `cookies()`, database clients or `fs` break or leak into the bundle.
- With `import "server-only"` in the module, the build fails, which is the desired guardrail.

### The supported pattern
1. A Server Component parent renders the Client Component.
2. It passes the Server Component as JSX: `<ClientShell><ServerList /></ClientShell>` or `<ClientShell sidebar={<ServerSidebar />} />`.
3. The Client Component renders `{children}` or `{sidebar}` wherever it wants.

The Server Component is rendered on the server first; the Client Component only receives its rendered output.

### Why this works
The Client Component never imports the server module. React resolves the server part before sending the payload, so the client gets a ready-made element.

### Calling server code from a Client Component
Client Components can import Server Functions from a `"use server"` file. That does not import server code; it imports a reference that makes a network call.

### Interview summary
"Client cannot import server, but server can pass server into client through props."
--- code
// app/page.tsx - Server Component composes both
import { Modal } from "./modal";          // "use client"
import { CartSummary } from "./cart-summary"; // async Server Component

export default function Page() {
  return (
    <Modal title="Your cart">
      <CartSummary /> {/* rendered on the server, passed as children */}
    </Modal>
  );
}

// app/modal.tsx
// "use client";
// import { useState } from "react";
// // import { CartSummary } from "./cart-summary";  <- wrong: would become client code
// export function Modal({ title, children }: { title: string; children: React.ReactNode }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <>
//       <button onClick={() => setOpen(true)}>{title}</button>
//       {open && <dialog open>{children}<button onClick={() => setOpen(false)}>Close</button></dialog>}
//     </>
//   );
// }

=== n72 | H | What is the "children pattern" for mixing server and client components?
**The children pattern lets a Client Component wrap server-rendered content without turning it into client code. A Server Component parent renders `<ClientWrapper><ServerContent /></ClientWrapper>`, and the client wrapper simply renders `{children}`. The server content is rendered on the server and arrives as finished output.**

### Why it matters
Many interactive shells need to wrap large amounts of static or data-heavy content: tabs, accordions, modals, sidebars, theme or auth providers, animation wrappers. Without the pattern, making the shell interactive would drag all of its content into the client bundle.

### How it works
1. The Server Component creates both elements.
2. React renders `<ServerContent />` on the server into the RSC payload.
3. `ClientWrapper` receives `children` as an opaque, already-rendered node.
4. The wrapper can show, hide, reorder or animate it, but cannot pass new props into it.

### Variations
- **Named slots:** `<Layout header={<Header />} sidebar={<Nav />}>`.
- **Providers:** `<ThemeProvider>{children}</ThemeProvider>` in the root layout keeps pages as Server Components.
- **Cache interleaving:** a `"use cache"` component can accept `children` without them becoming part of its cache key, as long as it does not inspect them.

### Limits
- The client wrapper cannot pass props to children; use context for that, read by Client Components inside.
- Children are rendered once per server render; client state changes do not re-run server code.
- Hidden children (an inactive tab) are still rendered on the server, so very expensive content can be deferred with `<Suspense>` or a route.
--- code
// app/docs/page.tsx (Server Component)
import { Accordion } from "./accordion"; // "use client"
import { db } from "@/lib/db";

async function Faq({ id }: { id: string }) {
  const item = await db.faq.findUnique({ where: { id } }); // server-only work
  return <div dangerouslySetInnerHTML={{ __html: item!.answerHtml }} />;
}

export default function DocsPage() {
  return (
    <>
      <Accordion title="How do refunds work?">
        <Faq id="refunds" />
      </Accordion>
      <Accordion title="Can I change plans?">
        <Faq id="plans" />
      </Accordion>
    </>
  );
}

// app/docs/accordion.tsx
// "use client";
// import { useState } from "react";
// export function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <section>
//       <button aria-expanded={open} onClick={() => setOpen(!open)}>{title}</button>
//       {open && children}
//     </section>
//   );
// }

=== n73 | M | What are third-party libraries' compatibility issues with RSC?
**Many libraries were written for client-only React. If they use hooks, context, browser APIs or runtime style injection but do not declare `"use client"`, importing them in a Server Component fails. Others pull in Node-only code or are large enough to bloat bundles if imported on the wrong side.**

### Common problems
- **Missing `"use client"`:** UI kits, carousels, animation libraries and form libraries that use hooks. Error: "useState only works in Client Components".
- **Context providers** (theme, i18n, state libraries) cannot be rendered by Server Components unless they are client modules.
- **Runtime CSS-in-JS** (Emotion, older styled-components setups) needs a style registry with `useServerInsertedHTML` and works only in Client Components.
- **Browser globals at import time** (`window` access at module scope) crash during server rendering.
- **Node-only or native packages** (`sharp`, `bcrypt`, Prisma engines) must not be bundled for the client and sometimes not even for the server.
- **Class instances as props** (ORM models, `Decimal`) are not serializable.

### Fixes
1. **Wrap in your own client file:** `"use client"; export { Slider } from "fancy-slider";`.
2. **Providers file:** create `app/providers.tsx` with `"use client"` and render it in the layout.
3. **Browser-only libraries:** load with `next/dynamic` and `ssr: false` from inside a Client Component.
4. **Native packages:** list them in `serverExternalPackages` so they are loaded from `node_modules` at runtime. Since 16.1, Turbopack also externalizes their transitive dependencies.
5. **Monorepo or ESM-only packages:** use `transpilePackages`.
6. **Big barrel imports:** `optimizePackageImports` (enabled for many popular libraries automatically).

### Checking compatibility
Most popular libraries (MUI, Chakra, Mantine, TanStack, Framer Motion) now ship RSC-compatible entry points. Check their App Router guide.
--- code
// app/ui/slider.tsx - wrap a hooks-based library that lacks the directive
"use client";
export { Slider } from "fancy-slider";

// app/ui/map.tsx - library touches window at import time
"use client";
import dynamic from "next/dynamic";
export const Map = dynamic(() => import("leaflet-map").then((m) => m.Map), {
  ssr: false,
  loading: () => <p>Loading map…</p>,
});

// next.config.ts
// const nextConfig = {
//   serverExternalPackages: ["sharp", "@node-rs/argon2"], // native modules
//   transpilePackages: ["@acme/ui"],                      // monorepo package
//   experimental: { optimizePackageImports: ["my-icon-lib"] },
// };

=== n74 | M | How do you handle browser-only APIs in Server Components?
**You cannot use them there. Server Components run on the server, where `window`, `document`, `localStorage` and `navigator` do not exist. Move the code into a Client Component and access the API in an effect or event handler, or load browser-only libraries with `next/dynamic` and `ssr: false`.**

### Approaches
1. **Client Component + `useEffect`:** effects run only in the browser, after hydration. Initialize state with a safe default and update it in the effect.
2. **Event handlers:** code in `onClick` runs only in the browser.
3. **`next/dynamic` with `ssr: false`:** skip server rendering for a component entirely. Must be called from a Client Component; it is not allowed in Server Components.
4. **`useSyncExternalStore`** with a server snapshot for values like `navigator.onLine` or media queries, which avoids hydration mismatches.
5. **Read on the server instead:** many "browser" values have server equivalents, such as cookies for theme, `headers()` for user agent or language, and geo headers from the host.

### Avoiding hydration errors
Rendering different output on the server and client (for example `localStorage` values or `Date.now()`) causes mismatches. Render a placeholder first and update in an effect, or store the value in a cookie so the server knows it.

### With Cache Components
Client Components are also prerendered on the server during SSR. To read synchronous browser-ish values such as `Date.now()` in a Client Component, React 19.3's `use(browser())` or `use(io())` (16.3) mark the read so it is deferred out of the static shell.

### Guard rail
`import "client-only"` in modules that touch browser globals makes accidental server imports fail at build time.
--- code
// app/components/online-status.tsx
"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OnlineStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // browser snapshot
    () => true // server snapshot: avoids hydration mismatch
  );
  return <span>{online ? "Online" : "Offline"}</span>;
}

// Server-side alternative: read what the request already tells you
// const lang = (await headers()).get("accept-language");

=== n75 | M | What is the difference between use server and use client?
**`"use client"` marks a module as client code: its components are bundled for the browser and can use state and effects. `"use server"` marks functions as Server Functions: they stay on the server and the client gets a reference it can call over the network. Neither is needed to make a Server Component; that is the default.**

### `"use client"`
- Placed at the top of a **file**.
- Declares a boundary in the module graph: this file and its imports go to the client bundle.
- Components inside are still SSR'd to HTML, then hydrated.
- Used for interactivity, hooks and browser APIs.

### `"use server"`
- Placed at the top of a **file** (all exports are Server Functions) or as the first line of an **async function**.
- The function body never ships to the client. The client gets an encrypted action ID.
- Calls become POST requests; arguments and return values are serialized.
- Used for mutations: form submissions, updates, deletes, with revalidation.

### Mental model
- `"use client"`: "send this code to the browser."
- `"use server"`: "let the browser call this code on the server."

### Common mistakes
- Adding `"use server"` to a component file to make it a Server Component. It is unnecessary and turns exports into endpoints.
- Exporting non-async values from a `"use server"` file.
- Assuming `"use server"` functions are private. They are public endpoints; authorize inside them.
- Using `"use server"` as a data-fetching layer for reads. Server Functions run sequentially, so reads are better in Server Components.

### Related directives
`"use cache"`, `"use cache: private"` and `"use cache: remote"` (Cache Components) mark cacheable functions and components.
--- code
// app/actions.ts - functions the client can call
"use server";

import { updateTag } from "next/cache";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function likePost(postId: string) {
  const user = await verifySession();
  await db.like.create({ data: { postId, userId: user.id } });
  updateTag(`post:${postId}`);
}

// app/like-button.tsx - code that runs in the browser
// "use client";
// import { useTransition } from "react";
// import { likePost } from "./actions"; // imports a reference, not the server code
// export function LikeButton({ postId }: { postId: string }) {
//   const [pending, start] = useTransition();
//   return <button disabled={pending} onClick={() => start(() => likePost(postId))}>Like</button>;
// }

=== n76 | M | How do you share state between Server and Client Components?
**Server and Client Components do not share memory, so "state" is shared through the URL, cookies, props, context seeded from the server, and Server Functions that change server data and refresh the UI. Choose the channel by who needs to read it and whether it must survive a reload.**

### Channels
- **URL (search params and path):** the best place for shareable UI state such as filters, tabs and pagination. Server Components read `searchParams`; Client Components use `useSearchParams` and update with `router.replace`.
- **Cookies:** state the server must know on every request (theme, locale, session, cart ID). Set them in Server Functions or Route Handlers with `(await cookies()).set()`; read them in Server Components.
- **Props:** server to client, one direction, a snapshot at render time.
- **Context seeded from the server:** fetch in a layout, pass to a client provider. Client components share and update it locally.
- **Server data + Server Functions:** the client calls an action that writes to the database and calls `updateTag` or `refresh()`; the server re-renders with the new state in the same response.

### Client-only state
State that only matters in the browser (open menus, form drafts) can live in `useState`, Zustand or Jotai. With Cache Components, pages stay mounted in a hidden `<Activity>` when you navigate away, so local state survives Back navigation.

### Pitfalls
- Do not put per-user data in module-level variables on the server; they are shared across all requests and users.
- Changing client state does not re-run Server Components. Use the URL or a Server Function plus `router.refresh()`.
--- code
// app/products/page.tsx (server reads URL state)
import { Filters } from "./filters";
import { Suspense } from "react";

async function List({ searchParams }: { searchParams: Promise<{ color?: string }> }) {
  const { color } = await searchParams;
  const items = await fetch(`https://api.example.com/items?color=${color ?? ""}`).then((r) => r.json());
  return <p>{items.length} items</p>;
}

export default function Page(props: PageProps<"/products">) {
  return (
    <>
      <Filters />
      <Suspense fallback={<p>Loading…</p>}>
        <List searchParams={props.searchParams as Promise<{ color?: string }>} />
      </Suspense>
    </>
  );
}

// app/products/filters.tsx (client writes URL state)
// "use client";
// const router = useRouter(); const params = useSearchParams();
// <select value={params.get("color") ?? ""} onChange={(e) => router.replace(`?color=${e.target.value}`)} />

// app/actions.ts (cookie state)
// "use server";
// export async function setTheme(theme: "light" | "dark") {
//   (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
// }

=== n77 | M | What is serialization and why does it matter when passing props?
**Serialization converts values into a format that can be sent over the network. When a Server Component passes props to a Client Component, or a client calls a Server Function, React serializes the values into the RSC payload. Only types React can serialize can cross, and everything that crosses becomes visible to the browser.**

### Supported across the boundary
- Primitives: string, number, bigint, boolean, `null`, `undefined`.
- Arrays and plain objects (with serializable values).
- `Date`, `Map`, `Set`, typed arrays, `ArrayBuffer`, `FormData` (for Server Function arguments).
- Promises (resolved on the client with `use()`).
- React elements (JSX) and Server Functions.

### Not supported
- Regular functions and arrow functions (event handlers).
- Class instances with prototypes (ORM models, `Decimal`, `URL`, custom classes).
- Symbols (except global ones), `WeakMap`, `WeakSet`, DOM nodes, React context.

### Why it matters
1. **Correctness:** passing a function or class instance throws an error during rendering.
2. **Security:** props are embedded in the HTML and RSC payload. Anything you pass, including fields you do not render, is readable in the browser.
3. **Performance:** large props increase payload size twice: once as HTML and once as data for hydration.
4. **Caching:** `"use cache"` arguments and return values must also be serializable, and arguments become part of the cache key.

### Practical rules
- Map database results to plain DTOs with only the needed fields.
- Convert `Decimal` to number or string, and IDs to strings.
- Pass Server Functions instead of callbacks.
- Use React's taint APIs to block sensitive objects from crossing.
--- code
// app/invoices/page.tsx (Server Component)
import { db } from "@/lib/db";
import { InvoiceList } from "./invoice-list"; // "use client"

export default async function Page() {
  const rows = await db.invoice.findMany(); // ORM objects with Decimal amounts

  const invoices = rows.map((r) => ({
    id: r.id,
    amount: r.amount.toNumber(), // Decimal class -> number
    issuedAt: r.issuedAt,        // Date is fine
    status: r.status,
  }));

  return (
    <InvoiceList
      invoices={invoices}
      // onSelect={(id) => console.log(id)}  Error: functions cannot be serialized
      // invoice={rows[0]}                  Error or leak: class instance with extra fields
    />
  );
}

=== n78 | M | What is a Shared Component?
**A shared component is one that can run as either a Server or Client Component because it only renders props: no hooks, no browser APIs and no server-only APIs. It becomes a Server Component when imported from server code and a Client Component when imported from a `"use client"` module.**

### Characteristics
- Pure rendering from props: buttons, cards, badges, layout primitives, formatters.
- No `useState`/`useEffect`, no `window`, no `cookies()` or database access.
- Not `async` (an async component could only be a Server Component).
- No directive at the top of the file.

### Why it is useful
- Reuse the same component in server-rendered pages and interactive client widgets.
- When used from the server, it adds nothing to the client bundle.
- When used from a client tree, it is bundled once for that client code.

### How the environment is decided
The importer decides. A shared `Badge` imported by `app/page.tsx` renders on the server. The same `Badge` imported by `app/cart-drawer.tsx` (which starts with `"use client"`) is bundled for the browser.

### Utilities follow the same idea
Formatting helpers, validation schemas (Zod) and constants can be imported on both sides. Mark modules that must never reach the browser with `import "server-only"`.

### Pitfall
Adding a hook later silently breaks server usages. Lint rules or tests that import shared components in a server context catch this early.
--- code
// components/price.tsx - shared: no directive, no hooks, no server APIs
type Props = { amount: number; currency?: string };

export function Price({ amount, currency = "USD" }: Props) {
  const text = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  return <span className="font-semibold tabular-nums">{text}</span>;
}

// app/products/page.tsx - Server Component uses it (zero client JS)
// import { Price } from "@/components/price";
// <Price amount={product.price} />

// app/cart/cart-drawer.tsx - Client Component uses the same component
// "use client";
// import { useState } from "react";
// import { Price } from "@/components/price"; // bundled for the browser here
// export function CartDrawer({ total }: { total: number }) {
//   const [open, setOpen] = useState(false);
//   return <button onClick={() => setOpen(!open)}>Cart <Price amount={total} /></button>;
// }

=== n79 | M | How does React handle hydration in Next.js?
**Hydration is the step where React, in the browser, attaches event handlers and state to HTML that was already rendered on the server, turning static markup into an interactive app. In Next.js only Client Components hydrate; Server Component output stays as plain HTML.**

### The sequence on first load
1. The server renders Server and Client Components to HTML and streams it, together with the RSC payload.
2. The browser paints the HTML immediately, so content is visible before JavaScript runs.
3. JavaScript for the Client Components downloads.
4. React rebuilds the tree from the RSC payload, matches it against the existing DOM, and attaches listeners and state (`hydrateRoot`).
5. Effects run; the page is interactive.

### Streaming and selective hydration
With `<Suspense>`, React hydrates each boundary as soon as its HTML and code arrive, and it prioritizes boundaries the user interacts with. A slow widget does not delay interactivity elsewhere.

### Why Server Components help
Server Component code is never hydrated or downloaded, so hydration work shrinks to the interactive islands. That improves Interaction to Next Paint (INP) and Total Blocking Time.

### Hydration errors
React expects the first client render to match the server HTML. Differences (dates, random values, `window` checks, invalid HTML nesting, browser extensions changing the DOM) trigger a hydration error. Next.js 16.2 shows a `+ Client` / `- Server` diff in the error overlay.

### After hydration
Navigations do not hydrate again; React applies new RSC payloads to the live tree. Pages left behind can be kept hidden in `<Activity>` with Cache Components.
--- code
// app/clock.tsx - hydration-safe time display
"use client";

import { useEffect, useState } from "react";

export function Clock({ serverTime }: { serverTime: string }) {
  // First client render matches the server HTML exactly
  const [time, setTime] = useState(serverTime);

  useEffect(() => {
    // Runs only after hydration, in the browser
    setTime(new Date().toLocaleTimeString());
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return <time suppressHydrationWarning>{time}</time>;
}

// app/page.tsx (Server Component)
// import { connection } from "next/server";
// await connection();
// <Clock serverTime={new Date().toLocaleTimeString("en-US", { timeZone: "UTC" })} />

=== n80 | M | What are hydration errors and how do you fix them?
**A hydration error happens when the HTML React renders in the browser during hydration differs from the HTML the server sent. React then discards and re-renders that part on the client, which is slower and can cause flicker. Fix it by making the first client render identical to the server render.**

### Common causes
- **Time and randomness:** `new Date()`, `Date.now()`, `Math.random()` rendered directly.
- **Browser-only checks during render:** `typeof window !== "undefined" ? A : B`, `localStorage`, `navigator`.
- **Locale and time zone differences:** `toLocaleString()` with different server and user settings.
- **Invalid HTML nesting:** `<p>` inside `<p>`, `<div>` inside `<p>`, `<a>` inside `<a>`, missing `<tbody>`.
- **Browser extensions** that modify the DOM (Grammarly, translators, password managers).
- **CSS-in-JS** misconfiguration, or data that changes between server and client fetch.

### Fixes
1. **Defer client-only values** to `useEffect`, rendering a stable placeholder first.
2. **Use `useSyncExternalStore`** with a server snapshot for browser values.
3. **Skip SSR** for a component with `next/dynamic` and `ssr: false` (from a Client Component).
4. **Pass values from the server:** read cookies or headers on the server so both renders agree.
5. **Format with explicit locale and timeZone.**
6. **`suppressHydrationWarning`** on a single element for unavoidable cases like timestamps. It only works one level deep; do not spread it around.
7. **Fix HTML nesting.**

### Debugging
The Next.js error overlay shows the component stack and, since 16.2, a diff of server versus client output. Test in an incognito window to rule out extensions. For theme flashes, set a class from a cookie on the server, or see the "Preventing flash before hydration" guide.
--- code
// app/greeting.tsx
"use client";

import { useEffect, useState } from "react";

// Bad: differs between server and browser
// export function Greeting() {
//   const hour = new Date().getHours();
//   return <p>{typeof window === "undefined" ? "Hello" : hour < 12 ? "Good morning" : "Good evening"}</p>;
// }

// Good: identical first render, client-specific value applied after hydration
export function Greeting() {
  const [text, setText] = useState("Hello");

  useEffect(() => {
    setText(new Date().getHours() < 12 ? "Good morning" : "Good evening");
  }, []);

  return <p>{text}</p>;
}

// Invalid nesting also causes hydration errors:
// <p>Intro <div>block</div></p>   -> use <div> or <span> instead
