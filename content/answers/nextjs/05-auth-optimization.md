=== n111 | M | How do you implement authentication in Next.js?
**Authentication in Next.js has three parts: sign-in (verify credentials or OAuth and create a session), session management (a secure cookie holding a signed token or a database session ID), and authorization checks in a Data Access Layer used by pages, Route Handlers and Server Functions. Use a library unless you have a strong reason not to.**

### 1. Sign-in
- A form posts to a **Server Function** that validates input (Zod), checks the password hash (Argon2 or bcrypt) or completes an OAuth flow.
- On success, create a session and set an `httpOnly`, `secure`, `sameSite=lax` cookie.
- Return field errors with `useActionState`; rate-limit attempts.

### 2. Sessions
- **Stateless:** a signed or encrypted JWT in the cookie (`jose`). No database lookup, but hard to revoke instantly.
- **Database sessions:** the cookie holds a random ID; the server looks it up. Easy to revoke, one query per check.

### 3. Authorization
- A `server-only` Data Access Layer with `verifySession()` wrapped in `React.cache`.
- Every data read and every Server Function checks the session and permissions.
- Return DTOs with only the fields the caller may see.
- `proxy.ts` can redirect unauthenticated users optimistically, but it is not the security boundary.

### Libraries
The Next.js docs list Auth0, Better Auth, Clerk, Descope, Kinde, Logto, Stytch, Supabase, WorkOS and others. Auth.js (NextAuth) is now maintained by the Better Auth team, which recommends Better Auth for new projects.

### With Cache Components
Reading the session cookie is request-time work: put user-specific UI inside `<Suspense>`. Never put per-user data in a shared `"use cache"` entry; pass the user ID as an argument or use `"use cache: private"`.
--- code
// app/login/actions.ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session"; // sets an httpOnly signed cookie

const Login = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function login(_prev: { error?: string }, formData: FormData) {
  const parsed = Login.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid email or password" };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user && (await verify(user.passwordHash, parsed.data.password));
  if (!ok) return { error: "Invalid email or password" }; // same message: no user enumeration

  await createSession(user.id);
  redirect("/dashboard");
}

// lib/dal.ts: export const verifySession = cache(async () => { ...read + verify cookie... });
// app/dashboard/page.tsx: const session = await verifySession(); if (!session) redirect("/login");

=== n112 | M | What is NextAuth.js (Auth.js)?
**Auth.js, originally NextAuth.js, is an open-source authentication library that adds OAuth providers, email magic links, credentials login, sessions (JWT or database) and adapters for many databases to Next.js. Since September 2025 it is maintained by the Better Auth team, who keep it patched but recommend Better Auth for new projects.**

### What it provides
- **Providers:** Google, GitHub, Microsoft Entra ID, Apple and dozens more, plus email and credentials.
- **Sessions:** encrypted JWT cookies by default, or database sessions through adapters (Prisma, Drizzle, MongoDB, Supabase).
- **Callbacks:** `jwt`, `session`, `signIn` and `authorized` to add roles or block users.
- **Security defaults:** CSRF tokens, PKCE and state checks for OAuth, secure cookies.

### Versions
- **next-auth v4:** the stable line, built around the Pages Router API (`getServerSession`).
- **Auth.js v5 (`next-auth@5`):** App Router-first, with a single `auth()` function usable in Server Components, Route Handlers, Server Functions and Proxy. It has stayed in beta for a long time, though many teams run it in production.

### Setup in brief (v5)
1. Create `auth.ts` exporting `{ handlers, auth, signIn, signOut }` from `NextAuth({ providers })`.
2. Expose `handlers` at `app/api/auth/[...nextauth]/route.ts`.
3. Set `AUTH_SECRET` and provider credentials in env vars.
4. Call `await auth()` on the server, `useSession()` on the client.

### Interview angle
Know the concepts (providers, callbacks, JWT vs database sessions) and the current landscape: Better Auth, Clerk and similar libraries are common choices in 2026. Mention that you still authorize inside your data layer, whatever library you use.
--- code
// auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub, Google], // read AUTH_GITHUB_ID / AUTH_GITHUB_SECRET etc. from env
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email?.endsWith("@acme.com")) token.role = "staff";
      return token;
    },
    async session({ session, token }) {
      session.user.role = (token.role as string) ?? "user";
      return session;
    },
  },
});

// app/api/auth/[...nextauth]/route.ts
// export const { GET, POST } = handlers;

// app/dashboard/page.tsx
// const session = await auth();
// if (!session) redirect("/api/auth/signin");

=== n113 | M | How do you set up session management in Next.js?
**Store a session token in a secure, `httpOnly` cookie, create it after sign-in in a Server Function or Route Handler, verify it on every server request through a cached `verifySession()` helper, refresh it before expiry, and delete it on sign-out. Choose stateless (signed JWT) or database sessions depending on how important instant revocation is.**

### Stateless sessions (JWT in a cookie)
- Sign or encrypt `{ userId, role, expiresAt }` with `jose` using a secret from env vars.
- Verifying needs no database, so it is fast enough for `proxy.ts`.
- Downside: you cannot revoke a token before it expires unless you add a denylist. Keep expiry short (hours to days) and rotate.

### Database sessions
- Cookie holds a random session ID; a `sessions` table stores the user, expiry and device.
- Easy to sign out everywhere or revoke a stolen session.
- One lookup per check; cache it per request with `React.cache` and consider Redis for speed.

### Cookie settings
`httpOnly: true`, `secure: true`, `sameSite: "lax"`, `path: "/"`, an explicit `expires`, and ideally the `__Host-` prefix.

### Where each step happens
- **Create / delete:** Server Functions or Route Handlers (`(await cookies()).set()`), since Server Components cannot set cookies.
- **Verify:** Data Access Layer, used by Server Components, Server Functions and Route Handlers.
- **Optimistic redirect:** `proxy.ts` reads the cookie only.
- **Extend:** update the expiry on activity in Proxy or a Server Function.

### Client access
Pass a minimal user object from the server via props or context. Do not expose the token to JavaScript.
--- code
// lib/session.ts
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + WEEK);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(key);

  (await cookies()).set("session", token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function readSession() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  try {
    return (await jwtVerify<{ userId: string }>(token, key)).payload;
  } catch {
    return null; // bad signature or expired
  }
}

export async function deleteSession() {
  (await cookies()).delete("session");
}

=== n114 | E | How do you protect pages using getServerSideProps?
**In the Pages Router, check the session inside `getServerSideProps` and return `{ redirect: { destination: "/login", permanent: false } }` when the user is not signed in (or `{ notFound: true }` when they lack access). Because it runs on the server before rendering, protected data never reaches unauthenticated users.**

### Steps
1. Read the session from `context.req` (cookies) with your auth library: `getServerSession(req, res, authOptions)` in next-auth v4, or your own `readSession(req.cookies.session)`.
2. If missing, return a redirect, preserving the destination in a query param.
3. If present, check permissions for this page.
4. Fetch data for that user and return it as props.

### Details
- Use `permanent: false` so browsers do not cache the redirect.
- Add `Cache-Control: private, no-store` for per-user pages so no CDN caches them.
- Protect the **data**, not only the page. API routes the page calls must check the session too.
- Pages using `getStaticProps` are public HTML; protect them with client-side checks plus protected API calls, or switch to `getServerSideProps`.

