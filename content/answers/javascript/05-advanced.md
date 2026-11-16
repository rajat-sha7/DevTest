=== j101 | H | How does the event loop work internally?
**Internally, the browser's event loop repeatedly picks one task from its task queues, runs it to completion, performs a microtask checkpoint (draining every microtask), and then, when a frame is due, runs the rendering steps; Node.js runs a different, phase-based loop built on libuv.**

### The browser loop, per the HTML spec
1. **Pick a task.** There are several task queues (user input, timers, networking, messaging). The browser may prioritise some, for example input over timers, but runs tasks from the same queue in order.
2. **Run it** on the call stack until the stack is empty.
3. **Microtask checkpoint**: run microtasks until the queue is empty, including ones added during this step (promise reactions, `queueMicrotask`, `MutationObserver`).
4. **Update the rendering** if a frame is due (roughly every 16.7 ms at 60 Hz, only for visible documents): run `requestAnimationFrame` callbacks, then style, layout and paint. `IntersectionObserver` and `ResizeObserver` callbacks also run around this step.
5. If there is spare time, run `requestIdleCallback` callbacks.

### Important consequences
- A `Promise.then` chain that keeps adding microtasks **starves** rendering and input.
- `requestAnimationFrame` is the right place for visual updates: it runs just before paint.
- `setTimeout(fn, 0)` is clamped to at least 4 ms after 5 nested levels, and heavily throttled in background tabs.
- Long tasks (over 50 ms) hurt INP (Interaction to Next Paint). Break work into chunks or move it to a Web Worker; `scheduler.postTask` and `scheduler.yield()` give finer control where supported.

### Node.js (libuv) phases
**timers** (`setTimeout`/`setInterval`) → **pending callbacks** → **poll** (I/O) → **check** (`setImmediate`) → **close callbacks**. Between each callback, Node drains `process.nextTick` callbacks first, then promise microtasks.
--- code
const log = (msg) => console.log(`${performance.now().toFixed(1).padStart(6)}ms  ${msg}`);

log("task 1: script starts");

setTimeout(() => log("task 2: timer (next task)"), 0);

// globalThis.x?.() is safe even where the API does not exist (workers, Node)
globalThis.requestAnimationFrame?.(() => log("rendering step: requestAnimationFrame (before paint)"));

Promise.resolve().then(() => {
  log("microtask A");
  queueMicrotask(() => log("microtask C (added while draining, still runs before the timer)"));
});
queueMicrotask(() => log("microtask B"));

// A long task blocks everything else
const start = performance.now();
while (performance.now() - start < 30); // 30ms of busy work
log("task 1: script ends (after a 30ms long task)");

// Order you will see:
// task 1 starts -> task 1 ends -> microtask A -> microtask B -> microtask C
// -> timer task (and the rAF callback around the next frame, in a browser)
await new Promise((r) => setTimeout(r, 60));

=== j102 | H | What is Garbage Collection?
**Garbage collection is the engine's automatic memory management: it periodically finds objects that can no longer be reached from your program and frees their memory, so you never free memory manually in JavaScript.**

### Reachability
An object is kept alive if it can be reached from a **root**: the global object, the current call stack (local variables and arguments), and active closures, timers or event listeners. Anything not reachable is garbage, even if objects in a group still reference each other (cycles are collected too).

### How modern engines do it (V8 as an example)
- **Mark-and-sweep**: starting from the roots, mark everything reachable, then reclaim everything unmarked.
- **Generational collection**: most objects die young, so new objects go into a small "young generation" collected often and cheaply (a scavenger). Survivors are promoted to the "old generation", which is collected less often.
- **Incremental and concurrent marking**: work is split up and done partly on background threads to avoid long pauses that would cause jank.
- **Compaction**: moving objects together to reduce fragmentation.

### What you control
- Do not keep references you no longer need (remove listeners, clear timers, empty caches).
- Use `WeakMap`, `WeakSet` and `WeakRef` when you want to associate data with objects without keeping them alive.
- `FinalizationRegistry` lets you run cleanup after an object is collected, but timing is not guaranteed, so never rely on it for program logic.

### Observing it
Chrome DevTools' Memory panel (heap snapshots, allocation timelines) shows what is retained and why. `performance.memory` (Chrome-only) gives rough numbers.
--- code
// Reachability: an object lives as long as something can reach it
let user = { name: "Ada", avatar: new Array(1_000).fill("pixel") };
const admins = [user]; // second reference
user = null; // the object is still reachable through `admins`
console.log(admins[0].name); // Ada
admins.length = 0; // now nothing reaches it -> eligible for GC

// Cycles are fine: unreachable groups are collected together
function makeCycle() {
  const a = {};
  const b = { a };
  a.b = b;
  return "cycle created";
}
console.log(makeCycle()); // a and b reference each other but are unreachable after return

// WeakMap: attach data without keeping the key alive
const metadata = new WeakMap();
let element = { id: "button-1" };
metadata.set(element, { clicks: 3 });
console.log(metadata.get(element).clicks); // 3
element = null; // the entry can now be collected automatically

// FinalizationRegistry: optional cleanup after collection (timing not guaranteed)
const registry = new FinalizationRegistry((label) => console.log(`${label} was collected`));
registry.register({ big: new Array(10_000) }, "temporary object");
console.log("registered; the callback may run much later or never in a short script");

=== j103 | H | What are memory leaks?
**A memory leak is memory your program no longer needs but that cannot be freed, because something still references it; in JavaScript that means an unintended reference keeps objects reachable, so the garbage collector cannot reclaim them and memory grows over time.**

### Common causes in front-end code
- **Event listeners not removed**, especially on `window`/`document` from components that mount and unmount.
- **Timers and intervals** that are never cleared and capture large data in their closures.
- **Detached DOM nodes**: elements removed from the page but still referenced from JavaScript (in an array, a cache, or a closure).
- **Unbounded caches**: a `Map` or object used as a cache that only ever grows.
- **Subscriptions** (WebSocket handlers, observables, store subscriptions) without unsubscribe.
- **Accidental globals** (assigning to undeclared variables in sloppy mode).
- **Closures** holding on to big objects longer than intended.

### Symptoms
The page gets slower over time, memory in Task Manager keeps rising, and the app may eventually crash, especially in long-lived SPAs and dashboards.

### Prevention
- Clean up in the same place you set up: React's effect cleanup, `AbortController` signals for listeners, `clearInterval`, `unsubscribe()`.
- Bound your caches (LRU with a maximum size) or use `WeakMap` when keyed by objects.
- Avoid storing DOM nodes long-term; store ids and look nodes up when needed.

### Finding leaks
Chrome DevTools → Memory → take heap snapshots before and after repeating an action several times, compare them, and look for growing object counts and "Detached" DOM trees. The retainers view shows exactly what keeps an object alive.
--- code
// LEAK: a listener on a long-lived target captures a big object and is never removed
function leakyWidget(target) {
  const bigData = new Array(100_000).fill("data");
  target.addEventListener("tick", () => bigData.length); // bigData lives as long as target
}

// FIX: give every setup a teardown
function widget(target) {
  const bigData = new Array(100_000).fill("data");
  const controller = new AbortController();
  target.addEventListener("tick", () => bigData.length, { signal: controller.signal });
  const timer = setInterval(() => bigData.length, 1_000);
  return function destroy() {
    controller.abort(); // removes the listener
    clearInterval(timer); // stops the timer
  };
}

const bus = new EventTarget(); // stands in for window/document
const destroy = widget(bus);
destroy(); // nothing references bigData any more -> collectable

// LEAK: an unbounded cache. FIX: cap its size (simple LRU using Map insertion order)
class BoundedCache {
  #map = new Map();
  constructor(max = 100) {
    this.max = max;
  }
  get(key) {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key);
    this.#map.delete(key);
    this.#map.set(key, value); // mark as recently used
    return value;
  }
  set(key, value) {
    this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.max) this.#map.delete(this.#map.keys().next().value); // evict oldest
  }
  get size() {
    return this.#map.size;
  }
}
const cache = new BoundedCache(3);
for (let i = 0; i < 10; i++) cache.set(i, `value ${i}`);
console.log(cache.size); // 3 - never grows without limit

