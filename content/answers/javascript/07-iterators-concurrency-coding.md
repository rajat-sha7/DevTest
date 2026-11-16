=== j151 | M | What is a Generator function?
**A generator function (`function*`) returns an iterator whose code runs lazily: each `next()` call resumes the function until the next `yield`, which hands out a value and pauses again, keeping all local state between calls.**

### How it works
- Calling a generator does **not** run its body; it returns a generator object.
- `gen.next()` runs until the next `yield value` and returns `{ value, done: false }`.
- When the function returns, you get `{ value: returnValue, done: true }`.
- Generators are **iterable**, so they work with `for...of`, spread and destructuring.

### Two-way communication
- `gen.next(x)` sends `x` back in as the result of the paused `yield` expression.
- `gen.return(v)` finishes the generator (running `finally` blocks).
- `gen.throw(err)` throws an error at the paused `yield`.

### Use cases
- **Lazy and infinite sequences**: ids, Fibonacci, pagination, without building huge arrays.
- **Custom iteration** for your own data structures (`*[Symbol.iterator]()`).
- **Pipelines** that process data step by step (`map`/`filter`/`take` over streams of values).
- **Delegation** with `yield*` to compose generators, e.g. walking a tree.
- Historically, async control flow (redux-saga, and the idea behind `async/await`).

### Iterator helpers
Modern engines add methods directly on iterators (`map`, `filter`, `take`, `drop`, `toArray`, ...), so generator pipelines read like array chains without creating intermediate arrays. Check support before relying on them in older browsers.
--- code
function* idGenerator(prefix = "id") {
  let n = 1;
  while (true) yield `${prefix}-${n++}`; // infinite, but lazy
}
const ids = idGenerator("user");
console.log(ids.next().value, ids.next().value); // user-1 user-2

// Finite generator: works with for...of and spread
function* countdown(from) {
  try {
    while (from > 0) yield from--;
    return "liftoff";
  } finally {
    console.log("cleanup runs on finish or early exit");
  }
}
console.log([...countdown(3)]); // [3, 2, 1] (the return value is not included)

// Two-way: values sent in with next(x)
function* runningTotal() {
  let total = 0;
  while (true) total += (yield total) ?? 0;
}
const acc = runningTotal();
acc.next(); // start
acc.next(5);
console.log(acc.next(10).value); // 15

// yield* delegation: walk a tree lazily
function* walk(node) {
  yield node.name;
  for (const child of node.children ?? []) yield* walk(child);
}
const tree = { name: "src", children: [{ name: "app", children: [{ name: "page.tsx" }] }, { name: "lib" }] };
console.log([...walk(tree)]); // ["src", "app", "page.tsx", "lib"]

// Take the first 5 even squares from an infinite sequence without building arrays
function* naturals() {
  let n = 1;
  while (true) yield n++;
}
const firstFive = [];
for (const n of naturals()) {
  if ((n * n) % 2 === 0) firstFive.push(n * n);
  if (firstFive.length === 5) break; // break also triggers cleanup
}
console.log(firstFive); // [4, 16, 36, 64, 100]

=== j152 | M | What is iterator protocol?
**The iterator protocol is a contract: an iterator is any object with a `next()` method returning `{ value, done }`; an object is iterable when its `[Symbol.iterator]()` method returns such an iterator, which lets it work with `for...of`, spread, destructuring, `Array.from`, `Promise.all` and more.**

### The two protocols
- **Iterable**: has `[Symbol.iterator]()`, which returns a fresh iterator.
- **Iterator**: has `next()`, returning `{ value: any, done: boolean }`. Optionally `return()` (called on early exit like `break`, so you can clean up) and `throw()`.

### Built-in iterables
Arrays, strings (by code point), `Map`, `Set`, `arguments`, typed arrays, `NodeList`, generator objects, and the results of `map.entries()`, `array.keys()` and so on. Plain objects are **not** iterable; use `Object.entries(obj)`.

### What consumes iterables
`for...of`, spread (`[...x]`), array destructuring, `Array.from`, `new Map(iterable)`, `new Set(iterable)`, `Promise.all/race/allSettled/any`, `yield*`, and `Object.fromEntries`.

### Writing your own
The easiest way is a generator method: `*[Symbol.iterator]() { ... }`. Writing `next()` by hand is useful to understand the protocol and when you need precise control.

### Iterators are single-use
An iterator is consumed once. An iterable can usually produce many iterators (each `for...of` calls `[Symbol.iterator]()` again). Generator objects are both iterable and iterator, so they are single-use too.

### Lazy evaluation
Iterators compute values on demand, which enables infinite sequences and memory-friendly processing of large data.
--- code
// Hand-written iterator: implementing the protocol directly
class Range {
  constructor(start, end, step = 1) {
    Object.assign(this, { start, end, step });
  }
  [Symbol.iterator]() {
    let current = this.start;
    const { end, step } = this;
    return {
      next: () => (current <= end ? { value: (current += step) - step, done: false } : { value: undefined, done: true }),
      return: () => {
        console.log("iterator closed early");
        return { done: true };
      },
    };
  }
}

const r = new Range(1, 10, 3);
console.log([...r]); // [1, 4, 7, 10]
const [first, second] = r; // destructuring stops early -> return() is called
console.log(first, second); // 1 4

// The protocol step by step
const it = ["a", "b"][Symbol.iterator]();
console.log(it.next(), it.next(), it.next()); // { value: "a", done: false } { value: "b", done: false } { value: undefined, done: true }

// Everything that accepts iterables works with our class
console.log(Math.max(...new Range(1, 5)), new Set(new Range(1, 3)).size); // 5 3

// Plain objects are not iterable - use Object.entries
const scores = { ada: 9, linus: 7 };
for (const [name, score] of Object.entries(scores)) console.log(name, score);
console.log(typeof scores[Symbol.iterator]); // undefined

=== j153 | H | What is async generator?
**An async generator (`async function*`) is a generator that can `await` inside its body and yields values asynchronously; you consume it with `for await...of`, which makes it ideal for streams of data that arrive over time.**

### How it works
- `next()` returns a **promise** of `{ value, done }`.
- Inside, you can `await` (fetch a page, wait for a message) and `yield` results one by one.
- Consumers use `for await (const item of asyncGen()) { ... }`, which waits for each value in turn.
- It implements `Symbol.asyncIterator`.

### Use cases
- **Paginated APIs**: yield items page by page and fetch the next page only when the consumer needs more.
- **Streams**: reading a `fetch` response body chunk by chunk, Node streams (which are async iterable), file reading, log tailing.
- **Event sources**: turning WebSocket messages or DOM events into an async sequence.
- **Rate-limited processing**: process items as they arrive without loading everything into memory.
- **Streaming AI responses** token by token.

### Benefits
- **Backpressure for free**: the producer pauses at each `yield` until the consumer asks for the next item.
- Clean early exit: `break` in `for await` calls `return()`, which runs the generator's `finally` (close connections, abort requests).

### Related
`Array.fromAsync(asyncIterable)` collects everything into an array. `ReadableStream` is also async iterable in modern runtimes.
--- code
// Fake paginated API
const DB = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: `item ${i + 1}` }));
async function fetchPage(page, size = 10) {
  await new Promise((r) => setTimeout(r, 10)); // network delay
  const items = DB.slice((page - 1) * size, page * size);
  return { items, hasMore: page * size < DB.length };
}

// Async generator: yields items, fetching pages only as needed
async function* allItems() {
  let page = 1;
  let pagesFetched = 0;
  try {
    while (true) {
      const { items, hasMore } = await fetchPage(page++);
      pagesFetched++;
      yield* items;
      if (!hasMore) return;
    }
  } finally {
    console.log(`pages fetched: ${pagesFetched}`); // runs on completion OR early break
  }
}

// Consume lazily: stop as soon as we find what we need
for await (const item of allItems()) {
  if (item.id === 12) {
    console.log("found", item.name); // found item 12
    break; // only 2 of the 3 pages are fetched
  }
}

// Collect everything
const everything = await Array.fromAsync(allItems());
console.log(everything.length); // 23

// Streaming text in chunks (e.g. an AI response)
async function* streamWords(text) {
  for (const word of text.split(" ")) {
    await new Promise((r) => setTimeout(r, 5));
    yield word;
  }
}
let output = "";
for await (const w of streamWords("tokens arrive one at a time")) output += w + " ";
console.log(output.trim());

=== j154 | M | What is a Worker Thread?
**Workers let JavaScript run code in parallel on separate threads: Web Workers in browsers and `worker_threads` in Node.js; each worker has its own event loop and memory, and communicates with the main thread by passing messages.**

### Why they exist
JavaScript on the main thread is single-threaded. CPU-heavy work (image processing, parsing large files, encryption, data crunching, syntax highlighting) blocks the UI, hurting responsiveness (INP). Moving it to a worker keeps the page smooth.

