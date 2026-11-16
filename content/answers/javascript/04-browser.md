=== j76 | M | What is Promise.race()?
**`Promise.race(iterable)` returns a promise that settles the same way as the first input promise to settle, whether that first one fulfills or rejects.**

### Typical uses
- **Timeouts**: race the real operation against a promise that rejects after N milliseconds.
- **Fastest source wins**: query a cache and the network and use whichever answers first (though `Promise.any` is usually better here, because it ignores failures).
- **Cancellation signals**: race work against a promise that rejects when the user navigates away.

### race vs any
- `race`: the first to **settle** wins, even if it is a failure.
- `any`: the first to **succeed** wins; it rejects only if every promise fails (with an `AggregateError`).

### Important caveats
- **The losers keep running.** A timed-out `fetch` still completes in the background and still uses bandwidth. To actually stop it, use an `AbortController` (`fetch(url, { signal })`). For simple timeouts, `AbortSignal.timeout(ms)` does both in one step.
- An **empty** iterable gives a promise that stays pending forever.
- Clear your timeout timer when the real operation wins, or it keeps the process (or test runner) alive.

### Modern timeout pattern
`fetch(url, { signal: AbortSignal.timeout(5000) })` rejects with a `TimeoutError` and cancels the request, which is cleaner than a race for fetch specifically. `Promise.race` remains the general tool for any promise.
--- code
const wait = (ms, value, fail = false) =>
  new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error(value)) : resolve(value)), ms));

console.log(await Promise.race([wait(50, "slow"), wait(10, "fast")])); // fast

// The first to settle wins, even if it's a rejection
try {
  await Promise.race([wait(30, "ok"), wait(10, "failed first", true)]);
} catch (e) {
  console.log("rejected:", e.message); // rejected: failed first
}

// Reusable timeout helper (clears its timer when the work wins)
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

console.log(await withTimeout(wait(10, "in time"), 100)); // in time
try {
  await withTimeout(wait(200, "too late"), 30);
} catch (e) {
  console.log(e.message); // Timed out after 30ms
}

// any: first SUCCESS wins, failures are ignored
console.log(await Promise.any([wait(5, "x", true), wait(20, "first success")])); // first success

=== j77 | M | What is Promise.allSettled()?
**`Promise.allSettled(iterable)` waits for every promise to finish, whether it succeeds or fails, and fulfills with an array of result objects describing each outcome; it never rejects.**

### Result shape
Each item is either:
- `{ status: "fulfilled", value }`
- `{ status: "rejected", reason }`

Results are in the same order as the input.

### When to use it
When operations are **independent** and partial success is acceptable:
- Loading several dashboard widgets: show the ones that worked and an error card for the rest.
- Sending notifications to many recipients and reporting which failed.
- Cleanup tasks where every one should be attempted.
- Batch uploads with a per-file status.

### allSettled vs all
- `Promise.all` is **all-or-nothing** and rejects on the first failure, losing the other results.
- `Promise.allSettled` **always** gives you every outcome.

### Handling the results
Split them with `filter` on `status`, or use `Object.groupBy(results, r => r.status)`. Remember that `allSettled` itself never rejects, so a `try/catch` around it will not catch the individual failures. You must inspect each result.

### Retrying failures
A common pattern is to run `allSettled`, collect the rejected items, and retry just those.
--- code
const loadWidget = (name, ms, fail = false) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error(`${name} unavailable`)) : resolve({ name, data: `${name} data` })), ms)
  );

const results = await Promise.allSettled([
  loadWidget("sales", 20),
  loadWidget("weather", 10, true),
  loadWidget("news", 15),
]);

console.log(results.map((r) => r.status)); // ["fulfilled", "rejected", "fulfilled"]

for (const [i, r] of results.entries()) {
  if (r.status === "fulfilled") console.log(`widget ${i}: show`, r.value.name);
  else console.log(`widget ${i}: error card ->`, r.reason.message);
}

// Group outcomes
const { fulfilled = [], rejected = [] } = Object.groupBy(results, (r) => r.status);
console.log(`${fulfilled.length} loaded, ${rejected.length} failed`); // 2 loaded, 1 failed

// Compare: Promise.all loses everything on one failure
try {
  await Promise.all([loadWidget("sales", 20), loadWidget("weather", 10, true)]);
} catch (e) {
  console.log("Promise.all rejected:", e.message); // Promise.all rejected: weather unavailable
}

=== j78 | M | What is the Fetch API?
**The Fetch API is the built-in, promise-based way to make HTTP requests in browsers, Node.js (18+), Deno, Bun and edge runtimes: `fetch(url, options)` returns a promise of a `Response`.**

### Basic flow
1. `const res = await fetch(url, options)`.
2. Check `res.ok` (status 200-299) or `res.status`.
3. Read the body once with `res.json()`, `res.text()`, `res.blob()`, `res.arrayBuffer()` or `res.formData()`.

### The surprise: HTTP errors do not reject
`fetch` rejects **only** on network failures (offline, DNS, CORS blocked, aborted). A 404 or 500 **fulfills** normally. Always check `res.ok` and throw yourself.

### Common options
- `method`: `"POST"`, `"PUT"`, `"DELETE"`...
- `headers`: e.g. `{ "Content-Type": "application/json", Authorization: "Bearer ..." }`
- `body`: a string (`JSON.stringify(data)`), `FormData`, `Blob` or `URLSearchParams`. With `FormData`, do not set `Content-Type` yourself; the browser adds the multipart boundary.
- `signal`: an `AbortSignal` to cancel, e.g. `AbortSignal.timeout(5000)`.
- `credentials`: `"include"` to send cookies cross-origin.
- `cache`: control the HTTP cache. In Next.js, `fetch` also accepts `next: { revalidate, tags }`.

### Good habits
- Wrap fetch in a small helper that checks `ok`, parses JSON and throws a meaningful error.
- Cancel requests that are no longer needed (component unmount, a new search) with `AbortController`.
- A body can be read only once; use `res.clone()` if you need it twice.
--- code
// A small fetch wrapper with timeout and proper HTTP error handling
async function fetchJson(url, { timeout = 5000, ...options } = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// data: URLs let this example run offline; real code would call an API URL
const todo = await fetchJson('data:application/json,{"id":1,"title":"Learn fetch","done":false}');
console.log(todo.title, todo.done); // Learn fetch false

// POST JSON (shape of a real request)
const request = new Request("https://api.example.com/todos", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Write tests" }),
});
console.log(request.method, request.headers.get("Content-Type")); // POST application/json

// Cancel a request that's no longer needed
const controller = new AbortController();
const pending = fetch("data:text/plain,hello", { signal: controller.signal });
controller.abort();
try {
  await pending;
} catch (e) {
  console.log(e.name); // AbortError
}

// Reading the body: text, json, blob...
const res = await fetch("data:text/plain,plain text body");
console.log(res.ok, res.status, await res.text()); // true 200 plain text body

=== j79 | E | What is Axios?
**Axios is a popular third-party HTTP client library with a promise-based API that adds conveniences on top of the platform's request functions, such as automatic JSON handling, interceptors, rejecting on HTTP errors and instance-wide defaults.**

### What it adds compared to `fetch`
- **Rejects on HTTP errors** (4xx/5xx) by default, so a failed request goes straight to `catch`.
- **Automatic JSON**: request bodies are serialised and responses parsed (`response.data`).
- **Interceptors**: run code before every request (attach auth tokens) or after every response (refresh tokens, central error logging).
- **Instances**: `axios.create({ baseURL, timeout, headers })` for each API.
- **Timeouts** via a simple option, and upload/download progress events.
- Works the same in the browser and Node.

