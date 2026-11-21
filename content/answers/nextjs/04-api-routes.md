=== n81 | E | How do you create an API route in Next.js (Pages Router)?
**Create a file under `pages/api/`, such as `pages/api/hello.ts`, and export a default function `(req, res) => {}`. It becomes the endpoint `/api/hello`, runs only on the server, and is never bundled for the browser.**

### The handler
- `req` is a Node.js `IncomingMessage` extended with `req.query`, `req.cookies` and a parsed `req.body`.
- `res` is a `ServerResponse` with helpers: `res.status(200)`, `res.json(data)`, `res.send()`, `res.redirect()`, `res.setHeader()`, and `res.revalidate(path)` for on-demand ISR.
- Dynamic routes work the same way as pages: `pages/api/users/[id].ts` gives `req.query.id`.

### Config per route
Export `config` to change behavior:
- `api.bodyParser: false` to handle the raw stream (webhooks with signature checks, file uploads).
- `api.bodyParser.sizeLimit: '2mb'` to raise the default 1MB limit.
- `api.responseLimit` to warn about large responses.
- `maxDuration` on supported hosts.

### Good practice
- Check `req.method` and return 405 for unsupported methods.
- Validate input and return useful status codes.
- Do not call your own API routes from `getServerSideProps` or `getStaticProps`; call the underlying function directly to avoid an extra network hop.

### App Router equivalent
Route Handlers in `app/api/.../route.ts` use the Web `Request`/`Response` APIs and export one function per HTTP method. API routes in `pages/api` keep working in Next.js 16 and can coexist with the App Router.
--- code
// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

type User = { id: string; name: string };
type Error = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<User | Error>) {
  const { id } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await db.user.findUnique({ where: { id: String(id) } });
  if (!user) return res.status(404).json({ error: "Not found" });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({ id: user.id, name: user.name });
}

// export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

=== n82 | E | What HTTP methods are supported in API routes?
**Route Handlers in the App Router support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` and `OPTIONS`, each as a named export. Unsupported methods get `405 Method Not Allowed` automatically. Pages Router API routes receive every method in one handler and you branch on `req.method`.**

### App Router (`route.ts`)
- Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` or `OPTIONS` as async functions.
- If you do not export `OPTIONS`, Next.js implements it automatically and sets the `Allow` header from the methods you exported.
- Only `GET` can be prerendered or cached. Other methods always run per request.

### Method semantics to mention in interviews
- **GET:** read, safe and idempotent; can be cached.
- **POST:** create or trigger an action; not idempotent.
- **PUT:** replace a resource; idempotent.
- **PATCH:** partial update.
- **DELETE:** remove; idempotent.
- **HEAD:** like GET without a body (check existence or size).
- **OPTIONS:** CORS preflight and capability discovery.

### Pages Router (`pages/api`)
Any method reaches your default export. Use a `switch (req.method)` and return 405 with an `Allow` header for the rest.

### Server Functions vs methods
Server Functions (`"use server"`) are always invoked with POST, regardless of what they do. For a public REST API consumed by other clients, use Route Handlers.
--- code
// app/api/posts/[id]/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/posts/[id]">) {
  const { id } = await ctx.params;
  const post = await db.post.findUnique({ where: { id } });
  return post ? Response.json(post) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/posts/[id]">) {
  const { id } = await ctx.params;
  const data = await req.json();
  const post = await db.post.update({ where: { id }, data: { title: data.title } });
  return Response.json(post);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/posts/[id]">) {
  const { id } = await ctx.params;
  await db.post.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
// PUT/POST not exported -> 405 automatically; OPTIONS answered with Allow: GET, PATCH, DELETE

=== n83 | E | How do you handle different HTTP methods in a single API route?
**In the App Router, export one function per method from the same `route.ts` file: `export async function GET()`, `export async function POST()`, and so on. In the Pages Router, write one default handler and branch on `req.method`.**

### App Router benefits
- Each method is a separate, typed function; there is no manual `switch`.
- Methods you do not export get an automatic 405.
- `OPTIONS` is implemented for you unless you export your own.
- You can share helpers (auth, validation) between methods in the same file.

### Pages Router pattern
- `switch (req.method)` with a case per method.
- `default`: set the `Allow` header and return 405.
- Keep each branch small by calling service functions.

### Shared concerns
- **Authentication:** call a `requireUser()` helper at the top of each method that needs it.
- **Validation:** parse the body with Zod per method.
- **Errors:** wrap logic in `try/catch` and return consistent JSON errors.

### Tip
A REST resource often needs a collection route (`/api/posts` with GET and POST) and an item route (`/api/posts/[id]` with GET, PATCH and DELETE). Keep them as two files rather than parsing IDs from a single route.
--- code
// app/api/posts/route.ts - collection: GET list, POST create
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const NewPost = z.object({ title: z.string().min(1), body: z.string() });

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const posts = await db.post.findMany({ skip: (page - 1) * 20, take: 20 });
  return Response.json(posts);
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = NewPost.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const post = await db.post.create({ data: { ...parsed.data, authorId: user.id } });
  return Response.json(post, { status: 201 });
}

// Pages Router equivalent:
// switch (req.method) { case "GET": ...; case "POST": ...; default: res.setHeader("Allow", "GET, POST"); res.status(405).end(); }

=== n84 | E | How do you create API routes in the App Router (Route Handlers)?
**Create a `route.ts` file inside `app/`, for example `app/api/users/route.ts`, and export functions named after HTTP methods. Each receives a Web `Request` (or `NextRequest`) and returns a `Response`. The URL follows the folder path.**

### Basics
- Signature: `export async function GET(request: NextRequest, ctx: RouteContext<'/api/users/[id]'>)`.
- `ctx.params` is a Promise with dynamic segments.
- Return `Response.json(data, { status })`, `new Response(body, init)` or `NextResponse` helpers.
- Use standard Web APIs: `request.json()`, `request.formData()`, `request.text()`, `Headers`, streams.
- Read cookies and headers with `request.cookies` / `request.headers` or `cookies()` / `headers()` from `next/headers`.

### Rules
- A `route.ts` cannot sit in the same segment as a `page.tsx`.
- Route Handlers do not use layouts and render no React UI.
- They run on the Node.js runtime. `export const runtime = 'edge'` is deprecated, and with Cache Components the `runtime` export must be removed.

### Caching
- **Without Cache Components:** handlers are not cached by default; opt `GET` in with `export const dynamic = 'force-static'` or `revalidate`.
- **With Cache Components:** `GET` follows the same model as pages. A handler that reads no request data or uncached I/O is prerendered at build time. To cache data inside a handler, call a helper marked `"use cache"`; the directive cannot go directly in the handler body.

### When to use them
Webhooks, public APIs for mobile or third parties, file downloads, OAuth callbacks, streaming responses and generated files. For mutations from your own UI, Server Functions are usually simpler.
--- code
// app/api/users/[id]/route.ts
import { NextRequest } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

async function getUser(id: string) {
  "use cache"; // directive lives in a helper, not in the handler body
  cacheLife("minutes");
  cacheTag(`user:${id}`);
  return db.user.findUnique({ where: { id }, select: { id: true, name: true } });
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser(id);
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(user);
}