### How they communicate
- `worker.postMessage(data)` / `self.onmessage` (browser), or `parentPort` (Node).
- Data is **structured-cloned** (copied) by default.
- **Transferables** (`ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`) can be moved without copying: ownership transfers to the worker.
- `SharedArrayBuffer` lets threads share memory directly (with `Atomics` for coordination).

### Limitations
- **No DOM access** in workers (no `document`, no `window`). They do have `fetch`, timers, `IndexedDB`, WebSockets, `OffscreenCanvas` and more.
- Startup cost and memory overhead: reuse workers (a pool) rather than creating one per task.
- Messaging has overhead; send work in reasonably large chunks.

### Types of browser workers
- **Dedicated workers**: one page.
- **Shared workers**: shared between tabs of the same origin.
- **Service workers**: network proxy for offline support, caching and push, not for general computation.

### Libraries
Comlink makes workers feel like calling async functions. Bundlers (Vite, webpack, Next.js) support `new Worker(new URL("./worker.js", import.meta.url))`.
--- code
// A Web Worker created from inline code (normally it would be its own file)
const workerSource = `
  self.onmessage = (event) => {
    const { numbers } = event.data;
    // CPU-heavy work runs here without freezing the page
    let primes = 0;
    for (const n of numbers) {
      let isPrime = n > 1;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { isPrime = false; break; }
      if (isPrime) primes++;
    }
    self.postMessage({ primes });
  };
`;
const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
const worker = new Worker(url);

// Wrap the message exchange in a promise
const runInWorker = (data) =>
  new Promise((resolve, reject) => {
    worker.onmessage = (e) => resolve(e.data);
    worker.onerror = (e) => reject(e);
    worker.postMessage(data);
  });

const numbers = Array.from({ length: 200_000 }, (_, i) => i);
const started = performance.now();
const ticker = setInterval(() => {}, 16); // the main thread stays free to run this
const { primes } = await runInWorker({ numbers });
clearInterval(ticker);
console.log(`${primes} primes found off the main thread in ${(performance.now() - started).toFixed(0)}ms`); // 17984 primes ...

worker.terminate();
URL.revokeObjectURL(url);

// Node.js equivalent:
// import { Worker } from "node:worker_threads";
// const w = new Worker("./prime-worker.js", { workerData: numbers });

=== j155 | H | What is SharedArrayBuffer?
**A `SharedArrayBuffer` is a fixed-size block of raw binary memory that can be shared between the main thread and workers, so they all read and write the same bytes directly instead of copying data through messages.**

### How it differs from ArrayBuffer
- `postMessage(arrayBuffer)` copies the data (or transfers ownership, after which the sender loses access).
- `postMessage(sharedArrayBuffer)` shares it: every thread sees changes immediately.
You access the bytes through typed arrays (`Int32Array`, `Float64Array`, ...) placed over the buffer.

### Why use it
- Very large data that would be expensive to copy (audio and video processing, simulations, image buffers).
- High-performance parallel algorithms, WebAssembly threads, game engines, emulators.

### The catch: race conditions
When several threads write the same memory, normal reads and writes can interleave and lose updates. Use **`Atomics`** operations (`Atomics.add`, `Atomics.compareExchange`, `Atomics.wait/notify`) to make updates safe and to synchronise threads.

### Security requirements in browsers
After the Spectre CPU vulnerabilities, browsers require the page to be **cross-origin isolated** before `SharedArrayBuffer` is available:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)
Check `self.crossOriginIsolated`. These headers can break third-party embeds and popups, so plan for them.

### Node.js
`SharedArrayBuffer` works with `worker_threads` without special headers.

### When not to use it
Most apps do not need shared memory; message passing (with transferables) is simpler and safer.
--- code
// Shared memory needs cross-origin isolation in browsers
const available = typeof SharedArrayBuffer !== "undefined" && (globalThis.crossOriginIsolated ?? true);
console.log("SharedArrayBuffer usable here:", available);

if (available) {
  const shared = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT); // 16 bytes
  const view = new Int32Array(shared);

  // Two views over the same memory see the same data (this is what workers would share)
  const otherThreadView = new Int32Array(shared);
  otherThreadView[0] = 42;
  console.log(view[0]); // 42 - no copying

  // Safe concurrent updates use Atomics
  Atomics.add(view, 1, 5);
  Atomics.add(view, 1, 5);
  console.log(Atomics.load(view, 1)); // 10

  // Sending it to a worker shares (not copies) the memory:
  // worker.postMessage(shared);
  // inside the worker: const v = new Int32Array(event.data); Atomics.add(v, 1, 1);
} else {
  console.log("Serve the page with COOP: same-origin and COEP: require-corp to enable it");
}

// Compare: a normal ArrayBuffer is copied by structuredClone / postMessage
const normal = new Int32Array([1, 2, 3]);
const copy = structuredClone(normal);
copy[0] = 99;
console.log(normal[0], copy[0]); // 1 99

=== j156 | H | What is Atomic operation in JS?
**Atomic operations, provided by the global `Atomics` object, read and modify values in a `SharedArrayBuffer` as single, indivisible steps, so concurrent threads cannot see half-finished updates or lose each other's writes.**

### The problem they solve
`view[0]++` is really three steps: read, add, write. Two workers doing it at the same time can both read `5` and both write `6`, losing an increment. `Atomics.add(view, 0, 1)` performs the whole read-modify-write as one step.

