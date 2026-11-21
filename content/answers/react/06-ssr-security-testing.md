=== r141 | M | What is SSR (Server-Side Rendering)?
**Server-side rendering means generating a page's HTML on the server for each request, so the browser shows content immediately; React then hydrates that HTML in the browser to make it interactive. It improves first paint, SEO and social previews compared with client-only rendering, at the cost of server work per request.**

### How it works in React
1. The server runs your components with `renderToPipeableStream` (Node) or `renderToReadableStream` (Web streams) from `react-dom/server`.
2. HTML streams to the browser; `<Suspense>` fallbacks are sent first and replaced as data resolves.
3. The browser displays the HTML before JavaScript loads.
4. `hydrateRoot` attaches event handlers and state; selective hydration prioritizes what the user interacts with.

### Benefits
- Faster first contentful paint and LCP, especially on slow devices.
- Crawlers and link previews get real content.
- Data can be fetched close to the database.

### Costs
- Server CPU per request and higher time to first byte if data is slow (mitigated by streaming).
- Code must run in both environments (no `window` at render time).
- Hydration mismatches if server and client output differ.

### Variants
- **Streaming SSR** (React 18+): send HTML progressively.
- **SSG and ISR:** render ahead of time and reuse.
- **Partial prerendering** (React 19.2 `prerender` + `resume`, Next.js Cache Components): a static shell plus streamed dynamic parts.
- **Server Components:** run only on the server and are not hydrated at all.

### In practice
Use a framework: Next.js, React Router framework mode, TanStack Start or Expo Router (web). Writing SSR by hand is rarely worth it.
--- code
// server.ts - minimal streaming SSR with Node.js
import { createServer } from "node:http";
import { renderToPipeableStream } from "react-dom/server";
import { App } from "./app";

createServer((req, res) => {
  const { pipe } = renderToPipeableStream(<App url={req.url ?? "/"} />, {
    bootstrapScripts: ["/client.js"],
    onShellReady() {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      pipe(res); // stream HTML as Suspense boundaries resolve
    },
    onShellError() {
      res.statusCode = 500;
      res.end("<h1>Something went wrong</h1>");
    },
    onError(err) {
      console.error(err);
    },
  });
}).listen(3000);

// client.tsx - hydrate the server HTML
// import { hydrateRoot } from "react-dom/client";
// hydrateRoot(document, <App url={location.pathname} />);

=== r142 | E | What is CSR (Client-Side Rendering)?
**Client-side rendering means the server sends a minimal HTML shell and a JavaScript bundle, and React builds the entire UI in the browser. It is the classic single-page app model (Vite SPA, old Create React App): simple to host and great for highly interactive apps behind a login, but slower to first content and weaker for SEO.**

### How it works
1. The browser downloads `index.html` with an empty `<div id="root">`.
2. It downloads and executes the JavaScript bundle.
3. `createRoot(...).render(<App />)` renders the UI.
4. Components fetch data, so users often see a spinner before content.

### Strengths
- Static hosting only (CDN, S3), no server runtime.
- Fast navigations after the first load, since everything runs on the client.
- Simple mental model: no server and client split.

### Weaknesses
- Slower first contentful paint and LCP, especially on slow phones.
- Data waterfalls: render, then fetch, then render children, then fetch again.
- SEO and link previews depend on crawlers executing JavaScript.
- Larger JavaScript bundles.

### When it is a good fit
Dashboards, internal tools, apps behind authentication, offline-capable apps, embedded widgets.

### Improving a CSR app
- Code split by route, preload critical chunks.
- Fetch data with a router loader or TanStack Query at the route level to avoid waterfalls.
- Prerender public pages, or move them to a framework with SSR or static generation.
- The React docs recommend frameworks for new apps, but note that frameworks like React Router and Next.js can also output pure SPAs.
--- code
// index.html (served as-is): the body is empty until JavaScript runs
// <div id="root"></div>
// <script type="module" src="/src/main.tsx"></script>

// src/main.tsx
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [stats, setStats] = useState<{ users: number } | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats); // data fetched after JS boots
  }, []);
  return <h1>{stats ? `${stats.users} users` : "Loading…"}</h1>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

=== r143 | M | What is SSG (Static Site Generation)?
**Static site generation renders pages to HTML at build time, once, and serves the files from a CDN for every request. It gives the fastest possible delivery and cheap hosting for content that does not change per user, such as marketing pages, docs and blogs. Changes require a rebuild, or incremental regeneration in frameworks that support it.**

### How it works
1. At build time, the framework runs your components and data loading for each route.
2. It writes HTML (and data files or RSC payloads) to disk.
3. A CDN serves them directly; React hydrates for interactivity.

### React APIs
React 19's `prerender` and `prerenderToNodeStream` (from `react-dom/static`) wait for all data before producing HTML, which is what static generation needs. React 19.2 added partial prerendering: `prerender` can return a `postponed` state that `resume` completes at request time.

### In frameworks
- **Next.js:** routes without request-time data are prerendered automatically; `generateStaticParams` lists dynamic paths; `output: "export"` produces a fully static site.
- **React Router framework mode:** `prerender` option in `react-router.config.ts`.
- **Astro, Gatsby:** content-focused static generators that can use React components.

### Freshness options
- Rebuild on content changes (CMS webhook triggers a deploy).
- **ISR / revalidation:** regenerate pages in the background after a time or on demand (Next.js `cacheLife`, `revalidateTag`).
- Client-side fetching for the few dynamic bits.

### Trade-offs
Build time grows with the number of pages; per-user content is impossible without client-side or server-side rendering.
--- code
// build-static.tsx - prerender pages to HTML files at build time (React 19)
import { writeFile, mkdir } from "node:fs/promises";
import { prerenderToNodeStream } from "react-dom/static";
import { text } from "node:stream/consumers";

function BlogPost({ title, body }: { title: string; body: string }) {
  return (
    <html lang="en">
      <body>
        <article>
          <h1>{title}</h1>
          <p>{body}</p>
        </article>
      </body>
    </html>
  );
}

const posts = [
  { slug: "hello", title: "Hello world", body: "First post" },
  { slug: "react-19", title: "What's new in React 19", body: "Actions, use, and more" },
];

for (const post of posts) {
  const { prelude } = await prerenderToNodeStream(<BlogPost {...post} />); // waits for all data
  await mkdir(`dist/blog/${post.slug}`, { recursive: true });
  await writeFile(`dist/blog/${post.slug}/index.html`, "<!doctype html>" + (await text(prelude)));
}

=== r144 | M | What is Hydration?
**Hydration is the process where React, running in the browser, takes HTML that was rendered on the server, rebuilds the component tree, and attaches event handlers and state to the existing DOM instead of recreating it. After hydration the static page becomes a fully interactive React app.**

### How it works
- `hydrateRoot(container, <App />)` from `react-dom/client` (React 18+; `ReactDOM.hydrate` was removed in React 19).
- React renders the same tree on the client and expects it to match the server HTML. It reuses DOM nodes and wires up listeners.
- With streaming SSR, React performs **selective hydration**: each `<Suspense>` boundary hydrates as its HTML and code arrive, and boundaries the user clicks are hydrated first.

### Hydration mismatches
If the client's first render differs from the server HTML, React logs a hydration error and re-renders that part on the client. Common causes:
- `Date.now()`, `Math.random()`, locale or time-zone differences.
- Branching on `typeof window` during render.
- Reading `localStorage` during render.
- Invalid HTML nesting (`<div>` inside `<p>`).
- Browser extensions modifying the DOM.

React 19 shows a single, clearer diff of the mismatch.

### Fixes
- Render the same output on both sides, then update in `useEffect`.
- `useSyncExternalStore` with a server snapshot.
- `suppressHydrationWarning` for single unavoidable text differences (timestamps).
- React 19.3's `use(browser())` (from `react-dom`) suspends during server rendering so a component renders only in the browser.

### Server Components
Server Components are not hydrated; only Client Components are, which reduces hydration cost.
--- code
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { useEffect, useState } from "react";

