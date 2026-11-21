=== n171 | M | What is Preview Mode in the Pages Router?
**Preview Mode was the Pages Router feature for showing unpublished CMS content on static pages: an API route called `res.setPreviewData({...})`, which set cookies that made `getStaticProps` run at request time with `context.preview` and `context.previewData`. It is deprecated in favor of Draft Mode (`res.setDraftMode({ enable: true })`), which works the same way without preview data.**

### How Preview Mode worked
1. The CMS opened `/api/preview?secret=...&slug=...`.
2. The API route validated the secret and called `res.setPreviewData({ token })`.
3. Two cookies (`__prerender_bypass` and `__next_preview_data`) were set.
4. `getStaticProps` ran on every request with `context.preview === true` and the stored `previewData`, fetching drafts.
5. `res.clearPreviewData()` exited preview.

### Why it was replaced
`previewData` was limited by cookie size (about 2KB) and encouraged storing data in cookies. Draft Mode keeps only the bypass flag; your code fetches drafts with server-side credentials.

### Draft Mode in the Pages Router
- Enable: `res.setDraftMode({ enable: true })` in an API route, then redirect.
- In `getStaticProps`: `context.draftMode` is `true`.
- Disable: `res.setDraftMode({ enable: false })`.

### App Router
`(await draftMode()).enable()` from `next/headers` in a Route Handler, and `(await draftMode()).isEnabled` in pages. With Cache Components, cached functions re-run for drafts automatically.

### Security
Always validate a secret and the redirect slug; otherwise anyone can force your pages into dynamic rendering or create open redirects.
--- code
// pages/api/draft.ts (Pages Router, Draft Mode)
import type { NextApiRequest, NextApiResponse } from "next";
import { getPostBySlug } from "@/lib/cms";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.secret !== process.env.CMS_PREVIEW_SECRET) {
    return res.status(401).json({ message: "Invalid token" });
  }
  const post = await getPostBySlug(String(req.query.slug), { preview: true });
  if (!post) return res.status(404).json({ message: "Invalid slug" });

  res.setDraftMode({ enable: true }); // old API: res.setPreviewData({ token: "..." })
  res.redirect(307, `/blog/${post.slug}`);
}

// pages/blog/[slug].tsx
// export const getStaticProps: GetStaticProps = async ({ params, draftMode }) => {
//   const post = await getPostBySlug(String(params!.slug), { preview: draftMode });
//   return { props: { post } };
// };

=== n172 | H | How do you implement a monorepo with Next.js?
**Use a workspace-aware package manager (pnpm, npm or Yarn workspaces, or Bun) with a task runner such as Turborepo or Nx. Put apps in `apps/` and shared code in `packages/`, depend on internal packages via `workspace:*`, and let Next.js compile untranspiled internal packages with `transpilePackages` or by having those packages build themselves.**

### Typical layout
```
apps/web        Next.js app
apps/docs       another Next.js app
packages/ui     shared React components
packages/config shared tsconfig, ESLint, Tailwind presets
packages/db     Prisma or Drizzle client (server-only)
```

### Next.js configuration
- **`transpilePackages: ["@acme/ui"]`** when internal packages ship raw TypeScript/JSX ("just-in-time" packages).
- **`turbopack.root`** (and `outputFileTracingRoot`) set to the monorepo root so Turbopack and standalone output can find hoisted dependencies.
- **Tailwind v4:** add `@source "../../packages/ui";` so classes used in shared components are generated.
- Symlinked packages outside the root: `experimental.turbopackAdditionalRoots` (16.4).

### Task running and caching
Turborepo caches `next build` outputs (`.next/**` excluding `.next/cache/**`) locally and remotely, and runs only affected apps. Next.js's own Turbopack disk cache also speeds CI when `.next/cache` is cached.

### Good practices
- Shared packages export clear entry points (`exports` in `package.json`), with `"use client"` at the top of client component files.
- Mark server-only packages with `import "server-only"`.
- Keep one version of React and Next.js across apps (pnpm catalogs or syncpack).
- For multiple apps on one domain, use **multi-zones** with rewrites or `assetPrefix`.
--- code
// pnpm-workspace.yaml
// packages: ["apps/*", "packages/*"]

// apps/web/package.json
// { "dependencies": { "@acme/ui": "workspace:*", "next": "16.4.6", "react": "19.2.x" } }

// apps/web/next.config.ts
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@acme/ui"], // ships raw TSX
  turbopack: { root: path.join(__dirname, "../..") },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  output: "standalone",
};

export default nextConfig;

// turbo.json
// { "tasks": { "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**"] },
//              "dev": { "cache": false, "persistent": true } } }

// apps/web/app/page.tsx
// import { Button } from "@acme/ui/button";

=== n173 | E | How do you configure path aliases in Next.js?
**Define `paths` (and optionally `baseUrl`) in `tsconfig.json` or `jsconfig.json`, for example `"@/*": ["./src/*"]`. Next.js and Turbopack read these automatically, so `import { db } from "@/lib/db"` works without any bundler config. `create-next-app` sets up `@/*` by default.**

### Setup
```
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ui/*": ["./src/components/ui/*"]
    }
  }
}
```

### Notes
- `baseUrl` is optional in TypeScript 5+, and paths resolve relative to the tsconfig. TypeScript 7 (supported in `next build` since 16.3) removes `baseUrl`, so prefer `paths` with `./` prefixes.
- Restart `next dev` after changing tsconfig paths.
- Aliases work in Server and Client Components, Route Handlers, `proxy.ts` and CSS imports processed by the bundler.

### Other tools need the same mapping
- **Jest:** `moduleNameMapper` (or use `next/jest`, which reads tsconfig paths).
- **Vitest:** `vite-tsconfig-paths` plugin.
- **ESLint import plugins:** a TypeScript resolver.
- **Node scripts:** `tsx` resolves tsconfig paths.

### Alternatives
- `package.json` subpath imports (`"imports": { "#lib/*": "./src/lib/*" }`) are a Node.js standard and work everywhere.
- `turbopack.resolveAlias` aliases packages, for example to swap a dependency.

### Tip
Keep one main alias (`@/`). Many aliases make code harder to navigate.
--- code
// tsconfig.json
// {
//   "compilerOptions": {
//     "paths": {
//       "@/*": ["./src/*"],
//       "@ui/*": ["./src/components/ui/*"]
//     }
//   }
// }

// src/app/page.tsx
import { db } from "@/lib/db";
import { Button } from "@ui/button";
import { formatPrice } from "@/lib/format";

export default async function Home() {
  const top = await db.product.findFirst();
  return (
    <main>
      <p>{top ? formatPrice(top.price) : "No products"}</p>
      <Button>Shop now</Button>
    </main>
  );
}

// vitest.config.mts
// import tsconfigPaths from "vite-tsconfig-paths";
// export default defineConfig({ plugins: [tsconfigPaths(), react()] });

=== n174 | M | What is the output option in next.config.js (standalone, export)?
**`output` controls what `next build` produces. The default emits a `.next` folder run with `next start`. `output: "standalone"` creates a minimal self-contained server in `.next/standalone` with only the needed `node_modules`, ideal for Docker. `output: "export"` writes a fully static site to `out/` that any static host can serve, without server features.**

### Default
`next build` then `next start` on a Node.js server; all features available.

### `"standalone"`
- Uses output file tracing to copy only the files and dependencies each route needs.
- Generates `.next/standalone/server.js`; run it with `node server.js`.
- Copy `public/` and `.next/static/` into the standalone folder yourself (or serve them from a CDN).
- Typical Docker images shrink from 1GB+ to around 100-200MB.
- In monorepos set `outputFileTracingRoot` to the repo root.
- Supports all server features: ISR, Cache Components, Server Functions, Proxy, image optimization.

### `"export"`
- Static HTML, CSS and JS in `out/`.
- Works: Server Components rendered at build time, static Route Handlers (`GET` without request data), client-side data fetching, `next/image` with a custom loader or `unoptimized`.
- Not supported: Server Functions, Proxy, cookies and headers, ISR and revalidation, dynamic routes without `generateStaticParams`, rewrites, redirects, headers config, default image optimization, and `dynamicParams: true`.
- Replaced the old `next export` command, removed in Next.js 14.