=== j104 | M | What is WeakMap?
**A `WeakMap` is a key-value collection whose keys must be objects (or non-registered symbols) and are held weakly: an entry does not stop its key from being garbage-collected, and once the key is gone the entry disappears automatically.**

### Differences from Map
| | `Map` | `WeakMap` |
|---|---|---|
| Keys | Any value | Objects (and non-registered symbols) only |
| Keeps keys alive | Yes | No |
| Iterable / `size` | Yes | No |
| Methods | `get`, `set`, `has`, `delete`, `clear`, iteration | `get`, `set`, `has`, `delete` |

It cannot be iterated or sized because its contents can change whenever the garbage collector runs.

### Use cases
- **Attaching data to objects you don't own** (DOM nodes, library objects) without modifying them and without causing leaks.
- **Caching results per object**: memoise computations keyed by an object; the cache entry dies with the object.
- **Private data** for classes (the pre-`#private` technique).
- Tracking which objects have already been processed.

### When to use something else
- Need to list or count entries, or use primitive keys: use `Map`.
- Just need to remember objects (no value): use `WeakSet`.
- Need to hold an object weakly and check later whether it is still alive: `WeakRef`.
--- code
// Cache expensive per-object results without leaking memory
const sizeCache = new WeakMap();
function expensiveSize(obj) {
  if (sizeCache.has(obj)) return `${sizeCache.get(obj)} (cached)`;
  const size = JSON.stringify(obj).length; // pretend this is expensive
  sizeCache.set(obj, size);
  return size;
}

let report = { rows: Array.from({ length: 100 }, (_, i) => ({ i })) };
console.log(expensiveSize(report)); // computed
console.log(expensiveSize(report)); // "... (cached)"
report = null; // the cache entry can be collected along with the object

// Attach metadata to objects you don't own
const clickCounts = new WeakMap();
const button = { id: "buy" }; // imagine a DOM element
clickCounts.set(button, (clickCounts.get(button) ?? 0) + 1);
clickCounts.set(button, clickCounts.get(button) + 1);
console.log(clickCounts.get(button)); // 2

// Keys must be objects
try {
  new WeakMap().set("text", 1);
} catch (e) {
  console.log(e.name); // TypeError
}

// No size or iteration
console.log(typeof new WeakMap().size, typeof new WeakMap()[Symbol.iterator]); // undefined undefined

=== j105 | M | What is WeakSet?
**A `WeakSet` is a collection of objects held weakly: you can add, check and remove objects, but it does not keep them alive, cannot be iterated and has no size.**

### API
`add(obj)`, `has(obj)`, `delete(obj)`. Values must be objects (or non-registered symbols).

### Use cases
WeakSet answers one question: **"have I seen or marked this object?"**, without leaking memory.
- **Tracking processed objects**: avoid handling the same node or request twice.
- **Cycle detection** in recursive algorithms such as deep clone, deep equal or serialisation.
- **Branding**: mark instances created by your own factory or class so other code can verify them (`trusted.has(obj)`).
- **Flagging DOM elements** (initialised, observed) without adding properties to them.

### WeakSet vs Set
A `Set` keeps every member alive forever until you delete it, which is a leak if you only use it as a "seen" marker for short-lived objects. A `WeakSet` lets the garbage collector remove members automatically.

### Limits
You cannot list its contents or know its size, because members can disappear at any time. If you need that, use a `Set` and clean up yourself.
--- code
// Make sure each element is only initialised once
const initialised = new WeakSet();
function initWidget(el) {
  if (initialised.has(el)) return `${el.id}: already set up`;
  initialised.add(el);
  return `${el.id}: set up`;
}
const card = { id: "card-1" };
console.log(initWidget(card)); // card-1: set up
console.log(initWidget(card)); // card-1: already set up

// Cycle-safe traversal
function countNodes(node, seen = new WeakSet()) {
  if (node === null || typeof node !== "object" || seen.has(node)) return 0;
  seen.add(node);
  return 1 + Object.values(node).reduce((sum, child) => sum + countNodes(child, seen), 0);
}
const a = { name: "a" };
const b = { name: "b", a };
a.b = b; // cycle
console.log(countNodes(a)); // 2 - no infinite loop

// Branding: only objects created by our factory are trusted
const trusted = new WeakSet();
function createToken(value) {
  const token = Object.freeze({ value });
  trusted.add(token);
  return token;
}
const real = createToken("abc");
const fake = { value: "abc" };
console.log(trusted.has(real), trusted.has(fake)); // true false

=== j106 | M | What is Symbol?
**`Symbol` is a primitive type whose values are always unique; symbols are mainly used as property keys that cannot collide with any other key, and well-known symbols let you customise how built-in language features treat your objects.**

### Creating symbols
- `Symbol("description")`: a new, unique symbol every time. The description is only a label for debugging.
- `Symbol.for("key")`: a **global registry** symbol; the same key returns the same symbol everywhere, even across realms such as iframes.

### Symbols as property keys
- Guaranteed not to clash with string keys or other libraries' keys.
- **Hidden from** `for...in`, `Object.keys`, and `JSON.stringify`. They are not private, though: `Object.getOwnPropertySymbols` and `Reflect.ownKeys` reveal them. (For real privacy, use `#private` fields.)

### Well-known symbols
- **`Symbol.iterator`**: makes an object iterable with `for...of` and spread.
- **`Symbol.asyncIterator`**: for `for await...of`.
- **`Symbol.toPrimitive`**: control conversion to numbers and strings.
- **`Symbol.toStringTag`**: customise `Object.prototype.toString` output.
- **`Symbol.hasInstance`**: customise `instanceof`.
- **`Symbol.dispose` / `Symbol.asyncDispose`**: used by the `using` declarations from the explicit resource management proposal, which is rolling out in engines.

### Use cases
Library metadata that will not collide with user properties, enum-like constants that cannot be confused with strings, and implementing language protocols like iteration.
--- code
const id1 = Symbol("id");
const id2 = Symbol("id");
console.log(id1 === id2, typeof id1, id1.description); // false "symbol" "id"
console.log(Symbol.for("app.version") === Symbol.for("app.version")); // true (global registry)

// Collision-free, hidden-from-JSON keys
const META = Symbol("meta");
const user = { name: "Ada", [META]: { fetchedAt: 1700000000 } };
console.log(Object.keys(user), JSON.stringify(user)); // ["name"] {"name":"Ada"}
console.log(user[META].fetchedAt); // 1700000000
console.log(Object.getOwnPropertySymbols(user).length); // 1 - discoverable, so not truly private

// Enum-like constants that can't be mistaken for strings
const Status = Object.freeze({ Active: Symbol("active"), Banned: Symbol("banned") });
const check = (s) => (s === Status.Active ? "welcome" : "denied");
console.log(check(Status.Active), check("active")); // welcome denied

// Well-known symbols customise built-in behaviour
class Range {
  constructor(from, to) {
    Object.assign(this, { from, to });
  }
  *[Symbol.iterator]() {
    for (let i = this.from; i <= this.to; i++) yield i;
  }
  get [Symbol.toStringTag]() {
    return "Range";
  }
}
const r = new Range(1, 4);
console.log([...r], Object.prototype.toString.call(r)); // [1, 2, 3, 4] "[object Range]"

=== j107 | M | What is BigInt?
**`BigInt` is a numeric primitive for integers of any size, written with an `n` suffix (`123n`) or created with `BigInt(value)`; it exists because regular `number`s lose precision beyond `Number.MAX_SAFE_INTEGER` (2^53 - 1).**

### Why it is needed
`number` is a 64-bit float and represents every integer exactly only up to 9,007,199,254,740,991. Beyond that, `9007199254740993` silently becomes `9007199254740992`. That breaks database ids (Twitter/X, Discord snowflakes), financial calculations in minor units, cryptography and high-precision timestamps.