function LocalTime({ iso }: { iso: string }) {
  // First client render must match server HTML: format in a fixed time zone
  const [text, setText] = useState(() => new Date(iso).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");

  useEffect(() => {
    // After hydration, switch to the user's local time
    setText(new Date(iso).toLocaleString());
  }, [iso]);

  return <time dateTime={iso}>{text}</time>;
}

function App({ publishedAt }: { publishedAt: string }) {
  return (
    <article>
      <h1>Release notes</h1>
      <LocalTime iso={publishedAt} />
      <button onClick={() => alert("hydrated!")}>Interactive after hydration</button>
    </article>
  );
}

hydrateRoot(document.getElementById("root")!, <App publishedAt="2026-09-09T17:00:00Z" />, {
  onRecoverableError: (err) => console.warn("hydration issue", err),
});

=== r145 | E | What is Next.js?
**Next.js is a full-stack React framework by Vercel. It adds file-system routing, server rendering and static generation, React Server Components, data caching, Route Handlers for APIs, Server Functions for mutations, and image, font and script optimization on top of React. Version 16 (latest 16.4, October 2026) uses Turbopack by default and the Cache Components model with `"use cache"`.**

### Main features
- **App Router:** folders in `app/` are routes, with nested `layout.tsx`, `loading.tsx` and `error.tsx`.
- **Server Components by default;** add `"use client"` for interactive components.
- **Partial Prerendering:** a static shell served instantly from a CDN, with dynamic parts streamed in.
- **Caching:** `"use cache"`, `cacheLife`, `cacheTag`, `revalidateTag`, `updateTag`.
- **Server Functions (`"use server"`)** for forms and mutations.
- **Route Handlers** (`route.ts`) for HTTP APIs and webhooks.
- **Proxy** (`proxy.ts`, formerly middleware) for redirects and rewrites before routing.
- **Optimizations:** `next/image`, `next/font`, `next/script`, Metadata API.
- **Tooling:** Turbopack, TypeScript, React Compiler support.

### Getting started
`npx create-next-app@latest`, then `npm run dev`.

### Relationship to React
The React docs list Next.js (App Router) as a recommended framework because it implements React's full-stack architecture (Server Components, Actions, Suspense streaming). Vercel is a founding member of the React Foundation.

### Alternatives
React Router framework mode, TanStack Start, Expo for native apps, or a Vite SPA when you do not need a server.
--- code
// app/page.tsx - a Server Component (default in the App Router)
import { LikeButton } from "./like-button";

async function getPosts() {
  "use cache"; // Next.js 16 Cache Components
  const res = await fetch("https://api.example.com/posts");
  return res.json() as Promise<{ id: string; title: string }[]>;
}

export default async function Home() {
  const posts = await getPosts(); // runs on the server, no client JavaScript for this code
  return (
    <main>
      {posts.map((p) => (
        <article key={p.id}>
          <h2>{p.title}</h2>
          <LikeButton id={p.id} />
        </article>
      ))}
    </main>
  );
}

// app/like-button.tsx
// "use client";
// export function LikeButton({ id }: { id: string }) {
//   const [liked, setLiked] = useState(false);
//   return <button onClick={() => setLiked(!liked)}>{liked ? "♥" : "♡"}</button>;
// }

=== r146 | E | Why use Next.js?
**Use Next.js when you want a production-ready React app without assembling routing, server rendering, data fetching, caching, bundling and deployment yourself. It gives fast first loads and good SEO through server rendering and static shells, less client JavaScript through Server Components, built-in backend capabilities, and a large ecosystem with first-class hosting on Vercel and other platforms.**

### Benefits
- **Performance:** Partial Prerendering, streaming, automatic code splitting, image and font optimization, prefetching of links.
- **SEO and sharing:** HTML with content and metadata for crawlers; Metadata API, sitemaps, OG images.
- **Full stack in one project:** Server Components read databases directly; Server Functions handle mutations; Route Handlers expose APIs.
- **Developer experience:** file-based routing, layouts, loading and error files, TypeScript, Turbopack's fast dev server.
- **Caching model:** explicit `"use cache"` with revalidation by time or tag.
- **Ecosystem and hiring:** the most widely used React framework.
- **Deployment options:** Vercel, Node.js servers, Docker (`output: "standalone"`), static export, and adapters for other platforms.

### Trade-offs
- More concepts: server versus client boundaries, caching, prefetching.
- Fast-moving: major changes between versions (async request APIs in 15, Cache Components and `proxy.ts` in 16).
- Requires a server runtime for dynamic features (unless exported statically).
- Some features are easiest on Vercel, although self-hosting is supported.

### When not to
Pure client-side tools behind login with no SEO needs might be simpler as a Vite SPA; content-only sites may ship less JavaScript with Astro.
--- code
// app/blog/[slug]/page.tsx - SEO, server data and caching in a few lines
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";

async function getPost(slug: string) {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.ok ? (res.json() as Promise<{ title: string; excerpt: string; html: string }>) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post?.title, description: post?.excerpt };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return <article><h1>{post.title}</h1><div dangerouslySetInnerHTML={{ __html: post.html }} /></article>;
}

=== r147 | M | What are Server Components?
**React Server Components (RSC) are components that run only on the server, either at build time or per request. They can be `async`, read databases, files and secrets directly, and their code never ships to the browser; React sends their rendered output to the client as a serialized payload. They became stable with React 19 and are used through frameworks such as Next.js and React Router.**

### Key properties
- **No client JavaScript** for the component or its dependencies (markdown parsers, date libraries stay on the server).
- **Direct data access:** `await db.query(...)` inside the component.
- **No interactivity:** no `useState`, `useEffect`, event handlers or browser APIs.
- **Compose with Client Components:** a Server Component can render `"use client"` components and pass serializable props or server-rendered `children`.
- **Streaming:** async Server Components suspend, and `<Suspense>` boundaries stream results.

### Related directives and APIs
- `"use client"` marks the client boundary.
- `"use server"` marks Server Functions callable from the client (for mutations).
- `cache()` deduplicates work per request; `cacheSignal()` (React 19.2) aborts work when the cache lifetime ends.
- React 19.3: Server Components can render Context providers from `"use client"` modules directly.

### Benefits
Smaller bundles, faster loads, no client-server data waterfalls, and keeping sensitive logic on the server.

### Security
Server Components and Server Functions are a server attack surface. Keep React and frameworks patched: critical RSC vulnerabilities were fixed in December 2025 (React 19.0.1, 19.1.2, 19.2.1 and framework releases).

### Not the same as SSR
SSR renders any component to HTML; Client Components are still SSR'd and hydrated. RSC changes where components run and what ships.
--- code
// app/products/page.tsx (Server Component in Next.js)
import { db } from "@/lib/db";          // server-only module
import { formatPrice } from "@/lib/fmt"; // runs on the server, not bundled for the browser
import { AddToCart } from "./add-to-cart"; // Client Component

export default async function Products() {
  const products = await db.product.findMany({ take: 20 }); // direct database access

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} - {formatPrice(p.price)}
          <AddToCart productId={p.id} /> {/* only this ships JavaScript */}
        </li>
      ))}
    </ul>
  );
}

// app/products/add-to-cart.tsx
// "use client";
// import { useTransition } from "react";
// import { addToCart } from "./actions"; // "use server" function
// export function AddToCart({ productId }: { productId: string }) {
//   const [pending, start] = useTransition();
//   return <button disabled={pending} onClick={() => start(() => addToCart(productId))}>Add</button>;
// }

=== r148 | E | What are Client Components?
**Client Components are regular interactive React components that are bundled for the browser and hydrated there. In frameworks with Server Components, you mark them by putting `"use client"` at the top of the file; they are still server-side rendered to HTML for the first load, then can use state, effects, event handlers, context and browser APIs.**

### When you need one
- `useState`, `useReducer`, `useEffect`, `useRef` for DOM work.
- Event handlers (`onClick`, `onChange`).
- Context consumers and providers.
- Browser APIs: `localStorage`, `window`, geolocation, `IntersectionObserver`.
- Client hooks: `useActionState`, `useOptimistic`, `useFormStatus`, router hooks.
- Libraries built on hooks (charts, animation, form libraries).

### The boundary
- `"use client"` marks a **module boundary**: that file and everything it imports become client code.
- Props from Server Components must be serializable (plain data, JSX, promises, Server Functions), not regular functions or class instances.
- Client Components cannot import Server Components, but can render them when passed as `children` or other props.

### Best practices
- Keep Client Components small and at the leaves (a button, a form, a chart), so most of the page stays server-rendered.
- Pass server data as props instead of fetching again on the client.
- Do not add `"use client"` to layouts or pages by habit.

### Outside frameworks
In a Vite SPA every component is effectively a Client Component, and the directive is not needed.
--- code
// app/components/search-filter.tsx
"use client"; // client boundary: state + events + browser APIs