### fetch today
Native `fetch` is now available everywhere (browsers, Node 18+, Deno, Bun, edge runtimes) and supports `AbortSignal.timeout`, streaming and the Next.js caching extensions. Many teams now write a 20-line `fetch` wrapper instead of adding a dependency. Axios still makes sense when you want interceptors and its conventions across a large codebase.

### Things to know
- Axios errors carry `error.response` (server replied with an error status), `error.request` (no response) or neither (setup error).
- Cancel requests with an `AbortController` signal (the old `CancelToken` is deprecated).
- In Next.js, prefer `fetch` in Server Components so you get built-in caching and revalidation.
--- code
// Requires: npm install axios
import axios from "axios";

const api = axios.create({
  baseURL: "https://api.example.com",
  timeout: 5000,
  headers: { Accept: "application/json" },
});

// Attach a token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Central error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);

export async function createTodo(title) {
  try {
    const { data } = await api.post("/todos", { title }); // body serialised for you
    return data; // already parsed JSON
  } catch (err) {
    if (err.response) throw new Error(`Server error ${err.response.status}`);
    if (err.request) throw new Error("No response (network or timeout)");
    throw err;
  }
}

=== j80 | E | What is an API call?
**An API call is a request your code sends to another program's interface (usually a web server over HTTP) to read or change data, followed by a response, typically in JSON.**

### Anatomy of an HTTP API call
- **URL / endpoint**: `https://api.example.com/users/42`
- **Method**: `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (remove).
- **Headers**: metadata such as `Content-Type`, `Authorization`, `Accept`.
- **Body**: data sent with `POST`/`PUT`/`PATCH`, usually JSON.
- **Response**: a status code (`200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `404` Not Found, `500` Server Error), headers, and a body.

### Making a call in JavaScript
With `fetch` (built in) or a library like Axios. The call is asynchronous, so you use `await` or `.then`.

### What a robust API call handles
- **Loading state** while waiting.
- **Errors**: network failures and HTTP error statuses (remember `fetch` does not reject on 4xx/5xx).
- **Timeouts and cancellation** with `AbortController`.
- **Validation** of the response shape before using it.
- **Retries** with backoff for temporary failures (and only for idempotent requests).
- **Security**: never put secret API keys in browser code; call your own backend, which holds the secrets.