// app/api/health/route.ts - no request data: prerendered at build with Cache Components
// export function GET() { return Response.json({ ok: true, version: process.env.APP_VERSION }); }

=== n85 | E | What is the route.js file in the App Router?
**`route.js` (or `route.ts`) is the App Router file convention for Route Handlers: server-side HTTP endpoints. Its exported functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) handle requests to the folder's URL and return Web `Response` objects.**

### Where it fits
- `app/api/orders/route.ts` serves `/api/orders`.
- It can live anywhere in `app/`, not just under `api/`, such as `app/feed.xml/route.ts` for an RSS feed or `app/auth/callback/route.ts` for OAuth.
- It cannot coexist with `page.tsx` in the same folder, because both would claim the URL.

### Parameters
1. **`request`**: a `NextRequest` with `nextUrl`, `cookies`, `headers` and body methods.
2. **`context`**: `{ params: Promise<...> }`. Type it with the generated `RouteContext<'/api/orders/[id]'>`.

### Segment config it supports
`dynamic`, `revalidate`, `fetchCache` (previous model only), `dynamicParams`, `preferredRegion` and `maxDuration`. With Cache Components, `GET` handlers are prerendered when possible, and request-dependent parts run at request time.

### Special generated routes
Metadata files like `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` and `manifest.ts` are specialized Route Handlers that Next.js recognizes by name.

### vs Server Functions
Use `route.ts` when an external client calls the endpoint, when you need control over HTTP (status codes, headers, streaming, non-JSON bodies), or for GET requests. Use Server Functions for form submissions and mutations from your own React UI.
--- code
// app/feed.xml/route.ts - an RSS feed served at /feed.xml
import { cacheLife } from "next/cache";
import { getPosts } from "@/lib/posts";

async function buildFeed() {
  "use cache";
  cacheLife("hours");
  const posts = await getPosts();
  const items = posts
    .map((p) => `<item><title>${p.title}</title><link>https://acme.dev/blog/${p.slug}</link></item>`)
    .join("");
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Acme</title>${items}</channel></rss>`;
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

=== n86 | E | How do you read request body in Route Handlers?
**Call the Web `Request` body methods: `await request.json()` for JSON, `await request.formData()` for forms and file uploads, `await request.text()` for raw text (webhook signatures), `await request.arrayBuffer()` or `request.blob()` for binary, or read `request.body` as a stream. A body can be read only once.**

### Choosing the method
| Content-Type | Method |
|---|---|
| `application/json` | `request.json()` |
| `multipart/form-data`, `application/x-www-form-urlencoded` | `request.formData()` |
| Webhooks that verify a signature | `request.text()` (raw string) |
| Binary uploads | `request.arrayBuffer()` / `blob()` |
| Large or streaming uploads | `request.body` (ReadableStream) |

### Rules and pitfalls
- The body is a stream: calling `json()` after `text()` throws "body used already". Use `request.clone()` if you must read it twice.
- `request.json()` throws on invalid JSON; wrap it in `try/catch` and return 400.
- Always validate the parsed data (Zod); never trust its shape.
- There is no automatic body size limit in Route Handlers like Pages Router's 1MB `bodyParser`; enforce limits yourself (check `Content-Length` or count bytes while streaming), and remember your host may cap request size.
- `GET` and `HEAD` requests have no body; use search params instead.

### Pages Router comparison
`req.body` is pre-parsed by `bodyParser`. Disable it (`config.api.bodyParser = false`) to get the raw stream for signatures.
--- code
// app/api/contact/route.ts
import { z } from "zod";

const Contact = z.object({
  email: z.string().email(),
  message: z.string().min(10).max(5000),
});

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";

  let input: unknown;
  try {
    input = type.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData()); // works for HTML forms too
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = Contact.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  // await sendEmail(parsed.data);
  return Response.json({ ok: true }, { status: 201 });
}

=== n87 | E | How do you return JSON from a Route Handler?
**Return `Response.json(data, init)` (standard Web API) or `NextResponse.json(data, init)`. Both serialize the value, set `Content-Type: application/json`, and accept a `status` and `headers` in the second argument.**

### Examples of init options
- `{ status: 201 }` for created resources.
- `{ status: 404 }` with an error body.
- `{ headers: { "Cache-Control": "public, s-maxage=60" } }` to let a CDN cache it.

### `Response.json` vs `NextResponse.json`
They produce the same JSON response. `NextResponse` adds convenience APIs such as `response.cookies.set()`, and helpers like `NextResponse.redirect()` and `NextResponse.rewrite()` (the latter mainly in Proxy). Use `Response.json` when you need nothing extra; it keeps handlers portable.

### Good practices
- Use a consistent error shape, for example `{ error: { code, message } }`.
- Return proper status codes: 200, 201, 204 (no body), 400, 401, 403, 404, 409, 422, 429, 500.
- Do not leak stack traces or database errors in responses; log them on the server.
- Values like `BigInt` and `Map` are not JSON-serializable. Convert them first, or `JSON.stringify` throws.
- For `204 No Content` use `new Response(null, { status: 204 })`, since a JSON body is not allowed.
--- code
// app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: `Product ${id} not found` } },
      { status: 404 }
    );
  }

  const res = NextResponse.json(
    { id: product.id, name: product.name, price: Number(product.price) },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } }
  );
  res.cookies.set("last_viewed", id, { path: "/", maxAge: 3600 });
  return res;
}

=== n88 | M | How do you handle cookies in Route Handlers?
**Read cookies with `request.cookies.get(name)` on a `NextRequest`, or with `(await cookies()).get(name)` from `next/headers`. Set or delete them with `(await cookies()).set()` / `.delete()`, or on a `NextResponse` with `response.cookies.set()`.**

### Reading
- `request.cookies.get("session")?.value`
- `request.cookies.getAll()`, `request.cookies.has("session")`
- `const store = await cookies(); store.get("theme")`. `cookies()` is async since Next.js 15 and synchronous access was removed in 16.

### Writing
- `const store = await cookies(); store.set("session", token, options)`.
- `store.delete("session")` or `store.set("session", "", { maxAge: 0 })`.
- Or build a response: `const res = NextResponse.json(data); res.cookies.set(...)`.

### Secure cookie options
- `httpOnly: true` so JavaScript cannot read session cookies (XSS protection).
- `secure: true` so they are only sent over HTTPS.
- `sameSite: "lax"` (default and recommended) or `"strict"`; `"none"` requires `secure` and is only for cross-site use.
- `path: "/"`, plus `maxAge` or `expires`.
- Consider the `__Host-` prefix for session cookies (requires `secure`, `path=/`, no domain).

### Where cookies can be set
Route Handlers, Server Functions and Proxy. **Not** in Server Components during render, because headers are already being streamed. Reading cookies in a page makes that part request-time.

### Effect on caching
Reading cookies in a `GET` handler means it cannot be prerendered. With Cache Components, cookies cannot be read inside `"use cache"`; read them outside and pass values as arguments.
--- code
// app/api/session/route.ts
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createSession, getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("__Host-session")?.value;
  const user = token ? await getSessionUser(token) : null;
  return Response.json({ user });
}

export async function POST(request: NextRequest) {
  const { userId } = await request.json(); // after verifying credentials
  const token = await createSession(userId);

  (await cookies()).set("__Host-session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete("__Host-session");
  return new Response(null, { status: 204 });
}

=== n89 | M | How do you handle headers in Route Handlers?
**Read incoming headers with `request.headers.get(name)` or `(await headers()).get(name)` from `next/headers` (read-only). Set outgoing headers by passing a `headers` object to `new Response()`/`Response.json()`, or by calling `response.headers.set()` before returning.**

### Reading
- `request.headers.get("authorization")`
- `(await headers()).get("user-agent")`: async since Next.js 15. The returned `Headers` is read-only.
- Useful values: `authorization`, `content-type`, `accept-language`, `x-forwarded-for` (client IP behind a proxy), and host-provided geo headers.

### Writing
- `Response.json(data, { headers: { "Cache-Control": "no-store" } })`.
- `const res = NextResponse.json(data); res.headers.set("X-Request-Id", id)`.
- Multiple values: `headers.append("Set-Cookie", ...)`; prefer the cookies API for cookies.

### Common response headers
- **Caching:** `Cache-Control` (`public, s-maxage=60, stale-while-revalidate=300`, or `private, no-store`).
- **CORS:** `Access-Control-Allow-Origin`, `-Methods`, `-Headers`.
- **Downloads:** `Content-Disposition: attachment; filename="report.csv"`.
- **Security:** `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.
- **Rate limiting:** `Retry-After`, `X-RateLimit-Remaining`.

### Tips
- Site-wide headers belong in `headers()` in `next.config.ts` or in `proxy.ts`, not repeated in every handler.
- Reading headers makes the handler request-time, so it cannot be prerendered.
- Do not trust `x-forwarded-for` unless your host sets it; it can be spoofed by clients.
--- code
// app/api/report/route.ts
import { headers } from "next/headers";
import { buildCsv } from "@/lib/reports";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REPORT_TOKEN}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const lang = (await headers()).get("accept-language")?.split(",")[0] ?? "en";
  const csv = await buildCsv({ lang });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="report.csv"',
      "Cache-Control": "private, no-store",
      "X-Report-Lang": lang,
    },
  });
}