import { useState } from "react";

type Item = { id: string; name: string };

export function SearchFilter({ items, children }: { items: Item[]; children?: React.ReactNode }) {
  const [query, setQuery] = useState(() => sessionStorage.getItem("q") ?? "");
  const visible = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <section>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          sessionStorage.setItem("q", e.target.value);
        }}
        placeholder="Filter"
      />
      <ul>{visible.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
      {children} {/* can be server-rendered content passed from a Server Component */}
    </section>
  );
}

// Server Component usage:
// const items = await db.item.findMany();
// <SearchFilter items={items.map(({ id, name }) => ({ id, name }))}><ServerFooter /></SearchFilter>

=== r149 | M | What is Edge Rendering?
**Edge rendering means running server rendering in lightweight runtimes deployed to many locations close to users (CDN edge networks, V8 isolates), instead of in one central region. It reduces network latency for the first byte, but edge runtimes have limited APIs, and if your data lives in one region, every query travels back to it, which can make pages slower.**

### Benefits
- Low latency for users far from your main region.
- Fast cold starts in isolate-based runtimes.
- Good for personalization based on request data only (geo, cookies, A/B buckets).

### Limitations
- Web APIs only: no `fs`, no native Node.js modules, limited npm compatibility.
- Small code size limits and execution time limits.
- **Data gravity:** a database in one region adds a round-trip per query from each edge location.

### How the industry evolved
- Next.js deprecated `runtime = "edge"` for pages and Route Handlers in recent versions; its Proxy (formerly middleware) runs on Node.js since Next.js 16. The recommended pattern is a static shell served from the CDN edge plus dynamic content streamed from functions near the database.
- Platforms like Cloudflare Workers still run full apps at the edge, often paired with globally replicated or edge-local data (D1, KV, Durable Objects, read replicas).

### When to use it
- Request rewriting, redirects, auth checks on signed cookies, feature flags, bot filtering.
- Apps whose data is also distributed globally.

### Interview framing
Explain the latency trade-off: move compute to the user only if the data can follow; otherwise cache at the edge and compute near the data.
--- code
// Cloudflare Worker-style edge handler: personalization from request data only
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const country = request.headers.get("cf-ipcountry") ?? "US";

    // Cheap decision at the edge: redirect to a regional storefront
    if (url.pathname === "/" && country === "IN") {
      return Response.redirect(new URL("/in", url), 302);
    }

    // Serve cached HTML from the edge cache, fetch from origin on a miss
    const cache = (caches as unknown as { default: Cache }).default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(`https://origin.example.com${url.pathname}`);
    const copy = new Response(response.body, response);
    copy.headers.set("Cache-Control", "public, s-maxage=300");
    await cache.put(request, copy.clone());
    return copy;
  },
};

=== r150 | M | What is Streaming?
**Streaming server rendering sends HTML to the browser in chunks as each part of the page becomes ready, instead of waiting for all data before sending anything. In React, `<Suspense>` boundaries define the chunks: the server sends the shell with fallbacks immediately, then streams each boundary's content (plus a small inline script to swap it in) when its data resolves.**

### How React streams
- `renderToPipeableStream` (Node.js) and `renderToReadableStream` (Web streams; also available in Node since React 19.2) render the shell and keep the connection open.
- Suspended components show their fallback first; when resolved, React streams the HTML and moves it into place.
- **Selective hydration:** each chunk can hydrate independently, with priority for parts the user interacts with.
- React 19.2 batches Suspense reveals during SSR so content appears in fewer, smoother steps.

### Benefits
- Lower time to first byte and first contentful paint.
- Slow data (recommendations, comments) does not block fast data (product title).
- Better perceived performance with progressive loading.

### Design tips
- Put boundaries around independent slow sections.
- Start data fetching early and in parallel so streaming has something to stream.
- Send critical content in the shell (title, main image).

### Caveats
- Status codes and headers are fixed once streaming starts; decide on 404s or redirects before the first flush.
- Some proxies buffer responses and break streaming.
- Bots that need complete HTML can be served a fully rendered response (`onAllReady` instead of `onShellReady`).

### Frameworks
Next.js (`loading.tsx`, `<Suspense>`), React Router (deferred data with `<Await>` or promises), TanStack Start.
--- code
// server.ts - streaming with Suspense
import { renderToPipeableStream } from "react-dom/server";
import { Suspense, use } from "react";
import type { ServerResponse } from "node:http";

const slow = <T,>(value: T, ms: number) => new Promise<T>((r) => setTimeout(() => r(value), ms));

function Reviews({ reviews }: { reviews: Promise<string[]> }) {
  const list = use(reviews); // suspends until resolved; streamed when ready
  return <ul>{list.map((r) => <li key={r}>{r}</li>)}</ul>;
}

function ProductPage() {
  const reviews = slow(["Great!", "Fast shipping"], 2000);
  return (
    <html lang="en">
      <body>
        <h1>Running shoe</h1> {/* in the first chunk */}
        <Suspense fallback={<p>Loading reviews…</p>}>
          <Reviews reviews={reviews} /> {/* streamed ~2s later */}
        </Suspense>
      </body>
    </html>
  );
}

export function handle(res: ServerResponse, isBot: boolean) {
  const stream = renderToPipeableStream(<ProductPage />, {
    onShellReady() { if (!isBot) { res.setHeader("Content-Type", "text/html"); stream.pipe(res); } },
    onAllReady() { if (isBot) { res.setHeader("Content-Type", "text/html"); stream.pipe(res); } }, // full HTML for crawlers
  });
}

=== r151 | M | XSS in React?
**Cross-site scripting (XSS) is injecting malicious scripts into a page so they run in other users' browsers, stealing sessions or acting on their behalf. React protects against most XSS by escaping values rendered in JSX, but you can still be vulnerable through `dangerouslySetInnerHTML`, `javascript:` URLs in `href`, spreading untrusted props, injecting into `<script>` tags during SSR, or unsafe third-party code.**

### Where React is safe by default
`<p>{userInput}</p>` renders `<script>alert(1)</script>` as visible text, because React escapes strings before inserting them into the DOM.

### Where XSS still happens
1. **`dangerouslySetInnerHTML`** with unsanitized HTML (CMS content, markdown output, comments).
2. **URLs:** `<a href={userUrl}>` with `javascript:alert(1)`. React warns in development, but you must validate protocols (`http:`, `https:`, `mailto:`).
3. **Untrusted props spread onto elements:** `<div {...userControlledProps}>` can inject `dangerouslySetInnerHTML` or event handlers.
4. **SSR data injection:** `<script>window.__DATA__ = ${JSON.stringify(data)}</script>` without escaping `<` lets `</script>` break out.
5. **Direct DOM APIs:** `element.innerHTML = ...`, `eval`, `new Function`, or libraries that do this.
6. **Third-party scripts and dependencies** that are compromised.

### Defenses
- Sanitize HTML with DOMPurify before `dangerouslySetInnerHTML`.
- Validate URL protocols.
- Never spread unknown objects as props.
- Escape serialized data in SSR (or use framework mechanisms).
- A **Content Security Policy** (`script-src` with nonces or hashes) limits damage.
- **Trusted Types:** React 19.3 passes `TrustedHTML`/`TrustedScriptURL` values intact to the DOM, so you can enforce Trusted Types policies.
- `httpOnly` cookies so scripts cannot read session tokens.
--- code
import DOMPurify from "dompurify";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function safeHref(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : "#";
  } catch {
    return "#";
  }
}