### Rules
- **No mixing** with `number` in arithmetic: `1n + 1` throws a `TypeError`. Convert explicitly with `BigInt(x)` or `Number(big)` (which may lose precision).
- **Division truncates** towards zero: `7n / 2n === 3n`.
- Comparisons work across types: `1n < 2` is `true`, `1n == 1` is `true`, `1n === 1` is `false`.
- `Math` functions do not accept BigInt.
- `typeof 10n` is `"bigint"`.
- `JSON.stringify` **throws** on BigInt; convert to a string first (or define `BigInt.prototype.toJSON` in your app, carefully).
- No unary `+` (`+1n` throws).

### When to use it
- Large integer ids from APIs: keep them as strings in JSON, convert to BigInt only for arithmetic.
- Exact integer arithmetic beyond 2^53.

### When not to
Decimals (BigInt is integers only) and ordinary counters: BigInt is slower than `number`. For money, store integer cents (a `number` is fine up to large amounts) or use a decimal library.
--- code
console.log(Number.MAX_SAFE_INTEGER); // 9007199254740991
console.log(9007199254740993); // 9007199254740992  <- precision silently lost
console.log(9007199254740993n); // 9007199254740993n - exact

// Big factorials stay exact
const factorial = (n) => (n <= 1n ? 1n : n * factorial(n - 1n));
console.log(factorial(25n)); // 15511210043330985984000000n

// Cannot mix with number
try {
  console.log(10n + 1);
} catch (e) {
  console.log(e.name); // TypeError
}
console.log(10n + BigInt(1), Number(10n) + 1); // 11n 11

console.log(7n / 2n, 1n < 2, 1n == 1, 1n === 1); // 3n true true false

// JSON: send large ids as strings
const order = { id: 1234567890123456789n, total: 4999 };
const json = JSON.stringify(order, (k, v) => (typeof v === "bigint" ? v.toString() : v));
console.log(json); // {"id":"1234567890123456789","total":4999}
console.log(BigInt(JSON.parse(json).id) + 1n); // 1234567890123456790n

=== j108 | H | What is Proxy?
**A `Proxy` wraps a target object and lets you intercept fundamental operations on it (reading, writing, deleting, checking, enumerating, calling) through handler functions called traps.**

### Syntax
`const proxy = new Proxy(target, handler)`. Any trap you do not define falls through to the target.

### Common traps
- `get(target, prop, receiver)`: property reads.
- `set(target, prop, value, receiver)`: writes; return `true` on success (returning `false` throws in strict mode).
- `has` (the `in` operator), `deleteProperty`, `ownKeys` (`Object.keys`, `for...in`), `getOwnPropertyDescriptor`, `defineProperty`.
- `apply` and `construct` when the target is a function.

### Real-world uses
- **Reactivity**: Vue 3 and MobX track which properties a component reads and re-render when they change.
- **Validation** of writes (see "How to use Proxy for validation").
- **Default values** for missing properties, and negative array indexes.
- **Logging, tracing and access control** (read-only views, hiding private keys).
- **API clients** that build URLs from property access (`api.users.get()`).
- Mocks and test spies.

### Best practices
- Inside traps, use **`Reflect`** methods (`Reflect.get(target, prop, receiver)`) to perform the default behaviour correctly, including getters and inheritance.
- Respect **invariants**: for example, a non-configurable property must keep reporting its real value, or the engine throws.

### Costs and limits
Every intercepted operation runs your code, so proxies are slower than plain objects. Avoid them in very hot paths. Some built-ins with internal slots (`Map`, `Date`, private class fields) do not work transparently through a proxy without extra care.
--- code
// Default values + read logging
const settings = new Proxy(
  { theme: "dark" },
  {
    get(target, prop, receiver) {
      if (!(prop in target)) return `<default ${String(prop)}>`;
      return Reflect.get(target, prop, receiver);
    },
  }
);
console.log(settings.theme, settings.language); // dark <default language>

// Negative indexes for arrays
const withNegativeIndex = (arr) =>
  new Proxy(arr, {
    get(target, prop, receiver) {
      const i = Number(prop);
      if (Number.isInteger(i) && i < 0) prop = String(target.length + i);
      return Reflect.get(target, prop, receiver);
    },
  });
const letters = withNegativeIndex(["a", "b", "c"]);
console.log(letters[-1], letters[0], letters.length); // c a 3

// A tiny reactive store: run a callback whenever a property changes
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, prop, value, receiver) {
      const old = target[prop];
      const ok = Reflect.set(target, prop, value, receiver);
      if (ok && old !== value) onChange(prop, old, value);
      return ok;
    },
  });
}
const state = reactive({ count: 0 }, (prop, from, to) => console.log(`${prop}: ${from} -> ${to}`));
state.count++; // count: 0 -> 1
state.count = 1; // no change, no log
state.count = 5; // count: 1 -> 5

=== j109 | H | What is Reflect?
**`Reflect` is a built-in object with static methods that perform the default behaviour of fundamental object operations (`get`, `set`, `has`, `deleteProperty`, `ownKeys`, `apply`, `construct`...), with the same names and arguments as Proxy traps.**

### Why it exists
1. **Companion to Proxy**: inside a trap, `Reflect.get(target, prop, receiver)` does exactly what the engine would have done, including getters and inheritance, so you can add behaviour and then forward cleanly.
2. **Better return values**: `Reflect.set` and `Reflect.defineProperty` return `true`/`false` instead of throwing or failing silently.
3. **Function form of operators**: `Reflect.has(obj, key)` instead of `key in obj`, and `Reflect.deleteProperty` instead of `delete`, which is handy for functional code.
4. **Complete key listing**: `Reflect.ownKeys(obj)` returns string **and** symbol keys, including non-enumerable ones.
5. **Safe function calls**: `Reflect.apply(fn, thisArg, args)` works even if `fn` has its own `apply` property.

### The receiver argument
`Reflect.get(target, prop, receiver)` passes `receiver` as `this` to getters. In a Proxy, forwarding the `receiver` ensures that getters reading other properties also go through the proxy, which matters for inheritance and reactivity.

### Reflect vs Object
Many methods overlap (`Object.getPrototypeOf` vs `Reflect.getPrototypeOf`). The `Reflect` versions are designed for meta-programming: consistent arguments and boolean results instead of exceptions.

### Reflect.construct
Calls a constructor with an arguments array and optionally a different `new.target`, useful when building factories or subclasses dynamically.
--- code
const user = { name: "Ada", get greeting() { return `Hi, ${this.name}`; } };
const ID = Symbol("id");
user[ID] = 7;
Object.defineProperty(user, "secret", { value: "x", enumerable: false });

console.log(Reflect.has(user, "name"), Reflect.get(user, "greeting")); // true "Hi, Ada"
console.log(Reflect.ownKeys(user)); // ["name", "greeting", "secret", Symbol(id)]
console.log(Object.keys(user)); // ["name", "greeting"] - no symbols or non-enumerables

// Boolean results instead of exceptions
const frozen = Object.freeze({ a: 1 });
console.log(Reflect.set(frozen, "a", 2)); // false (no throw, even in strict mode)
console.log(Reflect.defineProperty(frozen, "b", { value: 1 })); // false

// The receiver matters for getters inside a Proxy
const base = { first: "Ada", last: "Lovelace", get full() { return `${this.first} ${this.last}`; } };
const upper = new Proxy(base, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver); // `this` in getters = the proxy
    return typeof value === "string" ? value.toUpperCase() : value;
  },
});
console.log(upper.full); // ADA LOVELACE

// apply and construct as functions
console.log(Reflect.apply(Math.max, null, [3, 9, 4])); // 9
const date = Reflect.construct(Date, [2026, 0, 15]);
console.log(date.getFullYear()); // 2026

=== j110 | M | How to implement currying?
**A generic `curry(fn)` returns a function that collects arguments across calls and invokes the original function once it has received at least `fn.length` arguments; until then it returns another function waiting for the rest.**

### The algorithm
1. Read the target arity from `fn.length`.
2. Return a function `curried(...args)`.
3. If `args.length >= arity`, call `fn` with those arguments (keeping `this`).
4. Otherwise return a new function that, when called with more arguments, calls `curried` with the old and new arguments combined.

This version accepts several arguments per step, so `add(1)(2)(3)`, `add(1, 2)(3)` and `add(1)(2, 3)` all work. That is what libraries like Lodash and Ramda do.