### Choosing
- Docker, Kubernetes, VMs: `standalone`.
- Static hosting, GitHub Pages, S3 + CloudFront, or embedding in another app: `export`.
- Vercel and other adapter-based platforms: default (they use the Adapters API, stable in 16.2).
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // or "export" for a static site
};
export default nextConfig;

// Dockerfile (standalone)
// FROM node:22-alpine AS build
// WORKDIR /app
// COPY . .
// RUN npm ci && npm run build
//
// FROM node:22-alpine
// WORKDIR /app
// ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
// COPY --from=build /app/.next/standalone ./
// COPY --from=build /app/.next/static ./.next/static
// COPY --from=build /app/public ./public
// EXPOSE 3000
// CMD ["node", "server.js"]

=== n175 | M | How does next export work and what are its limitations?
**The `next export` command was removed in Next.js 14. Static export is now done by setting `output: "export"` in `next.config.ts` and running `next build`, which writes plain HTML, CSS and JavaScript to `out/`. The result runs on any static host but has no Node.js server, so request-time features are unavailable.**

### How it works now
1. `output: "export"` in config.
2. `next build` prerenders every route to HTML plus the RSC payload files used for client navigation.
3. Dynamic routes must list every path in `generateStaticParams`.
4. Deploy `out/` to S3, Netlify, GitHub Pages, Nginx, or any CDN.

### What still works
- Server Components (rendered at build time).
- Client Components and client-side data fetching (SWR, TanStack Query).
- `<Link>` client navigation and prefetching.
- Route Handlers with static `GET` responses (generated as files, such as `feed.xml`).
- Metadata, sitemaps, robots, generated OG images.
- `next/image` with a custom `loader` or `images.unoptimized: true`.

### What does not
- Server Functions and form actions.
- Proxy (middleware), rewrites, redirects and custom headers from config (configure them on your host).
- `cookies()`, `headers()`, `searchParams` on the server.
- ISR, `revalidatePath`/`revalidateTag`, Draft Mode.
- Dynamic routes without `generateStaticParams`, `dynamicParams: true`.
- Default image optimization and internationalized routing config.

### Tips
- `trailingSlash: true` produces `/about/index.html`, which many static hosts need.
- `basePath` for hosting under a subpath (GitHub Pages project sites).
- Use a backend or serverless functions elsewhere for forms.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",       // replaces the removed `next export` command
  trailingSlash: true,    // out/about/index.html
  basePath: "/docs-site", // e.g. GitHub Pages project
  images: { unoptimized: true },
};
export default nextConfig;

// app/blog/[slug]/page.tsx - every path must be known at build time
// export const dynamicParams = false;
// export async function generateStaticParams() {
//   const posts = await getAllPosts();
//   return posts.map((p) => ({ slug: p.slug }));
// }

// package.json
// "build": "next build"   ->  static files in ./out
// "preview": "npx serve out"

=== n176 | E | What is the difference between next build and next dev?
**`next dev` starts a development server that compiles routes on demand, with hot module replacement, error overlays, DevTools and unminified code. `next build` creates an optimized production build: it compiles everything, prerenders static content, minifies, and writes output that `next start` (or a platform) serves.**

### `next dev`
- Turbopack by default (since Next.js 16), with a persistent disk cache, so restarts are fast.
- Compiles routes lazily as you visit them.
- Fast Refresh preserves component state on edits.
- Renders every request on demand: no prefetching, pages are not cached, so `cacheLife` timing and ISR are not observable.
- Dev-only checks: Cache Components validation insights, hydration diffs, Instant Navigation validation, Server Function logs.
- Outputs to `.next/dev` since Next.js 16, so dev and build can run at the same time.
- Flags: `--port`, `--hostname`, `--experimental-https`, `--inspect`, `--webpack`.

### `next build`
- Compiles all routes, type-checks TypeScript, and no longer runs ESLint (removed with `next lint` in 16).
- Prerenders static shells and `generateStaticParams` paths; fails on build errors such as blocking routes or `ensureStatic` violations.
- Minifies and mangles code, extracts CSS, optimizes chunks.
- Writes `.next` (or `standalone`/`out` depending on `output`).
- Next.js 16 removed per-route `size` and `First Load JS` columns from the output.
- Flags: `--debug`, `--profile`, `--analyze`, `--debug-prerender`, `--debug-build-paths`, `--webpack`.

### Then `next start`
Runs the production server. Always test performance, caching and prefetching with `next build && next start`, never with `next dev`.
--- code
// package.json
// {
//   "scripts": {
//     "dev": "next dev",                 // http://localhost:3000, HMR, overlays
//     "build": "next build",             // production build into .next
//     "start": "next start",             // serve the production build
//     "lint": "eslint .",                // next lint was removed in Next.js 16
//     "typecheck": "tsc --noEmit"
//   }
// }

// Typical local production check:
//   npm run build && npm run start
// Debug a failing prerender with readable stack traces:
//   next build --debug-prerender
// Build only some routes while debugging:
//   next build --debug-build-paths="app/blog/**"

=== n177 | M | How do you deploy Next.js on Vercel vs self-hosted?
**On Vercel, you connect a Git repository and every Next.js feature works with zero configuration: CDN for static shells, functions for request-time rendering, a shared data cache for ISR and `use cache: remote`, image optimization and preview deployments. Self-hosting runs `next start` (often in Docker with `output: "standalone"`) and also supports every feature, but you configure caching, CDN, scaling and image optimization yourself.**

### Vercel
- Builds per commit, with preview URLs per branch or PR.
- Static output on a global CDN; request-time work on Fluid compute functions.
- Built-in durable cache for ISR, tags and remote caching; on-demand revalidation propagates globally.
- Image optimization, analytics, Speed Insights, firewall.
- Skew protection between deployments.

### Self-hosting on Node.js
- `next build` then `next start`, or `node server.js` with standalone output, behind Nginx or a load balancer.
- **Caching:** by default ISR and `use cache` entries live on local disk and memory. With multiple instances, configure `cacheHandlers` (for `use cache`) and `cacheHandler` (for ISR and fetch) backed by Redis or similar, so instances share entries and revalidation.
- **Encryption key:** set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` so all instances accept the same Server Function IDs.
- **`deploymentId`** for version skew protection.
- **Images:** the optimizer needs `sharp` (auto-installed) and CPU; or use a custom loader and a CDN.
- **Streaming:** disable proxy buffering.
- **CDN:** put a CDN in front for `/_next/static` (immutable) and static shells.

### Other platforms
Netlify, Cloudflare (OpenNext), AWS (OpenNext, Amplify), Render and Railway use the **Adapters API** (stable in 16.2) or OpenNext to map Next.js output to their infrastructure.

### Static only
`output: "export"` to any static host, with the feature limits of static export.
--- code
// next.config.ts (self-hosted, multi-instance)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  cacheHandlers: {
    remote: require.resolve("./cache/redis-use-cache-handler.js"), // for "use cache: remote"
  },
  cacheHandler: require.resolve("./cache/redis-isr-handler.js"),   // ISR / fetch cache
  cacheMaxMemorySize: 0, // rely on the shared cache instead of per-instance memory
  deploymentId: process.env.GIT_SHA,
};

export default nextConfig;

// Environment for every instance
// NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<same base64 key everywhere>
// Nginx: proxy_buffering off;  (keep streaming working)

=== n178 | M | How do you configure custom server in Next.js?
**A custom server is your own Node.js HTTP server (plain `http`, Express, Fastify) that creates a Next.js app with `next({ dev })`, calls `app.prepare()`, and forwards requests to `app.getRequestHandler()`. Use it only when you need something Next.js cannot do, like attaching WebSockets to the same port, because it gives up some optimizations and platform support.**

### Setup
1. Create `server.ts` that imports `next` and `node:http`.
2. `const app = next({ dev, hostname, port })`, then `await app.prepare()`.
3. Handle your special routes first; pass everything else to `handle(req, res)`.
4. Change scripts: `"dev": "tsx server.ts"`, `"start": "NODE_ENV=production node dist/server.js"`.

### Trade-offs
- Cannot be deployed to Vercel and many serverless platforms.
- `output: "standalone"` does not trace your custom server file; you must make sure its dependencies are available.
- You own process management, graceful shutdown, logging and HTTP hardening.
- Code in `server.ts` is not compiled by Next.js; compile it with `tsc` or run it with `tsx`.

### Usually you do not need one
- Redirects, rewrites and headers: `next.config.ts` or `proxy.ts`.
- APIs and webhooks: Route Handlers.
- Background work after responses: `after()`.
- Startup code, tracing and monitoring: `instrumentation.ts` (`register()` runs once when the server starts).
- Real-time features: a separate WebSocket service, or a managed service (Pusher, Ably, Liveblocks, Supabase Realtime).

### When it is reasonable
Legacy Express apps adopting Next.js gradually, WebSockets on the same port, or unusual networking requirements on your own servers.
--- code
// server.ts
import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200).end("ok");
    return;
  }
  handle(req, res); // everything else goes to Next.js
});

// The usual reason for a custom server: WebSockets on the same port
const wss = new WebSocketServer({ noServer: true });
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") wss.handleUpgrade(req, socket, head, (ws) => ws.send("hello"));
});

server.listen(port, () => console.log(`> Ready on http://localhost:${port}`));