export function Comment({ author, website, html }: { author: string; website: string; html: string }) {
  return (
    <article>
      {/* Escaped automatically: "<img onerror=...>" is shown as text */}
      <h3>{author}</h3>

      {/* Validate URLs: blocks javascript:alert(1) */}
      <a href={safeHref(website)} rel="noopener noreferrer nofollow">Website</a>

      {/* Sanitize before injecting HTML */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
    </article>
  );
}

// SSR data injection: escape "<" so </script> cannot break out
export const serialize = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

=== r152 | M | How React prevents XSS?
**React prevents most XSS by treating everything you render as data, not markup: strings and numbers in JSX are escaped before reaching the DOM (React sets text content, never `innerHTML`), attribute values are set through DOM properties, and React elements carry a special `$$typeof` symbol so JSON data cannot be smuggled in as fake elements. Only explicit escape hatches like `dangerouslySetInnerHTML` bypass this.**

### The mechanisms
1. **Text escaping:** `{value}` becomes a text node. `<`, `>`, `&` and quotes are never interpreted as HTML.
2. **Attributes via DOM APIs:** `title={value}` sets the property or attribute safely; the value cannot close the attribute and add new ones.
3. **Element validation:** React elements must have `$$typeof` set to an internal symbol. Since symbols cannot be represented in JSON, a server returning `{ type: "script", props: ... }` cannot be rendered as an element.
4. **URL warnings:** React warns about `javascript:` URLs in development and plans to block them.
5. **Named escape hatch:** `dangerouslySetInnerHTML={{ __html }}` is deliberately awkward so it is easy to spot in code review.
6. **Trusted Types (React 19.3):** values like `TrustedHTML` are passed to the browser intact, so you can enforce a Trusted Types policy that requires sanitization.

### What React does not do
- Sanitize HTML you inject.
- Validate URLs or `src` values.
- Protect against XSS in code outside React (`innerHTML` in effects, third-party widgets, `eval`).
- Protect server-rendered inline scripts you build by string concatenation.

### Complementary defenses
DOMPurify for HTML, a strict Content Security Policy, `httpOnly` cookies, dependency auditing, and Trusted Types.
--- code
const malicious = `<img src=x onerror="alert('xss')">`;

export function Safe() {
  return (
    <div>
      {/* Rendered as visible text, no script runs */}
      <p>{malicious}</p>

      {/* Attribute value is set safely; quotes cannot break out */}
      <input defaultValue={`" onfocus="alert(1)`} />
    </div>
  );
}

// Fake elements from JSON cannot render: $$typeof is a Symbol, which JSON cannot contain
const fromApi = JSON.parse('{"type":"script","props":{"children":"alert(1)"}}');
export function Fake() {
  // Rendering `fromApi` directly throws "Objects are not valid as a React child"
  return <pre>{JSON.stringify(fromApi)}</pre>;
}

// The explicit escape hatch: only with sanitized input
// <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

=== r153 | E | What is Sanitization?
**Sanitization is cleaning untrusted input so that dangerous parts are removed or neutralized before you use it. For HTML, it means stripping scripts, event handler attributes (`onerror`, `onclick`), `javascript:` URLs and other risky elements while keeping safe formatting. In React you sanitize with a library such as DOMPurify before passing HTML to `dangerouslySetInnerHTML`.**

### When you need it
- Rendering HTML from a CMS, a rich-text editor, emails or user comments.
- Converting markdown to HTML (markdown can contain raw HTML).
- Building URLs from user input.
- Inserting user content into SVGs, iframes (`srcdoc`) or styles.

### Sanitize vs escape vs validate
- **Escaping:** turn special characters into harmless text. React does this automatically for JSX text.
- **Sanitizing:** keep some markup but remove dangerous parts. Needed only when you intentionally render HTML.
- **Validating:** reject input that does not match the expected format (email, URL protocol, numeric ID). Do it on the server as well.

### Good practices
- Use a maintained library (DOMPurify, `sanitize-html` on Node.js). Never write your own regex-based sanitizer.
- Sanitize as close to rendering as possible, and also on the server if content is stored.
- Configure allowlists of tags and attributes for your use case.
- Prefer rendering structured data or markdown with a React renderer (`react-markdown` without raw HTML) over HTML strings.
- With Trusted Types enforced, have DOMPurify return `TrustedHTML` (`RETURN_TRUSTED_TYPE: true`); React 19.3 passes it to the DOM unchanged.
--- code
import DOMPurify from "dompurify";

const dirty = `
  <h2>Release notes</h2>
  <p onclick="steal()">Click me</p>
  <img src="x" onerror="alert('xss')">
  <a href="javascript:alert(1)">bad link</a>
  <script>alert('xss')</script>
`;

const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["h2", "p", "a", "strong", "em", "ul", "ol", "li", "img"],
  ALLOWED_ATTR: ["href", "src", "alt"],
});
// -> <h2>Release notes</h2><p>Click me</p><img src="x"><a>bad link</a>

export function ReleaseNotes() {
  return <section dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Validation example for URLs
export const isSafeUrl = (value: string) => /^(https?:|mailto:)/i.test(value);

=== r154 | M | What is CORS in React?
**CORS (Cross-Origin Resource Sharing) is a browser security mechanism, not a React feature. When your React app on one origin (`https://app.example.com`) calls an API on another origin (`https://api.example.com`), the browser only lets your code read the response if the API sends matching `Access-Control-Allow-*` headers. CORS errors are fixed on the server or with a proxy, never in React code.**

### How it works
- **Simple requests** (GET, or POST with form content types) are sent; the browser checks `Access-Control-Allow-Origin` on the response.
- **Preflight:** requests with custom headers (`Authorization`), JSON content type, or methods like PUT/DELETE trigger an `OPTIONS` request first. The server must reply with allowed origins, methods and headers.
- **Credentials:** sending cookies needs `credentials: "include"` in `fetch` and `Access-Control-Allow-Credentials: true` with an explicit origin (not `*`) on the server.

### Fixes
1. **Configure the API** to allow your origin (Express `cors` middleware, framework settings, API gateway).
2. **Development proxy:** Vite `server.proxy` makes requests same-origin during development.
3. **Same-origin backend:** call your own server or a backend-for-frontend (Next.js Route Handlers, React Router loaders) which calls the third-party API server-to-server, where CORS does not apply.

### Common misconceptions
- `mode: "no-cors"` does not fix anything; it produces an opaque response you cannot read.
- Disabling CORS in the browser only hides the problem locally.
- CORS is not authentication; servers still need to verify who is calling.

### Security
Do not reflect any `Origin` with credentials allowed; use an allowlist.
--- code
// vite.config.ts - development proxy: the browser talks to the same origin
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});