### App Router equivalent
Call `verifySession()` in the page or layout (a Server Component) and `redirect("/login")` if it fails. Layout checks alone are not enough, because layouts do not re-render on every navigation; check in pages and data functions.
--- code
// pages/billing.tsx
import type { GetServerSideProps } from "next";
import { readSession } from "@/lib/session-pages";
import { db } from "@/lib/db";

type Props = { invoices: { id: string; total: number }[] };

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, resolvedUrl }) => {
  const session = await readSession(req.cookies.session);

  if (!session) {
    return {
      redirect: { destination: `/login?next=${encodeURIComponent(resolvedUrl)}`, permanent: false },
    };
  }
  if (session.role !== "owner") return { notFound: true }; // hide existence of the page

  res.setHeader("Cache-Control", "private, no-store");
  const invoices = await db.invoice.findMany({ where: { orgId: session.orgId }, select: { id: true, total: true } });
  return { props: { invoices } };
};

export default function Billing({ invoices }: Props) {
  return <ul>{invoices.map((i) => <li key={i.id}>${i.total}</li>)}</ul>;
}

=== n115 | M | How do you protect routes using middleware?
**Use `proxy.ts` as an optimistic gate: read the session cookie, redirect signed-out users from protected paths and signed-in users away from auth pages. Then enforce real authorization close to the data, because Proxy can be bypassed by matcher gaps and does not know about resource ownership.**

### A layered approach
1. **Proxy (UX layer):** cookie present and token valid? If not, redirect to `/login`. Keeps protected pages from flashing.
2. **Page / layout (render layer):** `const session = await verifySession(); if (!session) redirect("/login")`.
3. **Data Access Layer (security layer):** every query and mutation checks the user's permission for the specific record.
4. **Server Functions and Route Handlers:** check the session at the start of each one.

### Why layers
- Server Functions are invoked as POSTs to the page URL, so a matcher that excludes the page skips Proxy for its actions.
- Layouts do not re-run on client navigation between their children, so a layout-only check can miss cases.
- Proxy should not query the database on every request.

### Role-based routes
Proxy can redirect by a role claim in a signed token (`/admin` requires `role=admin`), but double-check in the data layer because roles can change after the token was issued.

### Auth library helpers
Auth.js exports `auth` as a Proxy wrapper, Clerk provides `clerkMiddleware()` with `createRouteMatcher`, and Better Auth reads the session cookie with a helper. They all do the optimistic check; you still authorize data access yourself.

### With `authInterrupts`
In pages, `unauthorized()` and `forbidden()` (experimental) render `unauthorized.tsx` or `forbidden.tsx` with 401/403 status, as an alternative to redirecting.
--- code
// proxy.ts - optimistic gate
import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session-token"; // verifies signature only, no DB