=== n179 | M | What is edge rendering and when should you use it?
**Edge rendering means running server code in data centers close to the user, typically on lightweight runtimes such as V8 isolates, to reduce latency. In Next.js it meant setting `runtime = "edge"` on routes. That option is deprecated now; the recommended way to get edge-like speed is to serve prerendered static shells from a CDN and stream the dynamic parts from Node.js functions near your data.**

### The original promise
- Low cold-start overhead and execution near the user.
- Good for simple personalization: geo, A/B tests, auth redirects.

### Why it fell out of favor
- **Data gravity:** most pages query a database in one region. Rendering far from it adds a round-trip per query, often making pages slower.
- **API limits:** no `fs`, no native modules, limited npm compatibility and code size.
- No ISR on the Edge runtime.
- Node.js cold starts improved significantly on modern platforms.

### What Next.js recommends in 16
- Remove `runtime = "edge"` from pages and Route Handlers (deprecated, and unsupported with Cache Components).
- Use **Partial Prerendering:** the static shell is served from the CDN edge instantly, which is the "edge" part users feel, and request-time parts stream from the origin.
- Use **`proxy.ts`** for request-time routing logic like geo redirects. Some platforms deploy it close to users.
- Use **`preferredRegion`** to run functions near your database.
- Cache aggressively with `"use cache"` and `cacheLife`.

### When edge compute still helps
Pure request rewriting, header manipulation, bot filtering and redirects that need no database. These belong in Proxy or your CDN's own edge features.
--- code
// Before: edge rendering per route (deprecated)
// export const runtime = "edge";

// Now: static shell from the CDN + streamed dynamic part from a region near the DB
// app/store/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

async function Catalog() {
  "use cache";
  cacheLife("hours");
  const items = await fetch("https://api.example.com/items").then((r) => r.json());
  return <ul>{items.map((i: { id: string; name: string }) => <li key={i.id}>{i.name}</li>)}</ul>;
}

async function Cart() {
  const id = (await cookies()).get("cart")?.value;
  const cart = await fetch(`https://api.example.com/cart/${id}`).then((r) => r.json());
  return <p>{cart.count} items</p>;
}

export default function Store() {
  return (
    <>
      <Catalog />
      <Suspense fallback={<p>Cart…</p>}><Cart /></Suspense>
    </>
  );
}

// next.config or segment: run functions near the database
// export const preferredRegion = "fra1";

=== n180 | M | How do you test Next.js applications?
**Use layers: unit tests for utilities, schemas and permission logic (Vitest or Jest), component tests for Client and synchronous Server Components (React Testing Library), and end-to-end tests with Playwright or Cypress for full user flows, including async Server Components, Server Functions, routing and caching. The Next.js docs recommend E2E for async Server Components because unit test runners do not fully support them.**

### Layers
1. **Unit:** pure functions such as formatters, Zod schemas, `can()` permission checks, reducers. Fast and many.
2. **Component:** render Client Components, simulate events, assert on accessible output. Mock `next/navigation` hooks.
3. **Integration:** Route Handlers called directly with a `Request`, Server Functions called as functions with a mocked database or a test database.
4. **E2E:** `next build && next start`, then a browser test runner covering sign-up, checkout, navigation and prefetching.

### Tooling choices
- **Vitest** with `@vitejs/plugin-react`, `jsdom` and `vite-tsconfig-paths`: fast, ESM-native, popular for new projects.
- **Jest** with `next/jest`, which loads `next.config`, env files and SWC transforms.
- **Playwright**: cross-browser E2E, tracing, `webServer` to start the app. `@next/playwright` adds an `instant()` helper (16.3) to assert what is visible during a navigation before dynamic data streams in.
- **Cypress**: E2E and component testing.
- **MSW** to mock network requests in tests.

### Tips
- Run E2E against a production build; dev behaves differently (no prefetching, no caching).
- Test Proxy logic with `unstable_doesMiddlewareMatch`, `isRewrite` and `getRewrittenUrl` from `next/experimental/testing/server`.
- Keep business logic out of components so most tests are cheap unit tests.
--- code
// vitest.config.mts
// import { defineConfig } from "vitest/config";
// import react from "@vitejs/plugin-react";
// import tsconfigPaths from "vite-tsconfig-paths";
// export default defineConfig({ plugins: [tsconfigPaths(), react()], test: { environment: "jsdom" } });

// lib/permissions.test.ts - unit
import { describe, it, expect } from "vitest";
import { can } from "./permissions";

describe("can()", () => {
  it("lets editors update only their own posts", () => {
    const editor = { id: "u1", role: "editor" as const };
    expect(can(editor, "post:update", { authorId: "u1" })).toBe(true);
    expect(can(editor, "post:update", { authorId: "u2" })).toBe(false);
  });

  it("only admins delete", () => {
    expect(can({ id: "a", role: "admin" }, "post:delete")).toBe(true);
    expect(can({ id: "e", role: "editor" }, "post:delete")).toBe(false);
  });
});

// e2e/checkout.spec.ts - Playwright against `next build && next start`
// test("checkout", async ({ page }) => { await page.goto("/"); await page.getByRole("link", { name: "Shop" }).click(); ... });

=== n181 | M | What is the recommended testing setup for Next.js (Jest + Testing Library)?
**Install Jest, `jest-environment-jsdom`, React Testing Library and `@testing-library/jest-dom`, then create `jest.config.ts` using `nextJest({ dir: "./" })` from `next/jest`. That preset configures SWC transforms, CSS and image mocks, `.env` loading, path aliases and `next.config` for you. Vitest is an equally supported, faster alternative.**

### Install
`npm i -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event ts-node @types/jest`

### What `next/jest` handles
- Transforms TS/JSX with Next.js's SWC compiler (no Babel config).
- Mocks CSS, CSS Modules, images and fonts.
- Loads `.env.test` and `next.config`.
- Ignores `node_modules` and `.next` from transforms.
- Respects `paths` from tsconfig when configured via `moduleNameMapper` or automatically in recent versions.

### Writing tests
- Query by role and label (`getByRole("button", { name: /save/i })`), not by class names.
- Use `user-event` for realistic interactions.
- Mock `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`).
- Server Functions imported by client components can be mocked with `jest.mock("./actions")`.

### Limits
Jest and Testing Library render synchronous components. **Async Server Components are not supported**; cover them with E2E tests, or test the data function separately and the presentational component with props.

### Vitest variant
`vitest`, `@vitejs/plugin-react`, `jsdom`, `vite-tsconfig-paths`, with the same Testing Library APIs. Next.js publishes an official guide and example for both.
--- code
// jest.config.ts
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" }); // loads next.config + .env files

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // import "@testing-library/jest-dom";
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

export default createJestConfig(config);

// src/components/counter.test.tsx
// import { render, screen } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";
// import { Counter } from "./counter";
// test("increments", async () => {
//   render(<Counter start={1} />);
//   await userEvent.click(screen.getByRole("button", { name: "1" }));
//   expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
// });