// Client code: same-origin path in dev, full URL with credentials in prod
export async function getProfile() {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/profile`, {
    credentials: "include", // send cookies cross-origin (server must allow credentials)
  });
  return res.json();
}

// Server side (Express) - the actual CORS fix
// import cors from "cors";
// app.use(cors({ origin: ["https://app.example.com"], credentials: true }));

=== r155 | M | Auth in React?
**Authentication in a React app means verifying who the user is (login), keeping a session, and showing or hiding UI accordingly, while the server enforces access to data. The recommended setup is a server-issued session in an `httpOnly`, `secure`, `SameSite` cookie, an auth context or library hook for the current user on the client, route protection in loaders or guard components, and an auth provider or library instead of hand-rolled crypto.**

### Building blocks
1. **Login:** form posts credentials (or starts an OAuth or passkey flow) to the server.
2. **Session:** the server sets a cookie with a session ID or signed token. `httpOnly` keeps it away from JavaScript, which protects it from XSS.
3. **Current user on the client:** fetch `/api/me` on load and store it in context or a query cache.
4. **Protected routes:** redirect unauthenticated users (router middleware or loaders, guard components, framework Proxy).
5. **Authorization:** the API checks permissions on every request; the client only hides UI.
6. **Logout:** a server endpoint clears the cookie; the client clears cached user data.

### Tokens in localStorage?
Storing JWTs in `localStorage` is simple but exposes them to any XSS. Prefer cookies; if you must use bearer tokens (mobile or third-party APIs), keep access tokens short-lived and in memory, with refresh tokens in `httpOnly` cookies.

### Libraries and providers
Auth0, Clerk, WorkOS, Supabase Auth, Firebase Auth, Better Auth, Auth.js (now maintained by the Better Auth team). Passkeys (WebAuthn) are widely supported and phishing-resistant.

### UX details
Loading state while the session is checked, preserve the destination URL for after login, handle expired sessions gracefully with a re-login prompt.
--- code
import { createContext, use, useEffect, useState } from "react";

type User = { id: string; name: string; role: "user" | "admin" };
type Auth = { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }) // session lives in an httpOnly cookie
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch("/api/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!res.ok) throw new Error("Invalid credentials");
    setUser(await res.json());
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }

  return <AuthContext value={{ user, loading, login, logout }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

=== r156 | E | What is Testing?
**Testing is writing automated checks that verify your code behaves as expected, so you can change it confidently. In React apps you typically combine unit tests for logic, component tests that render components and interact with them like a user (React Testing Library), and end-to-end tests that drive a real browser (Playwright, Cypress), plus static checks such as TypeScript and ESLint.**

### Types of tests
- **Static analysis:** TypeScript and ESLint catch whole classes of bugs without running code.
- **Unit tests:** pure functions, reducers, hooks, utilities. Fast and numerous.
- **Component / integration tests:** render components with Testing Library, simulate typing and clicking, mock network calls (MSW), assert on what the user sees.
- **End-to-end (E2E):** run the real app in a browser and test full flows (sign up, checkout).
- **Visual regression:** compare screenshots (Playwright, Chromatic).
- **Accessibility tests:** `jest-axe`/`vitest-axe`, Playwright with axe.

### Tools in 2026
- Test runners: **Vitest** (fast, Vite-native, very common for React), **Jest** (version 30, still widely used).
- **React Testing Library** (`@testing-library/react` 16) with `user-event`.
- **MSW** for API mocking.
- **Playwright** for E2E and component testing; Cypress as an alternative.
- `react-test-renderer` is deprecated; use Testing Library.

### Principles
- Test behavior, not implementation details ("The more your tests resemble the way your software is used, the more confidence they can give you").
- Query by role and label, which also checks accessibility.
- Keep tests independent and deterministic.
- Put most effort where bugs are expensive: core flows and business logic.
--- code
// counter.tsx
import { useState } from "react";
export function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>;
}

// counter.test.tsx (Vitest + React Testing Library)
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Counter", () => {
  it("increments when clicked", async () => {
    const user = userEvent.setup();
    render(<Counter initial={2} />);

    const button = screen.getByRole("button", { name: /count: 2/i });
    await user.click(button);

    expect(screen.getByRole("button", { name: /count: 3/i })).toBeInTheDocument();
  });
});

=== r157 | E | What is Jest?
**Jest is a JavaScript testing framework from Meta (now maintained under the OpenJS Foundation) that provides a test runner, assertions (`expect`), mocking, snapshot testing and coverage in one package. It has long been the default for React testing; version 30 is current, and many newer Vite-based projects use Vitest, which has a Jest-compatible API.**

### Features
- `describe`, `it`/`test`, `beforeEach`, `afterAll`.
- Matchers: `toBe`, `toEqual`, `toHaveBeenCalledWith`, `toThrow`, plus DOM matchers from `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveTextContent`).
- Mocking: `jest.fn()`, `jest.spyOn`, `jest.mock("module")`, fake timers (`jest.useFakeTimers()`).
- Snapshot testing (use sparingly; large snapshots are rarely reviewed).
- Coverage reports, watch mode, parallel test files.
- `jsdom` environment to test DOM code in Node.js.

### Setup for React
- Transform TypeScript and JSX with `babel-jest`, `ts-jest` or `@swc/jest`.
- `testEnvironment: "jsdom"` and install `jest-environment-jsdom`.
- Setup file importing `@testing-library/jest-dom`.
- Frameworks provide presets, such as `next/jest` in Next.js.

### Jest vs Vitest
- **Vitest:** reuses the Vite config, native ESM and TypeScript, very fast watch mode, browser mode. Natural choice for Vite apps.
- **Jest:** mature, huge ecosystem, default in many existing codebases and React Native.
The APIs are nearly identical (`vi.fn` vs `jest.fn`), so knowledge transfers.
--- code
// formatPrice.ts
export function formatPrice(cents: number, currency = "USD") {
  if (!Number.isInteger(cents)) throw new TypeError("cents must be an integer");
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// formatPrice.test.ts (Jest)
describe("formatPrice", () => {
  it("formats cents as currency", () => {
    expect(formatPrice(1999)).toBe("$19.99");
    expect(formatPrice(500, "EUR")).toBe("€5.00");
  });

  it("rejects fractional cents", () => {
    expect(() => formatPrice(10.5)).toThrow(TypeError);
  });
});

// Mocking a module and timers
// jest.mock("./api", () => ({ fetchUser: jest.fn().mockResolvedValue({ name: "Ada" }) }));
// jest.useFakeTimers(); jest.advanceTimersByTime(1000);

// jest.config.ts
// export default { testEnvironment: "jsdom", setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"] };

=== r158 | E | What is React Testing Library?
**React Testing Library (RTL) is a set of utilities for testing React components the way users use them: you render a component, find elements by accessible role, label or text, interact with them through `user-event`, and assert on what appears. It deliberately avoids testing implementation details like state or internal methods. Version 16 requires `@testing-library/dom` as a peer dependency.**

### Core API
- `render(<Component />)` renders into a jsdom container (with `act` handled for you).
- `screen` queries:
  - `getBy*` throws if not found (for elements that must exist).
  - `queryBy*` returns `null` (to assert absence).
  - `findBy*` returns a promise (waits for async elements).
- Query priority: `ByRole` (with `name`), `ByLabelText`, `ByPlaceholderText`, `ByText`, `ByDisplayValue`, then `ByTestId` as a last resort.
- `userEvent.setup()` then `await user.click()`, `user.type()`, `user.keyboard()`: realistic event sequences.
- `waitFor(() => expect(...))` for async assertions.
- `renderHook()` for testing custom hooks.
- `@testing-library/jest-dom` matchers such as `toBeInTheDocument`, `toBeDisabled`, `toHaveAccessibleName`.

### Philosophy
"The more your tests resemble the way your software is used, the more confidence they can give you." Tests that use roles and labels survive refactors and double as accessibility checks.

### Works with
Vitest or Jest, MSW for network mocking, and providers wrapped with a custom `render` (router, query client, theme).

### Replaces
Enzyme (unmaintained, no support for modern React) and `react-test-renderer` (deprecated in React 19).
--- code
// login-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { LoginForm } from "./login-form";

test("submits email and password", async () => {
  const user = userEvent.setup();
  const onLogin = vi.fn().mockResolvedValue(undefined);
  render(<LoginForm onLogin={onLogin} />);

  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/password/i), "correct horse battery");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  expect(onLogin).toHaveBeenCalledWith({ email: "ada@example.com", password: "correct horse battery" });
});

test("shows an error for an invalid email", async () => {
  const user = userEvent.setup();
  render(<LoginForm onLogin={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), "not-an-email");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
  expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
});

=== r159 | E | Unit vs Integration testing?
**Unit tests check one small piece in isolation, such as a function, reducer or hook, usually with its dependencies mocked. Integration tests check that several pieces work together, such as a page component with its child components, state, router and a mocked API, the way a user would use them. In React, integration-style component tests usually give the most confidence per test.**

### Unit tests
- Targets: utilities (`formatPrice`), reducers, validation schemas, custom hooks, pure components.
- Fast, precise failure messages, easy to write.
- Risk: heavily mocked tests can pass while the real integration is broken.

### Integration tests
- Targets: a form submitting to a mocked API and showing the result; a page with routing, data fetching and context.
- Use React Testing Library with real child components, real providers, and **MSW** to mock the network instead of mocking modules.
- Slower than unit tests but much more realistic.

### End-to-end tests (for completeness)
Full app in a real browser with a real or staging backend (Playwright). The most confidence, the slowest and most brittle.

### Balance: the "testing trophy"
Kent C. Dodds' model for front-end testing: a base of static checks (TypeScript, ESLint), some unit tests, **mostly integration tests**, and a few E2E tests for critical flows.

### Tips
- Mock at the boundary (network) rather than inside your own code.
- Name tests by behavior: "shows an error when the card is declined".
- Keep tests independent; reset MSW handlers and query caches between tests.
--- code
// Unit: a pure reducer
import { expect, test } from "vitest";
import { cartReducer } from "./cart-reducer";

test("adds an item", () => {
  expect(cartReducer({ items: [] }, { type: "added", id: "pen" })).toEqual({ items: [{ id: "pen", qty: 1 }] });
});

// Integration: page + children + data fetching + mocked network (MSW)
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductsPage } from "./products-page";

const server = setupServer(http.get("/api/products", () => HttpResponse.json([{ id: "1", name: "Pen" }])));
beforeAll(() => server.listen());
afterAll(() => server.close());

test("lists products from the API", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductsPage />
    </QueryClientProvider>
  );
  expect(await screen.findByText("Pen")).toBeInTheDocument();
});

=== r160 | M | Mocking APIs in tests?
**Mock APIs at the network level with Mock Service Worker (MSW): define request handlers once, and they intercept `fetch` and XHR calls in Node.js tests (Vitest, Jest) and in the browser (Storybook, development). Your components keep using real `fetch`, Axios or TanStack Query, so tests exercise the real data layer while staying fast and deterministic.**

### Why MSW over module mocks
- No need to mock `fetch`, Axios or your API client module; tests are independent of how requests are made.
- The same handlers work in tests, Storybook and local development.
- Realistic: status codes, headers, delays, errors and streaming responses.

### Setup (MSW 2)
1. Handlers: `http.get("/api/user", () => HttpResponse.json({ name: "Ada" }))`.
2. Node: `setupServer(...handlers)` with `server.listen()` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`.
3. Per-test overrides: `server.use(http.get("/api/user", () => new HttpResponse(null, { status: 500 })))` to test error states.
4. Browser: `setupWorker(...handlers).start()` for development and Storybook.

### Other options
- **Module mocks** (`vi.mock("./api")`): quick for unit tests of components that receive data via a service, but tie tests to implementation.
- **Fake `fetch`** (`vi.spyOn(globalThis, "fetch")`): fine for a single call; awkward at scale.
- **Contract tests / generated mocks** from OpenAPI specs to keep mocks in sync with the real API.

### Tips
- Use `onUnhandledRequest: "error"` to catch requests you forgot to mock.
- Reset TanStack Query caches between tests and disable retries to keep error tests fast.
- Simulate slow responses with `delay()` to test loading states.
--- code
// test/handlers.ts
import { http, HttpResponse, delay } from "msw";

export const handlers = [
  http.get("/api/user/:id", async ({ params }) => {
    await delay(50);
    return HttpResponse.json({ id: params.id, name: "Ada Lovelace" });
  }),
  http.post("/api/comments", async ({ request }) => {
    const body = (await request.json()) as { text: string };
    return HttpResponse.json({ id: "c1", text: body.text }, { status: 201 });
  }),
];

// test/setup.ts
import { setupServer } from "msw/node";
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// user-card.test.tsx - override a handler to test the error state
// test("shows an error", async () => {
//   server.use(http.get("/api/user/:id", () => new HttpResponse(null, { status: 500 })));
//   render(<UserCard id="1" />);
//   expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i);
// });

=== r161 | E | How to debug a React app?
**Debug React apps with React DevTools (inspect the component tree, props, state and hooks, and profile renders), browser DevTools (breakpoints, `debugger`, network, console, performance), the error messages and component stacks React prints, and framework error overlays. Reproduce the bug in a small case, form a hypothesis, and verify with breakpoints rather than guesswork.**

### Tools
1. **React DevTools (Components tab):** select an element, inspect and edit props, state, hooks and context; see which component rendered it ("rendered by"); toggle Suspense and error boundaries.
2. **Profiler tab:** record interactions, see why components re-rendered.
3. **Browser DevTools:**
   - Sources: breakpoints, conditional breakpoints, `debugger;` statements, step through code with source maps.
   - Network: failed requests, payloads, CORS errors, slow APIs.
   - Console: React's warnings include component stacks.
   - Performance panel: React's Scheduler and Components tracks (React 19.2) show what React was doing.
4. **Error overlays** in Vite and Next.js show source-mapped errors and hydration diffs.
5. **Logging:** `console.log` with labels, `console.table` for arrays; `useDebugValue` for custom hooks.
6. **Testing:** write a failing test that reproduces the bug, then fix it.

### Common React bug categories and where to look
- **Stale values:** dependency arrays and closures.
- **Infinite loops:** effects setting their own dependencies ("Maximum update depth exceeded").
- **Wrong item state in lists:** keys.
- **Hydration errors:** server versus client differences.
- **Effects running twice in development:** Strict Mode, needs cleanup.

### AI and MCP tooling
Framework dev servers (for example Next.js 16's `/_next/mcp`) can expose errors and routes to coding agents.
--- code
import { useDebugValue, useEffect, useState } from "react";

export function useCart() {
  const [items, setItems] = useState<{ id: string; qty: number }[]>([]);
  useDebugValue(`${items.length} items`); // shows next to the hook in React DevTools
  return { items, setItems };
}

export function CheckoutButton() {
  const { items } = useCart();

  useEffect(() => {
    console.table(items); // readable logging of arrays of objects
  }, [items]);

  function checkout() {
    if (items.length === 0) {
      debugger; // pauses here when DevTools is open
    }
    console.log("%ccheckout", "color: white; background: purple; padding: 2px 6px", items);
  }

  return <button onClick={checkout}>Checkout</button>;
}

=== r162 | M | React DevTools Profiler?
**The Profiler tab in React DevTools records what React rendered during an interaction: each commit, which components rendered, how long each took, and (with the setting enabled) why each component rendered. Use it to find slow components and unnecessary re-renders before optimizing.**

### How to use it
1. Open React DevTools, go to **Profiler**, and press record.
2. Perform the slow interaction (typing, opening a panel).
3. Stop recording and review commits in the bar chart at the top.
4. **Flamegraph:** the component tree for a commit; width and color show render time; gray means the component did not render.
5. **Ranked chart:** components sorted by render time.
6. Click a component to see its render times across commits and **why it rendered** ("Props changed: onSelect", "Hook 2 changed", "The parent component rendered", "Context changed").

### Settings worth enabling
- "Record why each component rendered while profiling".
- "Highlight updates when components render" (Components tab settings) for a quick visual check.

### Programmatic profiling
`<Profiler id="Table" onRender={(id, phase, actualDuration, baseDuration) => ...}>` measures a subtree in code, useful for logging or CI checks.

### Production profiling
Development builds are slower than production. For realistic numbers, build with the profiling bundle (`react-dom/profiling`), for example `next build --profile`.

### Complement with Chrome DevTools
React 19.2 adds React tracks to the Chrome Performance panel (Scheduler and Components), so you can see React work alongside network, layout and paint.

### Interpreting results
Look for components that render often with the same props (candidates for memoization or state restructuring) and for single slow renders (heavy computation or huge lists to virtualize).
--- code
import { Profiler, type ProfilerOnRenderCallback, useState } from "react";

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  // actualDuration: time spent rendering this commit; baseDuration: estimate without memoization
  if (actualDuration > 8) {
    console.warn(`[${id}] ${phase} took ${actualDuration.toFixed(1)}ms (base ${baseDuration.toFixed(1)}ms)`, { startTime, commitTime });
  }
};

function BigTable({ rows }: { rows: number[] }) {
  return <table><tbody>{rows.map((r) => <tr key={r}><td>{r}</td></tr>)}</tbody></table>;
}

export function Report() {
  const [rows, setRows] = useState(() => Array.from({ length: 2000 }, (_, i) => i));
  return (
    <Profiler id="BigTable" onRender={onRender}>
      <button onClick={() => setRows((r) => [...r].reverse())}>Reverse</button>
      <BigTable rows={rows} />
    </Profiler>
  );
}

=== r163 | M | Why is a component re-rendering?
**To find out why a component re-renders, enable "Record why each component rendered" in the React DevTools Profiler and inspect the reason: its state or a hook changed, its props changed (and which ones), its parent rendered, or a context it reads changed. Then fix the cause, usually unstable props, state held too high, or a broad context.**

### The possible reasons
1. **Its own state changed** (`useState`, `useReducer`, external store via `useSyncExternalStore`).
2. **The parent rendered:** by default every child re-renders, even with identical props.
3. **Props changed:** often only by reference (new object, array or function each render).
4. **Context changed:** any consumer re-renders when the provider value changes; a new object value each provider render causes this every time.
5. **Development effects:** Strict Mode double rendering, Fast Refresh.

### How to investigate
- React DevTools Profiler with "why" recording; it names changed props and hook indexes.
- "Highlight updates when components render" for a live view.
- Temporary logging: `useEffect(() => console.log("rendered"))`, or a custom `useWhyDidYouUpdate` hook comparing previous and current props.
- The `why-did-you-render` library for detailed reports in development.
- React Compiler badges ("Memo ✨") show which components are already auto-memoized.

### Typical fixes
- Unstable props: memoize them or move them out of render (or enable the React Compiler).
- Parent re-renders: move state down, pass static parts as `children`, or wrap the child in `memo`.
- Context: split it, memoize the value, or use a store with selectors.
- Remember that a re-render is not necessarily slow; fix it only if it costs time.
--- code
import { useEffect, useRef } from "react";

// Development helper: logs which props changed between renders
export function useWhyDidYouUpdate(name: string, props: Record<string, unknown>) {
  const previous = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (previous.current) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of new Set([...Object.keys(previous.current), ...Object.keys(props)])) {
        if (!Object.is(previous.current[key], props[key])) {
          changes[key] = { from: previous.current[key], to: props[key] };
        }
      }
      if (Object.keys(changes).length) console.log(`[why-did-you-update] ${name}`, changes);
      else console.log(`[why-did-you-update] ${name}: no prop changed (parent or state/context render)`);
    }
    previous.current = props;
  });
}

