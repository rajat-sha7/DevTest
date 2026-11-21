=== n1 | E | What is Next.js and how does it differ from React?
**React is a UI library for building components; Next.js is a full-stack React framework that adds routing, server rendering, data fetching, caching, bundling and deployment conventions on top of React.**

### What React gives you
React renders components and manages state. It does not decide how URLs map to screens, where data is fetched, how code is bundled or how HTML reaches the browser. A plain React app (for example with Vite) is usually a client-rendered single-page app, and you pick a router, data library and server yourself.

### What Next.js adds
- **File-system routing.** Folders in `app/` become URLs, with nested layouts, loading and error states.
- **Server-first rendering.** Components are React Server Components by default. They run on the server, can read a database directly and send no JavaScript for themselves.
- **Prerendering and streaming.** Pages are prerendered into a static shell where possible, and dynamic parts stream in behind `<Suspense>`.
- **Caching model.** With Cache Components (`cacheComponents: true`, the default for new apps in Next.js 16.4) you mark cacheable work with `"use cache"`.
- **Backend features.** Route Handlers for HTTP APIs, Server Functions for mutations, and `proxy.ts` to run code before a request is handled.
- **Tooling.** Turbopack is the default bundler for `next dev` and `next build` since Next.js 16, plus built-in image, font and script optimization.

### How to explain it in an interview
"React is the engine; Next.js is the car." You still write React components, but Next.js decides where each one runs, what is cached and how it is delivered. The trade-off is convention: you follow its file structure and server/client rules in exchange for performance and less setup.

### Current versions
Next.js 16 shipped in October 2025. The latest minor is 16.4 (October 2026), which uses React 19.2+ features such as View Transitions, `useEffectEvent` and `<Activity>`.
--- code
// app/page.tsx - a Server Component by default (no "use client")
import { db } from "@/lib/db";
import LikeButton from "./like-button";

export default async function Home() {
  // Runs only on the server: safe to query the database directly
  const posts = await db.post.findMany({ take: 5 });

  return (
    <main>
      <h1>Latest posts</h1>
      {posts.map((p) => (
        <article key={p.id}>
          <h2>{p.title}</h2>
          {/* Only this small piece ships JavaScript to the browser */}
          <LikeButton postId={p.id} />
        </article>
      ))}
    </main>
  );
}

// app/like-button.tsx
// "use client";
// export default function LikeButton({ postId }: { postId: string }) {
//   const [liked, setLiked] = useState(false);
//   return <button onClick={() => setLiked(!liked)}>{liked ? "♥" : "♡"}</button>;
// }

=== n2 | E | What are the main features of Next.js?
**Next.js bundles routing, server and client components, multiple rendering strategies, a caching model, server-side APIs and asset optimization into one framework, so a React app is production-ready without assembling those pieces yourself.**

### Routing and rendering
- **App Router.** File-system routing in `app/` with nested layouts, `loading.tsx`, `error.tsx`, route groups, parallel and intercepting routes.
- **React Server Components.** Server by default; add `"use client"` only where you need state, effects or browser APIs.
- **Partial Prerendering.** With Cache Components, every route gets a static shell served instantly, and dynamic parts stream in behind `<Suspense>`.
- **Streaming** of HTML and the RSC payload, so slow data never blocks the whole page.

### Data and caching
- **`"use cache"`** with `cacheLife` and `cacheTag` for explicit caching of functions and components.
- **On-demand revalidation** with `revalidateTag`, `updateTag` and `revalidatePath`.
- **Server Functions (Server Actions)** for mutations called directly from forms and buttons.

### Backend
- **Route Handlers** (`route.ts`) using the Web `Request`/`Response` APIs.
- **Proxy** (`proxy.ts`, formerly middleware) for redirects, rewrites and header logic before routing.
- **`after()`** to run work such as logging after the response is sent.

### Optimization
- **`next/image`** for responsive, lazy-loaded, modern-format images.
- **`next/font`** to self-host fonts with zero layout shift.
- **`next/script`** for third-party script loading strategies.
- **Metadata API** for SEO, Open Graph images, sitemaps and robots files.

### Tooling
Turbopack is the default bundler with a persistent disk cache, TypeScript is first-class, and the React Compiler is supported through `reactCompiler: true`. The dev server also exposes an MCP endpoint (`/_next/mcp`) so coding agents can read errors and routes.
--- code
// One file per concern, all discovered by convention
// app/
// ├── layout.tsx          shared shell (html/body)
// ├── page.tsx            "/"
// ├── loading.tsx         instant loading UI (Suspense)
// ├── error.tsx           error boundary for this segment
// ├── blog/[slug]/page.tsx dynamic route "/blog/:slug"
// ├── api/health/route.ts  Route Handler "GET /api/health"
// proxy.ts               runs before matching requests

// app/blog/[slug]/page.tsx
import { cacheLife, cacheTag } from "next/cache";

async function getPost(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`post-${slug}`);
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.json();
}

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article><h1>{post.title}</h1></article>;
}

=== n3 | M | What is the difference between CSR, SSR, SSG, and ISR?
**They differ in when and where HTML is produced: CSR builds it in the browser, SSR on the server per request, SSG once at build time, and ISR at build time with background regeneration. Modern Next.js mixes them inside one page.**

### The four strategies
- **CSR (Client-Side Rendering).** The server sends a minimal shell and JavaScript renders the UI in the browser. Good for highly interactive, private dashboards. Weak for SEO and first paint.
- **SSR (Server-Side Rendering).** HTML is generated on every request. Always fresh and personalized, but every request pays server time.
- **SSG (Static Site Generation).** HTML is generated at `next build` and served from a CDN. Fastest and cheapest, but stale until the next build.
- **ISR (Incremental Static Regeneration).** Static pages that regenerate after a time window or on demand, using stale-while-revalidate. New paths can be generated on first request.

### How this maps to Next.js today
In the **Pages Router** the choice is per page: `getServerSideProps` (SSR), `getStaticProps` (SSG) and `getStaticProps` with `revalidate` (ISR).

In the **App Router with Cache Components**, the choice is per component, not per page:
- Code with no request data or uncached I/O is prerendered into the **static shell** (SSG).
- Code marked `"use cache"` with a `cacheLife` is cached and revalidated (ISR).
- Code reading `cookies()`, `headers()`, `searchParams` or uncached data runs per request behind `<Suspense>` (SSR, streamed).
- Client Components can still fetch in the browser (CSR).