=== n182 | M | How do you mock useRouter in tests?
**For the App Router, mock the `next/navigation` module with `jest.mock` or `vi.mock` and return fake `useRouter`, `usePathname`, `useSearchParams` and `useParams` implementations, then assert that `push` or `replace` was called. For the Pages Router, mock `next/router` or use the `next-router-mock` package, which provides an in-memory router.**

### App Router (`next/navigation`)
- `useRouter` returns `{ push, replace, refresh, prefetch, back, forward }`; make each a mock function.
- `usePathname` returns a string; `useSearchParams` returns a `URLSearchParams` (it is read-only in real code, but a real instance works in tests).
- Keep the mock in a setup file or a helper so tests can override per case with `mockReturnValue`.

### Pages Router (`next/router`)
- `jest.mock("next/router", () => require("next-router-mock"))` gives a working router with `memoryRouter.setCurrentUrl("/path")`.
- Or mock `useRouter` to return `{ push: jest.fn(), query: {}, pathname: "/" }`.

### Testing `<Link>`
`next/link` renders an `<a>` and works in jsdom without mocks; assert on `href`. Clicking it triggers navigation through the router context, so for navigation assertions prefer testing your own `router.push` calls or use E2E.

### Avoid over-mocking
If a component's behavior depends heavily on routing, an E2E test with Playwright is often clearer and less brittle than mocking every hook.
--- code
// src/components/search-box.test.tsx (Vitest; swap vi for jest in Jest)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "./search-box";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () => new URLSearchParams("q=shoe"),
}));

describe("SearchBox", () => {
  beforeEach(() => replace.mockClear());

  it("updates the query string with replace", async () => {
    render(<SearchBox />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("shoe");

    await userEvent.type(input, "s");
    expect(replace).toHaveBeenLastCalledWith("/products?q=shoes", { scroll: false });
  });
});

=== n183 | M | How do you write end-to-end tests with Playwright or Cypress for Next.js?
**Build and start the app (`next build && next start`), point Playwright or Cypress at it, and script real user flows: visit pages, click links, fill forms, and assert on visible, accessible content and URLs. Playwright's `webServer` option can start the server automatically, which is the setup the Next.js docs show.**

### Playwright setup
1. `npm init playwright@latest`.
2. In `playwright.config.ts`, set `webServer: { command: "npm run build && npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }` and `use.baseURL`.
3. Write tests with locators such as `page.getByRole("link", { name: "Pricing" })`.
4. Run `npx playwright test`; use `--ui` and traces to debug.

### What to test end to end
- Critical journeys: sign-up, login, checkout, search.
- Async Server Components, Server Functions, redirects and auth guards, which unit tests cannot cover well.
- Streaming and loading states: Playwright auto-waits for elements.
- Instant navigations: `instant()` from `@next/playwright` (Next.js 16.3) holds back dynamic content so you can assert that the prefetched UI shows immediately after a click.

### Cypress
`npx cypress open`, set `baseUrl`, use `cy.visit`, `cy.findByRole` (Testing Library plugin), `cy.intercept` for network stubs. Cypress also supports component testing for Client Components.

### Good practices
- Test against a production build; dev mode has no prefetching and different caching.
- Seed a test database or mock external APIs at the network level (MSW, `page.route`).
- Use `storageState` to reuse an authenticated session across tests.
- Run in CI with sharding and keep traces and videos for failures.
--- code
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

// e2e/auth.spec.ts
// import { test, expect } from "@playwright/test";
// test("redirects anonymous users to login", async ({ page }) => {
//   await page.goto("/dashboard");
//   await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
//   await page.getByLabel("Email").fill("ada@example.com");
//   await page.getByLabel("Password").fill("correct horse battery");
//   await page.getByRole("button", { name: "Sign in" }).click();
//   await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
// });

=== n184 | H | How do you test Server Components?
**Synchronous Server Components can be rendered with React Testing Library like any component. Async Server Components are not fully supported by Jest or Vitest renderers, so the recommended approach is to test them end to end, and to unit test their pieces separately: the data functions, and presentational child components rendered with props.**

### Strategies
1. **Split data from presentation.** `async function Page()` fetches and passes data to `<ProductList products={...} />`. Unit test `ProductList` with props, and unit test `getProducts()` with a mocked database.
2. **Test data access functions directly.** They are plain async functions: call them with a test database or mocked client, and assert on results and authorization behavior.
3. **E2E with Playwright** for the real rendering, streaming, caching and Suspense behavior.
4. **Workaround for simple async components:** `render(await Page())` calls the component as a function and renders the returned JSX. It only works when no nested async components or server-only APIs are involved, so treat it as a limited trick.

### Mocking server APIs
- `cookies()` and `headers()` from `next/headers`: mock the module in unit tests.
- `"use cache"`, `cacheLife` and `cacheTag`: mock `next/cache` so they are no-ops outside a Next.js build.
- `server-only`: alias it to an empty module in the test config.

### What not to test in units
Caching and prerender behavior, Suspense streaming and RSC serialization. These are framework behaviors; verify them with E2E tests and `next build` validation instead.
--- code
// app/products/product-list.tsx - presentational, easy to test
export function ProductList({ products }: { products: { id: string; name: string }[] }) {
  if (products.length === 0) return <p>No products yet</p>;
  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}

// app/products/page.tsx - thin async wrapper, covered by E2E
// export default async function Page() {
//   const products = await getProducts();
//   return <ProductList products={products} />;
// }

// app/products/product-list.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

test("renders products", () => {
  render(<ProductList products={[{ id: "1", name: "Shoe" }]} />);
  expect(screen.getByRole("listitem")).toHaveTextContent("Shoe");
});

test("empty state", () => {
  render(<ProductList products={[]} />);
  expect(screen.getByText("No products yet")).toBeInTheDocument();
});

=== n185 | M | How do you test API routes in Next.js?
**App Router Route Handlers are plain functions that take a Web `Request` and return a `Response`, so you can import `GET` or `POST` in a unit test, call it with `new Request(...)` (or `new NextRequest(...)`), and assert on `response.status` and `await response.json()`. Mock the database and `next/headers` as needed, and add E2E or HTTP-level tests against a running server for full coverage.**

### Unit testing Route Handlers
- Build requests: `new NextRequest("http://localhost/api/posts?page=2", { method: "POST", body: JSON.stringify(data) })`.
- Pass the context: `{ params: Promise.resolve({ id: "1" }) }`, because `params` is a Promise.
- Mock external services (database client, email) with `vi.mock`.
- If the handler uses `cookies()` or `headers()`, mock `next/headers`.
- Run in the Node test environment, not jsdom.

### Pages Router API routes
Use `node-mocks-http` to create `req`/`res` objects, or `next-test-api-route-handler`, which runs the handler through Next.js's resolver.

### Proxy
`next/experimental/testing/server` exports `unstable_doesMiddlewareMatch` (matcher checks), `isRewrite` and `getRewrittenUrl` to assert Proxy behavior in unit tests.

### Integration and E2E
- Start the app and hit endpoints with Playwright's `request` fixture or `supertest`-style HTTP calls.
- Test auth (401/403), validation (400/422), and rate limiting (429) paths, not only success.

### Server Functions
Import them and call them directly with `FormData`, mocking `verifySession` and the database. Assert on returned state, and that `updateTag` or `redirect` were called (mock `next/cache` and `next/navigation`).
--- code
// app/api/posts/[id]/route.test.ts  (Vitest, environment: node)
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "1" ? { id: "1", title: "Hello" } : null
      ),
    },
  },
}));

import { GET } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/posts/[id]", () => {
  it("returns the post", async () => {
    const res = await GET(new NextRequest("http://localhost/api/posts/1"), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "1", title: "Hello" });
  });

  it("returns 404 for unknown ids", async () => {
    const res = await GET(new NextRequest("http://localhost/api/posts/9"), ctx("9"));
    expect(res.status).toBe(404);
  });
});

=== n186 | M | How do you debug a Next.js application?
**Debug server code with `next dev --inspect` (Next.js 16.1+) and Chrome DevTools or VS Code breakpoints, and client code with browser DevTools and React DevTools. Use the Next.js error overlay and DevTools panel, terminal logs (including Server Function logs since 16.2), `next build --debug-prerender` for build errors, and the MCP endpoint for AI coding agents.**