export function UserCard(props: { user: { name: string }; onSelect: () => void }) {
  useWhyDidYouUpdate("UserCard", props); // e.g. logs "onSelect" changed every render -> unstable callback
  return <button onClick={props.onSelect}>{props.user.name}</button>;
}

=== r164 | M | How to trace performance issues?
**Trace performance issues by measuring first: use field data (Core Web Vitals such as INP and LCP from real users) to find which pages and interactions are slow, reproduce them, record with the Chrome DevTools Performance panel and the React DevTools Profiler to see whether time goes to rendering, JavaScript, network, layout or paint, then fix the biggest cost and measure again.**

### Step by step
1. **Identify:** real-user monitoring (`web-vitals` library, Vercel Speed Insights, Sentry, Datadog) and Lighthouse reports. INP measures responsiveness, LCP loading, CLS layout stability.
2. **Reproduce** in a production build, with CPU throttling (4x to 6x) to simulate mid-range phones.
3. **Record:**
   - **Chrome Performance panel:** long tasks (over 50ms), layout thrashing, scripting time. React 19.2 adds React-specific tracks (Scheduler priorities, component renders and effects).
   - **React Profiler:** which components rendered, how long, and why.
   - **Network panel:** request waterfalls, large bundles, uncached assets.
4. **Diagnose common causes:**
   - Too many or too expensive renders (unstable props, broad context, state too high).
   - Huge lists without virtualization.
   - Heavy synchronous work in event handlers (move to transitions, workers, or chunk it).
   - Data waterfalls (fetch in parallel, prefetch, use loaders).
   - Large bundles (code split, analyze).
   - Layout shifts from images without dimensions or late-loading fonts.