=== n90 | M | What is the NextRequest and NextResponse API?
**`NextRequest` and `NextResponse` from `next/server` extend the Web `Request` and `Response` classes with Next.js conveniences: parsed URL access (`nextUrl`), a cookies API, and response helpers such as `redirect`, `rewrite`, `next` and `json`. They are used in Route Handlers and especially in `proxy.ts`.**

### NextRequest
- **`request.nextUrl`**: an extended `URL` with `pathname`, `searchParams`, `basePath` and (Pages Router i18n) `locale`. Clone and modify it to build redirect targets.
- **`request.cookies`**: `get`, `getAll`, `set`, `delete`, `has`, `clear`.
- Everything from `Request`: `headers`, `method`, `json()`, `formData()`, `text()`.

### NextResponse
- **`NextResponse.json(body, init)`**: a JSON response.
- **`NextResponse.redirect(url, status?)`**: 307 by default; must be an absolute URL (`new URL("/login", request.url)`).
- **`NextResponse.rewrite(url)`**: serve a different route while keeping the browser URL. Used in Proxy.
- **`NextResponse.next(init)`**: continue routing from Proxy, optionally with modified request headers via `{ request: { headers } }`.
- **`response.cookies.set/delete`**: set cookies on the outgoing response.

### Related helpers
- `userAgent(request)` from `next/server` parses device, browser and bot info.
- `NextFetchEvent.waitUntil()` (second argument in Proxy) keeps work running after the response.
- `NextProxy` type for typing the proxy function.

### When to use plain Request/Response
In Route Handlers, plain Web types are enough unless you need `nextUrl` or the cookies helpers. Plain types keep code portable to other runtimes.

### Pitfall
`NextResponse.next({ headers })` sets **response** headers visible to the client; to pass data upstream, set `NextResponse.next({ request: { headers } })`.
--- code
// proxy.ts
import { NextResponse, userAgent } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Redirect: absolute URL built from the request
  if (pathname === "/old-pricing") {
    return NextResponse.redirect(new URL("/pricing", request.url), 308);
  }

  // Rewrite mobile users to a different page, URL stays the same
  if (userAgent(request).device.type === "mobile" && pathname === "/") {
    return NextResponse.rewrite(new URL("/mobile", request.url));
  }

  // Continue, passing data upstream through a request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-campaign", searchParams.get("utm_campaign") ?? "none");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("seen", "1", { path: "/" });
  return response;
}

=== n91 | E | How do you create dynamic API routes?
**Use bracketed folder names, just like pages: `app/api/users/[id]/route.ts` handles `/api/users/123`. The value arrives in the second argument's `params`, which is a Promise you must await: `const { id } = await ctx.params`.**

### Variants
- `app/api/users/[id]/route.ts`: one segment.
- `app/api/files/[...path]/route.ts`: catch-all, `path` is a string array.
- `app/api/docs/[[...slug]]/route.ts`: optional catch-all.
- Nested: `app/api/orgs/[orgId]/members/[memberId]/route.ts`.

### Typing
Use the generated `RouteContext<'/api/users/[id]'>` helper (from `next typegen`, also run by `next dev` and `next build`). It types `params` correctly, including arrays for catch-alls.

### Static generation
With Cache Components, a `GET` handler for a dynamic route can export `generateStaticParams` to prerender known values, just like a page.

### Validation
Params are user input. Validate format (UUID, number, slug) before using them in queries, and never build file paths from them without sanitizing.

### Pages Router
`pages/api/users/[id].ts` and read `req.query.id`, which can be `string | string[]`.
--- code
// app/api/orgs/[orgId]/members/[memberId]/route.ts
import { z } from "zod";
import { db } from "@/lib/db";

const Params = z.object({ orgId: z.string().uuid(), memberId: z.string().uuid() });

export async function GET(_req: Request, ctx: RouteContext<"/api/orgs/[orgId]/members/[memberId]">) {
  const parsed = Params.safeParse(await ctx.params);
  if (!parsed.success) return Response.json({ error: "Invalid id" }, { status: 400 });

  const { orgId, memberId } = parsed.data;
  const member = await db.member.findFirst({ where: { id: memberId, orgId } });

  return member
    ? Response.json(member)
    : Response.json({ error: "Not found" }, { status: 404 });
}

// app/api/files/[...path]/route.ts
// const { path } = await ctx.params; // ["images", "2026", "logo.png"]

=== n92 | M | How do you protect API routes with authentication?
**Verify the user inside every Route Handler (or Server Function) before doing any work: read the session cookie or `Authorization` header, validate it, check permissions for the specific resource, and return 401 or 403 on failure. Proxy can do optimistic redirects, but it must not be the only check.**

### Steps in a handler
1. **Authenticate:** get the session token from a cookie or a Bearer token, then verify it (signature and expiry for a JWT, a lookup for database sessions).
2. **Authorize:** check the user's role or ownership of the resource (`post.authorId === user.id`).
3. **Validate input**, then perform the operation.
4. **Return minimal data.**

### Centralize the logic
Create a Data Access Layer (`lib/dal.ts`) with `verifySession()` and permission helpers, marked `import "server-only"` and wrapped in `React.cache` so repeated calls in one request are cheap. Call it from handlers, Server Functions and Server Components.