### Edge cases to mention in an interview
- **`fn.length` ignores** rest parameters and parameters with defaults, so `curry((a, b = 2) => ...)` thinks the arity is 1. Allow an explicit arity: `curry(fn, arity)`.
- **Variadic functions** (like `sum(...nums)`) cannot be curried by length. A common variant collects until it is called with no arguments: `sum(1)(2)(3)()`.
- **Placeholders** (Lodash's `_`) let you skip arguments; an optional extension.
- Preserve `this` by using `apply`.

### Why it matters
Curried helpers make configuration-first functions (`log("error")(message)`), point-free pipelines, and reusable predicates (`hasRole("admin")`) easy to create.
--- code
function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...more) => curried.apply(this, [...args, ...more]);
  };
}

const add3 = curry((a, b, c) => a + b + c);
console.log(add3(1)(2)(3), add3(1, 2)(3), add3(1)(2, 3), add3(1, 2, 3)); // 6 6 6 6

// Reusable, configuration-first helpers
const hasRole = curry((role, user) => user.roles.includes(role));
const isAdmin = hasRole("admin");
const users = [{ name: "Ada", roles: ["admin"] }, { name: "Linus", roles: ["user"] }];
console.log(users.filter(isAdmin).map((u) => u.name)); // ["Ada"]

// Explicit arity for functions with defaults
const greet = curry((greeting, name = "friend") => `${greeting}, ${name}!`, 2);
console.log(greet("Hello")("Ada")); // Hello, Ada!

// Variadic version: keep collecting until called with no arguments
function curryVariadic(fn) {
  const collect = (args) => (...more) => (more.length ? collect([...args, ...more]) : fn(...args));
  return collect([]);
}
const sum = curryVariadic((...nums) => nums.reduce((a, b) => a + b, 0));
console.log(sum(1)(2)(3, 4)()); // 10

=== j111 | M | What are Pure Functions?
**A pure function always returns the same output for the same inputs and has no side effects: it does not modify its arguments, external variables, the DOM, storage or the network, and does not depend on anything that can change between calls.**

### The two rules
1. **Deterministic**: same arguments, same result. No dependence on `Date.now()`, `Math.random()`, global mutable state, or the current time and user.
2. **No side effects**: no mutating inputs, no writing to outer variables, no logging, no requests.

### Why they are valuable
- **Easy to test**: give inputs, assert outputs, no mocks or setup.
- **Easy to reason about**: the signature tells the whole story.
- **Safe to memoise and cache**, since results never change for the same input.
- **Safe to run in parallel, retry or reorder.**
- **Framework requirements**: React expects component rendering and state reducers to be pure (Strict Mode deliberately calls them twice to expose impurity), and Redux reducers must be pure.

### Turning impure into pure
- Pass the changing value in as an argument: `formatDate(date, now)` instead of reading `new Date()` inside.
- Return a new value instead of mutating: `[...list, item]` instead of `list.push(item)`.
- Keep side effects at the edges of the program (event handlers, effects, API layers) and keep the core logic pure ("functional core, imperative shell").

### Reality check
Programs need side effects to be useful. The goal is not zero side effects, but isolating them so most logic is pure.
--- code
// Pure: depends only on inputs, returns a new value
const addItem = (cart, item) => [...cart, item];
const total = (cart) => cart.reduce((sum, i) => sum + i.price * i.qty, 0);

// Impure: mutates its input and reads external state
let discount = 0.1;
function addItemImpure(cart, item) {
  cart.push(item); // side effect: mutates the argument
  return cart.length * (1 - discount); // depends on external variable
}

const cart = [{ name: "Book", price: 10, qty: 2 }];
const next = addItem(cart, { name: "Pen", price: 2, qty: 3 });
console.log(cart.length, next.length, total(next)); // 1 2 26

// Make time-dependent logic pure by passing time in
const isExpired = (expiresAt, now) => now >= expiresAt;
console.log(isExpired(1000, 999), isExpired(1000, 1000)); // false true
// in the app: isExpired(token.expiresAt, Date.now())  <- the impure part stays at the edge

// Pure functions are trivially testable and memoisable
const assertEqual = (a, b) => console.log(JSON.stringify(a) === JSON.stringify(b) ? "pass" : "FAIL");
assertEqual(total([{ price: 5, qty: 2 }]), 10); // pass
assertEqual(addItem([], 1), [1]); // pass

=== j112 | E | What are side effects?
**A side effect is anything a function does besides computing and returning a value: changing state outside itself, mutating its arguments, or interacting with the outside world such as the network, DOM, storage, timers or console.**

### Examples
- Mutating a parameter or a global/outer variable.
- Updating the DOM.
- HTTP requests, WebSocket messages.
- Reading or writing `localStorage`, cookies, files.
- Logging, analytics, `alert`.
- Starting timers, subscribing to events.
- Reading changing values like `Date.now()` or `Math.random()` (strictly, these make a function impure rather than being side effects themselves).

### Side effects are necessary
A program with no side effects cannot show anything or save anything. The goal is to **control** them:
- Keep core logic pure and push side effects to the boundaries (handlers, effects, services).
- Make them explicit and easy to find.
- Make them idempotent where possible (safe to repeat).
- Always pair setup with cleanup (unsubscribe, clear timers, abort requests).

### In React
Rendering must be pure. Side effects go in **event handlers** (in response to user actions) or **`useEffect`** (to synchronise with external systems), with cleanup functions. Fetching data is increasingly done in Server Components, route loaders or libraries like TanStack Query rather than raw effects.

### Testing
Functions with side effects need mocks or fakes for the outside world. Isolating effects behind small adapters keeps that manageable.
--- code
const log = [];

// Side effects mixed with logic (harder to test)
function checkoutImpure(cart) {
  const total = cart.reduce((s, i) => s + i.price, 0);
  log.push(`charged ${total}`); // side effect: external state
  cart.length = 0; // side effect: mutates the argument
  return total;
}

// Pure core + explicit side effects at the edge
const calculateTotal = (cart) => cart.reduce((s, i) => s + i.price, 0);

function createCheckout({ charge, clearCart }) {
  return async (cart) => {
    const total = calculateTotal(cart); // pure
    await charge(total); // side effect, injected
    clearCart(); // side effect, injected
    return total;
  };
}

// In tests (or here), swap the real effects for fakes
const effects = [];
const checkout = createCheckout({
  charge: async (amount) => effects.push(`charge ${amount}`),
  clearCart: () => effects.push("clear cart"),
});

const items = [{ price: 20 }, { price: 5 }];
console.log(await checkout(items), effects, items.length); // 25 ["charge 25", "clear cart"] 2

console.log(checkoutImpure([{ price: 1 }]), log); // 1 ["charged 1"]

=== j113 | M | What are immutability patterns?
**Immutability patterns are techniques for updating data by creating new versions instead of mutating existing ones, such as spread updates, non-mutating array methods, structural sharing, freezing, and helper libraries like Immer.**

### Core patterns
- **Object update**: `{ ...obj, key: value }`.
- **Nested update**: copy each level along the changed path: `{ ...state, user: { ...state.user, address: { ...state.user.address, city } } }`.
- **Array add/remove/update**: `[...list, item]`, `list.filter(i => i.id !== id)`, `list.map(i => i.id === id ? { ...i, done: true } : i)`.
- **ES2023 copies**: `toSorted`, `toReversed`, `toSpliced`, `with(index, value)`.
- **Remove a key**: `const { removed, ...rest } = obj`.
- **Maps/Sets**: create a new one: `new Map(old).set(k, v)`.

### Structural sharing
Only the changed path is copied; everything else is reused by reference. This keeps updates cheap and lets libraries detect changes with `===`, which is how React, Redux and memoisation decide what to re-render.

### Enforcing immutability
- `Object.freeze` (shallow) or a recursive deep freeze in development.
- TypeScript's `readonly` and `Readonly<T>`, `as const`.

### Immer
Write "mutating" code against a draft; Immer produces the immutable result with structural sharing. Redux Toolkit uses it internally. It shines with deeply nested state.