### Server-side
- **`next dev --inspect`** attaches the Node.js inspector to the process that runs your code (replacing the old `NODE_OPTIONS=--inspect` workaround). Open `chrome://inspect` or attach from VS Code.
- **`next start --inspect`** (16.2) debugs a production server.
- **VS Code launch configs** for server-side, client-side and full-stack debugging (documented in the Next.js debugging guide).
- **Logs:** `console.log` in Server Components prints in the terminal; in dev Next.js also forwards server logs to the browser console. Server Function calls are logged with name, arguments, duration and file.
- **`logging.fetches.fullUrl: true`** in `next.config` logs every `fetch` with cache hits and misses.

### Client-side
- Browser DevTools: Sources breakpoints, Network (filter `_rsc` for RSC requests), Performance.
- React DevTools: component tree, props, Profiler, Suspense and error boundary toggles.

### Next.js tooling
- **Error overlay** with source-mapped stacks, hydration diffs and `Error.cause` chains.
- **Next.js DevTools** (the indicator button): route info, Cache Components insights, Navigation Inspector to pause at the loading state.
- **`next build --debug-prerender`** for readable prerender errors; `--debug-build-paths` to build a subset.
- **`next info`** for bug reports.
- **MCP:** the dev server exposes `/_next/mcp` so coding agents can read errors, routes and logs.
--- code
// .vscode/launch.json
// {
//   "version": "0.2.0",
//   "configurations": [
//     {
//       "name": "Next.js: debug server",
//       "type": "node-terminal",
//       "request": "launch",
//       "command": "npx next dev --inspect"
//     },
//     {
//       "name": "Next.js: debug client",
//       "type": "chrome",
//       "request": "launch",
//       "url": "http://localhost:3000"
//     }
//   ]
// }

// next.config.ts - see fetch cache behavior in the terminal
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  logging: { fetches: { fullUrl: true } },
};
export default nextConfig;

// Useful commands
// next dev --inspect            server breakpoints
// next build --debug-prerender  readable prerender errors
// next info                     environment details for bug reports

=== n187 | E | What is the Next.js error overlay?
**The error overlay is the development-only panel Next.js shows over your app when something breaks: compile errors, runtime errors, unhandled promise rejections and hydration mismatches. It shows the message, a source-mapped code frame and the component stack, and lets you open the file in your editor.**

### What it shows
- **Build/compile errors** (syntax, missing imports) that block rendering.
- **Runtime errors** from Server and Client Components, with server errors forwarded to the browser.
- **Hydration errors** with a server versus client diff (`+ Client` / `- Server`, improved in 16.2).
- **`Error.cause` chains** up to five levels deep (16.2).
- **Cache Components insights:** blocking routes, random values or timestamps outside a cache, with fix cards linking to docs.
- Several errors at once, with arrows to step through them.

### The Next.js DevTools indicator
A small button in the corner opens the DevTools menu with route information (static or dynamic), the issues list, the Navigation Inspector, preferences and the option to hide the indicator. `devIndicators: false` in config hides the button; the overlay still appears for errors.

### Production
The overlay never appears in production. Users see your `error.tsx`, `global-error.tsx`, or the built-in error page (redesigned in 16.2). Server errors show a generic message plus a `digest` that matches server logs.

### Tips
- Click a stack frame to open it in your editor (set `REACT_EDITOR` or `EDITOR` if needed).
- If the overlay shows an error from a browser extension, test in a clean profile.
- Fix errors rather than suppressing them; the overlay usually points at the exact line.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move or hide the DevTools indicator; errors still open the overlay in dev
  devIndicators: { position: "bottom-right" },
  // devIndicators: false,
};

export default nextConfig;

// app/page.tsx - this throws in dev and opens the overlay with a code frame
// export default function Page() {
//   const user = undefined as unknown as { name: string };
//   return <h1>{user.name}</h1>; // TypeError: Cannot read properties of undefined
// }

// Open stack frames in your editor:
// REACT_EDITOR=code npm run dev

=== n188 | E | How do you use React DevTools with Next.js?
**Install the React Developer Tools browser extension, run the app (dev mode gives the most detail), and use the Components tab to inspect the tree, props, state and hooks, and the Profiler tab to record renders. Client Components are fully inspectable; Server Components appear in the tree with a "Server" badge and their props, but have no state.**

### Components tab
- Select an element on the page to find its component.
- Inspect and edit props, state and hook values live.
- See which components are Server Components (labelled) versus Client Components.
- Toggle **Suspense** boundaries to preview fallbacks, and force **error boundaries** to show `error.tsx` UI.
- Jump to source for a component.

### Profiler tab
- Record an interaction to see which components rendered, how long they took and why ("props changed", "hook 2 changed").
- Enable "Highlight updates when components render" to spot unnecessary re-renders.
- With the React Compiler (`reactCompiler: true`), components it memoized show a "Memo ✨" badge.

### Production profiling
Production builds strip most profiling hooks. Use `next build --profile` to create a build with profiling enabled.

### Related tools
- Next.js DevTools (in-page indicator) for route, cache and navigation insights.
- Chrome Performance panel with React's "Scheduler" and "Components" tracks (React 19.2) for timing.
- TanStack Query or Redux DevTools for client state libraries.
--- code
// Profile a production-like build
// next build --profile && next start

// Use <Profiler> programmatically for quick timing of a subtree
"use client";

import { Profiler, type ProfilerOnRenderCallback } from "react";

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > 16) console.warn(`[${id}] ${phase} took ${actualDuration.toFixed(1)}ms`);
};

export function ProfiledTable({ children }: { children: React.ReactNode }) {
  return (
    <Profiler id="OrdersTable" onRender={onRender}>
      {children}
    </Profiler>
  );
}

=== n189 | H | How do you analyze and fix slow build times in Next.js?
**Measure first (build logs show per-phase timings, plus `--experimental-cpu-prof` and Turbopack traces), then fix the slowest phase: enable and persist Turbopack's filesystem cache in CI, avoid prerendering more pages than needed, speed up data fetching during static generation, separate type checking, and trim heavy dependencies and plugins.**

### Measure
- `next build` prints timings for compilation, type checking, collecting page data and generating static pages (with the worker count, 16.1+).
- `next build --experimental-cpu-prof` writes CPU profiles to `.next-profiles/`.
- Turbopack tracing (see the local development guide) for compiler hot spots.
- `--debug-build-paths="app/blog/**"` builds a subset to iterate quickly.

### Common fixes
1. **Use Turbopack** (default in 16). A custom `webpack()` config forces `--webpack`; port it to `turbopack` options.
2. **Cache between CI runs:** persist `.next/cache`. Turbopack's filesystem cache for builds is on by default since 16.3 and made CI builds up to 5.5x faster in Vercel's measurements.
3. **Prerender fewer pages at build:** return only popular paths from `generateStaticParams` and let the rest generate on demand (ISR or App Shell).
4. **Faster data during prerender:** batch or cache CMS requests with `"use cache"`; slow APIs multiply across thousands of pages. Tune `staticGeneration` options (concurrency, retries).
5. **Type checking:** run `tsc` in a parallel CI job, or try TypeScript 7 (native, much faster) with `useTypeScriptCli` support (16.3).
6. **Linting** no longer runs in `next build` since 16; run ESLint or Biome separately.
7. **Babel and the React Compiler:** the Babel-based compiler slows builds; try `experimental.turbopackRustReactCompiler` (16.3+).
8. **Dependencies:** `optimizePackageImports` for barrel packages, `serverExternalPackages` for heavy server-only libraries.
9. **Monorepos:** Turborepo remote caching skips unchanged apps entirely.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Persistent Turbopack caches (defaults in recent 16.x, shown for clarity)
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    optimizePackageImports: ["@acme/icons"],
  },
  serverExternalPackages: ["@prisma/client", "sharp"],
};
export default nextConfig;

// app/blog/[slug]/page.tsx - prerender only the top pages at build time
// export async function generateStaticParams() {
//   const top = await getPosts({ orderBy: "views", take: 100 });
//   return top.map((p) => ({ slug: p.slug }));
// }