### Where Proxy fits
`proxy.ts` can read the session cookie and redirect anonymous users away from `/dashboard` or reject `/api/admin/*` early. But matchers are easy to misconfigure, and a refactor can move a route outside the matcher. The docs explicitly say to verify auth inside each Server Function and handler rather than relying on Proxy alone.

### Other protections
- **API keys** for machine clients, compared in constant time.
- **Webhook signatures** (HMAC) for third-party callbacks.
- **Rate limiting** on login and expensive endpoints.
- **CORS** to restrict which browser origins can call the API; CORS is not authentication.
--- code
// lib/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

export const verifySession = cache(async () => {
  const token = (await cookies()).get("session")?.value;
  const session = token ? await decrypt(token) : null; // verifies signature + expiry
  return session?.userId ? { userId: session.userId as string, role: session.role as string } : null;
});

// app/api/projects/[id]/route.ts
import { db } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const session = await verifySession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== session.userId && session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.project.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

=== n93 | M | What is CORS and how do you configure it in Next.js?
**CORS (Cross-Origin Resource Sharing) is the browser mechanism that decides whether JavaScript on one origin may read responses from another origin. The server opts in with `Access-Control-Allow-*` headers. In Next.js you set them in a Route Handler (including an `OPTIONS` handler for preflights), in `proxy.ts`, or with `headers()` in `next.config.ts`.**

### How it works
- **Simple requests** (GET/POST with basic headers) are sent; the browser blocks reading the response unless `Access-Control-Allow-Origin` matches.
- **Preflighted requests** (custom headers like `Authorization`, JSON `Content-Type`, PUT/DELETE) first send `OPTIONS`. The server must answer with allowed origin, methods and headers.
- **Credentials** (cookies) require `Access-Control-Allow-Credentials: true` and an explicit origin, never `*`.

### Options in Next.js
1. **Per Route Handler:** add headers to responses and export `OPTIONS`.
2. **`proxy.ts`:** one place for all `/api/*` routes, checking the `Origin` against an allowlist and answering preflights.
3. **`next.config.ts` `headers()`:** static headers for a path pattern. Simple, but it cannot vary by origin.

### Security notes
- CORS only restricts browsers. It does not protect an API from curl or servers; you still need authentication.
- Reflecting any `Origin` back with credentials enabled is a vulnerability. Use an allowlist.
- Add `Vary: Origin` when the header changes per origin, so caches do not mix responses.
- Same-origin calls (your own Next.js frontend) do not need CORS at all.
--- code
// app/api/public/data/route.ts
const ALLOWED = new Set(["https://app.acme.com", "https://partner.example.com"]);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: Request) {
  const data = { items: [1, 2, 3] };
  return Response.json(data, { headers: corsHeaders(request.headers.get("origin")) });
}

=== n94 | M | How do you handle file uploads in Next.js?
**For small files, send `multipart/form-data` to a Server Function or Route Handler and read the `File` from `formData()`, then store it in object storage. For large files, upload directly from the browser to storage (S3, R2, Vercel Blob) using a presigned URL that your server issues, so the file never passes through your Next.js server.**

### Small uploads through the server
1. A `<form>` with `<input type="file" name="avatar">` and `action={uploadAction}` (Server Function), or `fetch` to a Route Handler with a `FormData` body.
2. On the server: `const file = formData.get("avatar") as File`.
3. Validate size and type (`file.size`, `file.type`, and ideally the magic bytes).
4. Read `await file.arrayBuffer()` or stream `file.stream()` to storage.

Server Functions have a 1MB body limit by default; raise it with `serverActions.bodySizeLimit` in `next.config.ts`. Hosting platforms also cap request bodies (for example around 4.5MB on Vercel Functions).

### Large uploads: presigned URLs
1. The client asks a Route Handler for an upload URL (after auth).
2. The server creates a short-lived presigned PUT URL, restricted by key, type and size.
3. The browser uploads directly to storage and shows progress.
4. The client tells the server the upload finished, and the server records it.

### Do not
- Write uploads to the local disk or `public/` on serverless hosts. The file system is ephemeral and `public/` is only read at build time.
- Trust the file name or extension; generate your own keys.
- Serve uploaded HTML or SVG from your main domain without sanitizing (XSS risk).
--- code
// app/profile/actions.ts
"use server";

import { put } from "@vercel/blob"; // or S3/R2 SDK
import { updateTag } from "next/cache";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db";

const MAX = 2 * 1024 * 1024; // 2MB (set serverActions.bodySizeLimit: "3mb")
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadAvatar(_prev: { error?: string }, formData: FormData) {
  const session = await verifySession();
  if (!session) return { error: "Please sign in" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file" };
  if (file.size > MAX) return { error: "Max 2MB" };
  if (!TYPES.includes(file.type)) return { error: "PNG, JPEG or WebP only" };

  const blob = await put(`avatars/${session.userId}-${crypto.randomUUID()}`, file, { access: "public" });
  await db.user.update({ where: { id: session.userId }, data: { avatarUrl: blob.url } });
  updateTag(`user:${session.userId}`);
  return {};
}

=== n95 | H | How do you stream responses from API routes?
**Return a `Response` whose body is a `ReadableStream`. Next.js sends chunks to the client as you enqueue them, which is how you stream AI tokens, large exports or Server-Sent Events from a Route Handler. On the client, read `response.body` with a reader or use `EventSource` for SSE.**

### Building a stream
- Create `new ReadableStream({ async start(controller) { ... } })` and call `controller.enqueue(encoder.encode(chunk))`, then `controller.close()`.
- Or pass an existing stream through, such as an LLM SDK stream or a `fetch` response body.
- Async generators can be converted with `ReadableStream.from()` (Node.js 20+).
- Use `TransformStream` to modify chunks on the way.

### Server-Sent Events
Set `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform` and `Connection: keep-alive`, then write `data: ...\n\n` lines. Browsers reconnect automatically with `EventSource`.

### Handling disconnects
Listen to `request.signal` (an `AbortSignal`) and stop work when the client goes away, to avoid paying for unused computation.

### Platform considerations
- Streaming must not be buffered by a reverse proxy (`X-Accel-Buffering: no` for nginx).
- Serverless functions have a maximum duration; set `export const maxDuration = 60` where supported.
- Do not use `"use cache"` or prerendering for streaming handlers; they are request-time by nature.

### Alternatives
For streaming UI rather than raw data, use React Server Components with `<Suspense>`. For AI chat, the Vercel AI SDK wraps streaming in hooks like `useChat`.
--- code
// app/api/progress/route.ts - Server-Sent Events
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let pct = 0; pct <= 100; pct += 20) {
        if (request.signal.aborted) break; // client disconnected
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ pct })}\n\n`));
        await new Promise((r) => setTimeout(r, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Client:
// const es = new EventSource("/api/progress");
// es.onmessage = (e) => setPct(JSON.parse(e.data).pct);

=== n96 | M | What are Edge API Routes?
**Edge API Routes are API endpoints that run on the Edge Runtime, a lightweight V8-isolate environment with Web APIs only, by exporting `runtime = 'edge'`. They promised fast cold starts close to users, but in current Next.js the Edge Runtime is deprecated for routes: the docs say to remove the `runtime` export and use the default Node.js runtime.**

### How they worked
- Pages Router: `export const config = { runtime: 'edge' }` in `pages/api/*`.
- App Router: `export const runtime = 'edge'` in `route.ts`.
- Handlers used Web `Request`/`Response`; no `fs`, no native modules, no `require`, limited bundle size.

### Why they fell out of favor
- Many npm packages (database drivers, auth libraries, image tools) depend on Node.js APIs.
- Edge functions far from the database added latency for every query, wiping out the cold-start gain.
- No ISR on the Edge runtime, smaller code size limits and harder debugging.
- Hosting platforms improved Node.js cold starts (for example Vercel's Fluid compute), narrowing the gap.

### Current guidance (Next.js 16)
- `runtime = 'edge'` is **deprecated** for pages, layouts and Route Handlers.
- Cache Components does not support the `runtime` export at all.
- `proxy.ts` (formerly middleware) runs on Node.js and cannot be configured. The deprecated `middleware.ts` still supports the Edge runtime for apps that need it.
- For "edge" behavior such as geo redirects, use Proxy, CDN caching of prerendered output, or your platform's region settings (`preferredRegion`).

### Interview framing
Explain what the Edge runtime is, its trade-offs, and that today the default answer is the Node.js runtime with good caching.
--- code
// Legacy: app/api/geo/route.ts (deprecated pattern)
// export const runtime = "edge";
// export function GET(request: Request) {
//   return Response.json({ country: request.headers.get("x-vercel-ip-country") });
// }

// Current: same handler on the default Node.js runtime (no runtime export)
export function GET(request: Request) {
  return Response.json({
    country: request.headers.get("x-vercel-ip-country") ?? "unknown",
  });
}

// If you need low latency near the data, pin the region instead:
// export const preferredRegion = "iad1";

// Edge-style request logic belongs in proxy.ts:
// export function proxy(req: NextRequest) { /* geo redirect */ }