### Types of APIs
REST (resource URLs), GraphQL (one endpoint, query language), RPC-style (including Next.js Server Actions), WebSockets for real-time, and browser APIs (Geolocation, Clipboard) that are "APIs" in the broader sense.
--- code
// A complete, realistic API call: loading state, timeout, errors, validation
async function getUser(id) {
  const state = { loading: true, error: null, user: null };
  try {
    // offline demo: a data: URL standing in for https://api.example.com/users/:id
    const body = JSON.stringify({ id, name: "Ada Lovelace", email: "ada@example.com" });
    const res = await fetch(`data:application/json,${encodeURIComponent(body)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

    const data = await res.json();
    if (typeof data?.name !== "string") throw new Error("Unexpected response shape");
    state.user = data;
  } catch (err) {
    state.error = err.name === "TimeoutError" ? "The server took too long" : err.message;
  } finally {
    state.loading = false;
  }
  return state;
}

const result = await getUser(42);
console.log(result); // { loading: false, error: null, user: { id: 42, name: "Ada Lovelace", ... } }

=== j81 | E | What is the DOM?
**The DOM (Document Object Model) is the browser's live, tree-shaped object representation of an HTML document; JavaScript reads and changes the page through it, and the browser re-renders whatever changes.**

### The tree
The browser parses HTML into **nodes**: the `document` at the root, then element nodes (`<html>`, `<body>`, `<div>`), text nodes, comment nodes and attributes. Each element node is an object with properties (`id`, `className`, `value`), methods (`append`, `remove`, `addEventListener`) and relationships (`parentElement`, `children`, `nextElementSibling`).

### DOM vs HTML source
The DOM is not the HTML file. The browser fixes invalid markup, adds missing tags (like `<tbody>`), and JavaScript changes the DOM after load. DevTools' Elements panel shows the **current DOM**, while "View Source" shows the original HTML.

### What you do with it
- Find elements: `querySelector`, `querySelectorAll`, `getElementById`.
- Change content and structure: `textContent`, `append`, `remove`, `replaceWith`.
- Change appearance: `classList`, `style`.
- React to users: `addEventListener`.

### Performance
Reading layout properties (`offsetHeight`, `getBoundingClientRect`) after writes forces the browser to recalculate layout. Batch reads and writes, and build many nodes off-screen (e.g. in a `DocumentFragment`) before inserting them.

### Frameworks
React, Vue, Svelte and Angular manage the DOM for you and update only what changed; you rarely touch it directly, but knowing it explains what they do under the hood.
--- code
document.body.innerHTML = `
  <main id="app">
    <h1 class="title">Shopping list</h1>
    <ul id="list"><li>Milk</li><li>Bread</li></ul>
  </main>`;

// The DOM is a tree of objects
const list = document.querySelector("#list");
console.log(list.tagName, list.children.length); // UL 2
console.log(list.parentElement.id); // app
console.log(list.firstElementChild.textContent); // Milk

// Change it: the page updates immediately
const item = document.createElement("li");
item.textContent = "Eggs";
list.append(item);
document.querySelector(".title").textContent = "Shopping list (3 items)";

// Walk the tree
function printTree(node, depth = 0) {
  console.log(`${"  ".repeat(depth)}<${node.tagName.toLowerCase()}>`);
  for (const child of node.children) printTree(child, depth + 1);
}
printTree(document.querySelector("#app"));

=== j82 | M | What is DOM manipulation?
**DOM manipulation means using JavaScript to create, change, move or remove elements, attributes, text and styles on the page after it has loaded.**

### Core operations
- **Create**: `document.createElement("li")`, `document.createTextNode(text)`, or `<template>` cloning.
- **Insert**: `parent.append(...nodes)`, `prepend`, `before`, `after`, `replaceWith`, `insertAdjacentHTML/Element`.
- **Remove**: `element.remove()`.
- **Content**: `textContent` (safe for text) or `innerHTML` (parses HTML, an XSS risk with user input).
- **Attributes**: `setAttribute`, `getAttribute`, `removeAttribute`, `toggleAttribute`, and `dataset` for `data-*` attributes.
- **Classes and styles**: `classList.add/remove/toggle`, `element.style.setProperty`.

### Doing it efficiently
- **Batch DOM writes**: build many nodes in a `DocumentFragment` (or an array passed to one `append`) and insert once.
- **Avoid layout thrashing**: do not alternate reading layout (`offsetHeight`) and writing styles in a loop.
- **Prefer classes over inline styles** so CSS controls appearance.
- **Use event delegation** instead of a listener per item.
- **Animate with CSS transforms/opacity**, not layout properties.

### Safety
Never insert untrusted strings with `innerHTML`. Use `textContent`, or sanitise with a library like DOMPurify, or the newer `setHTML` Sanitizer API where supported.

### Frameworks vs manual
Frameworks are better for complex, state-driven UIs. Direct manipulation is still right for small widgets, progressive enhancement and performance-critical spots.
--- code
document.body.innerHTML = `<h2>Tasks</h2><ul id="tasks"></ul><button id="add">Add 3 tasks</button>`;
const list = document.getElementById("tasks");

function renderTasks(titles) {
  // Build off-screen, insert once (one layout instead of N)
  const fragment = document.createDocumentFragment();
  for (const title of titles) {
    const li = document.createElement("li");
    li.textContent = title; // safe: never parses HTML
    li.dataset.status = "todo";
    li.classList.add("task");
    fragment.append(li);
  }
  list.append(fragment);
}

renderTasks(["Write docs", "Fix bug", "<img src=x onerror=alert(1)>"]); // the last one stays plain text
console.log(list.children.length, list.lastElementChild.textContent); // 3 "<img src=x onerror=alert(1)>"

document.getElementById("add").addEventListener("click", () => renderTasks(["A", "B", "C"]));

// Update, move and remove
const first = list.firstElementChild;
first.dataset.status = "done";
first.classList.toggle("done", true);
list.append(first); // moves it to the end (no copy)
list.querySelector('[data-status="todo"]').remove();
console.log([...list.children].map((li) => `${li.textContent}:${li.dataset.status}`));

=== j83 | M | What is event bubbling?
**Event bubbling is the phase where an event, after reaching its target element, travels back up through each ancestor (parent, grandparent, up to `document` and `window`), triggering their listeners for the same event.**

### The full journey of an event
1. **Capturing phase**: from `window` down to the target's parent.
2. **Target phase**: on the element that was actually clicked.
3. **Bubbling phase**: back up from the target to `window`.

Listeners added normally (`addEventListener(type, fn)`) run in the bubbling phase.

### target vs currentTarget
- `event.target`: the element where the event started (the innermost clicked element).
- `event.currentTarget`: the element whose listener is running right now.

### Stopping it
- `event.stopPropagation()`: stops the event from reaching further ancestors.
- `event.stopImmediatePropagation()`: also stops other listeners on the same element.
Use these sparingly; they can break analytics, outside-click handlers for dropdowns, and delegated listeners elsewhere.

### Not every event bubbles
`focus`, `blur`, `mouseenter`, `mouseleave`, `load` and `scroll` (on elements) do not bubble. Bubbling alternatives exist: `focusin`/`focusout`, `mouseover`/`mouseout`. Check `event.bubbles`.

### Why it is useful
Bubbling makes **event delegation** possible: one listener on a parent handles events for all its children, including ones added later.
--- code
document.body.innerHTML = `
  <div id="card" style="padding:16px;border:1px solid #ccc">
    Card
    <button id="like">Like <span id="icon">♥</span></button>
  </div>`;

const log = [];
for (const id of ["card", "like", "icon"]) {
  document.getElementById(id).addEventListener("click", (e) => {
    log.push(`${e.currentTarget.id} (target: ${e.target.id})`);
  });
}
document.body.addEventListener("click", () => log.push("body"));

document.getElementById("icon").click(); // simulate a click on the innermost element
console.log(log);
// ["icon (target: icon)", "like (target: icon)", "card (target: icon)", "body"]

// Stop the event from reaching ancestors
log.length = 0;
document.getElementById("like").addEventListener("click", (e) => e.stopPropagation());
document.getElementById("icon").click();
console.log(log); // ["icon (target: icon)", "like (target: icon)"] - card and body never ran

console.log(new Event("focus").bubbles, new MouseEvent("click", { bubbles: true }).bubbles); // false true

=== j84 | M | What is event capturing?
**Event capturing is the first phase of event propagation, where the event travels from `window` down through each ancestor towards the target; you listen during it by passing `{ capture: true }` (or `true`) to `addEventListener`.**

### Propagation order
1. **Capture**: `window` → `document` → `html` → `body` → ... → parent of target.
2. **Target**: listeners on the target itself.
3. **Bubble**: back up from the target to `window`.

So a capturing listener on an ancestor runs **before** any listener on the target, and a bubbling listener on the same ancestor runs **after**.

### When capturing is useful
- **Intercepting events first**: e.g. a global handler that blocks clicks while a modal is open, or logs every interaction before components see it.
- **Handling non-bubbling events at a parent**: `focus`, `blur`, `load` and `scroll` do not bubble, but they do go through the capture phase. `form.addEventListener("focus", fn, true)` sees focus on every input.
- **Outside-click detection** that should run before inner components stop propagation.

### Removing a capturing listener
The capture flag is part of the listener's identity: `removeEventListener(type, fn, true)` must pass `true` again, or nothing is removed.

### In React
React supports capture-phase handlers with the `Capture` suffix: `onClickCapture`, `onFocusCapture`.
--- code
document.body.innerHTML = `<section id="outer"><div id="inner"><button id="btn">Click</button></div></section>`;
const order = [];

const outer = document.getElementById("outer");
const inner = document.getElementById("inner");
const btn = document.getElementById("btn");

outer.addEventListener("click", () => order.push("outer capture"), { capture: true });
inner.addEventListener("click", () => order.push("inner capture"), true);
btn.addEventListener("click", () => order.push("button (target)"));
inner.addEventListener("click", () => order.push("inner bubble"));
outer.addEventListener("click", () => order.push("outer bubble"));

btn.click();
console.log(order);
// ["outer capture", "inner capture", "button (target)", "inner bubble", "outer bubble"]

// focus does not bubble, but capturing still sees it
document.body.insertAdjacentHTML("beforeend", `<form id="f"><input id="a"><input id="b"></form>`);
const seen = [];
document.getElementById("f").addEventListener("focus", (e) => seen.push(e.target.id), true);
document.getElementById("a").focus();
document.getElementById("b").focus();
console.log("focused inside form:", seen); // ["a", "b"]

=== j85 | M | What is event delegation?
**Event delegation is attaching one event listener to a common ancestor instead of to each child, and using `event.target` (usually with `closest()`) to work out which child the event came from; it relies on events bubbling up.**

### Why use it
- **Fewer listeners**: one listener for a list of 1,000 items instead of 1,000.
- **Dynamic content just works**: items added later are handled automatically, with no need to attach new listeners.
- **Less cleanup**: nothing to remove when items are deleted, which also avoids leaks.

### How to do it well
1. Listen on a stable parent (the list, table or container).
2. In the handler, find the relevant element with `event.target.closest(selector)`. This handles clicks on nested elements, like an icon inside a button.
3. Check that the found element is inside your container (`container.contains(el)`).
4. Read what to do from `data-*` attributes (`data-action="delete"`, `data-id="42"`).

### Limitations
- Only works for events that bubble (use `focusin`/`focusout` instead of `focus`/`blur`).
- If a child calls `stopPropagation()`, the parent never sees the event.
- Very frequent events (`mousemove`) on huge containers can do more work per event than targeted listeners.

### Frameworks
React attaches listeners at the root of the app and dispatches to components, which is delegation done for you.
--- code
document.body.innerHTML = `
  <ul id="todos">
    <li data-id="1">Write docs <button data-action="done">✓</button> <button data-action="delete">✕</button></li>
    <li data-id="2">Fix bug <button data-action="done">✓</button> <button data-action="delete">✕</button></li>
  </ul>`;
const list = document.getElementById("todos");
const events = [];

// ONE listener for every current and future item
list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !list.contains(button)) return;
  const item = button.closest("li");
  const { action } = button.dataset;
  events.push(`${action} #${item.dataset.id}`);
  if (action === "delete") item.remove();
  if (action === "done") item.style.textDecoration = "line-through";
});

// Items added later work automatically
list.insertAdjacentHTML("beforeend", `<li data-id="3">Ship it <button data-action="delete">✕</button></li>`);

list.querySelector('[data-id="1"] [data-action="done"]').click();
list.querySelector('[data-id="3"] [data-action="delete"]').click();
console.log(events, list.children.length); // ["done #1", "delete #3"] 2

=== j86 | E | What is addEventListener?
**`target.addEventListener(type, listener, options)` registers a function to run when an event of that type happens on a DOM element, `document`, `window` or any other `EventTarget`; you can add many listeners for the same event.**

### Options
- **`once: true`**: run the listener a single time, then remove it automatically.
- **`passive: true`**: promise not to call `preventDefault()`. Browsers can then scroll immediately, which makes `touchstart`, `touchmove` and `wheel` listeners smoother.
- **`capture: true`**: listen in the capture phase instead of the bubble phase.
- **`signal`**: an `AbortSignal`; calling `controller.abort()` removes every listener registered with it. This is the cleanest way to clean up many listeners at once (for example when a component unmounts).

### Removing listeners
`removeEventListener(type, sameFunction, sameCaptureFlag)` needs the **exact same function reference**, so inline arrow functions cannot be removed. Keep a reference, or use `signal`.

### Compared to `onclick`
`element.onclick = fn` holds only one handler; assigning again replaces it. `addEventListener` supports multiple handlers and the options above.

### Inside the listener
- `event.target` (origin) vs `event.currentTarget` (the element the listener is on).
- `event.preventDefault()` stops default behaviour (form submit, link navigation).
- With a normal function, `this` is `currentTarget`; with an arrow function, use `event.currentTarget`.

### Custom events
`target.dispatchEvent(new CustomEvent("cart:add", { detail: {...} }))` lets parts of your app communicate through the DOM.
--- code
document.body.innerHTML = `<button id="save">Save</button> <a id="link" href="https://example.com">Link</a>`;
const save = document.getElementById("save");
const log = [];

// Multiple listeners on the same event
save.addEventListener("click", () => log.push("validate"));
save.addEventListener("click", () => log.push("save"));

// once: removed automatically after the first run
save.addEventListener("click", () => log.push("first-click analytics"), { once: true });

save.click();
save.click();
console.log(log); // ["validate", "save", "first-click analytics", "validate", "save"]

// Remove many listeners at once with an AbortController
const controller = new AbortController();
window.addEventListener("resize", () => {}, { signal: controller.signal });
document.addEventListener("keydown", () => {}, { signal: controller.signal });
controller.abort(); // both removed

// preventDefault: stop link navigation
document.getElementById("link").addEventListener("click", (e) => {
  e.preventDefault();
  console.log("navigation prevented for", e.currentTarget.href);
});
document.getElementById("link").click();

// Custom events
document.addEventListener("cart:add", (e) => console.log("added to cart:", e.detail.sku));
document.dispatchEvent(new CustomEvent("cart:add", { detail: { sku: "A1" } }));

=== j87 | M | Difference between innerHTML and textContent?
**`textContent` reads or sets an element's plain text (safe, fast, no HTML parsing); `innerHTML` reads or sets its HTML markup, which the browser parses into elements, so it is powerful but dangerous with untrusted input.**

### textContent
- **Setting** replaces all children with a single text node. Characters like `<` are shown literally, never interpreted.
- **Reading** returns the text of all descendants, including text hidden with CSS and inside `<script>`/`<style>`.
- Fast: no parsing, no layout needed.

### innerHTML
- **Setting** parses the string as HTML and replaces the children. Any existing child elements are destroyed, which also removes their event listeners and state (like an input's typed value).
- **Reading** serialises the children back to an HTML string.
- **XSS risk**: inserting user-provided content can run attacker code, for example through `<img src=x onerror="...">`. (Inserted `<script>` tags do not execute, but event-handler attributes do.)

### innerText
Similar to `textContent` but **layout-aware**: it respects CSS (hidden text is excluded, line breaks follow the rendering). Reading it forces a layout, so it is slower.

### Rules of thumb
- Displaying text, especially user content: **`textContent`**.
- Inserting trusted, static markup: `innerHTML` or `insertAdjacentHTML` is fine.
- Inserting user content as HTML: sanitise first (DOMPurify, or the Sanitizer API's `setHTML` where available), or build elements with `createElement`.
- Appending: `insertAdjacentHTML("beforeend", html)` avoids re-parsing and destroying existing children, unlike `innerHTML +=`.
--- code
document.body.innerHTML = `<div id="out"></div><p id="p">Hello <b>world</b><span style="display:none"> (hidden)</span></p>`;
const out = document.getElementById("out");
const userInput = '<img src="x" onerror="console.log(`XSS ran!`)"> Nice post';

// textContent: shown literally, never executed
out.textContent = userInput;
console.log(out.children.length, out.textContent.startsWith("<img")); // 0 true

// innerHTML parses markup -> the onerror handler would run with untrusted input!
// out.innerHTML = userInput;  // don't do this with user content

// Reading
const p = document.getElementById("p");
console.log(p.textContent); // "Hello world (hidden)"  - all text
console.log(p.innerText); // "Hello world"           - only what's rendered
console.log(p.innerHTML); // 'Hello <b>world</b><span style="display:none"> (hidden)</span>'

// innerHTML += destroys and recreates existing children (losing listeners/state)
document.body.insertAdjacentHTML("beforeend", `<div id="box"><input id="name" value="typed"></div>`);
const box = document.getElementById("box");
const before = document.getElementById("name");
box.innerHTML += "<p>appended</p>";
console.log(before === document.getElementById("name")); // false - the input was recreated
box.insertAdjacentHTML("beforeend", "<p>appended safely</p>"); // keeps existing nodes

=== j88 | E | What is querySelector?
**`querySelector(selector)` returns the first element matching a CSS selector (or `null`), and `querySelectorAll(selector)` returns a static `NodeList` of all matches; both work on `document` or on any element to search inside it.**

### Selectors you can use
Anything CSS supports: `#id`, `.class`, `tag`, attributes (`[data-id="3"]`, `input[type=email]`), combinators (`.card > h2`, `ul li`), pseudo-classes (`:checked`, `:not(.hidden)`, `li:nth-child(2n)`, `:has(img)`).

### Scoping
`container.querySelector(".title")` searches only inside `container`, which is faster and avoids matching elements elsewhere on the page.

### Static vs live collections
- `querySelectorAll` returns a **static** snapshot: adding elements later does not change it.
- `getElementsByClassName` / `getElementsByTagName` return **live** `HTMLCollection`s that update automatically, which can surprise you inside loops.

### Working with the results
- `NodeList` supports `forEach` and `for...of`, but not `map`/`filter`. Convert with `[...nodeList]` or `Array.from(nodeList)`.
- Always handle `null` from `querySelector`: `document.querySelector("#missing")?.remove()`.

### Related methods
- `element.closest(selector)`: walks **up** to the nearest matching ancestor (great for event delegation).
- `element.matches(selector)`: checks whether an element matches.
- `getElementById` is slightly faster for a single id, but the difference rarely matters.

### Escaping
For ids or values with special characters, use `CSS.escape(value)` inside the selector.
--- code
document.body.innerHTML = `
  <ul id="menu">
    <li class="item active" data-id="1">Home</li>
    <li class="item" data-id="2">About</li>
    <li class="item hidden" data-id="3">Admin</li>
  </ul>
  <input type="checkbox" id="agree" checked>`;

const menu = document.querySelector("#menu");
console.log(menu.querySelector(".active").textContent); // Home
console.log(document.querySelector('[data-id="2"]').textContent); // About
console.log(document.querySelector("#missing")); // null

const visible = menu.querySelectorAll(".item:not(.hidden)");
console.log(visible.length, [...visible].map((li) => li.textContent)); // 2 ["Home", "About"]

console.log(document.querySelector("input:checked")?.id); // agree
console.log(document.querySelector("ul:has(.hidden)")?.id); // menu

// Static vs live
const staticList = document.querySelectorAll(".item");
const liveList = document.getElementsByClassName("item");
menu.insertAdjacentHTML("beforeend", `<li class="item" data-id="4">Blog</li>`);
console.log(staticList.length, liveList.length); // 3 4

// closest and matches
const about = document.querySelector('[data-id="2"]');
console.log(about.closest("ul").id, about.matches(".item:not(.active)")); // menu true

=== j89 | E | What is classList?
**`element.classList` is a live list of an element's CSS classes with methods to add, remove, toggle, replace and check classes, which is far safer than editing the `className` string by hand.**

### Methods
- `add("a", "b")`: adds one or more classes (no duplicates).
- `remove("a", "b")`: removes classes (no error if missing).
- `toggle("open")`: adds if missing, removes if present; returns the new state.
- `toggle("open", condition)`: forces add (`true`) or remove (`false`). Ideal for syncing a class with state.
- `contains("open")`: checks for a class.
- `replace("old", "new")`: swaps one class for another.
- It is iterable, and `length`/`item(i)` work too.

### Why prefer it over className
`element.className = "active"` overwrites every other class. Concatenating strings leads to duplicates and spacing bugs. `classList` changes only what you ask.

### Good practice
- Toggle classes and let CSS handle appearance and transitions, instead of setting many inline styles.
- Keep state classes clearly named (`is-open`, `is-loading`, `has-error`).
- For accessibility, pair visual classes with ARIA attributes (`aria-expanded`, `aria-hidden`), because screen readers do not see classes.

### SVG
`classList` works on SVG elements too, where `className` is an object rather than a string.
--- code
document.body.innerHTML = `
  <style>.panel{display:none}.panel.is-open{display:block}</style>
  <button id="toggle" aria-expanded="false">Menu</button>
  <nav id="panel" class="panel theme-light">Links</nav>`;

const panel = document.getElementById("panel");
const button = document.getElementById("toggle");

panel.classList.add("rounded", "shadow");
console.log([...panel.classList]); // ["panel", "theme-light", "rounded", "shadow"]

button.addEventListener("click", () => {
  const isOpen = panel.classList.toggle("is-open"); // returns the new state
  button.setAttribute("aria-expanded", String(isOpen)); // keep accessibility in sync
});
button.click();
console.log(panel.classList.contains("is-open"), button.getAttribute("aria-expanded")); // true "true"

// Force a state from a condition
const hasError = false;
panel.classList.toggle("has-error", hasError);

// Swap a theme class
panel.classList.replace("theme-light", "theme-dark");
console.log(panel.className); // "panel theme-dark rounded shadow is-open" - replace keeps the position

// className overwrites everything (usually a bug)
panel.className = "panel";
console.log(panel.classList.length); // 1

=== j90 | M | What is dataset?
**`element.dataset` gives read/write access to an element's custom `data-*` attributes as a plain object, converting names from kebab-case in HTML (`data-user-id`) to camelCase in JavaScript (`dataset.userId`).**

### Rules
- `data-user-id="42"` ↔ `element.dataset.userId === "42"`.
- Values are **always strings**. Convert them yourself: `Number(el.dataset.id)`, `el.dataset.active === "true"`, or `JSON.parse` for small JSON.
- Setting `el.dataset.status = "done"` adds `data-status="done"` to the HTML.
- `delete el.dataset.status` removes the attribute.
- `"status" in el.dataset` checks for it.

### Common uses
- **Event delegation**: store an id and action on the element (`data-id`, `data-action`) and read them in one parent listener.
- **Configuration for widgets**: `<div data-carousel data-interval="5000">`.
- **CSS hooks**: style with attribute selectors (`[data-state="open"]`), which pairs nicely with state-driven UI. Libraries like Radix UI expose `data-state` for exactly this.
- Passing server-rendered values to client scripts.

### What not to store
- Sensitive data: it is visible in the HTML to anyone.
- Large or complex data: keep that in JavaScript (a `Map` keyed by id).
- Anything that duplicates state you already hold elsewhere and may go out of sync.
--- code
document.body.innerHTML = `
  <style>[data-state="open"] { font-weight: bold; }</style>
  <button id="product" data-product-id="42" data-price="19.99" data-in-stock="true" data-state="closed">
    Add to cart
  </button>`;

const btn = document.getElementById("product");

console.log(btn.dataset); // { productId: "42", price: "19.99", inStock: "true", state: "closed" }
console.log(typeof btn.dataset.price); // "string" - always strings

// Convert explicitly
const product = {
  id: Number(btn.dataset.productId),
  price: parseFloat(btn.dataset.price),
  inStock: btn.dataset.inStock === "true",
};
console.log(product); // { id: 42, price: 19.99, inStock: true }

// Write and remove
btn.dataset.state = "open"; // CSS [data-state="open"] now applies
btn.dataset.lastClicked = "2026-11-17";
console.log(btn.getAttribute("data-last-clicked")); // "2026-11-17" (camelCase -> kebab-case)
delete btn.dataset.lastClicked;
console.log(btn.hasAttribute("data-last-clicked"), "state" in btn.dataset); // false true

=== j91 | E | Difference: LocalStorage vs SessionStorage?
**Both store string key-value pairs in the browser with the same API, but `localStorage` persists until it is cleared (across tabs and restarts), while `sessionStorage` lasts only for one tab's session and is deleted when that tab closes.**

| | `localStorage` | `sessionStorage` |
|---|---|---|
| Lifetime | Until cleared by code, the user or the browser | Until the tab/window closes |
| Shared between tabs (same origin) | Yes | No, each tab has its own |
| Survives reload | Yes | Yes |
| Capacity | About 5 MB per origin | About 5 MB per origin |
| `storage` event in other tabs | Yes | No |

### API (identical)
`setItem(key, value)`, `getItem(key)` (returns `null` if missing), `removeItem(key)`, `clear()`, `key(index)`, `length`.

### Important details
- **Strings only**: store objects with `JSON.stringify` and read them with a guarded `JSON.parse`.
- **Synchronous**: it blocks the main thread; fine for small data, bad for large or frequent writes.
- **Can throw**: in private browsing modes, when storage is disabled, or when the quota is full. Wrap access in `try/catch`.
- **Not secure**: any JavaScript on the page (including an XSS payload) can read it. Never store auth tokens or secrets there; prefer HttpOnly cookies for sessions.
- **Not available on the server** (SSR), so read it inside effects or event handlers.

### Choosing
- `localStorage`: preferences, drafts, cached non-sensitive data.
- `sessionStorage`: per-tab state like a multi-step form or a scroll position.
- Larger or structured data: **IndexedDB**.
--- code
// A small, safe wrapper: JSON + error handling (storage can be blocked or full)
const store = (storage) => ({
  get(key, fallback = null) {
    try {
      const raw = storage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Could not save:", e.name); // e.g. QuotaExceededError
      return false;
    }
  },
});

// Even *reading* window.localStorage can throw (privacy settings, sandboxed iframes), so test it safely
function getStorage(kind) {
  try {
    const s = window[kind];
    s.setItem("__test__", "1");
    s.removeItem("__test__");
    return s;
  } catch {
    console.warn(`${kind} is unavailable here - using memory instead`);
    const mem = new Map(); // same API, lost on reload
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  }
}

const localStore = getStorage("localStorage");
const sessionStore = getStorage("sessionStorage");
const local = store(localStore); // survives restarts, shared across tabs
const session = store(sessionStore); // this tab only

local.set("preferences", { theme: "dark", fontSize: 16 });
session.set("checkoutStep", 2);

console.log(local.get("preferences").theme, session.get("checkoutStep")); // dark 2
console.log(typeof localStore.getItem("preferences")); // "string" - stored as JSON text
console.log(local.get("missing", "default")); // default

// Other tabs are notified when localStorage changes (not sessionStorage)
window.addEventListener("storage", (e) => console.log(`${e.key} changed in another tab`));

localStore.removeItem("preferences");
sessionStore.removeItem("checkoutStep");

=== j92 | M | What are Cookies?
**Cookies are small pieces of data (about 4 KB each) that a server or script stores in the browser and that the browser automatically sends back with every matching HTTP request; they are mainly used for sessions, preferences and tracking.**

### Setting cookies
- **Server**: `Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`.
- **JavaScript**: `document.cookie = "theme=dark; Max-Age=31536000; Path=/; SameSite=Lax"`. Each assignment sets one cookie; reading `document.cookie` returns all readable cookies as one string.
- A newer async API, **`cookieStore`**, is available in Chromium-based browsers.

### Attributes that matter
- **`HttpOnly`**: JavaScript cannot read it. Essential for session cookies, so an XSS attack cannot steal them.
- **`Secure`**: sent only over HTTPS.
- **`SameSite`**: `Lax` (default in modern browsers: sent on top-level navigations, not on cross-site sub-requests), `Strict` (never cross-site), `None` (always, requires `Secure`). This is the main defence against CSRF.
- **`Max-Age` / `Expires`**: without them it is a session cookie, removed when the browser closes.
- **`Domain` / `Path`**: which requests receive it.
- **`Partitioned`** (CHIPS): third-party cookies kept separate per top-level site.

### Cookies vs Web Storage
Cookies travel with **every** request (adding bytes to each one), are small, and can be HttpOnly. `localStorage` stays in the browser, is bigger, and is always readable by JavaScript.

### Privacy changes
Browsers increasingly restrict **third-party cookies** used for cross-site tracking, and privacy laws (GDPR) require consent for non-essential cookies.
--- code
// Minimal helpers for the cookies JavaScript is allowed to see
function setCookie(name, value, { days = 365, sameSite = "Lax", path = "/" } = {}) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}`;
}

function getCookie(name) {
  const pair = document.cookie
    .split("; ")
    .find((row) => row.startsWith(encodeURIComponent(name) + "="));
  return pair ? decodeURIComponent(pair.split("=").slice(1).join("=")) : null;
}

function deleteCookie(name, path = "/") {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`;
}

try {
  setCookie("theme", "dark");
  setCookie("lang", "en-GB");
  console.log(getCookie("theme"), getCookie("lang")); // dark en-GB
  deleteCookie("theme");
  console.log(getCookie("theme")); // null
} catch (e) {
  // cookies can be disabled by the user or blocked in sandboxed iframes (like this preview)
  console.warn("Cookies are blocked in this context:", e.name);
}

// A secure session cookie is set by the SERVER and is invisible to JavaScript:
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
console.log(navigator.cookieEnabled ? "cookies enabled" : "cookies disabled");

=== j93 | M | What are Web APIs?
**Web APIs are the interfaces the browser (or another host) provides to JavaScript beyond the core language, such as the DOM, `fetch`, timers, storage, Canvas, geolocation, the clipboard, Web Workers and many more.**

### Language vs platform
ECMAScript defines the language (syntax, types, `Promise`, `Array`). Everything that touches the outside world comes from the host. The browser exposes Web APIs through `window` (and `self` in workers); Node.js exposes its own APIs (and now implements many web standards like `fetch`, `URL`, `AbortController` and Web Streams).

### Well-known groups
- **Document and UI**: DOM, events, `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, View Transitions, Popover.
- **Network**: `fetch`, WebSocket, Server-Sent Events (`EventSource`), WebRTC.
- **Storage**: `localStorage`, `sessionStorage`, IndexedDB, Cache API, cookies, the Origin Private File System.
- **Concurrency and timing**: `setTimeout`, `requestAnimationFrame`, `requestIdleCallback`, Web Workers, `BroadcastChannel`.
- **Device and media**: Geolocation, Clipboard, Notifications, MediaDevices (camera and microphone), Web Audio, Vibration.
- **Graphics**: Canvas, WebGL, WebGPU.
- **Offline and installability**: Service Workers, Web App Manifest, Push.

### How they work with the event loop
Many Web APIs run outside the JavaScript thread (network, timers, workers) and deliver results back through the task or microtask queue.

### Feature detection and permissions
Check support before use (`if ("geolocation" in navigator)`), and expect permission prompts for sensitive APIs, many of which also require HTTPS ("secure contexts").
--- code
document.body.innerHTML = `<p id="status"></p><div style="height:150vh"></div><div id="footer">Footer</div>`;
const status = document.getElementById("status");
const report = (msg) => (status.textContent += msg + " | ");

// Feature detection before using a Web API
const features = {
  fetch: "fetch" in window,
  clipboard: "clipboard" in navigator,
  geolocation: "geolocation" in navigator,
  workers: "Worker" in window,
  indexedDB: "indexedDB" in window,
};
console.log(features);

// Timing API in sync with rendering
requestAnimationFrame((time) => report(`frame at ${Math.round(time)}ms`));

// IntersectionObserver: know when an element becomes visible (no scroll listeners needed)
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) report("footer is visible");
});
observer.observe(document.getElementById("footer"));

// Run heavy work off the main thread with a Web Worker
const workerCode = "onmessage = (e) => postMessage(e.data.reduce((a, b) => a + b, 0));";
const worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" })));
worker.onmessage = (e) => {
  console.log("sum computed in a worker:", e.data); // 5050
  worker.terminate();
};
worker.postMessage(Array.from({ length: 100 }, (_, i) => i + 1));

=== j94 | E | setTimeout vs setInterval?
**`setTimeout(fn, delay)` runs a function once after at least `delay` milliseconds; `setInterval(fn, delay)` runs it repeatedly every `delay` milliseconds until you stop it with `clearInterval`.**

### Both
- Return an id you pass to `clearTimeout` / `clearInterval`.
- Accept extra arguments that are passed to the callback.
- Are **minimum** delays, not guarantees. The callback runs only when the call stack is empty and the event loop reaches it, so busy code delays it.
- Are throttled in background tabs (often to once per second or less) and nested timers are clamped to at least 4 ms after a few levels.

### Problems with setInterval
- It schedules the next run regardless of whether the previous one finished. If the callback is slow or async (a network poll), runs can overlap or pile up.
- It keeps going forever if you forget to clear it, which is a common memory leak in components.

### Recursive setTimeout
Scheduling the next run at the end of the current one guarantees a gap between runs and makes it easy to change the delay (backoff) or stop based on a condition. This is the preferred pattern for polling.

### For animations
Use `requestAnimationFrame`, which syncs with the display refresh rate and pauses in hidden tabs.

### Cleanup
In React, clear timers in the effect cleanup function so they do not fire after the component unmounts.
--- code
// setTimeout: once
const id = setTimeout((name) => console.log(`Hello ${name} (once)`), 20, "Ada");

// setInterval: repeatedly, until cleared
let ticks = 0;
const intervalId = setInterval(() => {
  ticks++;
  console.log("tick", ticks);
  if (ticks === 3) clearInterval(intervalId); // always stop it
}, 10);

// Recursive setTimeout: the next run starts only after the previous finished
async function poll(task, { delay = 20, maxRuns = 3 } = {}) {
  let runs = 0;
  return new Promise((resolve) => {
    const run = async () => {
      runs++;
      const result = await task(runs);
      if (result === "done" || runs >= maxRuns) return resolve(runs);
      setTimeout(run, delay * runs); // easy to add backoff
    };
    run();
  });
}

const runs = await poll(async (n) => {
  console.log("poll attempt", n);
  return n === 2 ? "done" : "pending";
});
console.log("finished after", runs, "polls"); // finished after 2 polls

=== j95 | E | What is clearTimeout?
**`clearTimeout(id)` cancels a timer created by `setTimeout` before it fires, using the id that `setTimeout` returned; calling it with an id that already fired or is invalid does nothing.**

### Where it is essential
- **Debounce**: every new call clears the previous timer and starts a new one.
- **Component cleanup**: clear pending timers when a component unmounts (in a React effect's cleanup), otherwise the callback may update state that no longer exists.
- **Cancelling delayed actions**: "undo send" within 5 seconds, hiding a tooltip unless the pointer leaves, auto-logout warnings.
- **Timeouts for async work**: clear the timeout when the real operation finishes first.

### Details
- In browsers the id is a positive integer. In Node it is a `Timeout` object (which also has `ref()`/`unref()`).
- `clearTimeout` and `clearInterval` are technically interchangeable in browsers, but use the matching one for clarity.
- Keep the id in a variable that outlives the scheduling call (a closure, a ref, or an object property).

### Common bug
Storing the timer id in a variable that is recreated on every render (a plain variable in a React function component). The cleanup then clears the wrong id. Use the effect cleanup or a `useRef`.
--- code
// Undo send: cancel a delayed action
function sendWithUndo(message, delay = 50) {
  const timer = setTimeout(() => console.log("sent:", message), delay);
  return () => {
    clearTimeout(timer);
    console.log("cancelled:", message);
  };
}

sendWithUndo("first email"); // will be sent
const undo = sendWithUndo("second email");
undo(); // cancelled: second email

// Debounce relies on clearTimeout
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer); // cancel the previous pending call
    timer = setTimeout(() => fn(...args), wait);
  };
}
const save = debounce((text) => console.log("saved draft:", text), 30);
save("H");
save("He");
save("Hello"); // only this one is saved

// Clearing an already-fired or invalid id is harmless
clearTimeout(123456);
clearTimeout(undefined);

await new Promise((r) => setTimeout(r, 120));

=== j96 | M | What is the History API?
**The History API (`window.history`) lets JavaScript move through the browser's session history and change the URL without reloading the page, using `pushState`, `replaceState` and the `popstate` event; it is the foundation of client-side routing.**

### Methods
- **`history.pushState(state, "", url)`**: adds a new entry and changes the address bar. No request is made and no `popstate` fires.
- **`history.replaceState(state, "", url)`**: changes the current entry instead of adding one, useful for updating query params (filters, search) without growing the back stack.
- **`history.back()`, `forward()`, `go(n)`**: navigate like the browser buttons.
- **`history.state`**: the state object of the current entry.
- **`history.length`**: number of entries in this tab's session.

### The popstate event
Fires when the user navigates with back/forward (or you call `back`/`go`). Your router reads `location` and `event.state` and renders the matching view.

### Rules
- URLs must be **same-origin**.
- The `state` object must be structured-cloneable and is limited in size.
- After `pushState`, the server must be able to handle that URL on a refresh (serve the app shell for all routes).

### Navigation API
A newer API, `window.navigation`, gives a single `navigate` event for all navigations (links, forms, back/forward) and is supported in Chromium browsers and recent Safari and Firefox releases.

### In frameworks
React Router, Next.js and others wrap this. In Next.js, `window.history.pushState/replaceState` also integrate with the router.
--- code
document.body.innerHTML = `<nav><a href="/home" data-link>Home</a> <a href="/about" data-link>About</a></nav><main id="view"></main>`;
const view = document.getElementById("view");
const routes = { "/home": "Welcome home", "/about": "About us" };

function render(path) {
  view.textContent = routes[path] ?? "Not found";
}

// Change the URL without reloading. Sandboxed iframes (like the playground preview) forbid
// URL changes entirely, so routing keeps working there, just without updating the address.
function navigate(path, replace = false) {
  try {
    history[replace ? "replaceState" : "pushState"]({ path }, "", path);
  } catch {
    console.warn("history API blocked in this sandboxed preview - open on a normal page to see URL changes");
  }
  render(path);
}

// Intercept link clicks: change the URL without reloading
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;
  e.preventDefault();
  navigate(link.getAttribute("href"));
});

// Back/forward buttons
window.addEventListener("popstate", (e) => render(e.state?.path ?? location.pathname));

document.querySelector('a[href="/about"]').click();
console.log(view.textContent); // About us  (and on a normal page: location.pathname === "/about")

// replaceState: update the query string without adding a history entry
const params = new URLSearchParams(location.search);
params.set("sort", "newest");
try {
  history.replaceState(history.state, "", `?${params}`);
  console.log(location.search); // ?sort=newest
} catch {
  console.log("would update the query to", `?${params}`);
}

=== j97 | E | What is the Location API?
**`window.location` represents the current page's URL: you can read its parts (protocol, host, path, query, hash) and change it to navigate, reload or redirect.**

### Reading the URL
- `location.href`: the full URL.
- `location.origin`: protocol + host + port.
- `location.pathname`: `/products/42`.
- `location.search`: `?sort=price&page=2`. Parse it with **`URLSearchParams`**.
- `location.hash`: `#reviews`.
- `location.host`, `hostname`, `port`, `protocol`.

### Navigating
- `location.assign(url)` or `location.href = url`: navigate and **add** a history entry.
- `location.replace(url)`: navigate and **replace** the current entry, so Back does not return to it. Use it for redirects such as after login.
- `location.reload()`: reload the page.
- Setting `location.hash` jumps to an anchor without reloading and fires `hashchange`.

### Location vs History API
Changing `location` (except the hash) loads a new page. The History API changes the URL **without** loading anything, for single-page apps.

### Working with URLs
The `URL` class parses and builds URLs safely: `new URL(path, location.origin)`, `url.searchParams.set("page", "2")`. Avoid concatenating query strings by hand; `URLSearchParams` handles encoding.

### Security
Never redirect to a URL taken directly from user input or a query parameter (`?next=...`) without validating it: open redirects are used in phishing. Allow only same-origin or known destinations.
--- code
console.log(location.origin, location.pathname);

// Parse and build URLs safely instead of string concatenation
const url = new URL("https://shop.example.com/products?category=books&sort=price#reviews");
console.log(url.hostname, url.pathname, url.hash); // shop.example.com /products #reviews

const params = url.searchParams;
console.log(params.get("category"), params.has("sort")); // books true
params.set("page", "2");
params.set("q", "café & tea"); // encoded for you
params.delete("sort");
console.log(url.search); // ?category=books&page=2&q=caf%C3%A9+%26+tea

// Read the current page's query string
const current = new URLSearchParams(location.search);
console.log(Object.fromEntries(current)); // whatever params this page has

// Validate redirect targets (prevent open redirects)
function safeRedirectTarget(next, fallback = "/") {
  try {
    const target = new URL(next, location.origin);
    return target.origin === location.origin ? target.pathname + target.search : fallback;
  } catch {
    return fallback;
  }
}
console.log(safeRedirectTarget("/dashboard?tab=2")); // /dashboard?tab=2
console.log(safeRedirectTarget("https://evil.example/phish")); // /

// Navigation (commented out so the example doesn't leave the page):
// location.assign("/login");   // adds a history entry
// location.replace("/login");  // replaces the current entry

=== j98 | M | What is the Navigator object?
**`window.navigator` describes the browser and device the page is running on and is the entry point to many device-related APIs, such as clipboard, geolocation, online status, language, service workers and media devices.**

### Useful properties
- `navigator.onLine`: whether the browser believes it has a network connection (listen to `online`/`offline` events for changes).
- `navigator.language` / `languages`: the user's preferred languages, useful for i18n defaults.
- `navigator.hardwareConcurrency`: number of logical CPU cores, useful for sizing worker pools.
- `navigator.userAgent`: the user-agent string. It is unreliable and being reduced for privacy; prefer feature detection or `navigator.userAgentData` where supported.
- `navigator.cookieEnabled`, `navigator.maxTouchPoints`.

### APIs hanging off navigator
- `navigator.clipboard`: read/write the clipboard (requires a user gesture and HTTPS).
- `navigator.geolocation`: location, with a permission prompt.
- `navigator.serviceWorker`: register service workers for offline support and push.
- `navigator.mediaDevices`: camera and microphone (`getUserMedia`), screen capture.
- `navigator.share`: the native share sheet on supporting devices.
- `navigator.sendBeacon(url, data)`: reliably send analytics when the page is closing.
- `navigator.storage`: storage estimates and `persist()`.
- `navigator.permissions.query`: check permission state without prompting.

### Feature detection
Always check that an API exists before using it (`if ("share" in navigator)`), and handle rejections, since users can deny permissions.
--- code
document.body.innerHTML = `<button id="copy">Copy coupon</button> <span id="msg"></span>`;

console.log({
  online: navigator.onLine,
  language: navigator.language,
  cores: navigator.hardwareConcurrency,
  touch: navigator.maxTouchPoints > 0,
});

// React to connectivity changes
window.addEventListener("offline", () => console.log("You are offline - changes will sync later"));
window.addEventListener("online", () => console.log("Back online"));

// Clipboard (needs a user gesture and a secure context)
document.getElementById("copy").addEventListener("click", async () => {
  const msg = document.getElementById("msg");
  try {
    await navigator.clipboard.writeText("SAVE20");
    msg.textContent = "Copied!";
  } catch {
    msg.textContent = "Copy not allowed here";
  }
});

// Native share sheet where available
if ("share" in navigator) {
  // navigator.share({ title: "DevQnA", url: location.href }) - call from a click handler
}

// Storage quota estimate
try {
  const { usage, quota } = await navigator.storage.estimate();
  console.log(`using ${(usage / 1024).toFixed(1)} KB of ${(quota / 1024 / 1024).toFixed(0)} MB`);
} catch {
  console.log("storage estimate not available in this context"); // e.g. sandboxed iframes
}

=== j99 | H | What is CORS?
**CORS (Cross-Origin Resource Sharing) is a browser security mechanism that lets a server explicitly allow web pages from other origins to read its responses, using HTTP headers like `Access-Control-Allow-Origin`; without that permission, the browser blocks the page's JavaScript from reading the response.**

### Why it exists
The **same-origin policy** stops a page on `a.com` from reading data from `b.com` with the user's cookies. CORS is the controlled exception: the server at `b.com` says which origins may read its responses.

### Simple vs preflighted requests
- **Simple requests** (`GET`/`HEAD`/`POST` with basic headers and content types like form data): the browser sends the request with an `Origin` header and checks the response's `Access-Control-Allow-Origin`.
- **Preflighted requests** (other methods like `PUT`/`DELETE`, custom headers such as `Authorization`, or `Content-Type: application/json`): the browser first sends an `OPTIONS` request asking permission. The server must reply with `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` (cacheable with `Access-Control-Max-Age`).

### Credentials
To send cookies cross-origin, the client uses `credentials: "include"`, and the server must reply with `Access-Control-Allow-Credentials: true` **and a specific origin**, not `*`.

### Key facts for interviews
- CORS is enforced **by the browser**. Servers, `curl` and Postman ignore it.
- A CORS error means the **request may still have reached the server**; only reading the response was blocked. It is not a protection against CSRF.
- It is fixed on the **server** (or with a proxy on your own origin), never in client code.
- `Access-Control-Allow-Origin: *` is fine for public data, never for authenticated APIs.
--- code
// Server side (Node.js + Express): allow a specific front-end origin
import express from "express";

const app = express();
const ALLOWED = new Set(["https://app.example.com", "http://localhost:3000"]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); // a specific origin, not "*"
    res.setHeader("Access-Control-Allow-Credentials", "true"); // allow cookies
    res.setHeader("Vary", "Origin"); // caches must key on Origin
  }
  if (req.method === "OPTIONS") {
    // preflight: answer which methods/headers are allowed, and cache it
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  }
  next();
});