// CI (GitHub Actions) - keep the cache between runs
// - uses: actions/cache@v4
//   with: { path: .next/cache, key: next-${{ hashFiles('package-lock.json') }}-${{ github.sha }},
//           restore-keys: next-${{ hashFiles('package-lock.json') }}- }

=== n190 | M | How do you implement SEO in Next.js?
**Render content on the server (Server Components, prerendered static shells), define titles, descriptions, canonical URLs and Open Graph data with the Metadata API, generate `sitemap.xml` and `robots.txt` from code, add structured data (JSON-LD), use semantic HTML, and keep Core Web Vitals healthy with `next/image`, `next/font` and minimal client JavaScript.**

### Checklist
1. **Server-rendered HTML:** content in Server Components is in the initial HTML, so crawlers see it without running JavaScript.
2. **Metadata API:** `export const metadata` or `generateMetadata` in layouts and pages, with a `title.template` in the root layout.
3. **Canonical and alternates:** `alternates: { canonical, languages }` for duplicates and hreflang.
4. **Social cards:** `openGraph`, `twitter`, and generated images with `opengraph-image.tsx`.
5. **Sitemap and robots:** `app/sitemap.ts` and `app/robots.ts`; `generateSitemaps` for large sites.
6. **Structured data:** a `<script type="application/ld+json">` in the page (escape `<` characters).
7. **Status codes:** `notFound()` for 404s, `permanentRedirect()` for moved content, no soft 404s.
8. **Clean URLs:** descriptive slugs, `trailingSlash` consistency, no duplicate paths.
9. **Performance:** LCP, INP and CLS are ranking signals.
10. **Accessibility and semantics:** headings in order, `alt` text, `lang` on `<html>`.

### Streaming metadata
Since 15.2, `generateMetadata` can stream after the shell for normal browsers. Next.js detects bots that need metadata in `<head>` (configurable with `htmlLimitedBots`) and renders it before streaming.

### Pages Router
`next/head` for tags, and `getStaticProps` for prerendered content.
--- code
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/posts";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: "article", publishedTime: post.publishedAt, authors: [post.author] },
  };
}

export default async function Post({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, datePublished: post.publishedAt };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1>{post.title}</h1>
    </article>
  );
}

=== n191 | E | What is the Metadata API in the App Router?
**The Metadata API defines `<head>` tags from layouts and pages, either statically with `export const metadata: Metadata = {...}` or dynamically with `export async function generateMetadata()`. Next.js merges metadata from the root down to the page and renders the tags for you. File conventions such as `icon.png`, `opengraph-image.tsx`, `sitemap.ts` and `robots.ts` cover the rest.**

### Static and dynamic
- **`metadata` object:** for values known in advance.
- **`generateMetadata({ params, searchParams }, parent)`:** for values from data; can read and extend the parent metadata. `fetch` calls are memoized, so the page can request the same data without duplication.
- Only in Server Components (layouts and pages), not in Client Components.

### Common fields
`title` (string or `{ default, template, absolute }`), `description`, `metadataBase` (resolves relative URLs), `alternates` (canonical, languages), `openGraph`, `twitter`, `robots`, `icons`, `manifest`, `verification`, `keywords`, `authors`, `other`.

### Viewport is separate
`themeColor`, `colorScheme` and `viewport` moved to `export const viewport` or `generateViewport` in Next.js 14.

### Merging rules
Metadata is shallowly merged from root to page. Nested objects such as `openGraph` are **replaced**, not deep-merged, so spread shared values from a common object if needed.

### File-based metadata
- `favicon.ico`, `icon.(png|svg)`, `apple-icon.png`: multiple formats in one folder emit multiple `<link>` tags (16.2).
- `opengraph-image.(png|tsx)`, `twitter-image`: static files or generated with `ImageResponse`.
- `sitemap.ts`, `robots.ts`, `manifest.ts`.

### With Cache Components
Uncached data or runtime APIs in `generateMetadata` follow the same rules as pages: cache it or let it stream.
--- code
// app/layout.tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://acme.dev"),
  title: { default: "Acme", template: "%s | Acme" },
  description: "Tools for modern teams",
  openGraph: { siteName: "Acme", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", creator: "@acme" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

// app/pricing/page.tsx
// export const metadata: Metadata = { title: "Pricing" }; // -> "Pricing | Acme"

=== n192 | M | How do you generate dynamic metadata (Open Graph, Twitter cards)?
**Export `generateMetadata` from the page to return data-driven `title`, `description`, `openGraph` and `twitter` fields, and add an `opengraph-image.tsx` (and optionally `twitter-image.tsx`) file in the route segment that returns an `ImageResponse`. Next.js generates the image per URL and adds the right `og:image` and `twitter:image` tags automatically.**

### Dynamic text metadata
`generateMetadata({ params })` awaits `params`, loads the record and returns fields. Share the data call with the page through `fetch` memoization or a cached function.

### Generated images
- `app/blog/[slug]/opengraph-image.tsx` exports a default function returning `new ImageResponse(<jsx/>, { width: 1200, height: 630 })` from `next/og`.
- Export `alt`, `size` and `contentType` for the meta tags.
- Since Next.js 16 the image function receives `params` as a **Promise**.
- `ImageResponse` uses Satori: flexbox layout and a subset of CSS. Next.js 16.2 made it 2x to 20x faster, expanded CSS and SVG support, and changed the default font to Geist Sans.
- Load custom fonts with `readFile` (Node.js) and pass them in `fonts`.
- Images are generated at build time when possible and cached.

### Multiple images per page
`generateImageMetadata` returns several image variants; the image function then receives `id` as a Promise in Next.js 16.

### Testing
Share links in platform validators (LinkedIn Post Inspector, Facebook Sharing Debugger) or use an OG preview tool. Ensure `metadataBase` is set so image URLs are absolute.
--- code
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";

export const alt = "Blog post cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // a Promise since Next.js 16
  const post = await getPost(slug);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#0b1020", color: "white" }}>
        <div style={{ fontSize: 28, opacity: 0.7 }}>acme.dev/blog</div>
        <div style={{ fontSize: 64, fontWeight: 700 }}>{post?.title ?? "Acme Blog"}</div>
      </div>
    ),
    size
  );
}

// app/blog/[slug]/page.tsx
// export async function generateMetadata({ params }) {
//   const { slug } = await params; const post = await getPost(slug);
//   return { title: post.title, description: post.excerpt,
//            twitter: { card: "summary_large_image" } }; // og:image added from opengraph-image.tsx
// }

=== n193 | M | What is generateStaticParams and how does it replace getStaticPaths?
**`generateStaticParams` is an App Router function exported from a dynamic route's page or layout that returns the param values to prerender at build time, for example `[{ slug: "a" }, { slug: "b" }]`. It replaces `getStaticPaths`, with simpler return values, support at multiple nesting levels, and deduplicated `fetch` calls with the page.**

### Differences from `getStaticPaths`
| | `getStaticPaths` | `generateStaticParams` |
|---|---|---|
| Return | `{ paths: [{ params }], fallback }` | array of param objects |
| Unknown paths | `fallback: false/true/"blocking"` | `dynamicParams` (previous model) or App Shell + background generation (Cache Components) |
| Nested segments | one function per page | each level can generate its own params, and children receive parent params |
| Data | separate call | `fetch` memoized with the page |

### Behavior
- Runs at build time, before the layouts and pages for those params are rendered.
- In dev, it runs on navigation to check params (and its time shows in dev request timings since 16.1).
- Return `[]` to prerender nothing at build and generate on demand (in the previous model this needs `dynamic = 'force-static'` for ISR-like behavior; with Cache Components it serves the App Shell).

### With Cache Components
- Must return **at least one** param set; an empty array fails validation, because Next.js needs to verify the route renders.
- `dynamicParams` is not supported; unknown params serve the App Shell and are generated in the background.
- With `ensureStatic = 'navigation'` every dynamic param must be covered.

### Nested routes
For `/shop/[category]/[item]`, the category layout returns categories and the item page returns items for the category it receives as `params`.
--- code
// app/shop/[category]/layout.tsx
export async function generateStaticParams() {
  const categories = await fetch("https://api.example.com/categories").then((r) => r.json());
  return categories.map((c: { slug: string }) => ({ category: c.slug }));
}