const protectedPrefixes = ["/dashboard", "/admin"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = await decrypt(req.cookies.get("session")?.value);

  if (protectedPrefixes.some((p) => path.startsWith(p)) && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (path.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"] };

// app/admin/users/actions.ts - real check close to the data
// "use server";
// export async function banUser(id: string) {
//   const s = await verifySession();
//   if (s?.role !== "admin") throw new Error("Forbidden");
//   await db.user.update({ where: { id }, data: { banned: true } });
// }

=== n116 | H | How do you implement JWT-based auth in Next.js?
**Issue a signed JWT after verifying credentials, store it in an `httpOnly` secure cookie (not `localStorage`), verify the signature and expiry with `jose` on each server request (in Proxy, Server Components, Route Handlers and Server Functions), and handle expiry with short-lived tokens plus refresh or rotation.**

### Token design
- Claims: `sub` (user ID), `role`, `iat`, `exp`, and optionally `jti` for revocation.
- Keep it small; it travels with every request.
- Sign with HS256 (shared secret) or RS256/EdDSA (key pair, useful when other services verify it).
- Do not put sensitive data in it; JWT payloads are only base64-encoded unless you encrypt (JWE).

### Storage
- `httpOnly` cookie: JavaScript cannot read it, so XSS cannot steal it, and it is sent automatically to your server.
- `sameSite: "lax"` plus Next.js's built-in Server Function origin check protect against CSRF; for custom POST Route Handlers consumed by browsers, also check `Origin`.
- Avoid `localStorage` for tokens: any XSS can exfiltrate them.

### Verification
`jose` works in every runtime (Web Crypto). Wrap verification in a `React.cache` helper so it runs once per request.

### Expiry and revocation
- Access tokens of 15 minutes to a few hours, plus a refresh token (longer, rotated on use, ideally stored server-side).
- Or a sliding session: re-issue the cookie when more than half the lifetime has passed.
- For instant revocation, keep a denylist of `jti` values or a `tokenVersion` per user in a fast store.

### For external APIs
Mobile apps and third parties can send `Authorization: Bearer <jwt>` to Route Handlers; verify the same way.
--- code
// lib/jwt.ts
import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cache } from "react";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
type Claims = JWTPayload & { sub: string; role: "user" | "admin" };

export async function issueToken(userId: string, role: Claims["role"]) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("2h")
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export const currentUser = cache(async (): Promise<Claims | null> => {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<Claims>(token, secret, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null; // invalid signature, wrong alg or expired
  }
});

// Route Handler for mobile clients:
// const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
// const { payload } = await jwtVerify(bearer!, secret);

=== n117 | M | How do you handle OAuth providers with NextAuth?
**Add provider objects (Google, GitHub and so on) to the `providers` array in your Auth.js config, register your app with each provider to get a client ID and secret, set the callback URL to `/api/auth/callback/<provider>`, and store credentials in env vars. Auth.js handles the redirect, PKCE, state checks, token exchange and session creation.**

### Steps (Auth.js v5)
1. Create an OAuth app in the provider console.
2. Set the authorized redirect URI: `https://your-domain.com/api/auth/callback/github` (and the localhost version for dev).
3. Add env vars: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`. v5 reads `AUTH_<PROVIDER>_ID/SECRET` automatically.
4. Add the provider: `providers: [GitHub, Google]`.
5. Trigger sign-in with a Server Function: `await signIn("github", { redirectTo: "/dashboard" })`.

### Customizing
- **Scopes:** `Google({ authorization: { params: { scope: "openid email profile" } } })`.
- **Restricting sign-in:** the `signIn` callback can reject users outside your domain.
- **Account linking:** with a database adapter, multiple providers can map to one user. Linking accounts with the same email is off by default to prevent account takeover; enable it only for providers that verify email.
- **Access tokens:** persist provider tokens in the `jwt` callback if you need to call the provider's API, and refresh them before they expire.

### Security reminders
- Keep client secrets server-side only (no `NEXT_PUBLIC_`).
- Use exact redirect URIs, not wildcards.
- Behind a proxy, set `AUTH_URL` or `trustHost` so callback URLs are built correctly.

### Alternatives
Better Auth (`socialProviders` config), Clerk and Auth0 offer the same flows with hosted UIs or different trade-offs.
--- code
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub, // uses AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
    Google({ authorization: { params: { prompt: "select_account" } } }),
  ],
  callbacks: {
    signIn({ profile }) {
      return profile?.email?.endsWith("@acme.com") ?? false; // company accounts only
    },
  },
});

// app/login/page.tsx
// import { signIn } from "@/auth";
// export default function Login() {
//   return (
//     <form action={async () => { "use server"; await signIn("github", { redirectTo: "/dashboard" }); }}>
//       <button>Sign in with GitHub</button>
//     </form>
//   );
// }

=== n118 | E | What is the useSession hook in NextAuth?
**`useSession()` from `next-auth/react` is a client-side hook that returns the current session and its loading status: `{ data, status, update }`, where `status` is `"loading"`, `"authenticated"` or `"unauthenticated"`. It requires a `<SessionProvider>` in a Client Component above it.**

### Usage
- Wrap the app in `<SessionProvider>` (a Client Component) in the root layout. Pass the server-fetched session as a prop to avoid an initial loading state.
- `const { data: session, status } = useSession()` in any Client Component.
- `useSession({ required: true, onUnauthenticated() { ... } })` redirects when signed out.
- `update(data)` refreshes the session, for example after the user changes their name.

### How it works
It fetches `/api/auth/session` and caches the result in the provider. It refetches when the window regains focus and optionally on an interval (`refetchInterval`).

### When to use it
- Showing the user's avatar or name in client-side UI.
- Toggling client-only features.

### When not to
- **Protecting data:** client checks are cosmetic. Data must be protected on the server.
- **Server Components:** use `await auth()` instead; it needs no extra request and no loading state.

### Interview point
In the App Router, prefer reading the session on the server and passing what the client needs as props. Use `useSession` only where client components need to react to session changes.
--- code
// app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export function Providers({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

// app/components/user-menu.tsx
"use client";
import { useSession, signOut } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <span>…</span>;
  if (!session) return <a href="/api/auth/signin">Sign in</a>;

  return (
    <div>
      <img src={session.user?.image ?? ""} alt="" width={24} height={24} />
      {session.user?.name}
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}

=== n119 | M | How do you access the session in Server Components?
**Call your auth library's server function directly in the Server Component, for example `await auth()` (Auth.js v5), `auth.api.getSession({ headers: await headers() })` (Better Auth), `await currentUser()` (Clerk), or your own `verifySession()` that reads and verifies the cookie. No hook or provider is needed.**

### Pattern
1. A server-only helper reads the session cookie with `cookies()`.
2. It verifies the token or looks up the session, wrapped in `React.cache` so multiple components share one check per request.
3. Server Components call it and branch: render, `redirect("/login")`, `notFound()` or (experimental) `unauthorized()`.

### With Cache Components
- Reading cookies is request-time work. Place components that read the session inside `<Suspense>` so the rest of the page stays in the static shell.
- You cannot read cookies inside `"use cache"`. Read the session outside and pass the user ID as an argument to cached functions, so each user gets their own cache entry.
- Do not put `await auth()` at the top of the root layout; it makes the entire app request-time. Read it in the components that need it.

### Passing to the client
Pass the minimal fields (name, avatar, role) as props or into a context provider. Never pass the raw token.

### Security
Checking the session in a layout is not enough, since layouts do not re-render on every navigation. Check in the page or, better, in the data functions it calls.
--- code
// lib/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/session-token";

export const verifySession = cache(async () => {
  const session = await decrypt((await cookies()).get("session")?.value);
  if (!session?.userId) redirect("/login");
  return { userId: session.userId as string, role: session.role as string };
});

// app/dashboard/page.tsx
import { Suspense } from "react";

async function Welcome() {
  const { userId } = await verifySession(); // request-time: inside Suspense
  const user = await getUserProfile(userId); // can be "use cache" keyed by userId
  return <h1>Welcome back, {user.name}</h1>;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<h1>Welcome back</h1>}>
      <Welcome />
    </Suspense>
  );
}

declare function getUserProfile(id: string): Promise<{ name: string }>;

=== n120 | H | How do you implement role-based access control (RBAC) in Next.js?
**Store each user's role (and optionally fine-grained permissions) on the server, include it in the session, and enforce it in a central authorization layer called by every data read, Server Function and Route Handler. Use Proxy and UI hiding only for user experience, never as the enforcement point.**

### Model
- **Roles:** `viewer`, `editor`, `admin`, often scoped to an organization (`orgId + role`).
- **Permissions:** map roles to actions such as `post:read`, `post:update`, `billing:manage`. Check permissions, not role names, so roles can change without touching every check.
- **Ownership rules:** "editors can update **their own** posts" requires the resource, so checks happen where the data is loaded.

### Enforcement points
1. **Data Access Layer:** `can(user, "post:update", post)` before every query or mutation.
2. **Server Functions and Route Handlers:** authorize at the start; return 403 or throw.
3. **Pages:** call `forbidden()` (experimental `authInterrupts`) to render `forbidden.tsx` with a 403, or `notFound()` to hide the resource.
4. **Proxy:** optional redirect for whole sections such as `/admin` using the role claim in a signed token.
5. **UI:** hide buttons the user cannot use; purely cosmetic.

### Freshness
Role claims in a JWT can be stale after a role change. For sensitive actions, re-check the role from the database (cached per request), or keep tokens short-lived.

### Libraries
CASL, Permit.io, Oso or your auth provider's organizations feature (Clerk, WorkOS, Better Auth) can model roles and permissions.

### Testing
Unit test the permission function exhaustively; it is pure and easy to test. Add E2E tests that try forbidden actions directly against Server Functions and APIs.
--- code
// lib/permissions.ts
type Role = "viewer" | "editor" | "admin";
type Action = "post:read" | "post:create" | "post:update" | "post:delete";

const GRANTS: Record<Role, Action[]> = {
  viewer: ["post:read"],
  editor: ["post:read", "post:create", "post:update"],
  admin: ["post:read", "post:create", "post:update", "post:delete"],
};

export function can(user: { id: string; role: Role }, action: Action, post?: { authorId: string }) {
  if (!GRANTS[user.role].includes(action)) return false;
  // Editors may only update their own posts
  if (action === "post:update" && user.role === "editor") return post?.authorId === user.id;
  return true;
}

// app/posts/actions.ts
// "use server";
// import { forbidden } from "next/navigation"; // requires experimental.authInterrupts
// export async function deletePost(id: string) {
//   const user = await verifySession();
//   const post = await db.post.findUniqueOrThrow({ where: { id } });
//   if (!can(user, "post:delete", post)) forbidden();
//   await db.post.delete({ where: { id } });
//   updateTag("posts");
// }

=== n121 | E | What is the Next.js Image component?
**`next/image` exports an `<Image>` component that extends `<img>` with automatic optimization: it resizes images on demand, serves modern formats such as WebP or AVIF, lazy-loads by default, reserves space to prevent layout shift, and generates a responsive `srcset`.**

### Required and key props
- **`src`**: a static import (`import hero from "./hero.jpg"`), a path in `public/`, or a remote URL allowed by `images.remotePatterns`.
- **`alt`**: required for accessibility; use `""` for decorative images.
- **`width` / `height`**: required for remote and `public/` images (not for static imports), unless you use `fill`.
- **`fill`**: stretch to the parent, which must be positioned; combine with `sizes` and `object-fit`.
- **`sizes`**: tells the browser how wide the image will display, so it downloads the right size.
- **`preload`**: preload a critical image (the LCP image). Replaces the `priority` prop, deprecated in Next.js 16.
- **`placeholder="blur"`**: automatic for static imports; remote images need `blurDataURL`.
- **`quality`**: must be listed in `images.qualities` (default only `[75]` since Next.js 16).
- **`loading`**, **`fetchPriority`**, **`unoptimized`**, **`loader`**.

### How optimization works
The browser requests `/_next/image?url=...&w=828&q=75`. The server resizes and encodes the image (using `sharp`), caches it, and serves it with caching headers. `minimumCacheTTL` defaults to 4 hours since Next.js 16.

### Without the default optimizer
With `output: 'export'` or a CDN-based pipeline, set a custom `loader` (Cloudinary, Imgix, your CDN) or `unoptimized: true`.
--- code
// app/page.tsx
import Image from "next/image";
import hero from "./hero.jpg"; // static import: width, height and blur known at build

export default function Home() {
  return (
    <main>
      {/* LCP image: preload it */}
      <Image src={hero} alt="Team at work" placeholder="blur" preload sizes="100vw" />

      {/* Remote image: needs width/height and remotePatterns */}
      <Image
        src="https://images.example.com/products/42.jpg"
        alt="Blue running shoe"
        width={600}
        height={400}
        sizes="(max-width: 768px) 100vw, 50vw"
      />

      {/* Fill a sized container */}
      <div className="relative aspect-video">
        <Image src="/banner.webp" alt="" fill className="object-cover" sizes="100vw" />
      </div>
    </main>
  );
}

=== n122 | E | What are the benefits of using next/image?
**`next/image` improves Core Web Vitals with little effort: smaller files through resizing and modern formats, no layout shift thanks to reserved dimensions, lazy loading for offscreen images, responsive `srcset` generation, and built-in caching. It also adds security controls over which remote images can be optimized.**

### Performance
- **Right-sized images:** generates multiple widths and lets the browser choose with `srcset` and `sizes`, instead of shipping a 4000px photo to a phone.
- **Modern formats:** WebP by default, AVIF when enabled in `images.formats`, chosen from the browser's `Accept` header.
- **Lazy loading:** offscreen images load only near the viewport (`loading="lazy"` by default).
- **Preloading the LCP image** with `preload` (or `fetchPriority="high"`).
- **Caching:** optimized images are cached on the server or CDN with long TTLs.

### Visual stability
Width and height (or `fill` with a sized parent) reserve space, avoiding Cumulative Layout Shift. Blur placeholders improve perceived speed.

### Developer experience
- Static imports provide dimensions and blur data automatically.
- One component handles responsive art for different breakpoints.
- Custom loaders plug into Cloudinary, Imgix or any CDN.

### Security
- `images.remotePatterns` allowlists remote hosts, so your server cannot be abused to optimize arbitrary URLs.
- Since Next.js 16: local IP addresses are blocked by default (SSRF protection), redirects are limited to 3, and local images with query strings need `localPatterns`.

### Trade-offs
Optimization uses server CPU on first request, and each width/format combination is a cache entry. Limit `deviceSizes`, `imageSizes` and `qualities` to what you need.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"], // AVIF first when supported
    remotePatterns: [new URL("https://cdn.acme.com/uploads/**")],
    qualities: [60, 75, 90], // only these quality values are allowed
    minimumCacheTTL: 60 * 60 * 24, // 1 day (Next.js 16 default is 4 hours)
  },
};

export default nextConfig;

// Usage: the browser picks the right width from srcset
// <Image src="https://cdn.acme.com/uploads/cover.jpg" alt="Cover" width={1200} height={630}
//        sizes="(max-width: 640px) 100vw, 640px" quality={60} />

=== n123 | E | What is lazy loading and how does Next.js handle it?
**Lazy loading delays loading a resource until it is needed, which reduces initial download size and speeds up first render. Next.js lazy-loads images by default with `next/image`, splits JavaScript per route automatically, and lets you lazy-load components with `next/dynamic` or `React.lazy`, and scripts with `next/script`.**

### Images
- `<Image>` uses native `loading="lazy"`: offscreen images load when they approach the viewport.
- Do **not** lazy-load the above-the-fold LCP image; mark it with `preload` or `loading="eager"` / `fetchPriority="high"`.

### JavaScript
- **Automatic code splitting:** each route only loads the code it uses.
- **Server Components** send no component JavaScript at all.
- **`next/dynamic`** splits a Client Component into its own chunk and loads it when rendered. `ssr: false` skips server rendering for browser-only components.
- **Load on interaction:** render the dynamic component only after a click (a chart in a tab, a rich text editor in a modal).
- **Dynamic `import()`** for libraries used in event handlers, for example importing a PDF library when the user clicks "Export".
- Next.js 16.4 adds `experimental.turbopackLazyDynamicImports` to compile client `import()` chunks in dev only when requested, which speeds up the dev server.

### Scripts and media
- `<Script strategy="lazyOnload">` loads third-party scripts during browser idle time.
- Native `loading="lazy"` on `<iframe>` for embeds.

### Pitfalls
Lazy-loading everything adds loading states and network requests on interaction. Use it for heavy or rarely used pieces.
--- code
// app/report/page.tsx
import Image from "next/image";
import { ChartTab } from "./chart-tab"; // "use client"

export default function Report() {
  return (
    <main>
      <Image src="/hero.jpg" alt="Q3 results" width={1200} height={500} preload /> {/* not lazy */}
      <Image src="/team.jpg" alt="Team" width={600} height={400} /> {/* lazy by default */}
      <ChartTab />
    </main>
  );
}

// app/report/chart-tab.tsx
// "use client";
// import dynamic from "next/dynamic";
// import { useState } from "react";
// const Chart = dynamic(() => import("./heavy-chart"), { loading: () => <p>Loading chart…</p> });
// export function ChartTab() {
//   const [show, setShow] = useState(false);
//   return <>{<button onClick={() => setShow(true)}>Show chart</button>}{show && <Chart />}</>;
// }
// Export button: const { jsPDF } = await import("jspdf");

=== n124 | E | What is the priority prop in next/image?
**`priority` told Next.js that an image is critical, usually the Largest Contentful Paint (LCP) image: it disabled lazy loading and preloaded the image. In Next.js 16 `priority` is deprecated and replaced by the clearer `preload` prop, with `loading="eager"` and `fetchPriority="high"` as finer-grained alternatives.**

### What it did
- Added a `<link rel="preload" as="image">` with the right `imagesrcset` to the `<head>`.
- Set `fetchpriority="high"` and disabled `loading="lazy"`.

### Next.js 16 options
- **`preload`**: inserts a preload `<link>` in the head. Use for the single most important image.
- **`loading="eager"`**: load immediately, no lazy loading.
- **`fetchPriority="high"`**: tell the browser to prioritize the request.

The docs say that in most cases `loading="eager"` or `fetchPriority="high"` is enough, and to use `preload` only when the image must start loading before the browser discovers it, for example a hero background rendered after other markup.

### Choosing the image
Use one per page: the hero, the main product photo, or the first visible article image. Check which element is the LCP in Chrome DevTools or Lighthouse. Marking many images as high priority makes them compete and helps none.

### Do not combine
Do not use `preload` together with `loading="lazy"`. For art-directed images that switch at breakpoints, use `fetchPriority="high"` instead of `preload` so both variants are not downloaded.
--- code
// app/page.tsx
import Image from "next/image";
import hero from "./hero.jpg";

export default function Home() {
  return (
    <main>
      {/* Next.js 16: preload replaces the deprecated priority prop */}
      <Image src={hero} alt="Mountain lake at sunrise" preload sizes="100vw" />

      {/* Often enough: eager + high fetch priority */}
      <Image
        src="/product.jpg"
        alt="Product"
        width={800}
        height={800}
        loading="eager"
        fetchPriority="high"
      />

      {/* Before (Next.js 15 and earlier): */}
      {/* <Image src={hero} alt="..." priority /> */}
    </main>
  );
}

=== n125 | E | How do you configure remote image domains in Next.js?
**Add allowed sources to `images.remotePatterns` in `next.config.ts`, specifying protocol, hostname, and optionally port, pathname and search. Since Next.js 15.3 you can also pass `new URL("https://cdn.example.com/**")`. The older `images.domains` option is deprecated in Next.js 16.**

### Why it is required
The image optimizer fetches the remote URL on your server. Without an allowlist, anyone could use your server to process arbitrary images (cost and SSRF risk). Unlisted URLs return 400.

### Pattern details
- `protocol`: `"https"` (avoid allowing `http`).
- `hostname`: exact (`cdn.acme.com`) or wildcard: `*.acme.com` matches one subdomain level, `**.acme.com` matches any depth.
- `pathname`: `/uploads/**` limits the path; `**` matches any depth, `*` one segment.
- `port`: usually empty.
- `search`: exact query string, if required.

Be as specific as possible: allowing `**` on a shared host like `s3.amazonaws.com` lets anyone's bucket through.

### Related Next.js 16 settings
- `images.localPatterns` to allow local images with query strings.
- `images.dangerouslyAllowLocalIP` only for private networks where images resolve to internal IPs.
- `images.maximumRedirects` (default 3).

### Alternatives
- `unoptimized` on a single image skips the optimizer, so no pattern is needed.
- A custom `loader` sends the image straight to an external CDN that does the resizing.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Shorthand (15.3+)
      new URL("https://images.unsplash.com/**"),
      // Object form with tight limits
      {
        protocol: "https",
        hostname: "**.acme-cdn.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
    ],
    // domains: ["images.unsplash.com"], // deprecated in Next.js 16
  },
};

export default nextConfig;

=== n126 | E | What is next/font and how does it optimize fonts?
**`next/font` loads Google Fonts or local font files at build time and self-hosts them with your app. It removes requests to external font servers, preloads the font, adds `font-display` and automatic fallback metrics so text does not shift, and exposes a class name or CSS variable to apply it.**

### Two modules
- **`next/font/google`**: `import { Inter, Geist } from "next/font/google"`. Font files are downloaded at build time and served from your domain, so the browser never contacts Google (better privacy and performance).
- **`next/font/local`**: `localFont({ src: "./fonts/Brand.woff2" })` or multiple weights and styles.

### Optimizations
- **Self-hosting** removes DNS lookups and connections to third-party origins.
- **Preloading** of the font files used on the route.
- **Zero layout shift:** a fallback font with adjusted `size-adjust`, `ascent-override` and similar metrics, so swapping to the web font barely moves text.
- **Subsetting:** `subsets: ["latin"]` keeps files small.
- **Variable fonts** are recommended; one file covers all weights.

### Options
`weight`, `style`, `subsets`, `display` (default `swap`), `variable` (CSS variable name), `preload`, `fallback`, `adjustFontFallback`.

### Applying it
- `className={inter.className}` on `<html>` or `<body>`.
- Or `variable: "--font-sans"` and reference it in CSS or Tailwind's `@theme`.

### Rules
Call the font loader at module scope, not inside a component, and assign it to a constant. `create-next-app` uses Geist and Geist Mono by default.
--- code
// app/fonts.ts
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

export const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const brand = localFont({
  src: [
    { path: "./fonts/Brand-Regular.woff2", weight: "400" },
    { path: "./fonts/Brand-Bold.woff2", weight: "700" },
  ],
  variable: "--font-brand",
});

// app/layout.tsx
// import { sans, mono, brand } from "./fonts";
// <html lang="en" className={`${sans.variable} ${mono.variable} ${brand.variable}`}>
//   <body className="font-sans">{children}</body>
// </html>

/* app/globals.css (Tailwind v4) */
// @theme { --font-sans: var(--font-sans); --font-mono: var(--font-mono); }

=== n127 | M | What is automatic font optimization in Next.js?
**Automatic font optimization originally meant that Next.js inlined Google Fonts CSS at build time when you used a `<link>` tag, saving a round-trip. That approach is legacy: since Next.js 13 the `next/font` module does much more, self-hosting the font files, preloading them and generating fallback metrics to eliminate layout shift.**

### The old behavior (Next.js 10.2 to 12)
- With `<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">` in `_document`, Next.js downloaded the CSS at build time and inlined it.
- The font files themselves still came from Google, so there were still third-party connections and possible layout shift.
- Controlled by `optimizeFonts` in `next.config.js`, which has since been removed.

### The modern behavior (`next/font`)
1. Fonts are downloaded at build time and served from `/_next/static/media/` with long-lived cache headers.
2. Only the subsets and weights you request are included.
3. Files are preloaded for the routes that use them.
4. A fallback font is tuned with `size-adjust` and metric overrides so the text occupies the same space before and after the web font loads, keeping CLS near zero.
5. `font-display: swap` by default so text is visible immediately.

### Why it matters
Fonts affect LCP (text is often the LCP element) and CLS. Third-party font hosting also raises privacy concerns, for example under GDPR in some EU rulings.

### What to say in an interview
"Use `next/font`; the old inlining is obsolete. It self-hosts, subsets, preloads and generates metric-matched fallbacks."
--- code
// Legacy (do not use): font loaded from Google at runtime
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />

// Modern: app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",              // text visible immediately
  adjustFontFallback: true,     // metric-matched fallback (default)
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter)" }}>{children}</body>
    </html>
  );
}
// Output: files under /_next/static/media/*.woff2, preloaded, no requests to fonts.googleapis.com