### Main operations
- **Arithmetic and bitwise**: `add`, `sub`, `and`, `or`, `xor`; each returns the **old** value.
- **Read/write**: `load`, `store` (with ordering guarantees normal reads/writes don't have).
- **`exchange`**: set a new value, return the old one.
- **`compareExchange(view, i, expected, replacement)`**: replace only if the current value equals `expected`. This is the building block of locks and lock-free algorithms.
- **Synchronisation**: `Atomics.wait(view, i, value, timeout)` blocks a worker until notified (not allowed on the browser main thread); `Atomics.notify(view, i, count)` wakes waiters; `Atomics.waitAsync` gives a promise-based wait usable on the main thread.

### Typical uses
Counters and statistics shared between workers, mutexes and semaphores, producer/consumer queues in shared memory, and WebAssembly threads.

### Rules
- Atomics work on **integer typed arrays** (`Int32Array` and friends, plus `BigInt64Array`) over a `SharedArrayBuffer` (most operations also accept normal buffers, but are only meaningful when shared).
- Keep shared-memory code small and well tested; it is easy to introduce deadlocks and subtle bugs.
--- code
const view = new Int32Array(new SharedArrayBuffer(16));

// Read-modify-write as one indivisible step (returns the OLD value)
console.log(Atomics.add(view, 0, 5), Atomics.load(view, 0)); // 0 5
console.log(Atomics.sub(view, 0, 2), Atomics.load(view, 0)); // 5 3
console.log(Atomics.exchange(view, 0, 100), view[0]); // 3 100

// compareExchange: the building block of locks
const UNLOCKED = 0, LOCKED = 1;
function tryLock(v, i) {
  return Atomics.compareExchange(v, i, UNLOCKED, LOCKED) === UNLOCKED; // true if we got it
}
function unlock(v, i) {
  Atomics.store(v, i, UNLOCKED);
  Atomics.notify(v, i, 1); // wake one waiting worker, if any
}

console.log(tryLock(view, 1)); // true  - acquired
console.log(tryLock(view, 1)); // false - already held
unlock(view, 1);
console.log(tryLock(view, 1)); // true  - acquired again

// Why it matters: simulate interleaved non-atomic increments losing an update
const plain = new Int32Array(1);
const a = plain[0]; // thread A reads 0
const b = plain[0]; // thread B reads 0
plain[0] = a + 1; // A writes 1
plain[0] = b + 1; // B writes 1 -> one increment lost
console.log("non-atomic result:", plain[0]); // 1 (should be 2)

const safe = new Int32Array(new SharedArrayBuffer(4));
Atomics.add(safe, 0, 1);
Atomics.add(safe, 0, 1);
console.log("atomic result:", Atomics.load(safe, 0)); // 2

=== j157 | M | How to detect a memory leak in Chrome?
**Use Chrome DevTools' Memory tools: reproduce the suspected action several times, take heap snapshots before and after, compare them to find objects that keep accumulating, and inspect the retainers chain that keeps them alive.**

### Step-by-step workflow
1. **Spot the symptom**: Task Manager (Shift+Esc) or the Performance monitor panel shows JS heap size or DOM node count rising steadily while you repeat an action (open and close a modal, navigate between routes).
2. **Record a Performance trace with "Memory" checked**: a healthy app shows a saw-tooth pattern (memory rises, then GC drops it). A staircase that never comes down suggests a leak.
3. **Heap snapshots** (Memory panel):
   - Take snapshot 1 (DevTools runs garbage collection first).
   - Repeat the action 5-10 times.
   - Take snapshot 2, choose the **Comparison** view, sort by "# Delta" or "Size Delta".
   - Look for constructors whose count grows with each repetition: your components, arrays, closures, **"Detached"** DOM elements.
4. **Find the cause**: select a leaked object and read the **Retainers** panel bottom-up. It shows the path from a GC root (an event listener, a global, a timer, a cache) to the object.
5. **Allocation instrumentation on timeline**: shows which allocations survive; blue bars that never turn grey are retained.
6. Fix, then repeat the same test to confirm the count returns to baseline.

### Usual culprits
Listeners on `window`/`document` not removed, intervals not cleared, unbounded caches, detached DOM nodes held in arrays or closures, subscriptions without unsubscribe, and global stores that keep growing.

### Tips
Test in an incognito window (extensions add noise), filter snapshots by your component names, and use `queryObjects(Constructor)` in the console to count live instances.
--- code
// A deliberately leaky page to practise on. Run it, then open DevTools > Memory.
document.body.innerHTML = `<button id="open">Open + close modal x10</button><p id="status"></p>`;
const leaked = []; // the "cache" that retains detached nodes

class Modal {
  constructor() {
    this.el = document.createElement("div");
    this.el.textContent = "Modal content " + "x".repeat(10_000);
    this.onResize = () => this.el.style.width = innerWidth / 2 + "px";
    window.addEventListener("resize", this.onResize); // LEAK 1: never removed
    leaked.push(this.el); // LEAK 2: keeps the element after it is removed (a "Detached" node)
  }
  open() {
    document.body.append(this.el);
  }
  close() {
    this.el.remove();
    // FIX: window.removeEventListener("resize", this.onResize); and don't store the element
  }
}

document.getElementById("open").addEventListener("click", () => {
  for (let i = 0; i < 10; i++) {
    const m = new Modal();
    m.open();
    m.close();
  }
  document.getElementById("status").textContent = `Detached nodes kept alive: ${leaked.length}`;
});

document.getElementById("open").click();
console.log("detached modals retained:", leaked.length); // 10 - grows on every click
// In DevTools: snapshot -> click a few times -> snapshot -> Comparison -> filter "Detached" or "Modal"
// In the Console: queryObjects(Modal) counts live instances.

=== j158 | M | What is a polyfill?
**A polyfill is code that implements a modern language feature or web API in environments that do not support it natively, so you can use the standard feature everywhere; it only defines the feature if it is missing.**

### Polyfill vs transpiler
- A **transpiler** (Babel, SWC, TypeScript, esbuild) rewrites **syntax** the target cannot parse (optional chaining, class fields) into older syntax.
- A **polyfill** adds missing **functions and objects** at runtime (`Array.prototype.at`, `Object.groupBy`, `structuredClone`, `fetch`).
Many features need both: `async/await` syntax is transpiled, and older targets also need a `Promise` polyfill.

### How to write one safely
1. **Feature-detect** first: only define it if it is missing.
2. Follow the **spec** behaviour closely, including edge cases (negative indexes, `NaN`, holes).
3. Define methods as **non-enumerable** with `Object.defineProperty`, like built-ins, so they do not show up in `for...in`.
4. Keep `this` and argument handling correct.

### Using polyfills in practice
- **core-js** (usually through Babel's `useBuiltIns: "usage"` or SWC) adds only the polyfills your code and browser targets need.
- Define targets with **browserslist**.
- Modern frameworks (Next.js) include the polyfills they need for supported browsers.
- Avoid loading big polyfill bundles for every user; modern browsers rarely need them.

### Ponyfills
A **ponyfill** provides the same functionality without patching globals (you import a function). This is safer for libraries, because it never conflicts with the host page.
--- code
// Polyfill Array.prototype.at (ES2022) following the spec, only if missing
if (!Array.prototype.myAt) {
  Object.defineProperty(Array.prototype, "myAt", {
    value: function myAt(index) {
      const len = this.length >>> 0;
      let i = Math.trunc(Number(index)) || 0;
      if (i < 0) i += len;
      return i < 0 || i >= len ? undefined : this[i];
    },
    writable: true,
    configurable: true,
    enumerable: false, // built-ins are non-enumerable
  });
}
const arr = [10, 20, 30];
console.log(arr.myAt(0), arr.myAt(-1), arr.myAt(5), arr.myAt("1")); // 10 30 undefined 20
for (const key in arr) if (key === "myAt") console.log("would leak into for...in"); // nothing logged

// Polyfill Object.groupBy (ES2024) with feature detection
const groupBy =
  Object.groupBy ??
  function groupBy(items, keyFn) {
    const out = Object.create(null);
    let i = 0;
    for (const item of items) (out[keyFn(item, i++)] ??= []).push(item);
    return out;
  };
console.log(groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"))); // { odd: [1, 3], even: [2, 4] }

// Ponyfill style: export a function instead of patching globals
const structuredCloneSafe = globalThis.structuredClone ?? ((v) => JSON.parse(JSON.stringify(v)));
console.log(structuredCloneSafe({ a: [1] })); // { a: [1] }

delete Array.prototype.myAt; // clean up the demo

=== j159 | M | What is a transpiler?
**A transpiler is a source-to-source compiler that converts code from one language or language version into another at the same level, such as TypeScript or JSX into JavaScript, or modern JavaScript into older JavaScript for older browsers.**

### What transpilers do in front-end projects
- **Strip types**: TypeScript → JavaScript.
- **Transform JSX** into `React.createElement` / `jsx()` calls.
- **Downlevel syntax** for target browsers: optional chaining, class fields, `async/await` (for very old targets).
- **Experimental features** and framework transforms (decorators, the React Compiler's automatic memoisation).
- Emit **source maps** so DevTools show the original code.

### Common tools
- **Babel**: the most configurable, with a huge plugin ecosystem.
- **SWC** (Rust): very fast, used by Next.js, Parcel, Deno and others.
- **esbuild** (Go): very fast, used by Vite in development and many CLIs.
- **TypeScript's `tsc`**: type-checks and emits JavaScript; many projects use `tsc --noEmit` only for type checking and let SWC or esbuild do the fast transpiling.
- Node.js can now run many TypeScript files directly by stripping types.

### Transpiler vs compiler vs bundler
- A **compiler** usually translates to a lower level (C to machine code, TypeScript type-checking plus emit).
- A **bundler** (webpack, Rollup, Vite, Turbopack) combines modules into files for the browser; it calls a transpiler for each file.
- A **polyfill** adds missing runtime APIs; transpilers only handle syntax.

### Configuring targets
browserslist (`"> 0.5%, last 2 versions, not dead"`) or explicit targets tell the transpiler which syntax to keep, so modern browsers get smaller, faster code.
--- code
// INPUT: modern TypeScript + JSX
//
//   type User = { name?: string; tags?: string[] };
//   export const Badge = ({ user }: { user?: User }) => (
//     <span title={user?.name ?? "Guest"}>{user?.tags?.length ?? 0}</span>
//   );

// OUTPUT (roughly what SWC/Babel emit for older browsers): types removed,
// JSX turned into function calls, optional chaining and ?? downlevelled.
function jsx(type, props) {
  return { type, props }; // stand-in for react/jsx-runtime
}
var Badge = function Badge(_ref) {
  var _user$tags$length, _user$tags;
  var user = _ref.user;
  return jsx("span", {
    title: (user === null || user === void 0 ? void 0 : user.name) != null ? user.name : "Guest",
    children:
      (_user$tags$length = user === null || user === void 0 ? void 0 : (_user$tags = user.tags) === null || _user$tags === void 0 ? void 0 : _user$tags.length) !== null && _user$tags$length !== void 0
        ? _user$tags$length
        : 0,
  });
};

console.log(Badge({ user: { name: "Ada", tags: ["admin", "editor"] } })); // { type: "span", props: { title: "Ada", children: 2 } }
console.log(Badge({})); // { type: "span", props: { title: "Guest", children: 0 } }

// Typical commands:
// npx tsc --noEmit                      -> type-check only
// npx swc src -d dist                   -> fast transpile
// npx esbuild src/app.ts --bundle --target=es2020 --outfile=dist/app.js

=== j160 | M | What is the difference between shallow and deep freeze?
**`Object.freeze` is a shallow freeze: it locks only the object's own top-level properties, so nested objects stay mutable; a deep freeze recursively freezes every nested object and array, making the whole structure immutable.**

### Shallow freeze
- Built in: `Object.freeze(obj)`.
- Top-level properties cannot be added, removed or reassigned.
- But `frozen.settings.theme = "dark"` still works if `settings` is an object, because only the reference to it is frozen, not the object itself.

### Deep freeze
- Not built in; implemented with recursion over `Object.values` (or `Reflect.ownKeys` to include symbol keys).
- Must avoid infinite loops on circular references (skip objects that are already frozen).
- Should skip things that should not be frozen or cannot be meaningfully frozen: typed arrays with elements throw when frozen, and freezing objects you do not own (like DOM nodes or library instances) can break them.

### When to use which
- **Shallow** is enough for flat constants (`ROLES`, `HTTP_STATUS`).
- **Deep** for configuration trees, test fixtures, and in development to catch accidental mutation of state (Redux Toolkit and Immer freeze state in development for exactly this reason).

### Costs
Deep freezing large structures takes time and is usually skipped in production builds. TypeScript's `Readonly`/`as const` gives compile-time immutability without runtime cost; combine both where runtime safety matters.

### Note on Maps and Sets
Freezing a `Map` or `Set` does not stop `.set()`/`.add()`, because entries are internal state, not properties. Wrap them or use immutable data structures if you need that.
--- code
"use strict";

const config = {
  name: "app",
  db: { host: "localhost", ports: [5432, 5433] },
};

// Shallow
const shallow = Object.freeze(structuredClone(config));
shallow.db.host = "changed"; // allowed!
shallow.db.ports.push(9999); // allowed!
console.log(shallow.db); // { host: "changed", ports: [5432, 5433, 9999] }
try {
  shallow.name = "x";
} catch (e) {
  console.log("top level is frozen:", e.name); // TypeError
}

// Deep freeze: recursive, cycle-safe
function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj) || ArrayBuffer.isView(obj)) return obj;
  Object.freeze(obj); // freeze first, so cycles stop here
  for (const key of Reflect.ownKeys(obj)) deepFreeze(obj[key]);
  return obj;
}

const deep = deepFreeze(structuredClone(config));
console.log(Object.isFrozen(deep.db), Object.isFrozen(deep.db.ports)); // true true
for (const attempt of [() => (deep.db.host = "changed"), () => deep.db.ports.push(1)]) {
  try {
    attempt();
  } catch (e) {
    console.log("deep frozen:", e.name); // TypeError (x2)
  }
}

// Circular structures are handled
const cyclic = { a: {} };
cyclic.a.parent = cyclic;
console.log(Object.isFrozen(deepFreeze(cyclic).a)); // true

=== j161 | E | Reverse a string
**The idiomatic solution is `[...str].reverse().join("")`; use spread rather than `split("")` so characters outside the Basic Multilingual Plane (like emoji) are not broken, and use `Intl.Segmenter` if you must keep complex emoji and accented clusters intact.**

### Approaches
1. **Built-ins**: `[...str].reverse().join("")`. Clear and O(n).
2. **Loop from the end**: build the result character by character. Shows you can do it without helpers, which interviewers sometimes ask for.
3. **Two pointers on an array**: swap characters from both ends towards the middle; the classic in-place approach in languages with mutable strings.
4. **Recursion**: `reverse(s.slice(1)) + s[0]`. Elegant but O(n²) because of repeated slicing, and it can overflow the stack on long strings. Mention why you would not use it in production.

### Unicode details interviewers love
- `"😀".length` is **2**: JavaScript strings are UTF-16, and emoji use surrogate pairs. `split("")` splits the pair and produces broken characters when reversed.
- Spread and `for...of` iterate by **code points**, fixing surrogate pairs.
- Some visible characters are several code points (flags, families, skin tones, `e` + combining accent). Only grapheme segmentation (`Intl.Segmenter`) keeps those intact.

### Complexity
All the linear approaches are O(n) time and O(n) space (strings are immutable in JavaScript, so a new string is always created).

### Follow-ups
Reverse the words in a sentence (`split(" ").reverse().join(" ")`), or reverse in place in an array of characters with two pointers.
--- code
const reverse = (s) => [...s].reverse().join("");

function reverseLoop(s) {
  let out = "";
  for (let i = s.length - 1; i >= 0; i--) out += s[i]; // code units: fine for plain text
  return out;
}

function reverseTwoPointers(s) {
  const chars = [...s];
  for (let i = 0, j = chars.length - 1; i < j; i++, j--) [chars[i], chars[j]] = [chars[j], chars[i]];
  return chars.join("");
}

const reverseGraphemes = (s) =>
  Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment)
    .reverse()
    .join("");