// app/shop/[category]/[item]/page.tsx
export async function generateStaticParams({ params }: { params: { category: string } }) {
  // Called once per category generated by the parent
  const items = await fetch(`https://api.example.com/categories/${params.category}/items?top=20`).then((r) => r.json());
  return items.map((i: { slug: string }) => ({ item: i.slug }));
}

export default async function Item({ params }: PageProps<"/shop/[category]/[item]">) {
  const { category, item } = await params;
  return <h1>{category} / {item}</h1>;
}

// Pages Router equivalent:
// export const getStaticPaths = async () => ({ paths: [{ params: { category: "shoes", item: "runner" } }], fallback: "blocking" });

=== n194 | E | How do you implement a sitemap in Next.js?
**Create `app/sitemap.ts` that default-exports a function returning an array of `{ url, lastModified, changeFrequency, priority }` entries (type `MetadataRoute.Sitemap`). Next.js serves it as `/sitemap.xml`. For large sites, `generateSitemaps` splits it into multiple files, and a static `app/sitemap.xml` file also works.**

### Basics
- The function can be async and fetch from your CMS or database.
- It is a special Route Handler, cached by default unless it uses request-time APIs.
- Fields: `url` (absolute), `lastModified`, `changeFrequency`, `priority`, `alternates.languages` (hreflang), `images` and `videos`.

### Large sites
- Google limits a sitemap to 50,000 URLs.
- Export `generateSitemaps()` returning `[{ id: 0 }, { id: 1 }, ...]`. Each produces `/sitemap/0.xml`, `/sitemap/1.xml`.
- Since Next.js 16, the sitemap function receives `id` as a **Promise**: `const id = Number(await props.id)`.
- Reference the generated sitemaps from `robots.ts` or a sitemap index.

### Freshness
With Cache Components, put the data fetching in a `"use cache"` helper with `cacheLife("days")` and a tag, and revalidate the tag when content is published.

### Tips
- Include only canonical, indexable URLs that return 200.
- Keep `lastModified` accurate; search engines largely ignore `priority` and `changeFrequency`.
- Point to it from `robots.txt` and submit it in Google Search Console.
--- code
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

const BASE = "https://acme.dev";

async function getPosts() {
  "use cache";
  cacheLife("days");
  cacheTag("posts");
  return fetch("https://cms.example.com/posts?fields=slug,updatedAt").then((r) => r.json()) as Promise<
    { slug: string; updatedAt: string }[]
  >;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, changeFrequency: "monthly" },
    ...posts.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      alternates: { languages: { fr: `${BASE}/fr/blog/${p.slug}` } },
    })),
  ];
}

// Large sites:
// export async function generateSitemaps() { return [{ id: 0 }, { id: 1 }]; }
// export default async function sitemap(props: { id: Promise<string> }) { const id = Number(await props.id); ... }

=== n195 | E | How do you implement a robots.txt in Next.js?
**Add a static `app/robots.txt` file, or create `app/robots.ts` that returns a `MetadataRoute.Robots` object with `rules`, `sitemap` and optionally `host`. Next.js serves it at `/robots.txt`. The code version lets you vary rules by environment, for example blocking all crawlers on staging.**

### Fields
- **`rules`**: one object or an array, each with `userAgent`, `allow`, `disallow` and optional `crawlDelay`.
- **`sitemap`**: one or more absolute sitemap URLs.
- **`host`**: preferred host (used by some search engines).

### Common rules
- Disallow private or duplicate areas: `/api/`, `/admin/`, `/search?` result pages, `/_next/` is not needed (assets are fine to crawl).
- Block AI training crawlers if you choose, by naming their user agents (`GPTBot`, `CCBot`, `Google-Extended`).
- Staging and preview: `disallow: "/"` for all agents, plus an `X-Robots-Tag: noindex` header for safety.

### Important limits
- `robots.txt` controls **crawling**, not indexing. To keep a page out of search results, use `robots: { index: false }` in metadata (a `noindex` meta tag) and let crawlers see it.
- It is public; never list secret URLs in it.

### Pages Router
Put a static `public/robots.txt`, or generate one with a rewrite to an API route.
--- code
// app/robots.ts
import type { MetadataRoute } from "next";

const BASE = "https://acme.dev";
const isProduction = process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } }; // keep staging out of search
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/account/"] },
      { userAgent: ["GPTBot", "CCBot"], disallow: "/" },
    ],
    sitemap: [`${BASE}/sitemap.xml`],
    host: BASE,
  };
}

// Output at /robots.txt:
// User-Agent: *
// Allow: /
// Disallow: /api/
// ...
// Sitemap: https://acme.dev/sitemap.xml

=== n196 | M | What are the key differences between Next.js 13, 14, and 15?
**Next.js 13 introduced the App Router with React Server Components. 14 stabilized Server Actions and focused on speed. 15 moved to React 19, made request APIs async and stopped caching `fetch` by default. Next.js 16 (October 2025) made Turbopack the default, introduced Cache Components with `"use cache"`, renamed middleware to Proxy, and has continued through 16.4 (October 2026).**

### Next.js 13 (2022)
- App Router (`app/`) in beta, stable in 13.4: layouts, Server Components, streaming, `loading` and `error` files.
- `next/font`, new `next/image`, `<Link>` without a child `<a>`.
- Turbopack alpha, Route Handlers, Metadata API.

### Next.js 14 (2023)
- Server Actions stable.
- Partial Prerendering preview (experimental).
- Faster local dev with Turbopack improvements; `next export` command removed in favor of `output: "export"`.
- Minimum Node.js 18.17.

### Next.js 15 (2024)
- React 19 support; `useFormState` becomes `useActionState`.
- **Async request APIs:** `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` return Promises.
- **Caching defaults flipped:** `fetch`, `GET` Route Handlers and the client router cache for pages are not cached by default.
- `next dev --turbo` stable, `after()` (stable in 15.1), `forbidden()`/`unauthorized()` (experimental), `next.config.ts`, `<Form>` component, typed routes, Node.js middleware (15.5), `next typegen`.

### Next.js 16 (2025 to 2026)
- **Turbopack default** for dev and build; filesystem cache.
- **Cache Components:** `cacheComponents: true`, `"use cache"`, `cacheLife`, `cacheTag`, `updateTag`, `refresh()`; PPR via this model; `revalidateTag(tag, profile)`.
- **`proxy.ts`** replaces `middleware.ts` (Node.js runtime).
- Sync request API access removed; parallel routes need `default.js`; `next lint`, AMP and runtime config removed; Node.js 20.9+.
- React Compiler support stable; React 19.2 features (View Transitions, `useEffectEvent`, `<Activity>`).
- **16.1:** dev filesystem cache stable, bundle analyzer, `next dev --inspect`.
- **16.2:** Adapters API stable, faster dev startup and rendering, `transitionTypes` on `<Link>`.
- **16.3:** Instant Navigations, Partial Prefetching, `catchError`, `next/root-params`, faster builds.
- **16.4:** Cache Components on by default for new apps, `ensureStatic`, `prefetch()`/`navigation()`. The team says Cache Components will become the default in Next.js 17.
--- code
// Next.js 14: synchronous params, fetch cached by default
// export default function Page({ params }: { params: { slug: string } }) {
//   const data = await fetch(url); // cached (force-cache) by default
// }

// Next.js 15: async params, fetch NOT cached by default
// export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
//   const { slug } = await params;
//   const data = await fetch(url, { cache: "force-cache" }); // opt in explicitly
// }

// Next.js 16: Cache Components + "use cache"
import { cacheLife, cacheTag } from "next/cache";

async function getPost(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`post:${slug}`);
  return fetch(`https://cms.example.com/posts/${slug}`).then((r) => r.json());
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <h1>{post.title}</h1>;
}
// middleware.ts -> proxy.ts, `next dev --turbopack` -> just `next dev`

=== n197 | H | How do you migrate from the Pages Router to the App Router?
**Migrate incrementally: both routers work in the same app, so upgrade Next.js first, create a root `app/layout.tsx` that replaces `_app` and `_document`, then move routes one at a time from `pages/` to `app/`, converting data fetching to Server Components, `next/router` to `next/navigation`, and API routes to Route Handlers or Server Functions as you go.**