app.get("/api/me", (req, res) => res.json({ name: "Ada" }));
app.listen(4000);

// Client side (runs on https://app.example.com):
// await fetch("https://api.example.com/api/me", { credentials: "include" });

=== j100 | H | What is the Same-Origin Policy?
**The Same-Origin Policy (SOP) is the browser's core security rule that a page can freely interact only with resources from the same origin (same scheme, host and port); reading data from other origins is blocked unless they opt in, for example with CORS.**

### What counts as the same origin
Scheme + host + port must all match.
- `https://app.example.com` vs `https://app.example.com/page`: same origin.
- vs `http://app.example.com`: different scheme.
- vs `https://api.example.com`: different host (subdomains count).
- vs `https://app.example.com:8443`: different port.

### What SOP restricts
- **Reading** cross-origin responses from `fetch`/XHR (unless CORS allows it).
- **Accessing the DOM** of a cross-origin iframe or popup (`iframe.contentWindow.document`).
- Reading cross-origin **storage**: `localStorage`, IndexedDB and cookies are scoped to their own origin (cookies use slightly different "site" rules).
- Reading pixels from a cross-origin image drawn on a canvas (the canvas becomes "tainted").

### What SOP allows
- **Embedding**: `<img>`, `<script>`, `<link rel="stylesheet">`, `<video>`, `<iframe>` can load from anywhere.
- **Sending** requests (form posts, navigation). This is why CSRF is possible and why `SameSite` cookies and CSRF tokens exist.