console.log(reverse("hello"), reverseLoop("hello"), reverseTwoPointers("hello")); // olleh olleh olleh

// Unicode edge cases
console.log("😀".length); // 2 - one emoji, two UTF-16 code units
console.log(reverseLoop("ab😀") === "😀ba"); // false - surrogate pair broken
console.log(reverse("ab😀")); // 😀ba
console.log(reverse("🇬🇧!") === "!🇬🇧"); // false - a flag is two code points
console.log(reverseGraphemes("🇬🇧!")); // !🇬🇧

// Follow-up: reverse words, not characters
console.log("the quick brown fox".split(" ").reverse().join(" ")); // fox brown quick the

=== j162 | E | Check if a string is a palindrome
**Normalise the string (lowercase, keep only letters and digits), then compare characters from both ends moving inwards with two pointers; that is O(n) time and O(1) extra space beyond the normalised string.**

### Steps
1. **Normalise**: `s.toLowerCase().replace(/[^a-z0-9]/g, "")`. For international text use Unicode classes: `/[^\p{L}\p{N}]/gu` and `normalize("NFD")` to separate accents.
2. **Two pointers**: `i` at the start, `j` at the end; if `s[i] !== s[j]` return `false`; move inwards until they meet.
3. Return `true` if no mismatch was found.

### The one-liner
`clean === [...clean].reverse().join("")` is readable and fine for most cases, but uses O(n) extra memory and always processes the whole string, while two pointers can stop at the first mismatch.

### Skipping without building a new string
For a true O(1) extra-space version, move the pointers past non-alphanumeric characters in place instead of creating a cleaned copy.

### Edge cases to mention
- Empty string and single characters are palindromes.
- Case and punctuation: `"A man, a plan, a canal: Panama"` should be `true`.
- Unicode: accented letters and characters outside ASCII.
- Numbers: `121` is a palindrome; convert with `String(n)` (or reverse digits arithmetically).

### Follow-ups
"Valid Palindrome II" (can it become a palindrome by deleting at most one character?) and "longest palindromic substring" (expand around centres, O(n²)).
--- code
function isPalindrome(text) {
  const s = text.toLowerCase().normalize("NFD").replace(/[^\p{L}\p{N}]/gu, ""); // letters and digits only
  for (let i = 0, j = s.length - 1; i < j; i++, j--) {
    if (s[i] !== s[j]) return false; // stop at the first mismatch
  }
  return true;
}

// O(1) extra space: skip non-alphanumerics in place
function isPalindromeInPlace(text) {
  const ok = (c) => /[a-z0-9]/i.test(c);
  let i = 0, j = text.length - 1;
  while (i < j) {
    if (!ok(text[i])) { i++; continue; }
    if (!ok(text[j])) { j--; continue; }
    if (text[i].toLowerCase() !== text[j].toLowerCase()) return false;
    i++;
    j--;
  }
  return true;
}

const tests = ["racecar", "A man, a plan, a canal: Panama", "hello", "", "No 'x' in Nixon", "éa"];
for (const t of tests) console.log(JSON.stringify(t), isPalindrome(t), isPalindromeInPlace(t));
// all agree, except "éa": false true - the ASCII-only version skips "é" and wrongly says true

// Follow-up: can it become a palindrome by removing at most one character?
function validPalindromeOneRemoval(s) {
  const isPal = (i, j) => { while (i < j) if (s[i++] !== s[j--]) return false; return true; };
  for (let i = 0, j = s.length - 1; i < j; i++, j--) {
    if (s[i] !== s[j]) return isPal(i + 1, j) || isPal(i, j - 1);
  }
  return true;
}
console.log(validPalindromeOneRemoval("abca"), validPalindromeOneRemoval("abc")); // true false

=== j163 | E | Find duplicate numbers in an array
**Walk the array once with a `Set` of seen values: when a value is already in `seen`, it is a duplicate; collecting duplicates in a second `Set` gives each one once, in O(n) time and O(n) space.**

### Approaches compared
| Approach | Time | Space | Notes |
|---|---|---|---|
| Nested loops | O(n²) | O(1) | Simple, too slow for large inputs |
| Sort, then compare neighbours | O(n log n) | O(1)-O(n) | Mutates or copies the array |
| **Set of seen values** | **O(n)** | O(n) | Best general answer |
| Map of counts | O(n) | O(n) | Also tells you *how many* times |
| `filter` + `indexOf` | O(n²) | O(n) | Short but slow |