This combination is **Partial Prerendering (PPR)**: one route can be mostly static with a few dynamic holes.

### Interview tip
Say what you would pick and why: a marketing page is static, a product page is cached with tag-based revalidation, a cart is request-time, and a live chart is client-rendered.
--- code
// app/product/[id]/page.tsx - all four ideas in one route
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";
import LivePrice from "./live-price"; // "use client" - CSR, polls in the browser

async function ProductInfo({ id }: { id: string }) {
  "use cache"; // ISR: cached, regenerated in the background
  cacheLife("hours");
  const p = await fetch(`https://api.example.com/products/${id}`).then((r) => r.json());
  return <h1>{p.name}</h1>;
}

async function Cart() {
  const session = (await cookies()).get("session")?.value; // SSR: per request
  const cart = await fetch(`https://api.example.com/cart?s=${session}`).then((r) => r.json());
  return <p>{cart.count} items in cart</p>;
}

export default async function Page({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  return (
    <>
      <nav>Shop</nav> {/* SSG: part of the static shell */}
      <ProductInfo id={id} />
      <Suspense fallback={<p>Loading cart…</p>}>
        <Cart />
      </Suspense>
      <LivePrice id={id} />
    </>
  );
}

=== n4 | E | What is the Pages Router in Next.js?
**The Pages Router is the original Next.js routing system, where each file in `pages/` becomes a route and data is loaded with `getStaticProps`, `getServerSideProps` and `getStaticPaths`. It is still supported in Next.js 16, but new features land in the App Router.**

### How it works
- `pages/index.tsx` maps to `/`, `pages/about.tsx` to `/about`, `pages/blog/[slug].tsx` to `/blog/:slug`.
- `pages/_app.tsx` wraps every page (global CSS, providers, persistent layout).
- `pages/_document.tsx` customizes the `<html>` and `<body>` markup.
- `pages/api/*` defines API routes with a Node-style `(req, res)` handler.

### Data fetching
- **`getStaticProps`** runs at build time (SSG), optionally with `revalidate` for ISR.
- **`getServerSideProps`** runs on every request (SSR).
- **`getStaticPaths`** lists which dynamic paths to prerender.
- Components on the client use `useRouter` from `next/router`.

### Why the App Router replaced it as the default
Every page in the Pages Router is a Client Component that hydrates fully, so all page code ships to the browser. Layouts are not nested natively, data fetching is page-level only, and there is no streaming per component. The App Router adds Server Components, nested layouts, streaming and the Cache Components model.

### Status today
The Pages Router is maintained, receives bug and security fixes, and works with Turbopack. Both routers can live in the same project, which allows incremental migration: routes in `app/` take precedence when both define the same path. AMP support and `next lint`, which some older Pages Router projects relied on, were removed in Next.js 16.
--- code
// pages/blog/[slug].tsx - classic Pages Router page
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";

type Post = { slug: string; title: string; body: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const posts: Post[] = await fetch("https://cms.example.com/posts").then((r) => r.json());
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: "blocking", // render unknown slugs on first request
  };
};

export const getStaticProps: GetStaticProps<{ post: Post }> = async ({ params }) => {
  const res = await fetch(`https://cms.example.com/posts/${params!.slug}`);
  if (!res.ok) return { notFound: true };
  return { props: { post: await res.json() }, revalidate: 60 }; // ISR
};

export default function BlogPost({ post }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}

=== n5 | M | What is the App Router introduced in Next.js 13?
**The App Router is the `app/` directory routing system built on React Server Components. It introduced nested layouts, server-first components, streaming and colocated special files, and it is the recommended router for all new Next.js apps.**

### Timeline
- **Next.js 13 (2022):** introduced in beta.
- **13.4:** declared stable.
- **14:** Server Actions became stable.
- **15:** Request APIs (`params`, `cookies()`, `headers()`) became async and `fetch` stopped caching by default.
- **16:** Turbopack by default, Cache Components (`"use cache"`), `proxy.ts`, and synchronous request APIs fully removed.
- **16.4:** new apps enable Cache Components and Partial Prefetching by default.

### Core ideas
1. **Server Components by default.** Components run on the server and can be `async`. Add `"use client"` only for interactivity.
2. **Special files per segment.** `layout`, `page`, `loading`, `error`, `not-found`, `template`, `default` and `route`.
3. **Nested layouts** that persist and keep state across navigations.
4. **Streaming.** `loading.tsx` and `<Suspense>` let parts of the page render while others wait for data.
5. **Colocation.** Components, tests and styles can sit next to routes; only `page` and `route` files become public.
6. **Advanced routing.** Route groups `(name)`, parallel routes `@slot`, intercepting routes `(.)`.

### Compared to the Pages Router
Data is fetched inside components rather than in `getServerSideProps`. Mutations use Server Functions rather than API routes. Caching is explicit with `"use cache"` instead of page-level `revalidate`. Navigation uses `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`).

### Pitfall
Putting `"use client"` at the top of a high-level layout turns the whole subtree into client code, losing most App Router benefits. Keep client boundaries at the leaves.
--- code
// app/dashboard/layout.tsx - persists across /dashboard/* navigations
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <section className="grid grid-cols-[220px_1fr]">
      <aside>Sidebar (state survives navigation)</aside>
      <div>{children}</div>
    </section>
  );
}

// app/dashboard/loading.tsx - shown instantly while page.tsx streams
export default function Loading() { // (app/dashboard/loading.tsx)
  return <p>Loading dashboard…</p>;
}

// app/dashboard/page.tsx - async Server Component
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const stats = await db.stats.summary();
  return <h1>{stats.activeUsers} active users</h1>;
}

=== n6 | E | How does file-based routing work in Next.js?
**In the App Router, each folder inside `app/` is a URL segment, and a route becomes publicly reachable only when that folder contains a `page.tsx` (UI) or `route.ts` (API). Brackets, parentheses and other folder-name conventions add dynamic and organizational behavior.**

### Basic mapping
- `app/page.tsx` serves `/`.
- `app/about/page.tsx` serves `/about`.
- `app/blog/[slug]/page.tsx` serves `/blog/anything`.
- `app/api/users/route.ts` serves `/api/users` for HTTP methods.

A folder without `page` or `route` is not a route, so you can safely colocate components, tests and utilities next to it.