=== n128 | M | What is next/script and what are its loading strategies?
**`next/script` exports a `<Script>` component for loading third-party JavaScript with explicit timing. Its `strategy` prop picks when the script loads, `beforeInteractive`, `afterInteractive` (default), `lazyOnload` or the experimental `worker`, and Next.js deduplicates scripts across navigations.**

### Strategies
- **`beforeInteractive`**: injected into the initial HTML and loaded before any Next.js code or hydration. Only for critical scripts like bot detection or consent managers. Place it in the root layout.
- **`afterInteractive`** (default): loads after some hydration. Good for analytics and tag managers.
- **`lazyOnload`**: loads during browser idle time after everything else. Good for chat widgets, social embeds and low-priority tools.
- **`worker`** (experimental): offloads the script to a web worker using Partytown. Requires `nextScriptWorkers` and is not supported in the App Router.

### Other props
- `src` or inline content (inline scripts need an `id` so Next.js can track them).
- `onLoad` and `onError` (Client Components only), and `onReady`, which runs on load and on every remount.
- Standard attributes such as `nonce`, `crossOrigin` and `data-*`.

### Behavior
- A script loads once, even if multiple pages render it, and stays loaded across client navigations.
- Scripts in a layout load for all its routes; in a page, only when that page is visited.

### Performance tips
- Default to `lazyOnload` unless you need data early.
- For Google Analytics, Tag Manager, YouTube and Maps embeds, `@next/third-parties` provides optimized components.
- Third-party scripts often dominate INP and Total Blocking Time; audit them regularly.
--- code
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Consent manager must run before the app */}
        <Script src="https://consent.example.com/cmp.js" strategy="beforeInteractive" />

        {/* Analytics: after hydration */}
        <Script src="https://plausible.io/js/script.js" data-domain="acme.com" strategy="afterInteractive" />

        {/* Chat widget: whenever the browser is idle */}
        <Script src="https://widget.example-chat.com/loader.js" strategy="lazyOnload" />

        {/* Inline script needs an id */}
        <Script id="feature-flags" strategy="afterInteractive">
          {`window.__FLAGS__ = { newCheckout: true };`}
        </Script>
      </body>
    </html>
  );
}