### Variants interviewers ask
- **Return each duplicate once** (`[1,2,2,2,3,3]` → `[2,3]`): use a second `Set`.
- **Return all extra occurrences**: push every time you see a value again.
- **Count occurrences**: `Map` of value → count, then filter counts > 1.
- **First duplicate**: return as soon as you hit one.
- **Values in range 1..n with O(1) extra space** (LeetCode "Find All Duplicates"): mark visited indexes by negating `arr[Math.abs(x) - 1]`; mention it mutates the input.
- **Objects**: compare by a key (`id`), not by reference.

### Edge cases
Empty array, no duplicates, `NaN` (a `Set` treats `NaN` as equal to itself, `indexOf` does not), and `0` vs `-0` (treated as equal by `Set`).
--- code
function findDuplicates(arr) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of arr) {
    if (seen.has(value)) dupes.add(value);
    else seen.add(value);
  }
  return [...dupes];
}

function countOccurrences(arr) {
  const counts = new Map();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].filter(([, n]) => n > 1).map(([value, n]) => ({ value, n }));
}

// O(1) extra space when values are in 1..n (mutates a copy here)
function findDuplicatesInRange(input) {
  const nums = [...input];
  const out = [];
  for (const x of nums) {
    const i = Math.abs(x) - 1;
    if (nums[i] < 0) out.push(Math.abs(x));
    else nums[i] = -nums[i];
  }
  return out;
}

console.log(findDuplicates([1, 2, 3, 2, 4, 3, 3, 5])); // [2, 3]
console.log(countOccurrences([1, 2, 3, 2, 4, 3, 3, 5])); // [{ value: 2, n: 2 }, { value: 3, n: 3 }]
console.log(findDuplicatesInRange([4, 3, 2, 7, 8, 2, 3, 1])); // [2, 3]
console.log(findDuplicates([NaN, NaN, 0, -0])); // [NaN, 0]
console.log(findDuplicates([])); // []

// Objects: compare by key
const users = [{ id: 1 }, { id: 2 }, { id: 1 }];
console.log(findDuplicates(users.map((u) => u.id))); // [1]

=== j164 | E | Remove duplicates from an array
**`[...new Set(arr)]` removes duplicate primitives in O(n) while keeping the first occurrence's order; for objects, deduplicate by a key with a `Map` or a `Set` of seen keys.**

### Primitives
- `[...new Set(arr)]` or `Array.from(new Set(arr))`: the standard answer.
- `arr.filter((x, i) => arr.indexOf(x) === i)`: works but O(n²), and it drops `NaN` entirely because `indexOf(NaN)` is `-1`.
- `reduce` with `includes`: also O(n²).

`Set` uses SameValueZero equality: `NaN` equals `NaN`, and `0` equals `-0`.

### Objects
`new Set([{id: 1}, {id: 1}])` keeps both, because objects are compared by reference. Choose what "duplicate" means:
- **By key, keep the first**: track seen keys in a `Set`.
- **By key, keep the last** (e.g. the latest update wins): `[...new Map(arr.map(o => [o.id, o])).values()]`.
- **By several fields**: build a composite key like `` `${o.name}|${o.email}` ``.
- **By full content**: a stable `JSON.stringify` key (only for small, plain objects; key order matters).

### Case-insensitive or normalised values
Deduplicate by a normalised key (`email.trim().toLowerCase()`) while keeping the original value.

### Complexity
Set and Map approaches are O(n) time and O(n) space, and they preserve insertion order.
--- code
const nums = [3, 1, 3, 2, 1, NaN, NaN, 0, -0];
console.log([...new Set(nums)]); // [3, 1, 2, NaN, 0]
console.log(nums.filter((x, i) => nums.indexOf(x) === i)); // [3, 1, 2, 0] - O(n^2), and NaN disappears!

const users = [
  { id: 1, name: "Ada", updated: 1 },
  { id: 2, name: "Linus", updated: 1 },
  { id: 1, name: "Ada L.", updated: 2 },
];

// By key, keep the FIRST occurrence
function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
console.log(uniqueBy(users, (u) => u.id).map((u) => u.name)); // ["Ada", "Linus"]

// By key, keep the LAST occurrence (latest update wins)
const latest = [...new Map(users.map((u) => [u.id, u])).values()];
console.log(latest.map((u) => u.name)); // ["Ada L.", "Linus"]

// Normalised comparison, original values kept
const emails = ["Ada@Example.com", "ada@example.com ", "linus@example.com"];
console.log(uniqueBy(emails, (e) => e.trim().toLowerCase())); // ["Ada@Example.com", "linus@example.com"]

=== j165 | M | Flatten a nested array
**Use `arr.flat(Infinity)` in practice; in interviews, implement it recursively (concatenating flattened sub-arrays) or iteratively with an explicit stack to avoid recursion limits on deeply nested input.**

### Recursive solution
For each element: if it is an array, flatten it and spread the result; otherwise push it. Support a `depth` parameter to mirror `Array.prototype.flat`.

### Iterative solution (stack)
Push the input onto a stack in reverse; pop items; if an item is an array, push its elements back (in reverse to keep order); otherwise add it to the result. This handles any depth without risking a stack overflow and is a good follow-up answer.

### Generator solution
`function* flatten(arr) { for (const x of arr) Array.isArray(x) ? yield* flatten(x) : yield x }` flattens lazily, useful for huge or streamed data.

### Details to mention
- `Array.isArray` is the right check (strings are iterable but should not be split).
- `flat` removes holes in sparse arrays; decide whether your version should too.
- Complexity: O(n) over the total number of elements, O(d) recursion depth or O(n) stack space.
- Avoid repeated `concat` in a loop (`result = result.concat(...)`), which copies the array each time and becomes O(n²).
--- code
// 1. Recursive with an optional depth (like Array.prototype.flat)
function flatten(arr, depth = Infinity) {
  const out = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) out.push(...flatten(item, depth - 1));
    else out.push(item);
  }
  return out;
}

// 2. Iterative with an explicit stack: no recursion limits
function flattenIterative(arr) {
  const stack = [...arr].reverse();
  const out = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);
    else out.push(item);
  }
  return out;
}

// 3. Lazy generator
function* flattenLazy(arr) {
  for (const item of arr) Array.isArray(item) ? yield* flattenLazy(item) : yield item;
}

const nested = [1, [2, [3, [4, [5]]]], "six", [[["seven"]]]];
console.log(flatten(nested)); // [1, 2, 3, 4, 5, "six", "seven"]
console.log(flatten(nested, 1)); // [1, 2, [3, [4, [5]]], "six", [["seven"]]]
console.log(flattenIterative(nested)); // [1, 2, 3, 4, 5, "six", "seven"]
console.log([...flattenLazy(nested)].join()); // 1,2,3,4,5,six,seven
console.log(JSON.stringify(flatten(nested)) === JSON.stringify(nested.flat(Infinity))); // true

// Very deep nesting: the iterative version survives
let deep = [0];
for (let i = 1; i <= 50_000; i++) deep = [deep, i];
console.log(flattenIterative(deep).length); // 50001

=== j166 | M | Deep clone an object
**In production use `structuredClone(value)`; in an interview, write a recursive clone that handles primitives, arrays, plain objects, `Date`, `Map`, `Set` and circular references (with a `WeakMap` of already-cloned objects), and preserves prototypes if required.**

### Building the recursive version
1. **Primitives and functions**: return as-is (functions are usually shared, not copied).
2. **Circular references**: keep a `WeakMap` from original → clone; if you have seen the object, return its clone. Without this, cycles cause infinite recursion.
3. **Special types**: `Date` (copy the time), `RegExp` (source and flags), `Map` and `Set` (clone keys/values recursively).
4. **Arrays and objects**: create the container, register it in the map **before** recursing, then copy each own key (use `Reflect.ownKeys` to include symbols).
5. **Prototype**: `Object.create(Object.getPrototypeOf(obj))` keeps class instances' methods working.

### Comparing the options
| | Cycles | Date/Map/Set | Functions | Class prototype |
|---|---|---|---|---|
| `structuredClone` | Yes | Yes | Throws | Lost (plain object) |
| `JSON.parse(JSON.stringify())` | Throws | Lost/wrong | Dropped | Lost |
| Custom recursive | Yes | Yes (if handled) | Shared | Kept (if handled) |
| Lodash `cloneDeep` | Yes | Yes | Shared | Kept |

### Things to mention
- Getters are evaluated into plain values by simple implementations.
- Very deep structures can overflow the stack; an iterative version fixes that.
- Deep cloning large data is expensive; for state updates prefer copying only the changed path.
--- code
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value; // primitives and functions
  if (seen.has(value)) return seen.get(value); // circular reference

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    value.forEach((v, k) => copy.set(deepClone(k, seen), deepClone(v, seen)));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    value.forEach((v) => copy.add(deepClone(v, seen)));
    return copy;
  }

  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value)); // keep prototype
  seen.set(value, copy); // register BEFORE recursing
  for (const key of Reflect.ownKeys(value)) copy[key] = deepClone(value[key], seen);
  return copy;
}