### Folder conventions
- **`[id]`** dynamic segment, **`[...slug]`** catch-all, **`[[...slug]]`** optional catch-all.
- **`(group)`** route group: organizes files or shares a layout without adding to the URL.
- **`_folder`** private folder: excluded from routing entirely.
- **`@slot`** parallel route slot rendered by the parent layout.
- **`(.)photo`** intercepting route, for example opening a modal over the current page.

### Special files in a segment
`layout`, `page`, `loading`, `error`, `not-found`, `template`, `default` and `route`. They nest: a page renders inside every parent layout, wrapped by the nearest loading and error boundaries.

### Pages Router comparison
In `pages/`, every file is a route (`pages/about.tsx` serves `/about`), so you cannot colocate non-route files there without them becoming pages.

### Type safety
Run `next typegen` (or just `next dev`/`next build`) to generate global helpers such as `PageProps<'/blog/[slug]'>` and `LayoutProps`. Setting `typedRoutes: true` makes `<Link href>` type-checked against real routes.
--- code
// app/
// ├── page.tsx                      -> /
// ├── (marketing)/                  -> group, not in URL
// │   ├── layout.tsx                   shared marketing layout
// │   └── pricing/page.tsx          -> /pricing
// ├── blog/
// │   ├── page.tsx                  -> /blog
// │   ├── _components/PostCard.tsx     private, never a route
// │   └── [slug]/page.tsx           -> /blog/:slug
// ├── docs/[[...path]]/page.tsx     -> /docs, /docs/a, /docs/a/b
// └── api/health/route.ts           -> GET /api/health

// app/blog/[slug]/page.tsx
export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params; // params is a Promise since Next.js 15
  return <h1>Post: {slug}</h1>;
}

// app/api/health/route.ts
export function GET() {
  return Response.json({ ok: true });
}

=== n7 | E | What is the _app.js file and what is it used for?
**`pages/_app.js` (or `_app.tsx`) is the Pages Router component that wraps every page. Use it for global CSS, context providers, persistent layouts and per-page layout patterns. The App Router replaces it with the root `app/layout.tsx`.**

### What it does
Next.js renders `_app` with two props: `Component` (the active page) and `pageProps` (data from `getStaticProps`/`getServerSideProps`). Whatever you wrap around `<Component {...pageProps} />` applies to every page.

### Common uses
- **Global CSS.** In the Pages Router, global stylesheets can only be imported in `_app`.
- **Providers.** Theme, auth session, React Query or Redux providers.
- **Persistent layout.** UI that should not remount between page changes.
- **Per-page layouts.** A `getLayout` function on each page lets pages opt into different layouts.
- **Analytics or `reportWebVitals`.**

### What to avoid
- Adding `getInitialProps` to `_app` disables Automatic Static Optimization for every page, so all pages become server-rendered.
- Fetching data here for all pages; it runs on every navigation.

### App Router equivalent
- `app/layout.tsx` is the root layout and must render `<html>` and `<body>`.
- Global CSS is imported there.
- Providers go in a small Client Component (for example `app/providers.tsx`) rendered by the layout.
- Nested `layout.tsx` files replace the `getLayout` pattern.
--- code
// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "@/components/theme";

export type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type Props = AppProps & { Component: NextPageWithLayout };

export default function MyApp({ Component, pageProps }: Props) {
  // Each page can choose its own layout; default is no extra wrapper
  const getLayout = Component.getLayout ?? ((page) => page);

  return <ThemeProvider>{getLayout(<Component {...pageProps} />)}</ThemeProvider>;
}

// App Router equivalent: app/layout.tsx
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return <html lang="en"><body><Providers>{children}</Providers></body></html>;
// }

=== n8 | M | What is the _document.js file and when should you use it?
**`pages/_document.js` customizes the server-rendered `<html>`, `<head>` and `<body>` shell in the Pages Router. Use it for the `lang` attribute, body classes or CSS-in-JS server setup. In the App Router, the root `app/layout.tsx` does this job directly.**

### Key facts
- It renders **only on the server**, once per request or build. It never runs in the browser.
- Event handlers such as `onClick` and React state do not work here.
- It must render `<Html>`, `<Head>`, `<Main>` and `<NextScript>` from `next/document`.
- The `<Head>` from `next/document` is for tags shared by all pages. Page titles and meta tags belong in `next/head` inside pages.

### When to use it
- Setting `<Html lang="en">` or classes on `<body>`.
- Collecting server-rendered styles for libraries such as styled-components or Emotion (via `getInitialProps`).
- Adding `<link>` preconnects or font tags that every page needs.

### When not to use it
- Do not put application logic, data fetching or providers here; use `_app`.
- Do not load third-party scripts with raw tags; use `next/script` with `strategy="beforeInteractive"` if it must run early.

### App Router equivalent
The root layout renders the document yourself, so there is no separate file. Fonts come from `next/font`, metadata from the Metadata API, and CSS-in-JS setup uses a registry with `useServerInsertedHTML`.
--- code
// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Shared tags only. Titles go in next/head per page. */}
        <link rel="preconnect" href="https://cdn.example.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

// App Router: app/layout.tsx does the same thing directly
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body className="antialiased">{children}</body>
//     </html>
//   );
// }

=== n9 | E | What is the public folder in Next.js used for?
**`public/` holds static files served as-is from the site root: `public/logo.png` is available at `/logo.png`. Use it for favicons, `robots.txt`, images referenced by URL, downloadable files and verification files.**

### Rules
- Files are served from `/`, never with `/public` in the URL.
- Only files present at **build time** are served. Files added at runtime are not picked up; use object storage (S3, R2, Vercel Blob) for user uploads.
- A file in `public/` must not share a name with a page route, or there is a conflict.
- Next.js cannot fingerprint these files, so browsers may cache an old version. By default they get `Cache-Control: public, max-age=0`, meaning revalidate every time.

### When to prefer other options
- **Imported images** (`import hero from "./hero.jpg"`) get automatic width, height and blur placeholders with `next/image`, and hashed URLs that can be cached forever.
- **Favicons and OG images** can use the metadata file conventions (`app/icon.png`, `app/opengraph-image.png`, `app/favicon.ico`), which Next.js turns into the right `<link>` tags.
- **`robots.txt` and `sitemap.xml`** can be generated with `app/robots.ts` and `app/sitemap.ts`.

### Using public images with next/image
Reference them by path and pass explicit `width` and `height`, because Next.js cannot read their dimensions automatically.
--- code
// public/
// ├── favicon.ico        -> /favicon.ico
// ├── images/team.jpg    -> /images/team.jpg
// └── docs/guide.pdf     -> /docs/guide.pdf