=== n97 | M | What is the difference between Node.js and Edge runtime?
**The Node.js runtime is a full Node.js environment with every Node API and npm package; it is the default and recommended runtime for all Next.js code. The Edge runtime is a restricted, Web-standard environment (V8 isolates) with faster cold starts but no file system, no native modules and smaller size limits. It is deprecated for routes in current Next.js.**

### Node.js runtime
- Full API surface: `fs`, `crypto`, `net`, streams, native addons.
- Works with any npm package, ORMs and database drivers.
- Supports ISR, `"use cache"`, Cache Components, `after()` and all features.
- `proxy.ts` always runs on Node.js since Next.js 16.

### Edge runtime
- Web APIs only: `fetch`, `Request`, `Response`, Web Crypto, streams, `URL`, `TextEncoder`, plus `AsyncLocalStorage`.
- No `fs`, no `require`, no `eval` or `new Function`, no native modules.
- Very fast startup and low memory, can run in many regions.
- No ISR; code size is limited (a few MB depending on the host).
- Status: deprecated as a route segment option; still available for the deprecated `middleware.ts`.

### Choosing today
- Default to **Node.js** for pages, Route Handlers and Proxy.
- If latency matters, prerender into the static shell (served by the CDN) and stream the dynamic parts, and run functions near the database.
- Use the Edge runtime only for legacy middleware that relies on it, and plan to migrate.

### Interview point
Latency is usually dominated by data access, not cold starts. Running compute at the edge but querying a database in one region can make things slower.
--- code
// app/api/hash/route.ts - Node.js runtime (default)
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function GET() {
  const file = await readFile(process.cwd() + "/package.json"); // fs: Node.js only
  const sha = createHash("sha256").update(file).digest("hex");
  return Response.json({ sha });
}

// Web-standard code runs on both runtimes:
// const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hi"));

// Legacy Edge route (deprecated):
// export const runtime = "edge";

=== n98 | M | How do you add middleware to API routes?
**Use `proxy.ts` (formerly `middleware.ts`) with a `matcher` for `/api/:path*` to run shared logic, such as CORS, rate limiting or request IDs, before every API request. For logic that needs the handler's context, write wrapper functions (higher-order handlers) around your Route Handlers.**

### Option 1: Proxy
- One `proxy.ts` at the project root (or in `src/`).
- `export const config = { matcher: ["/api/:path*"] }`.
- Can rewrite, redirect, add headers, return a response early (401, 429), or pass data upstream with request headers.
- Runs on Node.js since Next.js 16, but should stay fast: avoid slow database calls. `fetch` caching does not work in Proxy.

### Option 2: Handler wrappers
Compose functions like `withAuth(withValidation(schema, handler))`. Each wrapper receives the request and context, does its check, and either returns an error response or calls the inner handler. This keeps authorization next to the code that needs it, which is safer than Proxy alone.

### Option 3: Shared helpers
Plain helper calls at the top of each handler (`const user = await requireUser()`) are explicit and easy to test.

### Pages Router
`pages/api` routes are also covered by Proxy. Libraries like `next-connect` add Express-style middleware chains to API routes.

### What not to do
Do not rely only on Proxy for authorization. A matcher typo or a moved route silently removes protection. Always check permissions in the handler too.
--- code
// lib/with-auth.ts - higher-order Route Handler
import { verifySession } from "@/lib/dal";

type Handler<C> = (req: Request, ctx: C, user: { userId: string }) => Promise<Response>;

export function withAuth<C>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const user = await verifySession();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return handler(req, ctx, user);
  };
}

// app/api/me/route.ts
export const GET = withAuth(async (_req, _ctx, user) => Response.json({ id: user.userId }));

// proxy.ts - cross-cutting concerns for all API routes
// export function proxy(req: NextRequest) {
//   const res = NextResponse.next();
//   res.headers.set("x-request-id", crypto.randomUUID());
//   return res;
// }
// export const config = { matcher: ["/api/:path*"] };

=== n99 | H | How do you rate-limit API routes in Next.js?
**Count requests per key (IP, user ID or API key) in a shared store such as Redis, and reject requests over the limit with `429 Too Many Requests` and a `Retry-After` header. Apply it in `proxy.ts` for broad protection or inside specific Route Handlers and Server Functions for sensitive actions like login.**

### Why a shared store
In-memory counters do not work on serverless or multi-instance deployments: each instance has its own memory and instances come and go. Use Redis (Upstash, Valkey), a database, or your platform's firewall rules.

### Algorithms
- **Fixed window:** N requests per minute; simple but bursty at window edges.
- **Sliding window:** smoother; the most common choice.
- **Token bucket:** allows short bursts while limiting the average rate.

### Choosing the key
- Authenticated users: user ID or API key (fairer than IP).
- Anonymous: client IP from a trusted header your host sets, such as `x-forwarded-for` from your platform. Behind your own proxy, make sure clients cannot spoof it.
- Combine with the route: `login:${ip}` gets a stricter limit than `search:${ip}`.

### Where to apply
- **Proxy:** cheap global limits for `/api/*`; one Redis call per request.
- **Inside handlers or Server Functions:** strict limits on login, signup, password reset, AI or email endpoints, where you also know the user.
- **Platform WAF:** Vercel Firewall, Cloudflare or AWS WAF rules stop abuse before your code runs.

### Response
Return 429 with `Retry-After`, and optionally `RateLimit-Limit`/`RateLimit-Remaining` headers so well-behaved clients can back off.
--- code
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const loginLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 attempts per minute
  prefix: "rl:login",
});