=== n129 | E | What is code splitting in Next.js?
**Code splitting breaks your JavaScript into smaller chunks so each page loads only the code it needs. Next.js does it automatically per route and per shared dependency, and Server Components remove component code from the client bundle entirely. You can split further with `next/dynamic` and dynamic `import()`.**

### Automatic splitting
- **Per route:** visiting `/blog` does not download the code for `/dashboard`.
- **Shared chunks:** code used by many routes (React, shared components) goes into common chunks that are cached across navigations.
- **Per layout segment** in the App Router.
- **CSS** is split per route as well.
- **Turbopack** (default in Next.js 16) handles chunking; since 16.4 the Turbopack runtime ships in a single chunk shared by all routes.

### Server Components
The biggest reduction: components without `"use client"` never become client JavaScript, and neither do their dependencies (markdown parsers, date libraries, SDKs).

### Manual splitting
- `next/dynamic(() => import("./Chart"))` for heavy Client Components.
- `await import("library")` inside an event handler for code used only after an interaction.
- Avoid importing whole libraries; `optimizePackageImports` automatically trims barrel imports for many popular packages.

### Prefetching works with it
`<Link>` prefetches the chunks and RSC payload for routes in the viewport, so split code is ready before the click.

### Measuring
Use `next analyze` (or `next build --analyze`, Turbopack) or `@next/bundle-analyzer` (webpack) to see chunk sizes. Next.js 16 removed the "First Load JS" column from `next build` output because it was inaccurate with RSC; use Lighthouse or real-user metrics instead.
--- code
// app/editor/page.tsx (Server Component)
import { EditorShell } from "./editor-shell";