// app/about/page.tsx
import Image from "next/image";
import hero from "./hero.jpg"; // imported: size and blur placeholder known at build

export default function About() {
  return (
    <main>
      <Image src={hero} alt="Our office" placeholder="blur" preload />
      {/* public/ file: give explicit dimensions */}
      <Image src="/images/team.jpg" alt="The team" width={800} height={500} />
      <a href="/docs/guide.pdf" download>
        Download the guide
      </a>
    </main>
  );
}

=== n10 | E | How do you create a 404 page in Next.js?
**In the App Router, create `app/not-found.tsx` for unmatched URLs and call `notFound()` from `next/navigation` when a resource does not exist. In the Pages Router, create `pages/404.tsx`.**

### App Router
- **`app/not-found.tsx`** handles any URL that matches no route, and any `notFound()` call that is not caught by a closer `not-found` file.
- **Nested `not-found.tsx`** files (for example `app/blog/not-found.tsx`) render inside that segment's layouts when `notFound()` is called there.
- **`notFound()`** throws a special error that stops rendering and returns a **404** status (when called before streaming starts). It also adds `<meta name="robots" content="noindex">`.
- `not-found` components can be async Server Components and fetch data.
- Calling `notFound()` inside `try/catch` swallows it unless you rethrow; use `unstable_rethrow(err)` in the catch block.

### Global not-found
For apps with several root layouts (for example per route group), `app/global-not-found.tsx` renders a complete document for unmatched URLs. It requires the `experimental.globalNotFound` flag and must render its own `<html>` and `<body>`.

### Pages Router
`pages/404.tsx` is statically generated at build time. Return `{ notFound: true }` from `getStaticProps` or `getServerSideProps` to render it for missing data.

### Interview point
A 404 page should be helpful (search, links home) and must return a real 404 status so search engines drop the URL. A "soft 404" with a 200 status hurts SEO.
--- code
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link href="/">Go home</Link>
    </main>
  );
}

// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound(); // renders the nearest not-found.tsx with a 404 status

  return <h1>{post.title}</h1>;
}

=== n11 | E | What is the next.config.js file?
**`next.config.js` (or `next.config.ts` / `.mjs`) is the project-level configuration file that Next.js reads at startup and build. It controls features such as Cache Components, images, redirects, headers, Turbopack, output mode and experimental flags.**

### Formats
- `next.config.ts` is supported natively with full typing via `NextConfig`.
- The export can be an object or a function `(phase, { defaultConfig }) => config`, so you can vary config between dev and build.
- It runs in Node.js and is not bundled into the app.

### Commonly used options in Next.js 16
- **`cacheComponents: true`** and **`partialPrefetching: true`**: the modern caching and prefetching model (default for new apps in 16.4).
- **`cacheLife`**: custom cache profiles.
- **`images.remotePatterns`**, `qualities`, `localPatterns` (`images.domains` is deprecated).
- **`redirects()`, `rewrites()`, `headers()`**: async functions returning rules.
- **`turbopack`**: top-level Turbopack options such as `rules` and `resolveAlias` (moved out of `experimental` in 16).
- **`reactCompiler: true`**: enable the React Compiler (stable since 16).
- **`typedRoutes: true`**: type-checked links.
- **`output: 'standalone' | 'export'`**, `basePath`, `trailingSlash`, `serverExternalPackages`, `transpilePackages`.
- **`adapterPath`**: deployment adapters (stable since 16.2).

### Removed in 16
`eslint` options (with `next lint`), `serverRuntimeConfig`, `publicRuntimeConfig`, `amp`, `experimental.ppr`, `experimental.dynamicIO` and `experimental.turbopack`.

### Good to know
Config changes require restarting `next dev`. Do not put secrets in it; anything under `env` is inlined into the bundle.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  images: {
    remotePatterns: [new URL("https://images.example.com/**")],
  },
  async redirects() {
    return [{ source: "/old-blog/:slug", destination: "/blog/:slug", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
  turbopack: {
    resolveAlias: { "lodash": "lodash-es" },
  },
};

export default nextConfig;

=== n12 | E | How do you set environment variables in Next.js?
**Put variables in `.env` files at the project root. Next.js loads them into `process.env` automatically. Server code can read any variable, but browser code can only read variables prefixed with `NEXT_PUBLIC_`, which are inlined at build time.**

### Files and load order
Next.js looks for these files, and the first match for a variable wins:
1. `process.env` (already set in the shell or hosting platform)
2. `.env.$(NODE_ENV).local`
3. `.env.local` (not loaded when `NODE_ENV=test`)
4. `.env.$(NODE_ENV)` (`.env.development`, `.env.production`, `.env.test`)
5. `.env`

Commit `.env` and `.env.development` with safe defaults. Never commit `.env*.local`.

### Server vs browser
- **Server-only** (`DATABASE_URL`, `STRIPE_SECRET_KEY`): read in Server Components, Route Handlers, Server Functions and `proxy.ts`.
- **Public** (`NEXT_PUBLIC_API_URL`): replaced with the literal value in client bundles at `next build`. Changing it later requires a rebuild.

### Runtime values
Server-side reads happen at request time only for code that runs at request time. If a page is prerendered, `process.env` is read during the build. To force a runtime read (for example one Docker image across environments), call `await connection()` before reading. The old `publicRuntimeConfig`/`serverRuntimeConfig` were removed in Next.js 16.

### Other tips
- Variables can reference others: `API=$HOST/api`.
- Use `@next/env`'s `loadEnvConfig` to load the same files in scripts or test setup.
- Validate variables at startup (for example with Zod) so a missing secret fails fast.
- Import `server-only` in modules that read secrets so they cannot be bundled for the client.
--- code
// .env.local  (never commit)
// DATABASE_URL="postgres://user:pass@localhost:5432/app"
// NEXT_PUBLIC_SITE_URL="http://localhost:3000"

// lib/env.ts - validate once, fail fast
import "server-only";
import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
  })
  .parse(process.env);

// app/status/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";

async function Region() {
  await connection(); // read at request time, not baked in at build
  return <p>Region: {process.env.DEPLOY_REGION ?? "local"}</p>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>…</p>}>
      <Region />
    </Suspense>
  );
}