// app/api/login/route.ts
import { headers } from "next/headers";

export async function POST(request: Request) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const { success, reset, remaining } = await loginLimiter.limit(ip);

  if (!success) {
    return Response.json(
      { error: "Too many attempts, try again soon" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) } }
    );
  }

  // ...verify credentials
  return Response.json({ ok: true }, { headers: { "RateLimit-Remaining": String(remaining) } });
}

=== n100 | M | How do you handle errors in API routes?
**Wrap handler logic in `try/catch`, map known failures (validation, not found, conflicts, auth) to the right status codes with a consistent JSON error shape, log unexpected errors on the server, and return a generic 500 without leaking internals. Use `onRequestError` in `instrumentation.ts` to report unhandled errors centrally.**

### Status codes
- **400** malformed input (bad JSON), **422** valid JSON that fails validation.
- **401** not authenticated, **403** authenticated but not allowed.
- **404** resource missing, **405** wrong method (automatic in Route Handlers).
- **409** conflict (duplicate email), **429** rate limited.
- **500** unexpected server error, **502/503/504** upstream or availability problems.

### Patterns
- **Custom error classes:** `class HttpError extends Error { status }`, thrown from services and converted once in a wrapper.
- **Wrapper function:** `withErrors(handler)` catches everything, converts `HttpError` and `ZodError`, and logs the rest.
- **Consistent shape:** `{ error: { code: "NOT_FOUND", message: "..." } }`, so clients can handle errors generically.
- **Correlation ID:** include a request ID in the response and logs.

### What not to do
- Return `error.message` from database or library errors to the client; it can expose SQL, paths or secrets.
- Return 200 with `{ success: false }`; status codes matter for caches, monitoring and clients.
- Swallow errors silently.

### Observability
`instrumentation.ts` can export `onRequestError(err, request, context)`, called for errors in Route Handlers, Server Components, Server Functions and Proxy. Forward them to Sentry, Datadog or OpenTelemetry.
--- code
// lib/http.ts
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function withErrors<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return Response.json({ error: { code: "VALIDATION", issues: err.issues } }, { status: 422 });
      }
      const id = crypto.randomUUID();
      console.error(`[${id}]`, err); // full details stay on the server
      return Response.json({ error: { code: "INTERNAL", message: "Something went wrong", id } }, { status: 500 });
    }
  };
}

// app/api/orders/[id]/route.ts
// export const GET = withErrors(async (_req, ctx: RouteContext<"/api/orders/[id]">) => {
//   const order = await db.order.findUnique({ where: { id: (await ctx.params).id } });
//   if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found");
//   return Response.json(order);
// });

=== n101 | E | What is middleware in Next.js?
**Middleware is code that runs before a request is completed, letting you redirect, rewrite, set headers or cookies, or return a response early. In Next.js 16 it was renamed to Proxy: the file is `proxy.ts` and the exported function is `proxy`. The functionality is the same, and `middleware.ts` still works but is deprecated.**

### What it is good for
- Redirects based on request data: locale detection, old URLs, logged-out users.
- Rewrites for A/B tests, multi-tenant subdomains or feature flags.
- Adding headers: security headers, CSP nonces, request IDs.
- Optimistic auth checks: redirect to `/login` if there is no session cookie.
- Bot or geo handling.

### What it is not for
- Slow data fetching or full session management. Proxy runs on many requests and should be fast.
- The only line of authorization; check permissions in pages, handlers and Server Functions too.
- Caching: `"use cache"`, `"use server"` and `fetch` caching options have no effect in Proxy.

### Why the rename
"Middleware" suggested Express-style middleware chains. "Proxy" better describes its role: a network boundary in front of the app that can redirect, rewrite and respond.

### Migration
Run `npx @next/codemod@canary middleware-to-proxy .`, or rename the file and the function. Config flags were renamed too, such as `skipMiddlewareUrlNormalize` to `skipProxyUrlNormalize`. Proxy runs on Node.js only; keep `middleware.ts` if you depend on the Edge runtime.
--- code
// proxy.ts (Next.js 16+, formerly middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("session");

  if (!hasSession && request.nextUrl.pathname.startsWith("/dashboard")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};

=== n102 | E | Where do you define middleware in Next.js?
**Create a single `proxy.ts` (or `proxy.js`) file in the project root, next to `app/` and `pages/`, or inside `src/` if you use a `src` directory. Before Next.js 16 the file was `middleware.ts` in the same location. Only one such file is supported per project.**

### Location rules
- `my-app/proxy.ts` when `app/` is at the root.
- `my-app/src/proxy.ts` when you use `src/app`.
- Not inside `app/`: a `proxy.ts` there is not picked up.
- With custom `pageExtensions` like `.page.tsx`, name it `proxy.page.ts`.

### Organizing larger logic
Only one file runs, but it can import modules. Split concerns into functions (`handleAuth`, `handleLocale`, `handleAbTest`) in a `lib/proxy/` folder and call them in order from `proxy.ts`. Return as soon as one of them produces a response.

### Exports
- The function: a named `proxy` export or a default export.
- Optional `config` with a `matcher`, which must be statically analyzable (literal strings or objects).

### Execution scope
It runs for every request that matches, including RSC requests for client navigations and Server Function POSTs on matched paths. Without a matcher it also runs for static files and images, so add a negative matcher.
--- code
// Project layout
// my-app/
// ├── src/
// │   ├── app/
// │   ├── lib/proxy/auth.ts
// │   ├── lib/proxy/locale.ts
// │   └── proxy.ts        <- here when using src/
// └── next.config.ts

// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { handleAuth } from "@/lib/proxy/auth";
import { handleLocale } from "@/lib/proxy/locale";

export function proxy(request: NextRequest) {
  // Each handler returns a Response to stop, or undefined to continue
  return handleAuth(request) ?? handleLocale(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

=== n103 | M | What is the matcher config in middleware?
**`matcher` in the exported `config` limits which request paths run Proxy (middleware). It accepts a path string, an array of paths, path-to-regexp patterns such as `/dashboard/:path*`, regular expressions, or objects with `source`, `has` and `missing` conditions. Without it, Proxy runs on every request, including static assets.**

### Pattern syntax
- `/about` matches `/about` and paths under it (anchored at the start).
- `/blog/:slug` matches one segment; `/blog/:path*` zero or more; `:path+` one or more; `:path?` zero or one.
- Regex in parentheses: `/((?!api|_next/static|_next/image|favicon.ico).*)` matches everything except those prefixes.
- All patterns must start with `/`.

### Object form
```
{ source: "/api/:path*", has: [{ type: "header", key: "authorization" }],
  missing: [{ type: "cookie", key: "session" }], locale: false }
```
Condition types: `header`, `query`, `cookie`, `host`.

### Rules
- Values must be **constants**; Next.js analyzes them at build time. Variables or computed strings are ignored.
- Excluding `_next/static`, `_next/image` and public files is important for performance and to avoid redirecting assets.
- Prefetch requests can be excluded with `missing: [{ type: "header", key: "next-router-prefetch" }]`.

### Matcher vs code checks
Use the matcher for coarse filtering and `request.nextUrl.pathname` checks inside the function for fine-grained logic. Remember that Server Functions are POSTs to the page route, so excluding a page path also skips Proxy for actions on that page.

### Testing
`unstable_doesMiddlewareMatch` from `next/experimental/testing/server` asserts whether Proxy runs for a URL.
--- code
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // Protect app sections, but only when there is no session cookie
    {
      source: "/(dashboard|settings|billing)/:path*",
      missing: [
        { type: "cookie", key: "session" },
        { type: "header", key: "next-router-prefetch" }, // skip prefetches
      ],
    },
  ],
};