### Controlled ways to cross origins
- **CORS** for HTTP APIs.
- **`postMessage`** for communication between windows and iframes (always check `event.origin`).
- A **proxy/BFF** on your own origin that calls the other service server-side.

### Why it matters
Without SOP, any site you visit could read your email or bank data using your logged-in cookies.
--- code
// Compare origins with the URL API
const sameOrigin = (a, b) => new URL(a).origin === new URL(b).origin;

const page = "https://app.example.com/dashboard";
console.log(sameOrigin(page, "https://app.example.com/settings")); // true
console.log(sameOrigin(page, "http://app.example.com")); // false - scheme
console.log(sameOrigin(page, "https://api.example.com")); // false - host
console.log(sameOrigin(page, "https://app.example.com:8443")); // false - port

// Safe cross-origin messaging with postMessage
const TRUSTED = "https://widgets.example.com";
window.addEventListener("message", (event) => {
  if (event.origin !== TRUSTED) return; // always check who sent it
  console.log("trusted message:", event.data);
});
// The parent page sends with an explicit target origin, never "*":
// iframe.contentWindow.postMessage({ type: "theme", value: "dark" }, TRUSTED);

// Reading a cross-origin response without CORS fails in the browser
try {
  await fetch("https://example.com/", { signal: AbortSignal.timeout(3000) }); // no CORS headers
  console.log("allowed (the server sent CORS headers)");
} catch (e) {
  console.log("blocked or offline:", e.name); // TypeError - the browser refused to expose the response
}