=== n13 | E | What is the NEXT_PUBLIC prefix used for in environment variables?
**`NEXT_PUBLIC_` marks an environment variable as safe for the browser. At `next build`, Next.js replaces every `process.env.NEXT_PUBLIC_X` reference in client code with its literal value. Variables without the prefix stay on the server only.**

### How the inlining works
`process.env.NEXT_PUBLIC_ANALYTICS_ID` is a text replacement at build time, not a runtime lookup. That has consequences:
- The value is **frozen into the JavaScript bundle**. Changing it in your hosting dashboard has no effect until you rebuild.
- **Dynamic lookups are not replaced.** `process.env[name]` or destructuring `const { NEXT_PUBLIC_X } = process.env` stays `undefined` in the browser.
- Anything with the prefix is **public**. Anyone can read it in the bundle, so never prefix secrets.

### What happens without the prefix
In a Client Component, `process.env.SECRET_KEY` is `undefined`. This is a security feature: server secrets cannot leak by accident.

### Patterns
- **Same build, many environments.** Read a non-prefixed variable on the server at request time (after `await connection()`), then pass the value to Client Components as a prop.
- **Keep secrets server-side.** Call third-party APIs from Route Handlers or Server Functions instead of exposing keys.
- **Taint.** The experimental `taint` option plus React's `experimental_taintUniqueValue` can block secret values from ever being passed to the client.

### Interview point
Explain both halves: the prefix controls exposure, and inlining means build time, not run time.
--- code
// .env
// NEXT_PUBLIC_SITE_NAME="DevQnA"
// STRIPE_SECRET_KEY="sk_live_..."

// app/components/footer.tsx
"use client";

export function Footer() {
  // Works: replaced with "DevQnA" at build time
  const name = process.env.NEXT_PUBLIC_SITE_NAME;

  // undefined in the browser: not prefixed, never shipped
  const secret = process.env.STRIPE_SECRET_KEY;

  // Does NOT work: dynamic lookup is not inlined
  const key = "NEXT_PUBLIC_SITE_NAME";
  const dynamic = process.env[key];

  return (
    <footer>
      © {name} {secret === undefined && dynamic === undefined ? "(safe)" : ""}
    </footer>
  );
}

=== n14 | E | How does Next.js handle CSS imports?
**Next.js supports global CSS, CSS Modules, Tailwind CSS, Sass and CSS-in-JS out of the box. In the App Router, global CSS can be imported in any layout or component; in the Pages Router it can only be imported in `_app`.**

### Global CSS
- App Router: import `globals.css` in the root `app/layout.tsx`. Global styles imported in nested layouts or components also work, but they are global and stay on the page once loaded.
- Pages Router: global CSS is allowed only in `pages/_app.tsx` to avoid order conflicts.

### CSS Modules
Files named `*.module.css` are locally scoped. Class names become unique hashes, so `.button` in two files never collides. In Next.js 16.4 production builds, the generated class names are shorter.

### Tailwind CSS
`create-next-app` sets up Tailwind CSS v4 by default. It needs only `@import "tailwindcss";` in `globals.css` and the `@tailwindcss/postcss` plugin in `postcss.config.mjs`. Theme customization lives in CSS with `@theme`.

### Sass
Install `sass` and import `.scss` or `.module.scss` files. Turbopack does not support the legacy `~` prefix for `node_modules` imports.

### How CSS is delivered
- In production CSS is extracted into `.css` files, minified and chunked per route, and loaded with `<link>` tags.
- In development styles hot-reload without losing state.
- Order follows import order, so import global CSS first.
- `experimental.inlineCss` can inline CSS into the HTML `<head>` to save a request on first load.
- External stylesheets from packages can be imported anywhere in the App Router.
--- code
// app/layout.tsx
import "./globals.css"; // global styles + Tailwind

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

/* app/globals.css (Tailwind CSS v4) */
// @import "tailwindcss";
// @theme { --color-brand: #4f46e5; }

// app/components/card.tsx - CSS Module, locally scoped
import styles from "./card.module.css"; // .card { padding: 1rem } -> .card_x7a2

export function Card({ title }: { title: string }) {
  return (
    <div className={`${styles.card} rounded-lg bg-brand text-white`}>
      {title}
    </div>
  );
}

=== n15 | E | What are CSS Modules in Next.js?
**CSS Modules are `.module.css` (or `.module.scss`) files whose class names are scoped to the component that imports them. Next.js compiles each class into a unique name, so styles never leak or collide, with zero runtime cost.**

### How they work
`import styles from "./button.module.css"` returns an object mapping your class names to generated ones, for example `styles.primary` becomes `button_primary__x7a2c`. Only the CSS for modules actually imported on a route is loaded.

### Rules and features
- Use **class selectors**. A bare element selector like `button { }` is not "pure" and is rejected, because it would be global.
- Use `:global(.some-class)` to target a global class from inside a module.
- **`composes`** lets one class reuse another: `.danger { composes: base; color: red; }`.
- Class names with dashes are accessed with brackets: `styles["is-active"]`.
- They work in both Server and Client Components because they are just static CSS.

### Why choose them
- No runtime cost, unlike runtime CSS-in-JS libraries. That matters in Server Components, which cannot use runtime style injection.
- Plain CSS skills apply.
- Pairs well with design tokens in CSS variables.

### Compared to Tailwind
Tailwind puts utilities in markup; CSS Modules keep styles in a separate file. Both are recommended for the App Router, and many teams use Tailwind for layout and CSS Modules for complex components.

### TypeScript
Next.js types `*.module.css` imports as `{ readonly [key: string]: string }`. For typed class names, use a plugin such as `typescript-plugin-css-modules`.
--- code
/* app/components/button.module.css */
// .base { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; }
// .primary { composes: base; background: var(--brand); color: white; }
// .ghost { composes: base; background: transparent; }
// .wrapper :global(.icon) { margin-right: 0.25rem; }

// app/components/button.tsx
import styles from "./button.module.css";

type Props = {
  variant?: "primary" | "ghost";
  children: React.ReactNode;
};

export function Button({ variant = "primary", children }: Props) {
  // styles.primary -> "button_primary__x7a2c" (unique per file)
  return (
    <span className={styles.wrapper}>
      <button className={styles[variant]}>
        <i className="icon">★</i>
        {children}
      </button>
    </span>
  );
}

=== n16 | E | How do you create dynamic routes in Next.js?
**Wrap a folder name in square brackets, such as `app/blog/[slug]/page.tsx`. The matching URL part arrives in the `params` prop, which is a Promise since Next.js 15 and must be awaited.**