### Normalise deep state
If updates require copying five levels deep, flatten the data (store entities by id in maps) so updates touch one level.
--- code
const state = {
  user: { name: "Ada", address: { city: "London", zip: "N1" } },
  todos: [{ id: 1, title: "Write", done: false }, { id: 2, title: "Ship", done: false }],
};

// Nested update: copy only along the changed path
const moved = {
  ...state,
  user: { ...state.user, address: { ...state.user.address, city: "Paris" } },
};
console.log(state.user.address.city, moved.user.address.city); // London Paris
console.log(moved.todos === state.todos); // true - untouched parts are shared

// Array patterns
const toggled = state.todos.map((t) => (t.id === 2 ? { ...t, done: true } : t));
const removed = state.todos.filter((t) => t.id !== 1);
const added = [...state.todos, { id: 3, title: "Celebrate", done: false }];
console.log(toggled[1].done, removed.length, added.length, state.todos[1].done); // true 1 3 false

// Remove a key immutably
const { zip, ...addressWithoutZip } = state.user.address;
console.log(addressWithoutZip); // { city: "London" }

// Deep freeze in development to catch accidental mutation
const deepFreeze = (obj) => {
  Object.values(obj).forEach((v) => typeof v === "object" && v !== null && deepFreeze(v));
  return Object.freeze(obj);
};
"use strict";
const frozen = deepFreeze(structuredClone(state));
console.log(Object.isFrozen(frozen.user.address)); // true

// Normalised state: entities by id make updates shallow
const byId = { 1: { title: "Write" }, 2: { title: "Ship" } };
const updated = { ...byId, 2: { ...byId[2], title: "Ship it" } };
console.log(updated[2].title, byId[2].title); // Ship it Ship

=== j114 | E | What are Higher-Order Functions?
**A higher-order function is a function that takes another function as an argument, returns a function, or both; it is possible because functions are values in JavaScript.**

### Built-in examples
`map`, `filter`, `reduce`, `forEach`, `sort`, `find`, `some`, `every`, `setTimeout`, `addEventListener`, `Promise.then`. They all take a function that defines the specific behaviour, while they handle the general part (looping, scheduling, waiting).

### Functions that return functions
- **Function factories**: `makeMultiplier(2)`.
- **Decorators/wrappers** that add behaviour to an existing function: `debounce`, `throttle`, `memoize`, `once`, logging, retry, timing.
- **Middleware**: Express and Redux middleware are functions returning functions.
- **Currying and partial application**.

### Why they matter
- **Abstraction**: separate *what* to do from *how* to iterate, wait or repeat.
- **Reuse**: one `retry` wrapper works for any async function.
- **Composition**: small functions combine into pipelines.
- **Declarative code**: `users.filter(isActive).map(toCard)` reads like a description of the result.

### In React
Hooks and render functions are built on the same idea. Higher-order components (`withAuth(Component)`) were the classic pattern before hooks; they still appear in older codebases.

### Tip
Keep the functions you pass in small and named (`isActive`, `byDate`) so higher-order calls read like sentences.
--- code
// Takes a function
const isActive = (u) => u.active;
const toLabel = (u) => `${u.name} (${u.role})`;
const users = [
  { name: "Ada", role: "admin", active: true },
  { name: "Linus", role: "user", active: false },
];
console.log(users.filter(isActive).map(toLabel)); // ["Ada (admin)"]

// Returns a function: a reusable wrapper that adds behaviour
function withLogging(fn) {
  return (...args) => {
    const result = fn(...args);
    console.log(`${fn.name}(${args.join(", ")}) = ${result}`);
    return result;
  };
}
const add = (a, b) => a + b;
withLogging(add)(2, 3); // add(2, 3) = 5

// Retry wrapper for any async function
function withRetry(fn, attempts = 3) {
  return async (...args) => {
    for (let i = 1; ; i++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (i >= attempts) throw e;
      }
    }
  };
}
let calls = 0;
const flaky = async () => (++calls < 3 ? Promise.reject(new Error("flaky")) : "ok on attempt " + calls);
console.log(await withRetry(flaky)()); // ok on attempt 3

// Function factory
const makeMultiplier = (factor) => (n) => n * factor;
console.log([1, 2, 3].map(makeMultiplier(10))); // [10, 20, 30]

=== j115 | M | What is Memoization?
**Memoization is caching a function's results by its arguments, so repeated calls with the same inputs return the stored result instead of recomputing it; it trades memory for speed and only works for pure functions.**

### How it works
Wrap the function; on each call build a key from the arguments, return the cached value if present, otherwise compute, store and return it.

### Choosing the cache key
- Single primitive argument: use it directly as a `Map` key.
- Several primitives: join them or nest Maps.
- Object arguments: `JSON.stringify` (slow, order-sensitive) or a `WeakMap` keyed by the object (fast, no leaks, but only works if the same object instance is passed again).

### When it helps
- Expensive pure computations called repeatedly with the same inputs (formatting, parsing, layout calculations).
- **Recursive algorithms with overlapping subproblems** (Fibonacci, dynamic programming), where it turns exponential time into linear.
- Caching async results (store the **promise**, so concurrent callers share one request).

### Pitfalls
- **Unbounded growth**: limit the cache size (LRU) or expire entries.
- **Impure functions** give stale or wrong results.
- **Overhead**: for cheap functions, building the key costs more than recomputing.

### In React
`useMemo` (cache a value) and `useCallback` (cache a function) memoise between renders, and `React.memo` skips re-rendering a component when props are unchanged. The React Compiler can add much of this automatically.
--- code
function memoize(fn, { maxSize = 100, key = (...args) => JSON.stringify(args) } = {}) {
  const cache = new Map();
  const memoized = (...args) => {
    const k = key(...args);
    if (cache.has(k)) return cache.get(k);
    const value = fn(...args);
    cache.set(k, value);
    if (cache.size > maxSize) cache.delete(cache.keys().next().value); // drop the oldest
    return value;
  };
  memoized.cache = cache;
  return memoized;
}

let computations = 0;
const slowSquare = (n) => {
  computations++;
  for (let i = 0; i < 1e5; i++); // pretend this is expensive
  return n * n;
};
const fastSquare = memoize(slowSquare);
console.log(fastSquare(12), fastSquare(12), fastSquare(12), "computed", computations, "time"); // 144 144 144 computed 1 time

// Recursion with overlapping subproblems: exponential -> linear
const countPaths = memoize((rows, cols) =>
  rows === 1 || cols === 1 ? 1 : countPaths(rows - 1, cols) + countPaths(rows, cols - 1)
);
console.log(countPaths(16, 16)); // 155117520 (instant)

// Async: cache the promise so concurrent calls share one request
let requests = 0;
const getUser = memoize(async (id) => {
  requests++;
  await new Promise((r) => setTimeout(r, 10));
  return { id };
});
await Promise.all([getUser(1), getUser(1), getUser(1)]);
console.log("requests made:", requests); // requests made: 1

=== j116 | H | How do Promises work internally?
**Internally a promise is a small state machine (pending, fulfilled or rejected) with two lists of reactions; settling it stores the result and schedules each registered reaction as a microtask, and every `.then` call creates a new promise that is resolved with whatever its handler returns.**

### The internal slots (per the spec)
- `[[PromiseState]]`: pending / fulfilled / rejected.
- `[[PromiseResult]]`: the value or reason.
- `[[PromiseFulfillReactions]]` and `[[PromiseRejectReactions]]`: handlers waiting while pending.
- `[[PromiseIsHandled]]`: used to report unhandled rejections.

### What happens step by step
1. **Construction**: the executor runs synchronously and receives `resolve` and `reject` functions. Only the first call to either has any effect.
2. **`.then(onFulfilled, onRejected)`** always returns a **new promise**. If the original is still pending, the reaction is stored; if already settled, a job is queued immediately.
3. **Settling** stores the result and queues every stored reaction as a **microtask** (a "PromiseReactionJob").
4. **Running a reaction** calls the handler. Its return value resolves the derived promise; a throw rejects it. A missing handler passes the value or error through, which is how errors skip ahead to a later `.catch`.
5. **Resolving with a thenable** (another promise or any object with a `then` method) does not fulfil directly. A job adopts that thenable's eventual state. This "thenable assimilation" is what makes returning promises from `.then` flatten chains, and it costs extra microtask ticks.