export default function EditorPage() {
  // Nothing from this file ships to the browser
  return <EditorShell />;
}

// app/editor/editor-shell.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Separate chunk, downloaded only when rendered
const RichEditor = dynamic(() => import("./rich-editor"), { loading: () => <p>Loading editor…</p> });

export function EditorShell() {
  const [editing, setEditing] = useState(false);

  async function exportPdf() {
    const { jsPDF } = await import("jspdf"); // loaded only on click
    new jsPDF().text("Hello", 10, 10).save("doc.pdf");
  }

  return (
    <div>
      <button onClick={() => setEditing(true)}>Edit</button>
      <button onClick={exportPdf}>Export PDF</button>
      {editing && <RichEditor />}
    </div>
  );
}

=== n130 | E | How does Next.js handle dynamic imports?
**Next.js supports standard JavaScript `import()` everywhere and adds `next/dynamic`, a wrapper around `React.lazy` and `<Suspense>` for components. Each dynamic import becomes a separate chunk that is downloaded only when the code runs, and `next/dynamic` can also skip server rendering with `ssr: false`.**

### `import()` (native)
- Returns a promise for the module: `const { format } = await import("date-fns")`.
- Use it for libraries needed only after an event, or in Server Components to load modules lazily.
- The bundler (Turbopack or webpack) creates a chunk per dynamic import.

### `next/dynamic`
- `const Map = dynamic(() => import("./map"))` creates a lazily loaded component.
- **`loading`**: a component shown while the chunk downloads.
- **`ssr: false`**: render only in the browser. Must be used inside a Client Component; using it in a Server Component is an error.
- Named exports: `dynamic(() => import("./charts").then((m) => m.BarChart))`.

### In Server Components
Dynamically importing a Server Component does not split client code (there is none); it only lazy-loads on the server. Client Components imported by it are still code-split.

### Rules
- The path in `import()` must be a static string or a template the bundler can analyze. Fully dynamic paths like `import(userInput)` are not supported.
- Do not call `dynamic()` inside a component body; define it at module scope.
- Turbopack 16.3 also supports `import.meta.glob("./posts/*.md")` for importing many files by pattern.
--- code
// app/dashboard/widgets.tsx
"use client";

import dynamic from "next/dynamic";

// Browser-only chart library: skip SSR, show a placeholder meanwhile
const RevenueChart = dynamic(() => import("./revenue-chart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded bg-slate-100" />,
});

// Named export from a module
const HeatMap = dynamic(() => import("./maps").then((m) => m.HeatMap));

export function Widgets({ data }: { data: number[] }) {
  async function copyAsCsv() {
    const { unparse } = await import("papaparse"); // native import() on demand
    await navigator.clipboard.writeText(unparse(data.map((v) => ({ v }))));
  }

  return (
    <section>
      <RevenueChart data={data} />
      <HeatMap />
      <button onClick={copyAsCsv}>Copy CSV</button>
    </section>
  );
}

=== n131 | M | What is React.lazy and how does it work with Next.js?
**`React.lazy(() => import("./Comp"))` defines a component whose code is loaded the first time it renders, suspending until the module arrives, so it must sit inside `<Suspense>`. In Next.js it works in Client Components, but `next/dynamic` is usually preferred because it adds a `loading` option, `ssr: false` and better integration with SSR and preloading.**

### How `React.lazy` works
1. The import function runs on first render.
2. The component suspends; the nearest `<Suspense>` shows its fallback.
3. When the module resolves, React renders its default export.
4. The result is cached; later renders are immediate.

### Constraints
- The module must have a **default export** that is a component (wrap named exports: `.then((m) => ({ default: m.Chart }))`).
- Define it at module scope.
- Needs a `<Suspense>` boundary.
- Used in Server Components it gives no client code-splitting benefit; use it in Client Components.

### `next/dynamic` vs `React.lazy`
| | `React.lazy` | `next/dynamic` |
|---|---|---|
| Needs explicit `<Suspense>` | Yes | No (built in) |
| Loading component option | No | `loading` |
| Disable SSR | No | `ssr: false` |
| Named exports | Manual wrapper | `.then((m) => m.Named)` |

### SSR behavior
Both server-render the component on first load when SSR is enabled, so the HTML contains it, then load the chunk for hydration.

### When to choose React.lazy
Code shared with non-Next React apps, or libraries that already expect it.
--- code
// app/settings/advanced.tsx
"use client";

import { lazy, Suspense, useState } from "react";

// Default export required
const AdvancedPanel = lazy(() => import("./advanced-panel"));
// Named export wrapped into a default
const AuditLog = lazy(() => import("./audit").then((m) => ({ default: m.AuditLog })));

export function Advanced() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button onClick={() => setOpen((o) => !o)}>Advanced settings</button>
      {open && (
        <Suspense fallback={<p>Loading…</p>}>
          <AdvancedPanel />
          <AuditLog />
        </Suspense>
      )}
    </section>
  );
}

// next/dynamic equivalent with fewer moving parts:
// const AdvancedPanel = dynamic(() => import("./advanced-panel"), { loading: () => <p>Loading…</p> });