### App Router
- `app/blog/[slug]/page.tsx` matches `/blog/hello` with `params = { slug: "hello" }`.
- Multiple segments work: `app/shop/[category]/[id]/page.tsx`.
- **`generateStaticParams`** returns the values to prerender at build time.
- **Unknown values:** with Cache Components, a param not returned by `generateStaticParams` serves the App Shell immediately and the full page is generated in the background, then cached (ISR). Without Cache Components, `export const dynamicParams = false` returns 404 for unknown values.
- In Client Components, read params with `useParams()` from `next/navigation`.

### Why params is a Promise
Making `params` async lets Next.js prerender everything that does not depend on it. You can even pass the promise down and await it inside a `<Suspense>` boundary so the rest of the layout stays in the static shell. Synchronous access was fully removed in Next.js 16.

### Typing
Use the generated helper `PageProps<'/blog/[slug]'>` (from `next typegen`) instead of hand-writing `{ params: Promise<{ slug: string }> }`.

### Pages Router
`pages/blog/[slug].tsx`, reading `params` in `getStaticProps`/`getServerSideProps` or `router.query.slug` on the client.
--- code
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";

async function getPost(slug: string) {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://cms.example.com/posts/${slug}`);
  return res.ok ? res.json() : null;
}

// Prerender the most popular posts at build time
export async function generateStaticParams() {
  const posts = await fetch("https://cms.example.com/posts?top=20").then((r) => r.json());
  return posts.map((p: { slug: string }) => ({ slug: p.slug }));
}

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return <h1>{post.title}</h1>;
}

=== n17 | M | What are catch-all routes and how do you define them?
**A catch-all route matches one or more URL segments with a single file, using three dots in brackets: `app/docs/[...slug]/page.tsx`. The segments arrive as an array in `params`, for example `/docs/a/b` gives `{ slug: ["a", "b"] }`.**

### Behavior
- `/docs/intro` gives `slug = ["intro"]`.
- `/docs/guides/routing/advanced` gives `slug = ["guides", "routing", "advanced"]`.
- `/docs` does **not** match. Use an optional catch-all `[[...slug]]` or a separate `app/docs/page.tsx` for that.

### Typical uses
- Documentation sites and CMS pages where the path structure comes from content.
- Proxying an external API: `app/api/proxy/[...path]/route.ts`.
- File browsers, nested category pages, and localized slugs.

### Priority
More specific routes win. With `app/docs/getting-started/page.tsx` and `app/docs/[...slug]/page.tsx`, the URL `/docs/getting-started` uses the static page. Static segments beat dynamic ones, and dynamic beats catch-all.

### Static generation
`generateStaticParams` must return arrays for catch-all params: `[{ slug: ["guides", "routing"] }]`.

### Pitfalls
- A catch-all must be the **last** segment; `app/[...slug]/edit` is not allowed.
- Values are URL-decoded strings; validate them before using them in file paths or queries to avoid path traversal.
- A root-level `app/[...slug]` catches almost everything, so keep it as the last resort for CMS pages and call `notFound()` for unknown paths.
--- code
// app/docs/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { getDoc, getAllDocPaths } from "@/lib/docs";

export async function generateStaticParams() {
  const paths = await getAllDocPaths(); // e.g. ["guides/routing", "api/link"]
  return paths.map((p) => ({ slug: p.split("/") }));
}

export default async function DocPage({ params }: PageProps<"/docs/[...slug]">) {
  const { slug } = await params; // /docs/guides/routing -> ["guides", "routing"]

  // Guard against "..", empty parts and odd characters before touching the file system
  if (slug.some((part) => !/^[a-z0-9-]+$/.test(part))) notFound();

  const doc = await getDoc(slug.join("/"));
  if (!doc) notFound();

  return (
    <article>
      <p>Path: {slug.join(" / ")}</p>
      <h1>{doc.title}</h1>
    </article>
  );
}

=== n18 | E | What is the difference between [slug] and [...slug]?
**`[slug]` matches exactly one URL segment and gives a string; `[...slug]` matches one or more segments and gives an array of strings.**

### Side by side
| URL | `app/blog/[slug]` | `app/blog/[...slug]` |
|---|---|---|
| `/blog` | no match | no match |
| `/blog/hello` | `"hello"` | `["hello"]` |
| `/blog/2026/11/hello` | no match (404) | `["2026", "11", "hello"]` |

A third form, **`[[...slug]]`** (optional catch-all), also matches `/blog` with `slug` undefined.

### When to use each
- **`[slug]`** for a resource identified by one value: a post, a user profile, a product ID. It is the most common and easiest to type.
- **`[...slug]`** when the depth varies: docs trees, nested categories, CMS-driven paths, or proxy routes.

### Things to remember
- Both are `Promise`-wrapped in `params` and must be awaited.
- `generateStaticParams` returns `{ slug: "hello" }` for `[slug]` and `{ slug: ["2026", "hello"] }` for `[...slug]`.
- You cannot have `[slug]` and `[...slug]` as siblings at the same level, because they would be ambiguous for single-segment URLs.
- Catch-all must be the final segment of the route.
--- code
// app/blog/[slug]/page.tsx   ->  /blog/hello
export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params; // "hello"
  return <h1>Post: {slug}</h1>;
}

// app/docs/[...slug]/page.tsx  ->  /docs/guides/routing
export async function DocsPage({ params }: PageProps<"/docs/[...slug]">) {
  const { slug } = await params; // ["guides", "routing"]
  return <h1>{slug.join(" › ")}</h1>;
}

// generateStaticParams shapes differ
export async function generateStaticParams() {
  return [
    { slug: ["guides", "routing"] }, // for [...slug]
    // { slug: "hello" }             // for [slug]
  ];
}

=== n19 | M | What is an optional catch-all route [[...slug]]?
**An optional catch-all, `app/shop/[[...slug]]/page.tsx`, behaves like `[...slug]` but also matches the parent path with no segments, so `/shop`, `/shop/shoes` and `/shop/shoes/running` are all handled by one file.**

### Values
- `/shop` gives `params = {}` (`slug` is `undefined`).
- `/shop/shoes` gives `{ slug: ["shoes"] }`.
- `/shop/shoes/running` gives `{ slug: ["shoes", "running"] }`.