class Point {
  constructor(x, y) { this.x = x; this.y = y; }
  length() { return Math.hypot(this.x, this.y); }
}

const original = {
  date: new Date("2026-01-01"),
  tags: new Set(["a", "b"]),
  lookup: new Map([["k", { deep: true }]]),
  point: new Point(3, 4),
  list: [1, { nested: [2, 3] }],
  [Symbol("id")]: 7,
};
original.self = original; // cycle

const copy = deepClone(original);
copy.list[1].nested.push(99);
copy.lookup.get("k").deep = false;

console.log(original.list[1].nested, original.lookup.get("k").deep); // [2, 3] true - untouched
console.log(copy.self === copy, copy.date instanceof Date, copy.tags.has("b")); // true true true
console.log(copy.point.length(), copy.point instanceof Point); // 5 true - prototype kept
console.log(Object.getOwnPropertySymbols(copy).length); // 1

=== j167 | M | Implement a debounce function
**A debounce wrapper keeps a timer in a closure; each call clears the previous timer and starts a new one, so the wrapped function runs only after `wait` ms without further calls, using the latest arguments and `this`.**

### Requirements to cover in an interview
1. **Trailing call** with the **latest arguments** after the quiet period.
2. **Preserve `this`** so it works as a method (use a regular function and `fn.apply(this, args)`).
3. **`cancel()`** to drop a pending call (e.g. on component unmount).
4. **`flush()`** to run the pending call immediately (e.g. save before leaving the page).
5. Optional **`leading`** edge: run on the first call of a burst.
6. Optional **`maxWait`**: guarantee a call at least every `maxWait` ms during long bursts.
7. Return the result of the last invocation (Lodash does) or a promise, if needed.

### Common mistakes
- Creating a new debounced function on every render in React, so nothing is ever debounced. Create it once (`useMemo`/`useRef`) and cancel it in cleanup.
- Using an arrow function for the wrapper, which loses the caller's `this`.
- Forgetting that responses from debounced searches can still arrive out of order; abort stale requests.

### Testing
Use fake timers (`vi.useFakeTimers()` / `jest.useFakeTimers()`) and advance time instead of waiting.
--- code
function debounce(fn, wait, { leading = false, maxWait } = {}) {
  let timer = null, maxTimer = null, lastArgs, lastThis, result;

  const invoke = () => {
    clearTimeout(timer);
    clearTimeout(maxTimer);
    timer = maxTimer = null;
    if (lastArgs) {
      result = fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = undefined;
    }
    return result;
  };

  function debounced(...args) {
    const isFirstInBurst = timer === null;
    lastArgs = args;
    lastThis = this; // keep the caller's `this`
    if (isFirstInBurst && leading) {
      result = fn.apply(this, args);
      lastArgs = undefined; // already handled
    }
    clearTimeout(timer);
    timer = setTimeout(invoke, wait);
    if (maxWait != null && maxTimer === null) maxTimer = setTimeout(invoke, maxWait);
    return result;
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    clearTimeout(maxTimer);
    timer = maxTimer = null;
    lastArgs = lastThis = undefined;
  };
  debounced.flush = () => invoke();
  return debounced;
}

const calls = [];
const search = debounce((q) => calls.push(q), 50);
["a", "ab", "abc"].forEach((q) => search(q));
await new Promise((r) => setTimeout(r, 80));
console.log(calls); // ["abc"]

// `this` is preserved for methods
const editor = { text: "draft", save: debounce(function () { calls.push(`saved ${this.text}`); }, 20) };
editor.save();
editor.save.flush(); // run now
console.log(calls.at(-1)); // saved draft

// cancel drops the pending call
search("never");
search.cancel();
await new Promise((r) => setTimeout(r, 80));
console.log(calls.includes("never")); // false

// maxWait: a call is guaranteed during a long burst
const progress = [];
const autosave = debounce((n) => progress.push(n), 40, { maxWait: 100 });
for (let i = 0; i < 20; i++) setTimeout(() => autosave(i), i * 15); // a 300ms burst
await new Promise((r) => setTimeout(r, 400));
console.log(progress.length > 1, progress.at(-1)); // true 19 - saved during the burst and at the end

=== j168 | M | Implement a throttle function
**A throttle wrapper remembers when it last ran; it runs immediately if at least `interval` ms have passed (leading edge) and otherwise schedules one trailing call with the latest arguments for when the interval ends, so it fires at a steady rate without dropping the final state.**

### Requirements to cover
1. **Leading call**: respond immediately to the first event.
2. **At most once per interval** while calls keep coming.
3. **Trailing call** with the **latest arguments**, so the final position or value is never lost.
4. **Preserve `this`** and arguments.
5. Options `{ leading, trailing }` to turn each edge off (Lodash-compatible).
6. **`cancel()`** to clear the pending trailing call.

### Timestamp vs timer implementations
- Timestamp-only: simple, leading edge only, can drop the last event.
- Timer-only: trailing edge only, adds latency to the first event.
- **Combined** (below): leading and trailing, the most useful in UIs.

### Alternatives
- `requestAnimationFrame`-based throttling for visual updates (once per frame).
- `IntersectionObserver` instead of throttled scroll handlers for visibility checks.

### Testing
Use fake timers and assert both the number of calls and the arguments of the last one.
--- code
function throttle(fn, interval, { leading = true, trailing = true } = {}) {
  let lastRun = 0;
  let timer = null;
  let pendingArgs = null;
  let pendingThis = null;

  const run = (ctx, args) => {
    lastRun = Date.now();
    fn.apply(ctx, args);
  };

  function throttled(...args) {
    const now = Date.now();
    if (!lastRun && !leading) lastRun = now; // skip the leading edge
    const remaining = interval - (now - lastRun);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      run(this, args);
    } else if (trailing) {
      pendingArgs = args; // always keep the latest
      pendingThis = this;
      timer ??= setTimeout(() => {
        timer = null;
        run(pendingThis, pendingArgs);
      }, remaining);
    }
  }
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastRun = 0;
  };
  return throttled;
}

const positions = [];
const onScroll = throttle((y) => positions.push(y), 100);

// 30 scroll events over ~300ms
for (let i = 0; i <= 30; i++) setTimeout(() => onScroll(i * 10), i * 10);
await new Promise((r) => setTimeout(r, 450));

console.log(positions[0]); // 0   - leading edge: immediate
console.log(positions.length <= 5); // true - throttled to ~1 per 100ms
console.log(positions.at(-1)); // 300 - trailing edge keeps the final position

// Trailing only (e.g. send the final drag position after each interval)
const trailingOnly = [];
const onDrag = throttle((x) => trailingOnly.push(x), 50, { leading: false });
onDrag(1);
onDrag(2);
onDrag(3);
await new Promise((r) => setTimeout(r, 80));
console.log(trailingOnly); // [3]

=== j169 | E | Create a polyfill for map()
**A `map` polyfill creates a new array of the same length, calls the callback with `(element, index, array)` and the optional `thisArg` for each existing element, and stores the results; it must validate the callback and skip holes in sparse arrays.**

### Spec details to get right
1. Throw a `TypeError` if `this` is `null`/`undefined` or the callback is not a function.
2. Convert `this` with `Object(this)` so it works on array-likes (strings, `arguments`).
3. Read `length` once at the start (`>>> 0` to get a valid unsigned integer). Items appended during iteration are not visited.
4. **Skip holes**: only call the callback for indexes that exist (`i in O`), and leave the same holes in the result.
5. Call the callback with `thisArg` as `this` and arguments `(value, index, O)`.
6. Return a new array; never mutate the original.
7. Define it as **non-enumerable** with `Object.defineProperty`, and only if it is missing (in a real polyfill).

### What interviewers look for
Correct `this` handling (use a regular function, not an arrow), argument order, not mutating the input, and awareness of sparse arrays. Mentioning `Object.defineProperty` and feature detection shows production thinking.