// Common "everything except assets" matcher:
// matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]

=== n104 | E | How do you redirect users in middleware?
**Return `NextResponse.redirect(url)` from `proxy.ts` with an absolute URL, usually built from the request: `new URL("/login", request.url)`. It defaults to a 307 temporary redirect; pass `308` (or `301`) as the second argument for permanent ones.**

### Building the target
- `new URL("/login", request.url)` keeps the host and protocol.
- Clone `request.nextUrl` to change only the path or query: `const url = request.nextUrl.clone(); url.pathname = "/login"`.
- Preserve where the user was going: `url.searchParams.set("next", request.nextUrl.pathname)`.

### Status codes
- **307** (default): temporary, method preserved.
- **308**: permanent, method preserved. Good for moved pages.
- 301/302 work too, but they may change POST to GET.

### Avoid redirect loops
Do not redirect a path to itself: exclude `/login` from the auth check, or use the matcher to skip it.

### Choosing where to redirect
- **Static mappings** (old URL to new URL): `redirects()` in `next.config.ts`. It runs before Proxy and needs no code.
- **Thousands of redirects** from a CMS: store them in a fast lookup (Edge Config, Redis, a Bloom filter) and check them in Proxy.
- **Logic-based:** auth, locale, geo, feature flags belong in Proxy.
- **After a mutation or during render:** `redirect()` in Server Functions and Server Components.
--- code
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.has("session");

  // Temporary redirect to login, remembering the destination
  if (!loggedIn && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url); // 307
  }

  // Logged-in users should not see the login page
  if (loggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Permanent move
  if (pathname.startsWith("/docs/v1")) {
    return NextResponse.redirect(new URL(pathname.replace("/docs/v1", "/docs"), request.url), 308);
  }
}

export const config = { matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/docs/v1/:path*"] };

=== n105 | M | How do you rewrite URLs in middleware?
**Return `NextResponse.rewrite(url)` from `proxy.ts`. Next.js serves the content of the destination route while the browser keeps showing the original URL. It is used for A/B tests, multi-tenant subdomains, localized routing and feature flags.**

### Redirect vs rewrite
- **Redirect:** the browser receives a 3xx and makes a new request; the URL bar changes.
- **Rewrite:** the server internally serves another path; the URL bar does not change, and there is no extra round-trip.

### Typical uses
- **Multi-tenancy:** `acme.example.com/about` rewrites to `/sites/acme/about`.
- **A/B testing:** assign a bucket cookie and rewrite `/pricing` to `/pricing/b`.
- **Locale:** rewrite `/products` to `/en/products` internally based on `Accept-Language`, without showing the prefix.
- **Proxying to external services:** rewrite `/blog/:path*` to another origin (Next.js proxies the request).

### Details
- The destination must be an absolute URL; build it with `new URL(path, request.url)`.
- Rewrites preserve query strings unless you change them.
- For RSC requests (client navigation), `NextResponse.rewrite()` forwards the required internal headers automatically. If you implement rewrites with your own `fetch`, you must forward them yourself.
- Static rewrites with no logic are simpler in `rewrites()` in `next.config.ts` (`beforeFiles`, `afterFiles`, `fallback`).

### Pitfall
`<Link>` prefetching sees the original URL. For links whose rewrite depends on Proxy logic, the docs show passing `as` and `href` so the prefetch uses the destination.
--- code
// proxy.ts - multi-tenant subdomains + A/B test
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl;

  // tenant.example.com/* -> /sites/tenant/*
  const [subdomain] = host.split(".");
  if (host.endsWith("example.com") && subdomain !== "www" && subdomain !== "example") {
    return NextResponse.rewrite(new URL(`/sites/${subdomain}${url.pathname}`, request.url));
  }

  // A/B test on /pricing, sticky via cookie
  if (url.pathname === "/pricing") {
    const bucket = request.cookies.get("ab-pricing")?.value ?? (Math.random() < 0.5 ? "a" : "b");
    const res = NextResponse.rewrite(new URL(`/pricing/${bucket}`, request.url));
    res.cookies.set("ab-pricing", bucket, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }
}

export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };

=== n106 | E | How do you access cookies in middleware?
**Use `request.cookies` on the `NextRequest` to read incoming cookies (`get`, `getAll`, `has`), and `response.cookies` on a `NextResponse` to set or delete cookies on the response.**

### Reading
- `request.cookies.get("session")?.value`
- `request.cookies.getAll()`
- `request.cookies.has("consent")`

### Writing
- `const res = NextResponse.next(); res.cookies.set("visited", "1", { path: "/", maxAge: 86400 })`
- `res.cookies.delete("old-cookie")`
- Works the same on `NextResponse.redirect()` and `NextResponse.rewrite()` responses.

### Passing a cookie to the app on the same request
Setting a cookie on the response only affects later requests. To make a new value visible to Server Components in **this** request, also set it on the request: `request.cookies.set(...)` and pass the modified headers via `NextResponse.next({ request: { headers: request.headers } })`.

### Security
- Proxy can **read** a session cookie for an optimistic check, and even verify a signed JWT quickly. Do not perform database session lookups on every request here.
- Set `httpOnly`, `secure` and `sameSite` on sensitive cookies.

### `cookies()` from `next/headers`
That API is for Server Components, Server Functions and Route Handlers. In Proxy, use the request and response objects.
--- code
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const theme = request.cookies.get("theme")?.value ?? "light";
  const isFirstVisit = !request.cookies.has("visited");

  // Make a value available to Server Components in THIS request
  if (!request.cookies.has("visitor-id")) {
    request.cookies.set("visitor-id", crypto.randomUUID());
  }
  const response = NextResponse.next({ request: { headers: request.headers } });

  // Persist cookies for future requests
  response.cookies.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  response.cookies.set("visitor-id", request.cookies.get("visitor-id")!.value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  if (isFirstVisit) response.cookies.set("visited", "1", { path: "/" });

  return response;
}

=== n107 | M | How do you protect routes using middleware?
**In `proxy.ts`, read the session cookie (optionally verify a signed token), and redirect unauthenticated users away from protected paths using a matcher or path checks. Treat this as an optimistic first gate for good UX; real authorization must still happen in pages, Route Handlers and Server Functions.**

### Implementation steps
1. List protected and public routes (or protected prefixes).
2. Read the session cookie from `request.cookies`.
3. Optionally decrypt or verify it (a JWT signature check with `jose` is fast). Avoid database lookups here.
4. Redirect to `/login?next=...` if it is missing or invalid.
5. Redirect signed-in users away from `/login` and `/signup`.
6. Exclude static assets and prefetches with the matcher.

### Why it is not enough on its own
- Server Functions are POST requests to the page route; if a matcher excludes that path, the action is unprotected.
- Matchers are easy to break during refactors.
- The cookie may exist but be revoked on the server.
- Role checks often need data (ownership of a document) that Proxy should not fetch.