### When it helps
- One page that shows "all items" at the root and filtered views deeper down.
- Docs where `/docs` is the index and `/docs/a/b` are pages, all rendered by the same component.
- Catch-all CMS routing at the root of the app: `app/[[...path]]/page.tsx`, with specific routes still taking priority.

### Rules
- You cannot have both `app/shop/page.tsx` and `app/shop/[[...slug]]/page.tsx`, because both would handle `/shop`.
- It must be the last segment in the route.
- In `generateStaticParams`, return `{ slug: [] }` or omit `slug` to prerender the root path.
- Always handle the `undefined` case; `slug?.join("/") ?? ""` is a common default.

### Choosing between them
Use `[...slug]` when the root path should be a different page or a 404, and `[[...slug]]` when the root and deeper paths share the same UI and data logic.
--- code
// app/shop/[[...slug]]/page.tsx
import { getProducts } from "@/lib/products";

export async function generateStaticParams() {
  return [
    { slug: [] },                     // /shop
    { slug: ["shoes"] },              // /shop/shoes
    { slug: ["shoes", "running"] },   // /shop/shoes/running
  ];
}

export default async function Shop({ params }: PageProps<"/shop/[[...slug]]">) {
  const { slug = [] } = await params; // default for /shop
  const [category, subcategory] = slug;

  const products = await getProducts({ category, subcategory });

  return (
    <main>
      <h1>{category ? `${category} ${subcategory ?? ""}` : "All products"}</h1>
      <p>{products.length} products</p>
    </main>
  );
}

=== n20 | E | How do you use the useRouter hook?
**`useRouter` gives Client Components programmatic navigation. In the App Router, import it from `next/navigation`; it exposes `push`, `replace`, `refresh`, `prefetch`, `back` and `forward`. In the Pages Router, `useRouter` from `next/router` also exposes `query`, `pathname` and router events.**

### App Router (`next/navigation`)
- `router.push(href, { scroll })` navigates and adds a history entry.
- `router.replace(href)` navigates without adding a history entry.
- `router.refresh()` re-renders the current route on the server and merges the new RSC payload, keeping client state.
- `router.prefetch(href)` prefetches a route manually.
- `router.back()` / `router.forward()` move through history.

Reading the URL uses separate hooks: `usePathname()`, `useSearchParams()` and `useParams()`. There are no `router.events`; use `usePathname` and `useSearchParams` in an effect to react to navigation, or `onNavigate` on `<Link>`.

### Rules
- Only works in **Client Components** (`"use client"`).
- Do not call `push` during render; call it in event handlers or effects.
- For server-side navigation in Server Components or Server Functions, use `redirect()` instead.
- Mixing up the imports is a classic bug: `next/router` in the App Router throws "NextRouter was not mounted".

### Prefer Link
Use `<Link>` for normal navigation. It renders a real `<a>`, so it supports opening in a new tab, prefetching and accessibility. Use `useRouter` when navigation follows logic, such as after a form succeeds.
--- code
// app/search/search-box.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) params.set("q", term);
    else params.delete("q");

    // replace: typing should not create a history entry per keystroke
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <div>
      <input defaultValue={searchParams.get("q") ?? ""} onChange={(e) => onSearch(e.target.value)} />
      {isPending && <span>Searching…</span>}
      <button onClick={() => router.refresh()}>Refresh results</button>
      <button onClick={() => router.back()}>Back</button>
    </div>
  );
}

=== n21 | E | What is the difference between router.push and router.replace?
**`router.push` adds a new entry to the browser history, so the Back button returns to the previous page. `router.replace` swaps the current entry, so the previous URL is gone from history.**

### Use push when
- The user is moving to a new page they might want to come back from.
- Navigating after creating something, such as going to `/posts/123` after "Save".
- Moving between steps where Back should return to the earlier step.

### Use replace when
- **Updating filters or search query** as the user types, so Back does not step through every keystroke.
- **Redirecting** after login, so Back does not return to the login form.
- Normalizing a URL, for example fixing casing or adding default query parameters.
- Changing tabs that should not clutter history.

### Shared behavior
- Both perform a client-side transition, keeping shared layouts mounted.
- Both accept `{ scroll: false }` to keep the scroll position.
- Both are wrapped in a React transition, so you can use `useTransition` to show pending UI.
- `<Link replace>` is the declarative equivalent of `router.replace`.

### Server side
`redirect()` in a Server Component or Server Function uses `replace` by default in Server Components and `push` in Server Functions. `permanentRedirect()` returns a 308 status for moved pages.
--- code
// app/login/login-form.tsx
"use client";

import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    const res = await fetch("/api/login", { method: "POST", body: formData });
    if (res.ok) {
      // replace: Back should not return to the login form
      router.replace("/dashboard");
    }
  }

  return (
    <form action={onSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button>Sign in</button>
    </form>
  );
}

// Elsewhere: push keeps history so Back works
// router.push(`/posts/${newPost.id}`);
// Declarative equivalent of replace:
// <Link href="/settings/billing" replace>Billing</Link>

=== n22 | E | How do you programmatically navigate in Next.js?
**Use `useRouter().push()` or `replace()` in Client Components, `redirect()` or `permanentRedirect()` in Server Components, Server Functions and Route Handlers, and `NextResponse.redirect()` in `proxy.ts`.**

### Options by context
| Where | API |
|---|---|
| Client Component event handler | `useRouter()` from `next/navigation` |
| Server Component during render | `redirect()` from `next/navigation` |
| Server Function after a mutation | `redirect()` (after revalidating data) |
| Route Handler | `redirect()` or `Response.redirect()` |
| Before routing for many paths | `NextResponse.redirect()` in `proxy.ts` |
| Fixed, known redirects | `redirects()` in `next.config.ts` |

### Details
- `redirect()` throws a special error, so code after it does not run. Do not call it inside `try`, or rethrow it.
- In Server Functions, revalidate first (`updateTag`, `revalidatePath`) and then `redirect`, so the destination shows fresh data.
- `permanentRedirect()` sends a 308 status for content that moved for good.
- In Client Components, wrap navigation in `startTransition` to track pending state.
- In the browser you can also use `window.history.pushState` or `replaceState`; Next.js syncs these with `usePathname` and `useSearchParams` without a server round-trip.