=== n132 | E | What is the purpose of the next/dynamic function?
**`next/dynamic` lazy-loads a React component in its own JavaScript chunk, so it is downloaded only when rendered. It combines `React.lazy` and `<Suspense>` with Next.js extras: a `loading` placeholder, the option to disable server-side rendering, and support for named exports.**

### Signature
`dynamic(() => import("./Component"), { loading?, ssr? })`

### Use cases
- **Heavy components** that are not needed immediately: charts, maps, rich-text editors, code editors, video players.
- **Components shown after interaction:** modals, drawers, tabs, "show more" sections.
- **Browser-only libraries** that touch `window` on import: `ssr: false`.
- **Conditional features:** load an admin-only toolbar only for admins.

### Rules
- Call `dynamic()` at the top level of a module, not inside a component.
- The import path must be static (analyzable by the bundler).
- `ssr: false` is only allowed in Client Components. In a Server Component, wrap the dynamic call in a small `"use client"` file.
- When importing a Server Component dynamically, only the Client Components inside it are lazy-loaded on the client.

### Pitfalls
- Lazy-loading small components adds a request for little gain.
- `ssr: false` removes the content from the initial HTML, which can hurt SEO and LCP. Use it only for components that genuinely cannot render on the server.
- The `loading` component should reserve space to avoid layout shift.
--- code
// app/contact/map.tsx
"use client";

import dynamic from "next/dynamic";

// Leaflet touches window at import time: render only in the browser
export const OfficeMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div style={{ height: 320 }} aria-busy="true">Loading map…</div>,
});

// app/contact/page.tsx (Server Component)
// import { OfficeMap } from "./map";
// export default function Contact() {
//   return (
//     <main>
//       <h1>Visit us</h1>
//       <OfficeMap lat={28.61} lng={77.21} />
//     </main>
//   );
// }

=== n133 | M | How do you disable SSR for a component using next/dynamic?
**Pass `{ ssr: false }` to `next/dynamic` inside a Client Component: `const Editor = dynamic(() => import("./editor"), { ssr: false })`. The component is skipped during server rendering, its `loading` fallback is sent in the HTML, and it renders only in the browser after its chunk loads.**

### When it is justified
- Libraries that access `window`, `document` or `navigator` at import time (some map, chart, editor or canvas libraries).
- Components whose output depends entirely on browser state, where any server output would mismatch.
- Very heavy widgets you do not want to render on the server at all.

### Rules in the App Router
- `ssr: false` is **not allowed in Server Components** and produces an error. Create a small `"use client"` wrapper file that calls `dynamic(..., { ssr: false })` and import that wrapper from the Server Component.
- Provide a `loading` component that reserves the same space, to avoid layout shift.

### Alternatives (often better)
- **Fix the import:** move browser access into `useEffect` so the component can SSR.
- **`useSyncExternalStore`** with a server snapshot for browser values.
- **Render after mount** with an `isClient` state flag for small pieces.
- **`use(browser())` / `use(io())`** with Cache Components to defer browser-dependent values out of the static shell.

### Trade-offs
The content is not in the initial HTML: crawlers may not see it, LCP can suffer, and users wait for JavaScript. Use it for interactive widgets, not for main content.
--- code
// app/notes/editor-client.tsx - the wrapper must be a Client Component
"use client";

import dynamic from "next/dynamic";

export const NotesEditor = dynamic(() => import("./monaco-editor"), {
  ssr: false, // monaco needs window at import time
  loading: () => <div className="h-96 rounded border bg-slate-50" aria-busy="true" />,
});

// app/notes/page.tsx (Server Component)
import { NotesEditor } from "./editor-client";
// import dynamic from "next/dynamic";
// const Bad = dynamic(() => import("./monaco-editor"), { ssr: false }); // Error in a Server Component

export default async function NotesPage() {
  const initial = await fetch("https://api.example.com/notes/1").then((r) => r.text());
  return (
    <main>
      <h1>Notes</h1>
      <NotesEditor initialValue={initial} />
    </main>
  );
}

=== n134 | M | What is tree shaking and does Next.js support it?
**Tree shaking removes unused exports from the final bundle by analyzing ES module `import`/`export` statements. Next.js supports it in production builds with both Turbopack (default) and webpack, and adds `optimizePackageImports` to handle large "barrel" packages that defeat normal tree shaking.**

### Requirements for it to work
- **ES modules:** CommonJS (`require`, `module.exports`) is hard to analyze and usually is not shaken.
- **Side-effect information:** packages declare `"sideEffects": false` in `package.json` so unused modules can be dropped entirely.
- **Named imports:** `import { debounce } from "lodash-es"` instead of the whole library.

### Barrel files
Packages that re-export everything from an `index.js` (icon sets, UI kits) force the bundler to parse thousands of modules, slowing builds and sometimes keeping unused code. `optimizePackageImports` rewrites imports to the exact modules. Next.js enables it automatically for popular packages such as `lucide-react`, `date-fns`, `lodash-es`, `@mui/material` and `react-icons`; add your own in `next.config.ts`.

### What else reduces bundles
- Server Components keep their dependencies off the client entirely.
- `serverExternalPackages` keeps big server-only packages out of the server bundle too.
- Next.js 16.4 adds export-name mangling in production, which shrinks the JavaScript that does ship.

### Verify
Run `next analyze` (or `next build --analyze`) to see which modules ended up in each chunk, or `@next/bundle-analyzer` with webpack builds.

### Pitfalls
`import * as utils` and dynamic property access (`utils[name]`) prevent shaking. Side effects at module top level (polyfills, CSS imports) keep modules alive.
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Add internal or less common barrel packages (popular ones are automatic)
    optimizePackageImports: ["@acme/icons", "@acme/ui"],
  },
};
export default nextConfig;

// Good: only the used functions are bundled
import { format, addDays } from "date-fns";
import { Search } from "lucide-react";

// Bad: the whole CommonJS library is included
// import _ from "lodash";
// _.debounce(fn, 300);

// Better
import debounce from "lodash-es/debounce";

export const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
export const SearchIcon = Search;
export const onType = debounce((q: string) => console.log(q), 300);

=== n135 | M | What is bundle analysis in Next.js and how do you do it?
**Bundle analysis visualizes which modules make up your JavaScript chunks and how large they are, so you can find heavy dependencies, duplicates and code that leaked into the client. In Next.js 16 use the built-in Turbopack analyzer (`next analyze` or `next build --analyze`); for webpack builds use `@next/bundle-analyzer`.**

### Turbopack analyzer (Next.js 16.1+)
- Introduced as `next experimental-analyze` in 16.1; the CLI now provides `next analyze` and `next build --analyze`.
- Opens an interactive UI with client and server views, route filters and import chains that explain **why** a module is included.
- 16.4 added a route summary homepage, a sortable table view, snapshots you can diff over time, and highlighting of modules on the critical render path.
- `next analyze -o` writes the data to `.next/diagnostics/analyze` for CI artifacts.

### Webpack analyzer
`@next/bundle-analyzer` wraps the config: `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig)`, then `ANALYZE=true next build --webpack`. It produces treemap reports for client, server and edge bundles.

### What to look for
- Large libraries in client chunks: move usage to Server Components, lazy-load them, or swap for lighter alternatives (`dayjs` instead of `moment`).
- Server-only code in the client bundle: a `"use client"` boundary placed too high, or a missing `server-only` guard.
- Duplicate versions of the same package (check lockfile resolutions).
- Barrel imports pulling in whole icon sets.