5. **Fix and verify** with the same measurement.

### Useful APIs
`performance.mark`/`measure`, the Long Animation Frames API, `PerformanceObserver`, and React's `<Profiler>`.
--- code
// main.tsx - collect real-user metrics with the web-vitals library
import { onCLS, onINP, onLCP, type Metric } from "web-vitals/attribution";

function report(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    page: location.pathname,
    // attribution points at the slow element or interaction
    target: "attribution" in metric ? (metric.attribution as { interactionTarget?: string; target?: string }).interactionTarget ?? (metric.attribution as { target?: string }).target : undefined,
  });
  navigator.sendBeacon("/api/vitals", body);
}

onINP(report);
onLCP(report);
onCLS(report);

// Custom timing around a suspicious operation
export function measureSort<T>(label: string, items: T[], compare: (a: T, b: T) => number) {
  performance.mark(`${label}-start`);
  const sorted = items.toSorted(compare);
  performance.measure(label, `${label}-start`); // visible in the Performance panel
  return sorted;
}

=== r165 | M | What are Error Boundaries?
**Error boundaries are components that catch JavaScript errors thrown while rendering their children, in lifecycle methods and in constructors, log them, and display a fallback UI instead of unmounting the whole app. They are still written as class components (using `static getDerivedStateFromError` and `componentDidCatch`) or via a library such as `react-error-boundary`.**

### What they catch
- Errors during rendering of any descendant.
- Errors thrown by Suspense data sources (`use(promise)` rejections, `useSuspenseQuery`).
- Errors from React 19 Actions (async transitions, form actions) bubble to the nearest boundary.

### What they do not catch
- Errors in event handlers (use `try/catch`).
- Errors in async code outside React's rendering (timers, plain promises).
- Errors during server rendering (handled by the SSR APIs or framework).
- Errors thrown in the boundary itself.

### Placement
- A top-level boundary for a friendly "something went wrong" page.
- Granular boundaries around widgets, routes and third-party components, so one failure does not take down the page.
- Reset with `resetKeys` (for example when the route changes) or a retry button.

### Reporting (React 19)
`createRoot(el, { onCaughtError, onUncaughtError, onRecoverableError })` centralizes reporting to monitoring tools; React 19 also stopped re-throwing caught errors, reducing duplicate console noise.

### Framework helpers
- React Router: route `ErrorBoundary` exports.
- Next.js: `error.tsx`, `global-error.tsx` and `catchError` from `next/error`.

### Why there is no hook
`componentDidCatch` has no hook equivalent yet, so libraries wrap a class for you.
--- code
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { createRoot } from "react-dom/client";

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong: {error instanceof Error ? error.message : "Unknown error"}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function RevenueChart({ data }: { data: number[] | null }) {
  if (!data) throw new Error("No revenue data"); // caught by the boundary below
  return <p>{data.length} points</p>;
}

export function Dashboard({ data, route }: { data: number[] | null; route: string }) {
  return (
    <main>
      <h1>Dashboard</h1> {/* stays visible if the chart fails */}
      <ErrorBoundary FallbackComponent={Fallback} resetKeys={[route]} onError={(e) => console.error("chart failed", e)}>
        <RevenueChart data={data} />
      </ErrorBoundary>
    </main>
  );
}

createRoot(document.getElementById("root")!, {
  onCaughtError: (error, info) => console.error("caught", error, info.componentStack), // send to monitoring
  onUncaughtError: (error) => console.error("uncaught", error),
}).render(<Dashboard data={null} route="/" />);

=== r166 | M | What is HOC (Higher-Order Component)?
**A higher-order component is a function that takes a component and returns a new component that wraps it with extra behavior or props, such as `withAuth(Dashboard)` or `withTheme(Button)`. It was the main pattern for reusing logic before hooks; today custom hooks are preferred, but HOCs still appear in libraries and for cross-cutting wrappers.**

### Shape
`const withX = (Wrapped) => function WithX(props) { const extra = ...; return <Wrapped {...props} extra={extra} />; }`

### Classic uses
- Injecting data or behavior: Redux's old `connect()`, `withRouter`, `withTranslation`.
- Guards: `withAuth` redirecting unauthenticated users.
- Instrumentation: `withErrorBoundary`, `withProfiler`, logging.
- `React.memo` and `forwardRef` are built-in functions with an HOC-like shape.

### Drawbacks
- **Wrapper hell:** many nested wrappers in DevTools.
- **Prop collisions:** two HOCs injecting the same prop name.
- **Indirection:** hard to see where a prop comes from.
- **Static methods and refs** need manual forwarding (refs are simpler in React 19 because `ref` is a regular prop).
- TypeScript typing of injected props is awkward.

### Hooks instead
`const user = useAuth()` inside the component is explicit, composable and easy to type.

### When HOCs still make sense
- Wrapping components you do not control with a boundary or provider.
- Libraries that must support class components.
- Applying the same wrapper to many route components declaratively.

### Rules
Create HOCs outside render (calling `withX(Component)` during render creates a new component type each time, remounting the subtree), set a `displayName` for DevTools, and pass through unrelated props.
--- code
import { ErrorBoundary } from "react-error-boundary";
import { useEffect } from "react";

// HOC: add an error boundary and page-view logging to any page component
export function withPage<P extends object>(Page: React.ComponentType<P>, pageName: string) {
  function WrappedPage(props: P) {
    useEffect(() => {
      console.log("page_view", pageName);
    }, []);
    return (
      <ErrorBoundary fallback={<p>{pageName} failed to load.</p>}>
        <Page {...props} />
      </ErrorBoundary>
    );
  }
  WrappedPage.displayName = `withPage(${Page.displayName ?? Page.name})`;
  return WrappedPage;
}

function Settings({ userId }: { userId: string }) {
  return <h1>Settings for {userId}</h1>;
}

// Created once at module level, not during render
export const SettingsPage = withPage(Settings, "Settings");

// Hook alternative for logic reuse:
// function usePageView(name: string) { useEffect(() => console.log("page_view", name), [name]); }

=== r167 | M | What are Render Props?
**Render props is a pattern where a component receives a function (often as `children` or a `render` prop) and calls it with its internal state or behavior to decide what to render: `<MouseTracker>{({ x, y }) => <Cursor x={x} y={y} />}</MouseTracker>`. It shares logic while leaving rendering to the caller. Custom hooks have replaced most uses, but the pattern is still useful for headless components and libraries.**