### Why handlers are always async
Even for an already-resolved promise, reactions go through the microtask queue. That guarantees consistent ordering ("Zalgo-free" code).

### async/await
`await x` is roughly "wrap `x` in a resolved promise and continue the function in a reaction job", which is why code after `await` always runs in a later microtask.
--- code
// Watching the internals through ordering
const order = [];

const p = new Promise((resolve) => {
  order.push("1 executor runs synchronously");
  resolve("value");
  resolve("ignored"); // only the first settle counts
});

p.then((v) => order.push(`3 reaction ran as a microtask with ${v}`));
order.push("2 .then registered; reaction queued, not run yet");

// .then returns a NEW promise resolved by the handler's return value
const derived = p.then(() => {
  throw new Error("handler threw");
});
derived.catch((e) => order.push(`4 derived promise rejected: ${e.message}`));
console.log(derived !== p); // true

// Missing handlers pass values and errors through the chain
Promise.reject(new Error("skips ahead"))
  .then(() => order.push("never runs"))
  .then(() => order.push("never runs either"))
  .catch((e) => order.push(`6 caught later: ${e.message}`)); // needs 3 microtask hops

// Thenable assimilation: any object with .then is adopted
const thenable = { then(resolve) { resolve("from a thenable"); } };
Promise.resolve(thenable).then((v) => order.push(`5 ${v}`)); // fewer hops, so it lands first

// Independent chains interleave by how many microtask hops each needs, not by source order.

await new Promise((r) => setTimeout(r, 0));
console.log(order.join("\n"));

=== j117 | M | What is the Async Queue?
**An async queue is a structure that runs asynchronous tasks in a controlled way, either one at a time in order or with a limited number running at once, so you can avoid race conditions, respect rate limits and keep resource use predictable.**

### Why you need one
- **Ordering**: saving edits must happen in the order the user made them; if two `save` requests race, the older one may finish last and overwrite the newer data.
- **Concurrency limits**: uploading 500 files with `Promise.all` fires 500 requests at once, overwhelming the browser, the server or an API's rate limit.
- **Backpressure**: produce work faster than it can be processed without running out of memory.

### Two common shapes
1. **Serial queue (concurrency 1)**: chain each task onto the previous promise. Simple and guarantees order.
2. **Pool with concurrency N**: keep at most N tasks running; when one finishes, start the next.

### Features of a robust queue
- Each `add(task)` returns a promise for that task's own result.
- One failing task does not stop the rest (or optionally it does, if order matters).
- Events or callbacks for idle/drained state.
- Optional priorities, retries, pausing and cancellation (`AbortSignal`).

### Libraries and built-ins
Libraries like `p-limit` and `p-queue` are widely used. In Node, streams handle backpressure natively. The full implementation is covered in "Implement an Async Queue".
--- code
// Serial queue: each task starts only after the previous one finished
function createSerialQueue() {
  let tail = Promise.resolve();
  return (task) => {
    const run = tail.then(() => task());
    tail = run.catch(() => {}); // keep the chain alive after failures
    return run; // callers still see their own errors
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const enqueue = createSerialQueue();
const saved = [];

// The first save is slow, but order is still preserved
enqueue(async () => { await wait(30); saved.push("edit 1"); });
enqueue(async () => { await wait(5); saved.push("edit 2"); });
await enqueue(async () => { saved.push("edit 3"); });
console.log(saved); // ["edit 1", "edit 2", "edit 3"]

// Concurrency-limited pool: at most `limit` tasks at once
function pLimit(limit) {
  let active = 0;
  const waiting = [];
  const next = () => {
    if (active >= limit || !waiting.length) return;
    active++;
    const { task, resolve, reject } = waiting.shift();
    task().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  };
  return (task) => new Promise((resolve, reject) => {
    waiting.push({ task, resolve, reject });
    next();
  });
}

const limit = pLimit(2);
let running = 0, peak = 0;
const job = (n) => limit(async () => {
  peak = Math.max(peak, ++running);
  await wait(10);
  running--;
  return n * 2;
});
console.log(await Promise.all([1, 2, 3, 4, 5].map(job)), "peak concurrency:", peak); // [2, 4, 6, 8, 10] peak concurrency: 2

=== j118 | M | What is the Microtask Queue?
**The microtask queue holds short callbacks (promise reactions, code after `await`, `queueMicrotask` callbacks and `MutationObserver` records) that run immediately after the current task finishes and before the browser renders or starts the next task; it is always drained completely.**

### Properties
- **Drained completely**: the engine keeps running microtasks until the queue is empty, including microtasks queued by other microtasks.
- **Runs before the next task and before rendering**: so DOM changes made in microtasks are painted together.
- **FIFO order** within the queue.
- Also drained after each callback during event dispatch when the stack empties, which is why promise reactions inside a click handler run before the next listener in some cases.

### queueMicrotask(fn)
A direct way to schedule a microtask without creating a promise. Useful for:
- Deferring work until the current synchronous code finishes but before anything else (e.g. batching several state changes into one notification).
- Making a function consistently asynchronous.

### Dangers
- **Starvation**: a microtask that always schedules another blocks rendering, input and timers forever. The page freezes even though no single function runs for long.
- Errors thrown in `queueMicrotask` callbacks are reported as uncaught errors (they do not reject anything).

### Microtasks vs `setTimeout(fn, 0)`
Use a microtask to run "right after this code" and a task (`setTimeout`, `MessageChannel`, `scheduler.yield()`) to **yield** to the browser so it can render and handle input.
--- code
// Batching: many synchronous updates -> one notification
function createStore(initial) {
  let state = initial;
  let scheduled = false;
  const listeners = new Set();
  return {
    set(patch) {
      state = { ...state, ...patch };
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        listeners.forEach((l) => l(state)); // runs once, after all sync updates
      });
    },
    subscribe: (l) => listeners.add(l),
  };
}

const store = createStore({ a: 0, b: 0 });
let notifications = 0;
store.subscribe((s) => {
  notifications++;
  console.log("render with", s);
});
store.set({ a: 1 });
store.set({ b: 2 });
store.set({ a: 3 });
console.log("synchronous code done, notifications so far:", notifications); // 0

await Promise.resolve(); // let the microtask run
console.log("notifications after microtasks:", notifications); // 1

// Microtasks queued by microtasks run in the same drain, before any timer
const order = [];
setTimeout(() => order.push("timer"), 0);
queueMicrotask(() => {
  order.push("micro 1");
  queueMicrotask(() => order.push("micro 2 (nested)"));
});
await new Promise((r) => setTimeout(r, 5));
console.log(order); // ["micro 1", "micro 2 (nested)", "timer"]

=== j119 | E | What is Callback Hell?
**Callback hell is deeply nested asynchronous callbacks, where each step is written inside the previous step's callback, producing code that drifts right ("the pyramid of doom") and becomes hard to read, debug and handle errors in.**

### Why it happens
With callback-based APIs, the only way to run step B after step A is to put B inside A's callback. Several dependent steps (load user, then orders, then details, then save) nest several levels deep.

### Problems beyond indentation
- **Error handling repeats** at every level (`if (err) return handle(err)`), and one missed check silently swallows failures.
- **`try/catch` does not work** across async boundaries.
- **Hard to run things in parallel** or add timeouts and retries.
- **Inversion of control**: you trust each API to call your callback exactly once.

### Fixes, in historical order
1. **Named functions** instead of anonymous inline callbacks (flattens the code, does not fix error handling).
2. **Promises**: chain with `.then` and handle errors once with `.catch`.
3. **async/await**: write the steps top to bottom with one `try/catch`.

### Converting old APIs
Wrap callback APIs with `new Promise(...)` or Node's `util.promisify`. Most modern APIs (fetch, Node's `fs/promises`) already return promises.
--- code
// Simulated callback-based API (error-first)
const db = {
  getUser: (id, cb) => setTimeout(() => cb(null, { id, name: "Ada" }), 5),
  getOrders: (user, cb) => setTimeout(() => cb(null, [{ id: 7, total: 40 }]), 5),
  getDetails: (order, cb) => setTimeout(() => (order.id === 7 ? cb(null, { ...order, items: 3 }) : cb(new Error("missing"))), 5),
};