### Beyond bundles
Next.js 16 removed `size` and `First Load JS` from `next build` output because they were misleading with RSC. Measure real impact with Lighthouse, Chrome DevTools coverage and Core Web Vitals field data.
--- code
// package.json scripts
// "analyze": "next analyze",                         // Turbopack, interactive UI
// "analyze:ci": "next analyze -o",                    // write report to .next/diagnostics/analyze
// "analyze:webpack": "ANALYZE=true next build --webpack"

// next.config.ts (webpack analyzer)
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  // your config
};

export default withBundleAnalyzer(nextConfig);

// Typical fix after analysis:
// Before: import moment from "moment";            // ~300KB in a client chunk
// After:  move date formatting into a Server Component, or use Intl.DateTimeFormat

=== n136 | M | How does Next.js optimize third-party scripts?
**Next.js gives third-party scripts controlled loading with `next/script` strategies (`beforeInteractive`, `afterInteractive`, `lazyOnload`, experimental `worker`), deduplicates them across navigations, and provides `@next/third-parties` components for Google Tag Manager, Google Analytics, YouTube and Google Maps that load efficiently by default.**

### Why it matters
Third-party scripts (analytics, ads, chat, A/B testing) are often the largest source of main-thread work, hurting INP, Total Blocking Time and LCP.

### Tools
1. **`<Script strategy>`**: delay non-critical scripts. Chat widgets with `lazyOnload`; analytics with `afterInteractive`; only consent and bot protection with `beforeInteractive`.
2. **`@next/third-parties`**:
   - `<GoogleTagManager gtmId="GTM-XXXX" />` and `sendGTMEvent()`.
   - `<GoogleAnalytics gaId="G-XXXX" />` and `sendGAEvent()`.
   - `<YouTubeEmbed videoid="..." />` uses a lightweight facade until the user clicks.
   - `<GoogleMapsEmbed />` lazy-loads the map iframe.
3. **Placement:** scripts in a specific page load only on that route; in the root layout they load everywhere.
4. **Workers:** `strategy="worker"` with Partytown moves scripts off the main thread. It is experimental and Pages Router only.

### Other practices
- Preconnect to required third-party origins only.
- Self-host small scripts when licensing allows.
- Use facades for embeds (load the real widget on click).
- Respect consent: do not load tracking scripts until the user agrees.
- Add hashes or nonces to a Content Security Policy so only approved scripts run.
--- code
// app/layout.tsx
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-ABCD123" />
      <body>
        {children}
        <Script src="https://widget.intercom.io/widget/abc123" strategy="lazyOnload" />
      </body>
    </html>
  );
}

// app/videos/page.tsx
// import { YouTubeEmbed } from "@next/third-parties/google";
// <YouTubeEmbed videoid="dQw4w9WgXcQ" height={400} params="controls=1" />

// Client event:
// "use client";
// import { sendGTMEvent } from "@next/third-parties/google";
// <button onClick={() => sendGTMEvent({ event: "signup_click" })}>Sign up</button>

=== n137 | M | What is the Turbopack bundler in Next.js?
**Turbopack is the Rust-based, incremental bundler built by Vercel for Next.js. Since Next.js 16 it is stable and the default for both `next dev` and `next build`, replacing webpack unless you pass `--webpack`. It caches work at the function level, including on disk, so rebuilds and restarts stay fast as apps grow.**

### Key features
- **Incremental computation:** only work affected by a change is recomputed.
- **Filesystem cache:** compiler results persist between runs. On by default for `next dev` (stable since 16.1) and `next build` (16.3), with up to 5.5x faster CI builds reported.
- **Lazy compilation in dev:** only the routes and chunks you request are compiled.
- **Unified graph** for client, server and edge environments, with fewer inconsistencies.
- **Supports** CSS Modules, Tailwind/PostCSS, Sass, TypeScript, JSX, many webpack loaders, `import.meta.glob` (16.3) and Babel when a config is present.

### Configuration
Top-level `turbopack` in `next.config.ts` (moved out of `experimental` in 16):
- `rules`: run webpack loaders for file patterns (for example SVGR for `*.svg`).
- `resolveAlias`, `resolveExtensions`.
- `root` for monorepos.

### Migrating from webpack
- A custom `webpack()` config makes `next build` fail by default in Next.js 16, to avoid silently ignoring it. Port it to `turbopack` options, or run `next build --webpack`.
- Sass `~` imports are not supported; remove the tilde.
- `resolve.fallback` maps to `turbopack.resolveAlias`.

### Recent additions
Experimental options in 16.3 and 16.4 include memory eviction, a garbage collector (`turbopackGc`), lazy dynamic imports and a Rust port of the React Compiler (`turbopackRustReactCompiler`).
--- code
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
    resolveAlias: {
      // Replace a Node module in browser bundles (prefer refactoring instead)
      fs: { browser: "./empty.ts" },
    },
  },
};

export default nextConfig;

// package.json
// "dev": "next dev",                 // Turbopack by default (no --turbopack flag needed)
// "build": "next build",             // Turbopack by default
// "build:webpack": "next build --webpack"

=== n138 | M | What are the performance metrics Next.js focuses on (Core Web Vitals)?
**Next.js targets Google's Core Web Vitals: Largest Contentful Paint (LCP) for loading, Interaction to Next Paint (INP) for responsiveness, and Cumulative Layout Shift (CLS) for visual stability. It also reports supporting metrics like Time to First Byte (TTFB) and First Contentful Paint (FCP), which you can collect with `useReportWebVitals`.**

### The three Core Web Vitals (good thresholds)
- **LCP ≤ 2.5s:** when the largest visible element (hero image, heading) renders.
- **INP ≤ 200ms:** the latency of user interactions across the visit. It replaced First Input Delay (FID) in March 2024.
- **CLS ≤ 0.1:** how much visible content shifts unexpectedly.

Measured at the 75th percentile of real users.

### How Next.js features map to them
- **LCP:** prerendered static shells served from a CDN, streaming, `next/image` with `preload` on the hero image, `next/font` preloading, and route prefetching for instant navigations.
- **INP:** Server Components (less JavaScript to hydrate), selective hydration, code splitting, `next/script` deferral, the React Compiler to cut re-renders, and transitions for non-urgent updates.
- **CLS:** image dimensions, metric-matched font fallbacks, and skeleton fallbacks in `loading.tsx` and `<Suspense>` that match the final layout.
- **TTFB:** caching with `"use cache"`, Partial Prerendering and CDN delivery.

### Measuring
- **Lab:** Lighthouse, Chrome DevTools Performance panel.
- **Field:** `useReportWebVitals` from `next/web-vitals` to send metrics to your analytics, Vercel Speed Insights, or the Chrome UX Report.
- `experimental.webVitalsAttribution` adds attribution data that helps find the cause of poor scores.

### Interview tip
Name the metric, the threshold, and one concrete Next.js technique per metric.
--- code
// app/web-vitals.tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric.name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB"
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // "good" | "needs-improvement" | "poor"
      id: metric.id,
      page: window.location.pathname,
    });
    // sendBeacon survives page unloads
    if (!navigator.sendBeacon?.("/api/vitals", body)) {
      fetch("/api/vitals", { method: "POST", body, keepalive: true });
    }
  });
  return null;
}

// app/layout.tsx
// <body><WebVitals />{children}</body>