### Step by step
1. **Upgrade** to the latest Next.js and React (`npx @next/codemod@canary upgrade latest`, or `next upgrade`), and fix breaking changes (async request APIs, `proxy.ts`, image defaults).
2. **Root layout:** create `app/layout.tsx` with `<html>` and `<body>`, global CSS, fonts and providers from `_app` and `_document`. Put providers in a `"use client"` file.
3. **Move one route:** copy `pages/about.tsx` to `app/about/page.tsx`. Routes in `app/` take priority; delete the `pages/` version once it works.
4. **Data fetching:**
   - `getStaticProps` becomes an async Server Component with `"use cache"` + `cacheLife` (or `fetch` with caching options).
   - `getServerSideProps` becomes a Server Component reading `cookies()`/`headers()` inside `<Suspense>`.
   - `getStaticPaths` becomes `generateStaticParams`.
5. **Client logic:** mark interactive components with `"use client"`. Replace `useRouter` from `next/router` with `useRouter`, `usePathname` and `useSearchParams` from `next/navigation`; `router.query` becomes `useParams` and `useSearchParams`; router events become effects on pathname changes.
6. **Head tags:** `next/head` becomes the Metadata API.
7. **Errors and 404:** `pages/404.tsx` and `_error` become `not-found.tsx`, `error.tsx` and `global-error.tsx`.
8. **APIs:** `pages/api` routes can stay. Move them to `route.ts` when convenient; form posts can become Server Functions.
9. **Adopt Cache Components** last, once routes are on the App Router.

### Pitfalls
- Navigating between `pages/` and `app/` routes is a full page load.
- CSS-in-JS needs a registry.
- Libraries using `next/router` need App Router versions.
--- code
// BEFORE: pages/products/[id].tsx
// export const getStaticPaths = async () => ({ paths: [], fallback: "blocking" });
// export const getStaticProps = async ({ params }) => {
//   const product = await getProduct(params.id);
//   return { props: { product }, revalidate: 3600 };
// };
// export default function Product({ product }) {
//   const router = useRouter(); // next/router
//   return <><Head><title>{product.name}</title></Head><h1>{product.name}</h1></>;
// }

// AFTER: app/products/[id]/page.tsx
import type { Metadata } from "next";
import { cacheLife } from "next/cache";

async function getProduct(id: string) {
  "use cache";
  cacheLife("hours"); // replaces revalidate: 3600
  return fetch(`https://api.example.com/products/${id}`).then((r) => r.json());
}

export async function generateStaticParams() {
  return [{ id: "1" }]; // replaces getStaticPaths
}

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getProduct(id)).name }; // replaces next/head
}

export default async function Product({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  return <h1>{product.name}</h1>;
}

=== n198 | M | What are common pitfalls when using the App Router?
**The most common mistakes are client boundaries placed too high, misunderstanding caching (old defaults, per-user data in shared caches), request-time reads at the top of layouts, relying on Proxy or layouts for authorization, waterfalls from sequential awaits, hydration mismatches, and outdated APIs such as synchronous `params`, `middleware.ts` or one-argument `revalidateTag`.**

### Rendering and boundaries
- **`"use client"` in layouts or pages** turns everything below into client code. Keep boundaries at the leaves and use the children pattern.
- **Importing server-only modules into client code.** Guard with `import "server-only"`.
- **Passing non-serializable props** (functions, class instances) to Client Components.

### Data and caching
- **Assuming `fetch` is cached.** It has not been since Next.js 15. With Cache Components, nothing is cached without `"use cache"`.
- **Caching per-user data under a shared key**, leaking data between users. Pass user IDs as arguments or use `"use cache: private"`.
- **Waterfalls:** sequential `await`s in one component; start requests in parallel or split into Suspense boundaries.
- **`cookies()` at the top of the root layout**, making the whole app request-time.
- **`useSearchParams` without `<Suspense>`**, breaking static rendering.
- **Mutating outside Server Functions** without `router.refresh()`, then wondering why the UI is stale.

### Security
- **Proxy-only auth** and **layout-only auth checks**. Authorize in the data layer and in every Server Function.
- **Returning whole database rows** to the client.

### Routing
- **Parallel routes without `default.tsx`** (build fails in 16).
- **`redirect()` inside `try/catch`** swallowing the redirect.
- **Using `next/router`** in the App Router.

### Outdated patterns to update
Synchronous `params`/`cookies()`, `middleware.ts`, `useFormState`, `priority` on images, `images.domains`, `experimental.ppr`, `unstable_noStore`, `export const runtime = "edge"`, and `next lint`.
--- code
// Pitfall: waterfall + whole-app dynamic + client boundary too high
// "use client";                                   // makes the entire layout client code
// export default async function Layout({ children }) {
//   const user = await getUser((await cookies()).get("s")); // request-time at the root
//   const posts = await getPosts();                // waits for getUser first
//   const stats = await getStats();                // waits for getPosts
// }

// Better
import { Suspense } from "react";
import { UserMenu } from "./user-menu"; // reads cookies, streams

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          Acme
          <Suspense fallback={<span>…</span>}>
            <UserMenu />
          </Suspense>
        </header>
        {children}
      </body>
    </html>
  );
}

// In pages: start independent requests together
// const [posts, stats] = await Promise.all([getPosts(), getStats()]);

=== n199 | M | How does Next.js compare to Remix, Nuxt, or Astro?
**Next.js is a full-stack React framework centered on Server Components, streaming and an explicit caching model, with the largest ecosystem and first-class Vercel support. Remix has merged into React Router v7 (framework mode), which favors web standards and loaders and actions. Nuxt is the Vue equivalent of Next.js. Astro is content-first, shipping zero JavaScript by default with "islands" of interactivity from any UI framework.**

### Next.js
- **Strengths:** React Server Components, Partial Prerendering, `"use cache"`, Server Functions, image and font optimization, Turbopack, a huge ecosystem, many deployment adapters.
- **Trade-offs:** more concepts to learn (server/client boundaries, caching, prefetching), and features evolve quickly.
- **Best for:** large React apps, e-commerce, SaaS dashboards, content plus app hybrids.

### React Router v7 (formerly Remix)
- Remix 2 features became React Router v7's framework mode in late 2024; the Remix team is pursuing a separate new direction for "Remix 3".
- Route `loader`/`action` functions, nested routes, progressive enhancement, Web Fetch APIs, Vite-based.
- Simpler mental model with less framework-level caching; you rely on HTTP caching headers.
- **Best for:** apps that want standards-based data loading and easy migration from React Router SPAs.

### Nuxt
- Vue framework with file routing, SSR/SSG/ISR-style hybrid rendering per route, auto-imports, Nitro server engine (deploys almost anywhere), and a large module ecosystem. Nuxt 4 shipped in 2025.
- **Best for:** teams using Vue.

### Astro
- Static-first and content-focused: zero client JavaScript by default, interactive islands with React, Vue, Svelte or Solid, content collections, server islands for dynamic parts.
- **Best for:** blogs, docs, marketing sites where interactivity is limited.

### Others worth naming
SvelteKit (Svelte), TanStack Start (React, type-safe routing and server functions), and Vite-based SPAs for apps that do not need SSR.

### How to answer
Pick by team skills, interactivity level, data needs and hosting, not popularity alone.
--- code
// Same "load data, render, mutate" idea in each framework

// Next.js (App Router)
// export default async function Page() {
//   const posts = await getPosts();            // Server Component
//   return <PostList posts={posts} />;
// }
// "use server"; export async function addPost(fd: FormData) { ... }

// React Router v7 (formerly Remix)
// export async function loader() { return { posts: await getPosts() }; }
// export async function action({ request }) { const fd = await request.formData(); ... }
// export default function Route({ loaderData }) { return <PostList posts={loaderData.posts} />; }

// Nuxt (Vue)
// <script setup> const { data: posts } = await useFetch("/api/posts"); </script>

// Astro
// ---
// const posts = await getPosts();
// ---
// <PostList posts={posts} />   <!-- static HTML -->
// <LikeButton client:visible /> <!-- interactive island -->

export const frameworks = ["Next.js", "React Router v7", "Nuxt", "Astro"] as const;