### How it works
1. The component owns the logic (state, subscriptions, measurements).
2. It calls `props.children(value)` or `props.render(value)` inside its JSX.
3. The caller returns whatever UI it wants for that value.

### Where it still shines
- **Headless UI and libraries:** virtualizers (`react-window` row renderers), Formik's `<Formik>{(formik) => ...}</Formik>`, `react-error-boundary`'s `fallbackRender`, Downshift.
- **Scoped access to context-like data** at a specific place in the tree.
- **Inversion of control:** a list component lets callers render each item (`renderItem`).

### Drawbacks
- Nesting several render-prop components creates "callback pyramids".
- Inline functions are new each render, which can defeat memoization (less of an issue with the React Compiler).
- Less obvious to read than a hook call.

### Hook equivalent
`const { x, y } = useMousePosition()` gives the same values with flat code. Use render props when the component also needs to control *where* or *when* something renders, or when the API is shared with class components.
--- code
import { useEffect, useState } from "react";

type Size = { width: number; height: number };

// Render-prop component: owns the logic, caller decides the UI
export function WindowSize({ children }: { children: (size: Size) => React.ReactNode }) {
  const [size, setSize] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return <>{children(size)}</>;
}

// A list that lets callers render each item (inversion of control)
export function List<T>({ items, renderItem }: { items: T[]; renderItem: (item: T, index: number) => React.ReactNode }) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item, i)}</li>)}</ul>;
}

export function Demo() {
  return (
    <>
      <WindowSize>{({ width }) => <p>{width < 640 ? "Mobile" : "Desktop"} ({width}px)</p>}</WindowSize>
      <List items={["Ada", "Grace"]} renderItem={(name, i) => <strong>{i + 1}. {name}</strong>} />
    </>
  );
}

=== r168 | H | What are Compound Components?
**Compound components are a set of components that work together and share implicit state, giving users a flexible, declarative API, like `<select>` and `<option>` in HTML. For example `<Tabs>`, `<Tabs.List>`, `<Tabs.Tab>` and `<Tabs.Panel>`: the parent holds the state and children read it through context, so users compose the parts in any layout without wiring props by hand.**

### Why use them
- **Flexible markup:** users choose the order, wrapping elements and styling of each part.
- **Clean API:** no giant configuration objects or dozens of props.
- **Encapsulated state:** the parent manages selection, open state or focus.
- Used by Radix UI, Headless UI, React Aria, Reach UI and shadcn/ui.

### Implementation
1. Create a context for the shared state and actions.
2. The root component provides it (controlled or uncontrolled: `value`/`defaultValue`, `onValueChange`).
3. Child components read the context and throw a helpful error if rendered outside the root.
4. Attach children as static properties (`Tabs.Tab`) or export them separately (better for tree shaking and Server Components).
5. Handle accessibility: roles (`tablist`, `tab`, `tabpanel`), `aria-selected`, `aria-controls`, keyboard navigation, and IDs from `useId`.

### Older approach
`React.Children.map` + `cloneElement` to inject props into direct children. Fragile with wrappers and fragments; context is the modern approach.

### Pitfalls
- Over-flexibility can produce invalid structures; validate in development.
- Keep context values memoized to avoid re-rendering every part.
--- code
import { createContext, use, useId, useState } from "react";

type TabsCtx = { value: string; setValue: (v: string) => void; baseId: string };
const TabsContext = createContext<TabsCtx | null>(null);

function useTabs() {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error("Tabs parts must be used inside <Tabs>");
  return ctx;
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [value, setValue] = useState(defaultValue);
  const baseId = useId();
  return <TabsContext value={{ value, setValue, baseId }}><div>{children}</div></TabsContext>;
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

export function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  const t = useTabs();
  return (
    <button role="tab" id={`${t.baseId}-tab-${value}`} aria-selected={t.value === value}
      aria-controls={`${t.baseId}-panel-${value}`} onClick={() => t.setValue(value)}>
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: React.ReactNode }) {
  const t = useTabs();
  if (t.value !== value) return null;
  return <div role="tabpanel" id={`${t.baseId}-panel-${value}`} aria-labelledby={`${t.baseId}-tab-${value}`}>{children}</div>;
}

// <Tabs defaultValue="a"><TabList><Tab value="a">Account</Tab><Tab value="b">Billing</Tab></TabList>
//   <TabPanel value="a">Account settings</TabPanel><TabPanel value="b">Invoices</TabPanel></Tabs>

=== r169 | E | Custom Hooks Pattern?
**The custom hooks pattern moves reusable stateful logic into functions named `useSomething` that compose built-in hooks, so components stay focused on rendering. It replaced higher-order components and render props as the main way to share logic, and it is how libraries such as TanStack Query, React Hook Form and Zustand expose their APIs.**

### Typical custom hooks
- **Data:** `useUser(id)`, `useProducts(filters)` wrapping TanStack Query.
- **Browser APIs:** `useMediaQuery`, `useOnlineStatus`, `useLocalStorage`, `useIntersectionObserver`.
- **Timing:** `useDebounce`, `useInterval`, `useThrottle`.
- **UI behavior:** `useDisclosure` (open/close), `useClickOutside`, `useFocusTrap`.
- **Domain logic:** `useCart`, `useCheckout`, `usePermissions`.

### Design guidelines
1. **Single purpose** and a descriptive name.
2. **Accept parameters, return a clear API:** a value, a tuple for state-like hooks, or an object for many values.
3. **Stable return values** (memoized functions) when consumers may use them in dependencies, or rely on the React Compiler.
4. **Clean up** subscriptions and timers.
5. **Avoid effects for things that can be derived**; a hook can compute values during render.
6. **Build on `useSyncExternalStore`** for external sources.
7. **Do not hide too much:** a hook that fetches, writes to a store and navigates is hard to reuse.

### Testing
`renderHook(() => useDebounce(value, 300))` with fake timers, or test through a component that uses it.

### Sharing state
Custom hooks share logic, not state. Wrap a context or store for shared state.
--- code
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((o) => !o),
  };
}

// Composed in a component: logic is reusable, rendering stays simple
export function SearchPanel() {
  const panel = useDisclosure();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (debouncedQuery) console.log("search", debouncedQuery);
  }, [debouncedQuery]);

  return (
    <div>
      <button onClick={panel.toggle}>{panel.isOpen ? "Close" : "Search"}</button>
      {panel.isOpen && <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />}
    </div>
  );
}

=== r170 | M | Controlled Pattern?
**The controlled pattern means a component's important state is owned by its parent: the parent passes the current value (`value`, `open`, `selected`) and a change handler (`onChange`, `onOpenChange`), and the component only renders and requests changes. Good reusable components support both controlled and uncontrolled use (`value` versus `defaultValue`).**

### Controlled vs uncontrolled components
- **Controlled:** `<Dialog open={isOpen} onOpenChange={setIsOpen} />`. The parent can open it from anywhere, sync it with the URL, or block closing.
- **Uncontrolled:** `<Dialog defaultOpen={false} />`. The component manages its own state; simpler for basic use.

### Supporting both
1. Accept `value`, `defaultValue` and `onChange`.
2. If `value !== undefined`, use it (controlled); otherwise use internal state initialized from `defaultValue`.
3. Always call `onChange` when the user requests a change.
4. Do not switch between modes during the component's lifetime; warn in development if it happens.

This is how native inputs, Radix UI and React Aria components work. A reusable `useControllableState` hook makes it easy.

### Benefits of control
- Single source of truth in the parent.
- Validation or transformation before accepting a change.
- Coordination between components (one accordion open at a time).
- Persistence in the URL or a store.

### Related: state reducer pattern
Some libraries let callers pass a reducer to intercept internal state changes, offering control without managing all state.
--- code
import { useState } from "react";

function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const setValue = (next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };
  return [current, setValue] as const;
}

type ToggleProps = { checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (v: boolean) => void; label: string };

export function Switch({ checked, defaultChecked = false, onCheckedChange, label }: ToggleProps) {
  const [on, setOn] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange });
  return (
    <button role="switch" aria-checked={on} onClick={() => setOn(!on)}>
      {label}: {on ? "On" : "Off"}
    </button>
  );
}

export function Settings() {
  const [notifications, setNotifications] = useState(true);
  return (
    <>
      <Switch label="Dark mode" defaultChecked /> {/* uncontrolled */}
      <Switch label="Notifications" checked={notifications} onCheckedChange={(v) => confirm("Change?") && setNotifications(v)} /> {/* controlled */}
    </>
  );
}