// Callback hell: nesting + repeated error handling
db.getUser(1, (err, user) => {
  if (err) return console.log(err);
  db.getOrders(user, (err, orders) => {
    if (err) return console.log(err);
    db.getDetails(orders[0], (err, details) => {
      if (err) return console.log(err);
      console.log("callbacks:", user.name, details.items, "items");
    });
  });
});

// Fix: promisify once, then write flat async code with one error handler
const promisify = (fn) => (...args) => new Promise((resolve, reject) => fn(...args, (err, data) => (err ? reject(err) : resolve(data))));
const getUser = promisify(db.getUser);
const getOrders = promisify(db.getOrders);
const getDetails = promisify(db.getDetails);

try {
  const user = await getUser(1);
  const [firstOrder] = await getOrders(user);
  const details = await getDetails(firstOrder);
  console.log("async/await:", user.name, details.items, "items");
} catch (err) {
  console.log("one place to handle every error:", err.message);
}

=== j120 | M | What is Promise Chaining?
**Promise chaining is linking `.then()` calls so each step receives the previous step's result; it works because every `.then` returns a new promise that resolves with whatever its handler returns, including another promise, which is waited for automatically.**

### Rules of the chain
- **Return a value** → the next `.then` receives it.
- **Return a promise** → the chain waits for it, then passes on its result (this is what keeps async steps flat instead of nested).
- **Throw (or return a rejected promise)** → the chain skips to the next `.catch` (or a `.then` with a rejection handler).
- **`.catch` returns a promise too**: if it returns normally, the chain **recovers** and continues; if it re-throws, the error keeps propagating.
- **`.finally`** runs either way and passes the original result through.

### The most common bug
Forgetting to `return` inside `.then`. The next step then runs immediately with `undefined`, and the inner promise is detached (its errors become unhandled).

### Nesting vs chaining
`p.then(a => getB(a).then(b => ...))` nests and brings back callback hell. Return the promise instead: `p.then(getB).then(b => ...)`. If a later step needs an earlier value, `async/await` is usually clearer.

### Chaining vs async/await
They are equivalent. `await` is easier to read for sequential logic and loops; `.then` chains remain handy for short transformations and in code that cannot be `async`.
--- code
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

const result = await Promise.resolve(2)
  .then((n) => n * 10) // return a value
  .then((n) => wait(10, n + 1)) // return a promise -> the chain waits
  .then((n) => {
    if (n > 20) throw new Error(`too big: ${n}`);
    return n;
  })
  .catch((err) => {
    console.log("recovering from", err.message); // recovering from too big: 21
    return 0; // the chain continues with 0
  })
  .finally(() => console.log("finally runs, value passes through"))
  .then((n) => `final value: ${n}`);
console.log(result); // final value: 0

// The classic bug: missing return
const broken = await Promise.resolve(1)
  .then((n) => {
    wait(10, n + 1); // forgot `return`
  })
  .then((n) => n);
console.log(broken); // undefined

// Flat chain instead of nesting
const getUser = (id) => wait(5, { id, name: "Ada" });
const getPosts = (user) => wait(5, [`${user.name}'s first post`]);
console.log(await getUser(1).then(getPosts)); // ["Ada's first post"]

=== j121 | M | What is the Singleton Pattern?
**The Singleton pattern ensures a class or module has exactly one instance and provides a single shared access point to it, for example one database connection pool, configuration object, logger or app-wide store.**

### In JavaScript, modules are already singletons
An ES module is evaluated once, and every `import` receives the same exports. So exporting an instance (`export const logger = new Logger()`) is the simplest and most idiomatic singleton, with no special class code needed.

### Class-based singleton
Store the instance in a static (ideally private) field and return it from the constructor or a `getInstance()` method. Useful when the instance must be created lazily or configured on first use.

### Real-world places you see it
- **Database clients** (e.g. one Prisma client, reused across hot reloads in Next.js dev by storing it on `globalThis`).
- Analytics, logging and feature-flag clients.
- Global state stores.

### Criticisms
- **Hidden global state**: any code can reach and change it, making dependencies implicit.
- **Testing**: state leaks between tests; you need reset hooks or dependency injection.
- **Server-side rendering**: a module singleton is shared by **all requests** on the server. Storing per-user data in it leaks data between users. Keep request-specific data in request scope.

### Alternative
Create the instance once at the composition root and pass it to whoever needs it (dependency injection). That keeps "only one" without hidden coupling.
--- code
// 1. Idiomatic: a module-level instance (every import gets the same object)
class Logger {
  #lines = [];
  log(msg) {
    this.#lines.push(`${new Date(0).toISOString().slice(11, 19)} ${msg}`);
  }
  get count() {
    return this.#lines.length;
  }
}
const logger = new Logger(); // export const logger = new Logger();