### Complexity
O(n) time, O(n) space for the result.
--- code
Object.defineProperty(Array.prototype, "myMap", {
  value: function myMap(callback, thisArg) {
    if (this == null) throw new TypeError("Array.prototype.myMap called on null or undefined");
    if (typeof callback !== "function") throw new TypeError(`${callback} is not a function`);

    const O = Object(this);
    const len = O.length >>> 0; // read length once
    const result = new Array(len);

    for (let i = 0; i < len; i++) {
      if (i in O) result[i] = callback.call(thisArg, O[i], i, O); // skip holes
    }
    return result;
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

console.log([1, 2, 3].myMap((n) => n * 2)); // [2, 4, 6]
console.log([1, 2, 3].myMap((n, i, arr) => `${i}/${arr.length}`)); // ["0/3", "1/3", "2/3"]

// thisArg support
const multiplier = { factor: 10 };
console.log([1, 2].myMap(function (n) { return n * this.factor; }, multiplier)); // [10, 20]

// Holes are preserved, like the native map
console.log([1, , 3].myMap((n) => n * 2)); // [2, <1 empty item>, 6]

// Works on array-likes
console.log(Array.prototype.myMap.call("abc", (c) => c.toUpperCase())); // ["A", "B", "C"]

// Validation
try {
  [1].myMap("not a function");
} catch (e) {
  console.log(e.name); // TypeError
}

// Matches the native behaviour
const sample = [5, , 7];
console.log(JSON.stringify(sample.myMap((x) => x + 1)) === JSON.stringify(sample.map((x) => x + 1))); // true

delete Array.prototype.myMap; // clean up

=== j170 | E | Create a polyfill for filter()
**A `filter` polyfill walks the array, calls the predicate with `(element, index, array)` and the optional `thisArg`, and pushes the element into a new array whenever the predicate returns a truthy value, skipping holes and never mutating the original.**

### Spec details
1. Throw `TypeError` for `null`/`undefined` `this` or a non-function callback.
2. `Object(this)` and `length >>> 0`, read once.
3. Only visit existing indexes (`i in O`); unlike `map`, the result is **dense** (no holes) because you push matches.
4. **Read the value before calling the predicate** and push that value, so changes the callback makes to the array do not affect what you push.
5. Truthiness, not strict `true`: `filter(Boolean)` must work.
6. Return a new array.

### Common interview mistakes
- Using an arrow function for the method, which breaks `this`.
- Returning the original array when everything matches (must be a new array).
- Pushing `undefined` for holes.

### Complexity
O(n) time, O(k) space for k matches.
--- code
Object.defineProperty(Array.prototype, "myFilter", {
  value: function myFilter(predicate, thisArg) {
    if (this == null) throw new TypeError("Array.prototype.myFilter called on null or undefined");
    if (typeof predicate !== "function") throw new TypeError(`${predicate} is not a function`);

    const O = Object(this);
    const len = O.length >>> 0;
    const result = [];

    for (let i = 0; i < len; i++) {
      if (!(i in O)) continue; // skip holes
      const value = O[i]; // read before calling the predicate
      if (predicate.call(thisArg, value, i, O)) result.push(value);
    }
    return result;
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

const numbers = [1, 2, 3, 4, 5, 6];
console.log(numbers.myFilter((n) => n % 2 === 0)); // [2, 4, 6]
console.log([0, "a", null, 1, "", NaN].myFilter(Boolean)); // ["a", 1]
console.log([1, , 3].myFilter(() => true)); // [1, 3] - dense result

// thisArg
const range = { min: 2, max: 4 };
console.log(numbers.myFilter(function (n) { return n >= this.min && n <= this.max; }, range)); // [2, 3, 4]

// Always a new array
const all = numbers.myFilter(() => true);
console.log(all !== numbers, all.length); // true 6

// Array-likes
console.log(Array.prototype.myFilter.call("hello", (c) => c !== "l")); // ["h", "e", "o"]

delete Array.prototype.myFilter;

=== j171 | M | Create a polyfill for reduce()
**A `reduce` polyfill keeps an accumulator: it starts from `initialValue` if one is passed (checked with `arguments.length`, since `undefined` is a valid initial value), otherwise from the first existing element; it then calls the reducer for each remaining existing element and returns the final accumulator.**

### Spec details that separate good answers from great ones
1. Validate `this` and the callback (`TypeError`).
2. **Detect whether an initial value was provided with `arguments.length >= 2`**, not `initialValue !== undefined`. `[1, 2].reduce(fn, undefined)` must use `undefined` as the start.
3. Without an initial value, find the **first existing index** (skipping holes) as the start. If there is none (empty or all holes), throw `TypeError: Reduce of empty array with no initial value`.
4. Call `callback(accumulator, value, index, array)`; note `reduce` has **no `thisArg`**.
5. Skip holes.
6. Read `length` once.

### reduceRight
The same algorithm iterating from the end; a natural follow-up.

### Complexity
O(n) time, O(1) extra space (plus whatever the accumulator holds).
--- code
Object.defineProperty(Array.prototype, "myReduce", {
  value: function myReduce(callback, initialValue) {
    if (this == null) throw new TypeError("Array.prototype.myReduce called on null or undefined");
    if (typeof callback !== "function") throw new TypeError(`${callback} is not a function`);

    const O = Object(this);
    const len = O.length >>> 0;
    let i = 0;
    let acc;

    if (arguments.length >= 2) {
      acc = initialValue; // even if it's undefined
    } else {
      while (i < len && !(i in O)) i++; // find the first existing element
      if (i >= len) throw new TypeError("Reduce of empty array with no initial value");
      acc = O[i++];
    }

    for (; i < len; i++) {
      if (i in O) acc = callback(acc, O[i], i, O);
    }
    return acc;
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

console.log([1, 2, 3, 4].myReduce((sum, n) => sum + n, 0)); // 10
console.log([1, 2, 3, 4].myReduce((sum, n) => sum + n)); // 10 (starts from the first element)
console.log(["a", "b"].myReduce((acc, x, i) => ({ ...acc, [x]: i }), {})); // { a: 0, b: 1 }

// undefined is a valid initial value (detected with arguments.length, not !== undefined)
const join = (acc, x) => [acc, x].join("|");
console.log([1, 2].myReduce(join, undefined), [1, 2].reduce(join, undefined)); // |1|2 |1|2
console.log([1, 2].myReduce(join), [1, 2].reduce(join)); // 1|2 1|2

// Holes are skipped, including when looking for the start
console.log([, , 5, , 6].myReduce((a, b) => a + b)); // 11

// Empty array without an initial value throws, like the native one
try {
  [].myReduce((a, b) => a + b);
} catch (e) {
  console.log(e.message); // Reduce of empty array with no initial value
}

delete Array.prototype.myReduce;

=== j172 | H | Implement a simple Promise
**A minimal Promise is a state machine (pending, fulfilled, rejected) with queued handlers: `resolve`/`reject` settle it once and run the handlers as microtasks, and `then` returns a new promise resolved by the handler's result, adopting it if the result is itself a thenable.**

### Core requirements (Promises/A+)
1. **Executor runs immediately** with `resolve` and `reject`; if it throws, reject.
2. **Settle once**: later calls are ignored.
3. **`then(onFulfilled, onRejected)` returns a new promise.**
4. **Handlers run asynchronously** (`queueMicrotask`), even if already settled.
5. **Return values chain**: the handler's return value resolves the next promise; a throw rejects it.
6. **Pass-through**: a missing handler forwards the value or error to the next promise.
7. **Thenable assimilation**: resolving with a promise or thenable adopts its eventual state (and guards against a promise resolving with itself).

### Extras to add if time allows
`catch` (`then(undefined, onRejected)`), `finally` (runs a callback, passes the original result through), and static helpers `resolve`, `reject`, `all`, `race`.

### What this demonstrates
Understanding of closures, microtasks, recursion through thenables, and why `await` always continues asynchronously. Real engines implement the same algorithm natively.
--- code
class MyPromise {
  #state = "pending";
  #value;
  #handlers = [];

  constructor(executor) {
    const resolve = (value) => this.#resolve(value);
    const reject = (reason) => this.#settle("rejected", reason);
    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  #resolve(value) {
    if (this.#state !== "pending") return;
    if (value === this) return this.#settle("rejected", new TypeError("Cannot resolve a promise with itself"));
    if (value && (typeof value === "object" || typeof value === "function")) {
      let then;
      try {
        then = value.then;
      } catch (err) {
        return this.#settle("rejected", err);
      }
      if (typeof then === "function") {
        let called = false; // a thenable may call back only once
        try {
          then.call(value, (v) => !called && ((called = true), this.#resolve(v)), (r) => !called && ((called = true), this.#settle("rejected", r)));
        } catch (err) {
          if (!called) this.#settle("rejected", err);
        }
        return;
      }
    }
    this.#settle("fulfilled", value);
  }

  #settle(state, value) {
    if (this.#state !== "pending") return; // settle once
    this.#state = state;
    this.#value = value;
    this.#handlers.forEach((h) => queueMicrotask(h));
    this.#handlers = [];
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = () => {
        const cb = this.#state === "fulfilled" ? onFulfilled : onRejected;
        if (typeof cb !== "function") return (this.#state === "fulfilled" ? resolve : reject)(this.#value); // pass-through
        try {
          resolve(cb(this.#value));
        } catch (err) {
          reject(err);
        }
      };
      this.#state === "pending" ? this.#handlers.push(handle) : queueMicrotask(handle);
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(fn) {
    return this.then((v) => MyPromise.resolve(fn()).then(() => v), (r) => MyPromise.resolve(fn()).then(() => { throw r; }));
  }

  static resolve(v) {
    return v instanceof MyPromise ? v : new MyPromise((res) => res(v));
  }
}

const result = await new MyPromise((resolve) => setTimeout(() => resolve(2), 10))
  .then((n) => n * 10)
  .then((n) => new MyPromise((res) => res(n + 1))) // adopts the returned promise
  .then((n) => { throw new Error(`failed at ${n}`); })
  .then(() => "skipped") // pass-through of the rejection
  .catch((e) => e.message)
  .finally(() => console.log("finally ran"));
console.log(result); // failed at 21

// Handlers are async even when already resolved
const order = [];
MyPromise.resolve("x").then(() => order.push("handler"));
order.push("sync");
await null;
await null;
console.log(order); // ["sync", "handler"]

=== j173 | M | Create a custom event emitter
**An event emitter stores a map from event names to listener sets and provides `on` (subscribe, returning an unsubscribe function), `once`, `off` and `emit` (call every listener for that event with the given arguments).**

### API design
- `on(event, listener)`: add; return an `off` function for easy cleanup.
- `once(event, listener)`: auto-remove after the first call; make sure `off(event, originalListener)` can still remove it before it fires.
- `off(event, listener)`: remove a specific listener (or all listeners for an event when no listener is given).
- `emit(event, ...args)`: call listeners in registration order and return whether any were called.
- `listenerCount(event)`.

### Robustness details interviewers like
- **Iterate over a copy** of the listeners when emitting, so listeners that add or remove listeners during an emit do not break the loop.
- **Error isolation**: one throwing listener should not stop the others (or emit an `"error"` event, like Node).
- Use a `Map` of `Set`s: O(1) add and remove, no duplicate registrations, and no prototype collisions with event names like `"constructor"`.
- Optional **max listener warning** to detect leaks.
- **Typed events** in TypeScript: `EventEmitter<{ login: [user: User]; logout: [] }>`.

### Built-in alternatives
Node's `EventEmitter`, and in browsers `EventTarget` with `CustomEvent` (works everywhere, including workers, and supports `AbortSignal` cleanup).
--- code
class EventEmitter {
  #events = new Map(); // event name -> Set of listeners

  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add(listener);
    return () => this.off(event, listener); // unsubscribe function
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener.apply(this, args);
    };
    wrapper.original = listener; // lets off(event, listener) remove it
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const set = this.#events.get(event);
    if (!set) return;
    if (!listener) return void this.#events.delete(event);
    for (const fn of set) if (fn === listener || fn.original === listener) set.delete(fn);
    if (set.size === 0) this.#events.delete(event);
  }

  emit(event, ...args) {
    const set = this.#events.get(event);
    if (!set?.size) return false;
    for (const fn of [...set]) {
      // iterate over a copy
      try {
        fn.apply(this, args);
      } catch (err) {
        if (event !== "error") this.emit("error", err);
      }
    }
    return true;
  }

  listenerCount(event) {
    return this.#events.get(event)?.size ?? 0;
  }
}

const chat = new EventEmitter();
const log = [];
const offMessage = chat.on("message", (from, text) => log.push(`${from}: ${text}`));
chat.once("message", () => log.push("first message notification"));
chat.on("message", () => {
  throw new Error("bad listener");
});
chat.on("error", (err) => log.push(`error handled: ${err.message}`));

chat.emit("message", "Ada", "hi");
chat.emit("message", "Linus", "hello");
offMessage();
chat.emit("message", "Grace", "anyone?");
console.log(log);
console.log(chat.listenerCount("message"), chat.emit("unknown")); // 1 false

=== j174 | H | Implement an LRU cache
**An LRU (Least Recently Used) cache with a fixed capacity evicts the entry that was used least recently; in JavaScript a `Map` gives O(1) `get` and `put`, because it remembers insertion order: re-insert on access to mark as most recent, and evict `map.keys().next().value` (the oldest) when over capacity.**

### Operations
- `get(key)`: if present, move it to the most-recent position (delete and re-set) and return the value; otherwise return `undefined` (or `-1` in the LeetCode version).
- `put(key, value)`: delete the old entry if present, set it (now most recent), and if the size exceeds capacity, delete the first (least recent) key.

### The classic data-structure answer
In languages without an ordered hash map, use a **hash map + doubly linked list**: the map gives O(1) lookup of list nodes, and the list gives O(1) move-to-front and remove-from-tail. Interviewers may ask for this to see you understand why it is O(1); the `Map` version is the idiomatic JavaScript answer.

### Extensions
- **TTL**: store an expiry time with each entry and treat expired entries as missing.
- **Size by weight** (bytes instead of count).
- **`has`/`peek`** that do not update recency.
- **Eviction callback** (`onEvict`) for cleanup.

### Where LRU caches are used
Memoisation with bounded memory, image and API response caches, database page caches, CDN edges, and browser caches.
--- code
class LRUCache {
  #map = new Map();
  constructor(capacity) {
    if (capacity < 1) throw new RangeError("capacity must be at least 1");
    this.capacity = capacity;
  }

  get(key) {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key);
    this.#map.delete(key); // move to most-recent position
    this.#map.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.#map.has(key)) this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.capacity) {
      const oldest = this.#map.keys().next().value; // first key = least recently used
      this.#map.delete(oldest);
    }
    return this;
  }

  peek(key) {
    return this.#map.get(key); // read without updating recency
  }

  keys() {
    return [...this.#map.keys()]; // least -> most recent
  }
}

const cache = new LRUCache(3);
cache.put("a", 1).put("b", 2).put("c", 3);
cache.get("a"); // "a" becomes most recent
cache.put("d", 4); // evicts "b", the least recently used
console.log(cache.keys()); // ["c", "a", "d"]
console.log(cache.get("b"), cache.get("c")); // undefined 3
cache.put("e", 5); // evicts "a"
console.log(cache.keys()); // ["d", "c", "e"]

// Bounded memoisation with an LRU cache
const lru = new LRUCache(100);
const slowSquare = (n) => lru.get(n) ?? (lru.put(n, n * n), n * n);
console.log(slowSquare(12), slowSquare(12)); // 144 144

=== j175 | E | Generate Fibonacci sequence
**Generate Fibonacci numbers iteratively by keeping the last two values and adding them, which is O(n) time and O(1) space; avoid the naive recursive version (O(2^n)), and switch to `BigInt` beyond the 78th number, where `Number` loses precision.**

### Approaches
1. **Iterative** (best default): two variables, one loop.
2. **Generator**: `function*` yielding forever; the consumer decides how many to take.
3. **Naive recursion**: `fib(n) = fib(n-1) + fib(n-2)`. Elegant but exponential, because the same values are recomputed again and again (`fib(40)` makes over 300 million calls).
4. **Memoised recursion / dynamic programming**: cache results, O(n).
5. **Matrix exponentiation / fast doubling**: O(log n), for very large `n`.

### Precision
`Number` represents integers exactly only up to 2^53 - 1. Fibonacci(79) exceeds that, so results become wrong silently. Use `BigInt` (`0n`, `1n`) for large terms.

### Interview follow-ups
- Return the nth number vs return the first n numbers.
- Handle `n = 0`, `n = 1` and negative input.
- Discuss time and space complexity of each approach.
- Explain why recursion is slow (overlapping subproblems) and how memoisation fixes it, which leads into dynamic programming.
--- code
// 1. Iterative: O(n) time, O(1) space
function fib(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n must be a non-negative integer");
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// First n numbers
const sequence = (count) => Array.from({ length: count }, (_, i) => fib(i));
console.log(sequence(10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

// 2. Generator: lazy and unbounded
function* fibonacci() {
  let [a, b] = [0n, 1n];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
const firstTen = [];
for (const n of fibonacci()) {
  if (firstTen.length === 10) break;
  firstTen.push(Number(n));
}
console.log(firstTen.join(", ")); // 0, 1, 1, 2, 3, 5, 8, 13, 21, 34

// 3. Naive recursion is exponential
let calls = 0;
const naive = (n) => (calls++, n < 2 ? n : naive(n - 1) + naive(n - 2));
naive(25);
console.log("naive calls for n=25:", calls); // 242785

// 4. Precision: Number breaks after fib(78), BigInt stays exact
const fibBig = (n) => {
  let [a, b] = [0n, 1n];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
};
console.log(fib(78), fibBig(78)); // 8944394323791464 8944394323791464n
console.log(fib(90), fibBig(90)); // 2880067194370816000 2880067194370816120n - the Number is off by 120