The Next.js data security guidance is explicit: verify authentication and authorization inside every Server Function and data access function.

### Defense in depth
- **Proxy:** fast redirect for unauthenticated users.
- **Data Access Layer:** `verifySession()` plus permission checks on every read and write.
- **UI:** hide controls users cannot use, purely for UX.

### Libraries
Auth.js, Better Auth, Clerk and others provide Proxy helpers that do the optimistic check for you.
--- code
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const PUBLIC = ["/", "/login", "/signup", "/pricing"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  let userId: string | undefined;
  if (token) {
    try {
      userId = (await jwtVerify(token, key)).payload.sub; // signature + expiry, no DB call
    } catch {}
  }

  const isPublic = PUBLIC.includes(pathname);
  if (!userId && !isPublic) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }
  if (userId && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"] };

=== n108 | M | What is the execution order of middleware?
**For each request, Next.js applies `headers` from `next.config`, then `redirects` from `next.config`, then Proxy (middleware), then `beforeFiles` rewrites, then file-system routes (`public/`, `_next/static`, `app/`, `pages/`), then `afterFiles` rewrites, then dynamic routes, and finally `fallback` rewrites.**

### The full order
1. `headers()` from `next.config.ts`
2. `redirects()` from `next.config.ts`
3. **Proxy** (`proxy.ts`): rewrites, redirects, headers, early responses
4. `beforeFiles` rewrites from `next.config.ts`
5. File-system routes: `public/`, `_next/static/`, `pages/`, `app/`
6. `afterFiles` rewrites
7. Dynamic routes such as `/blog/[slug]`
8. `fallback` rewrites

### What this means in practice
- A config redirect runs **before** Proxy, so Proxy never sees requests that a config redirect already handled.
- Proxy runs before any page or Route Handler, which is why it can rewrite to them.
- Headers from config are applied even if Proxy rewrites the request.
- Only **one** Proxy file runs; there is no chain of middleware files. Compose functions inside it.
- Server Functions are not separate routes: they are POSTs to the page, so they pass through Proxy for that page's path.

### Inside the app after routing
Once a route matches: root layout, nested layouts, then the page render. Route segment config (`ensureStatic`, `instant`) and data caching apply at that stage, not in Proxy.

### Debugging the order
`next build --debug` prints the configured rewrites, redirects and headers.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "x-step", value: "1-config-headers" }] }];
  },
  async redirects() {
    // Step 2: runs before proxy.ts ever sees /old
    return [{ source: "/old", destination: "/new", permanent: true }];
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/docs", destination: "/docs/intro" }], // step 4
      afterFiles: [{ source: "/blog/:slug", destination: "/news/:slug" }], // step 6
      fallback: [{ source: "/:path*", destination: "https://legacy.example.com/:path*" }], // step 8
    };
  },
};

export default nextConfig;

// proxy.ts runs at step 3, between config redirects and beforeFiles rewrites

=== n109 | M | What runtime does middleware run on?
**Since Next.js 16, Proxy (`proxy.ts`, the renamed middleware) runs on the Node.js runtime, and the runtime cannot be configured. Before that, middleware ran on the Edge runtime by default, with Node.js support added as stable in 15.5. The deprecated `middleware.ts` still uses the Edge runtime if you need it.**

### History
- **Next.js 12 to 14:** middleware ran only on the Edge runtime (Web APIs, no `fs`, no native modules).
- **15.2:** experimental Node.js runtime for middleware.
- **15.5:** Node.js runtime for middleware became stable via `export const config = { runtime: 'nodejs' }`.
- **16.0:** `middleware.ts` renamed to `proxy.ts`. Proxy always uses Node.js; setting `runtime` in a proxy file throws an error.

### What Node.js enables
- Full npm compatibility: database clients, auth SDKs, `node:crypto`.
- Easier code sharing with the rest of the app.

### Still keep it fast
Proxy runs on every matched request, including client navigations and prefetches. Avoid slow network calls; if you need lookups (redirect maps, feature flags), use a fast store. `fetch` caching options and `"use cache"` do not work in Proxy.

### Deployment note
Proxy is designed to run separately from your render code, and some platforms deploy it to their CDN layer. Do not rely on shared module state or globals between Proxy and the app; pass information via headers, cookies, rewrites or the URL.
--- code
// proxy.ts - Node.js runtime: Node APIs are available
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

function validSignature(value: string, sig: string) {
  const expected = createHmac("sha256", process.env.SIGNING_SECRET!).update(value).digest();
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function proxy(request: NextRequest) {
  const [value, sig] = (request.cookies.get("preview")?.value ?? "").split(".");
  if (request.nextUrl.pathname.startsWith("/preview") && !(value && sig && validSignature(value, sig))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// export const config = { runtime: "edge" }; // Error in proxy.ts
// Legacy middleware.ts can still run on Edge (deprecated).

=== n110 | M | What are the limitations of Next.js middleware?
**Proxy (formerly middleware) runs before routing on every matched request, so it must be fast and stateless. It cannot render React, cannot use the caching directives or `fetch` cache, should not do slow data fetching, has only one file per project, and must not be your only authorization layer.**

### Functional limits
- **One file:** a single `proxy.ts`; compose logic inside it.
- **No React rendering:** it returns responses, redirects or rewrites, not components.
- **No directive transforms:** `"use cache"`, `"use server"` and `cacheLife`/`cacheTag` have no effect (calling `cacheLife` throws).
- **No `fetch` caching:** `cache`, `next.revalidate` and `next.tags` do nothing; use an external store.
- **Static matchers:** `config.matcher` must be constant.
- **Runtime fixed to Node.js** in `proxy.ts`; the `runtime` option throws. Edge needs the deprecated `middleware.ts`.
- **Request body:** Proxy can read bodies, but there is a size limit (`proxyClientMaxBodySize`) and buffering bodies slows every request.

### Design limits
- **Latency:** it adds work to every matched request, including prefetches and RSC navigations. Keep it to cookie checks and lookups in fast stores.
- **No shared state with the app:** it may be deployed separately, so module globals are not shared. Pass data through headers, cookies or the URL.
- **Not a security boundary on its own:** Server Functions on excluded paths skip it, and refactors change paths. Check auth in the data layer.
- **Internal headers stripped:** RSC headers like `rsc` and `next-router-state-tree` are hidden from `request.headers`.

### When to use something else
- Static redirects and headers: `next.config.ts`.
- Per-page auth checks and data: Server Components and the Data Access Layer.
- Heavy processing: Route Handlers or background jobs with `after()`.
--- code
// proxy.ts - what works and what does not
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { redis } from "@/lib/redis"; // fast external store: OK

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // OK: cheap cookie check
  if (!request.cookies.has("session") && request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // OK: fast key-value lookup for dynamic redirects
  const target = await redis.get<string>(`redirect:${request.nextUrl.pathname}`);
  if (target) return NextResponse.redirect(new URL(target, request.url), 308);

  // OK: background work after the response
  event.waitUntil(fetch("https://logs.example.com", { method: "POST", body: request.url }));

  // Not effective here:
  // await fetch(url, { next: { revalidate: 60 } });  // not cached in Proxy
  // "use cache" / cacheLife()                        // no effect / throws
  // await db.user.findMany()                         // too slow for every request
}