// 2. Class-based singleton with lazy creation
class Config {
  static #instance = null;
  constructor() {
    if (Config.#instance) return Config.#instance;
    this.values = { apiUrl: "https://api.example.com", retries: 3 };
    Config.#instance = this;
  }
  static getInstance() {
    return Config.#instance ?? new Config();
  }
}

const a = new Config();
const b = Config.getInstance();
const c = new Config();
console.log(a === b, b === c); // true true
b.values.retries = 5;
console.log(a.values.retries); // 5 - same instance everywhere

logger.log("app started");
logger.log("user logged in");
console.log(logger.count); // 2

// 3. The Next.js dev pattern: survive hot reloads by caching on globalThis
const globalForDb = globalThis;
globalForDb.__db ??= { createdAt: "once", query: (sql) => `result of ${sql}` };
const db = globalForDb.__db;
console.log(db.query("select 1")); // result of select 1

=== j122 | M | What is the Factory Pattern?
**The Factory pattern uses a function (or method) to create objects, hiding the details of which concrete type is built and how it is configured; callers ask for "a notifier for email" and get a ready-to-use object.**

### Factory functions in JavaScript
In JavaScript a plain function that returns an object is a factory: no `new`, no classes needed. Closures inside it can hold private state.

### Benefits
- **Encapsulated creation logic**: validation, defaults and wiring live in one place.
- **Choose the implementation at runtime**: based on configuration, environment or input (e.g. a storage adapter that uses IndexedDB in the browser and memory in tests).
- **Private state** through closures without class syntax.
- **No `this` binding problems**, because returned methods can close over variables instead of using `this`.
- **Easy to swap in tests**.

### Factory vs constructor/class
- Classes give you `instanceof`, shared prototype methods (less memory per instance) and inheritance.
- Factories give you flexibility, privacy via closures, and the ability to return different types or cached instances.
Both are fine; pick based on whether you need those features.

### Variations
- **Simple factory**: a function with a `switch` or registry of types.
- **Factory method**: subclasses decide which object to create.
- **Abstract factory**: creates families of related objects (e.g. light and dark UI kits).
- **Registry-based factory**: register new types without editing the factory (open/closed principle).
--- code
// A registry-based factory: add new types without editing the factory
const notifierTypes = new Map();
const registerNotifier = (type, create) => notifierTypes.set(type, create);

function createNotifier(type, options = {}) {
  const create = notifierTypes.get(type);
  if (!create) throw new Error(`Unknown notifier type: ${type}`);
  return create({ retries: 3, ...options });
}

registerNotifier("email", ({ from, retries }) => ({
  send: (to, msg) => `email from ${from} to ${to}: ${msg} (retries ${retries})`,
}));
registerNotifier("sms", ({ retries }) => ({
  send: (to, msg) => `sms to ${to}: ${msg.slice(0, 160)} (retries ${retries})`,
}));

console.log(createNotifier("email", { from: "noreply@app.com" }).send("ada@x.com", "Welcome!"));
console.log(createNotifier("sms").send("+44 7700 900000", "Your code is 1234"));

try {
  createNotifier("pigeon");
} catch (e) {
  console.log(e.message); // Unknown notifier type: pigeon
}

// Factory function with private state and no `this`
function createCounter(start = 0) {
  let count = start;
  return { increment: () => ++count, reset: () => (count = start), get value() { return count; } };
}
const counter = createCounter(10);
const { increment } = counter; // safe to destructure: no `this`
increment();
increment();
console.log(counter.value); // 12

=== j123 | M | What is the Observer Pattern?
**The Observer pattern lets an object (the subject) keep a list of dependents (observers) and notify them automatically when its state changes, so they stay in sync without the subject knowing what they do.**

### Structure
- **Subject**: holds state, `subscribe(observer)`, `unsubscribe(observer)`, `notify()`.
- **Observers**: callbacks or objects with an `update` method.
- `subscribe` usually returns an **unsubscribe function**, which makes cleanup easy.

### Where you meet it
- DOM events (`addEventListener` is observer registration).
- State libraries: Redux `store.subscribe`, Zustand, MobX, signals.
- React's `useSyncExternalStore`, which subscribes components to any external store.
- `IntersectionObserver`, `MutationObserver`, `ResizeObserver`.
- RxJS observables, WebSocket message handlers, Node's `EventEmitter`.

### Observer vs Pub/Sub
In Observer, observers subscribe **directly to the subject**. In Pub/Sub, publishers and subscribers communicate **through a message broker or event bus** using topics, and do not know about each other.

### Pitfalls
- **Memory leaks** when observers forget to unsubscribe.
- **Notification storms**: many updates in a row trigger many notifications. Batch them (for example with a microtask).
- **Order dependence** between observers, and an observer throwing an error that stops others from being notified (wrap each call).
- Changing the observer list while notifying: iterate over a copy.
--- code
class Observable {
  #state;
  #observers = new Set();
  constructor(initial) {
    this.#state = initial;
  }
  get state() {
    return this.#state;
  }
  #call(observer) {
    try {
      observer(this.#state);
    } catch (e) {
      console.log("observer failed:", e.message); // one bad observer doesn't stop others
    }
  }
  subscribe(observer) {
    this.#observers.add(observer);
    this.#call(observer); // send the current value immediately
    return () => this.#observers.delete(observer); // unsubscribe function
  }
  set(updater) {
    this.#state = typeof updater === "function" ? updater(this.#state) : updater;
    for (const observer of [...this.#observers]) this.#call(observer); // copy: safe if the list changes
  }
}

const cart = new Observable({ items: 0 });
const badge = [];
const totals = [];

const unsubscribeBadge = cart.subscribe((s) => badge.push(`badge: ${s.items}`));
cart.subscribe((s) => totals.push(`total: $${s.items * 10}`));
cart.subscribe(() => {
  throw new Error("broken widget");
});

cart.set((s) => ({ items: s.items + 1 }));
unsubscribeBadge();
cart.set((s) => ({ items: s.items + 2 }));

console.log(badge); // ["badge: 0", "badge: 1"] - stopped after unsubscribing
console.log(totals); // ["total: $0", "total: $10", "total: $30"]

=== j124 | M | What is the Module Pattern?
**The module pattern organises code into self-contained units with private internals and a public interface; historically it was built with an IIFE returning an object, and today ES modules (`import`/`export`) provide it natively.**

### The classic version (pre-ES2015)
An IIFE created a private scope, kept variables and helper functions inside it, and returned an object containing only the public methods. The **revealing module pattern** defined everything privately and returned references to the public parts.

### ES modules today
- Every file has its own scope; nothing is global unless exported.
- `export` defines the public API; everything else is private.
- Modules run once and are cached, so module-level state is shared by all importers.
- Static `import`/`export` enable **tree shaking**: bundlers drop unused exports.
- `import()` loads modules lazily for code splitting.
- Top-level `await` is allowed.

### CommonJS
Node's older format (`require` / `module.exports`). Still common in the Node ecosystem; modern Node supports both, and ESM is the standard going forward.

### Private class fields
For object-level privacy, `#private` fields complement module-level privacy.

### Good module design
- Export a small, intentional API.
- Avoid side effects at import time where possible (they run once and cannot be undone, and they block tree shaking).
- Be careful with module-level mutable state on servers: it is shared across all requests.
--- code
// Classic module pattern: an IIFE with private state and a public API
const CartModule = (function () {
  const items = []; // private
  const TAX = 0.2; // private

  function subtotal() {
    return items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  // revealing module pattern: expose only what you choose
  return {
    add(name, price, qty = 1) {
      items.push({ name, price, qty });
      return this;
    },
    total() {
      return +(subtotal() * (1 + TAX)).toFixed(2);
    },
    count: () => items.length,
  };
})();

CartModule.add("Book", 10).add("Pen", 2, 3);
console.log(CartModule.count(), CartModule.total()); // 2 19.2
console.log(CartModule.items, CartModule.TAX); // undefined undefined - private

// The modern equivalent is just a file:
//
//   // cart.js
//   const items = [];                 // private to the module
//   const TAX = 0.2;
//   export function add(name, price, qty = 1) { items.push({ name, price, qty }); }
//   export function total() { ... }
//
//   // app.js
//   import { add, total } from "./cart.js";
//   const { heavyChart } = await import("./chart.js"); // lazy-load another module

=== j125 | M | What is the Pub-Sub Pattern?
**Publish/subscribe is a messaging pattern where publishers emit messages on named topics (channels) and subscribers listen to topics, with a central event bus or broker in between, so neither side needs to know about the other.**

### How it differs from Observer
- **Observer**: observers subscribe directly to a specific subject object.
- **Pub/Sub**: communication goes through a **broker** using topic names. Publishers and subscribers are fully decoupled; there can be any number of each, and they can be added at runtime.

### Where it is used
- In-app event buses connecting unrelated parts of a UI (e.g. "cart:updated" refreshes the header badge).
- Micro-frontends talking to each other.
- **Cross-tab** messaging with `BroadcastChannel`.
- Backends: Redis Pub/Sub, Kafka, Google Pub/Sub, AWS SNS, MQTT for IoT.
- Real-time features over WebSockets.

### Features of a good implementation
- `subscribe(topic, handler)` returns an unsubscribe function.
- `once` subscriptions.
- Wildcard or namespaced topics (`user.*`).
- Error isolation, so one failing handler does not stop the others.
- Optionally async delivery, so publishers are not blocked by slow subscribers.

### Trade-offs
Decoupling is powerful, but it makes the flow harder to trace ("who listens to this event?"), can hide errors, and leaks memory if subscriptions are not removed. Keep topic names documented and typed (e.g. a TypeScript map of topic → payload), and prefer explicit function calls or shared state for simple cases.
--- code
function createPubSub() {
  const topics = new Map(); // topic -> Set of handlers

  return {
    subscribe(topic, handler) {
      if (!topics.has(topic)) topics.set(topic, new Set());
      topics.get(topic).add(handler);
      return () => topics.get(topic)?.delete(handler); // unsubscribe
    },
    once(topic, handler) {
      const off = this.subscribe(topic, (data) => {
        off();
        handler(data);
      });
      return off;
    },
    publish(topic, data) {
      const handlers = [...(topics.get(topic) ?? []), ...(topics.get("*") ?? [])];
      for (const handler of handlers) {
        try {
          handler(data, topic);
        } catch (e) {
          console.log(`handler for "${topic}" failed:`, e.message);
        }
      }
      return handlers.length;
    },
  };
}

const bus = createPubSub();
const header = [];

// Unrelated parts of the app, connected only by topic names
const off = bus.subscribe("cart:updated", ({ count }) => header.push(`badge shows ${count}`));
bus.once("cart:updated", () => header.push("first-add confetti"));
bus.subscribe("*", (data, topic) => header.push(`analytics: ${topic}`));

bus.publish("cart:updated", { count: 1 });
bus.publish("cart:updated", { count: 2 });
off();
console.log(bus.publish("cart:updated", { count: 3 }), "handler(s) notified"); // 1 handler(s) notified (only analytics)
console.log(header);
// ["badge shows 1", "first-add confetti", "analytics: cart:updated", "badge shows 2", "analytics: cart:updated", "analytics: cart:updated"]