### Pages Router
`useRouter` from `next/router`, `Router.push` outside components, and returning `{ redirect: { destination, permanent } }` from `getServerSideProps`.
--- code
// app/posts/actions.ts - Server Function
"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function createPost(formData: FormData) {
  const user = await verifySession(); // always authorize inside the action
  const post = await db.post.create({
    data: { title: String(formData.get("title")), authorId: user.id },
  });

  updateTag("posts"); // make the new post visible immediately
  redirect(`/posts/${post.id}`); // throws: nothing after this runs
}

// app/admin/page.tsx - Server Component guard
// import { redirect } from "next/navigation";
// const user = await getUser();
// if (!user?.isAdmin) redirect("/login");

// Client Component
// const router = useRouter();
// <button onClick={() => router.push("/checkout")}>Checkout</button>

=== n23 | M | What is shallow routing?
**Shallow routing changes the URL without re-running server data fetching for the page. In the Pages Router it is `router.push(url, undefined, { shallow: true })`. In the App Router you use the native `window.history.pushState` or `replaceState`, which Next.js keeps in sync with its hooks.**

### Pages Router
`shallow: true` updates the URL and `router.query` without calling `getServerSideProps`, `getStaticProps` or `getInitialProps` again. It only works for the **same page**; changing to another page always does a full data load.

### App Router
There is no `shallow` option. Instead:
- `window.history.pushState(null, "", "?sort=asc")` updates the URL with no server request.
- `usePathname()` and `useSearchParams()` update to reflect the new URL, so the UI re-renders on the client.
- This is ideal for UI state you want in the URL: sort order, selected tab, open modal, map position.

By contrast, `router.push("?sort=asc")` performs a real navigation, re-rendering the Server Components for that route with the new `searchParams`.

### Choosing between them
- Data must change on the server (results filtered by the database): use `router.push`/`replace` or `<Link>`.
- Data is already on the client and only the view changes (client-side sort): use `history.pushState`.

### Pitfalls
- A full page reload with the shallow URL runs the server render with those params, so the page must handle them.
- Libraries such as `nuqs` wrap this pattern with typed search params.
--- code
// app/products/sort-toggle.tsx
"use client";

import { useSearchParams } from "next/navigation";

export function SortedList({ items }: { items: { id: number; name: string }[] }) {
  const searchParams = useSearchParams();
  const order = searchParams.get("sort") === "desc" ? "desc" : "asc";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", order === "asc" ? "desc" : "asc");
    // Shallow: URL updates, useSearchParams re-renders, no server request
    window.history.pushState(null, "", `?${params}`);
  }

  const sorted = [...items].sort((a, b) =>
    order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  return (
    <>
      <button onClick={toggle}>Sort: {order}</button>
      <ul>{sorted.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
    </>
  );
}

// Pages Router equivalent:
// router.push({ query: { sort: "desc" } }, undefined, { shallow: true });

=== n24 | M | How do you handle query parameters in Next.js?
**On the server, read the `searchParams` prop of `page.tsx`, which is a Promise you must await. On the client, use the `useSearchParams()` hook and update the URL with `router.push`/`replace` or `<Link>`.**

### Server: the `searchParams` prop
- Only `page.tsx` receives it; layouts do not, because a layout is shared across URLs and does not re-render on query changes.
- Values are `string | string[] | undefined`, so normalize them.
- Reading `searchParams` makes that part of the page depend on the request. With Cache Components, put the reading component inside `<Suspense>` so the rest of the page stays in the static shell.
- With Partial Prefetching, `<Link prefetch={true}>` can resolve `searchParams` at prefetch time, so cached results for that URL arrive before the click.

### Client: `useSearchParams()`
- Returns a read-only `URLSearchParams`.
- Copy it to change values: `new URLSearchParams(searchParams)`.
- A component using it during prerendering needs a `<Suspense>` boundary above it, or the build reports "Missing Suspense boundary with useSearchParams".

### Route Handlers
Read `request.nextUrl.searchParams` (or `new URL(request.url).searchParams`).

### Tips
- Validate with Zod; query strings are user input.
- Use `replace` for filters typed live, so history is not flooded.
- Treat the URL as the source of truth for shareable state.
--- code
// app/products/page.tsx
import { Suspense } from "react";
import { z } from "zod";

const Query = z.object({
  q: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
});

async function Results({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const { q, page } = Query.parse(await searchParams);
  const res = await fetch(`https://api.example.com/products?q=${encodeURIComponent(q)}&page=${page}`);
  const products: { id: string; name: string }[] = await res.json();
  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <main>
      <h1>Products</h1> {/* static shell */}
      <Suspense fallback={<p>Loading results…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

// Client: const q = useSearchParams().get("q");
// Route Handler: const q = request.nextUrl.searchParams.get("q");

=== n25 | E | What is the Link component and how does it work?
**`<Link>` from `next/link` renders a real `<a>` tag but intercepts clicks to perform client-side navigation, and it prefetches the destination when it enters the viewport. Shared layouts stay mounted, so only the changed part of the page re-renders.**

### What happens on click
1. Next.js prevents the full page load.
2. It uses the prefetched RSC payload if available, otherwise fetches it.
3. It renders the new segments while keeping parent layouts and their state.
4. It updates the URL and manages scroll and focus.

Modifier clicks (Cmd/Ctrl+click) and external URLs behave like normal links.

### Key props
- **`href`** string or URL object `{ pathname, query }`.
- **`replace`** replace the history entry instead of pushing.
- **`scroll`** set `false` to keep the scroll position.
- **`prefetch`** `"auto"`/`null` (default), `true`, or `false`.
- **`onNavigate`** runs only for client-side navigations and can `preventDefault()`, useful to block leaving a dirty form.
- **`transitionTypes`** (16.2+) passes types to React View Transitions for different animations.
- Any `<a>` attribute (`className`, `target`, `aria-*`) passes through.

### Related tools
- `useLinkStatus()` shows a pending state for the clicked link.
- `usePathname()` helps mark the active link.
- `typedRoutes: true` type-checks `href` values.

### Interview point
Use `<Link>` instead of `<a>` for internal routes; an `<a>` triggers a full reload and loses client state. Use `useRouter` only when navigation depends on logic.
--- code
// app/components/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={pathname === l.href ? "page" : undefined}
          className={pathname === l.href ? "font-bold" : ""}
        >
          {l.label}
        </Link>
      ))}
      <Link href={{ pathname: "/search", query: { q: "nextjs" } }} prefetch={false}>
        Search
      </Link>
      <Link href="https://nextjs.org" target="_blank" rel="noreferrer">Docs</Link>
    </nav>
  );
}
