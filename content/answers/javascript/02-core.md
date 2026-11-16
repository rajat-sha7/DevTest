=== j26 | E | What is the map() method?
**`map()` creates a new array by calling a function on every element of the original array and collecting the return values; the original array is not changed and the new array always has the same length.**

### Signature
`array.map((element, index, array) => newValue, thisArg?)`

### When to use it
Whenever you want to **transform** each item into something else: format prices, pick fields from objects, convert API data into view models, or render a list of React elements.

### Rules that trip people up
- **Always return a value.** With curly braces you need an explicit `return`; forgetting it gives an array of `undefined`.
- **Do not use `map` for side effects only.** If you are not using the result, use `forEach` or `for...of`. Linters flag unused `map` results.
- **Returning an object literal** from an arrow needs parentheses: `items.map(i => ({ id: i.id }))`.
- **`map` with `parseInt`** is a classic trap: `["1", "2", "3"].map(parseInt)` gives `[1, NaN, NaN]` because `map` passes the index as `parseInt`'s radix. Use `map(Number)` or an explicit arrow.
- **Async callbacks** return promises, so `map(async ...)` gives an array of promises. Wrap it in `Promise.all`.

### Related
`flatMap` maps and flattens one level, useful when each item produces zero or many results. `Array.from(iterable, mapFn)` maps while converting.
--- code
const products = [
  { id: 1, name: "Laptop", price: 1200 },
  { id: 2, name: "Mouse", price: 25 },
];

const labels = products.map((p) => `${p.name}: $${p.price}`);
console.log(labels); // ["Laptop: $1200", "Mouse: $25"]

const withTax = products.map((p) => ({ ...p, price: +(p.price * 1.2).toFixed(2) }));
console.log(withTax[1].price, products[1].price); // 30 25 - original untouched

console.log(["1", "2", "3"].map(parseInt)); // [1, NaN, NaN] - index used as radix
console.log(["1", "2", "3"].map(Number)); // [1, 2, 3]

// flatMap: each item can become 0..n items
const tags = [{ tags: ["js", "ts"] }, { tags: [] }, { tags: ["css"] }];
console.log(tags.flatMap((t) => t.tags)); // ["js", "ts", "css"]

// Async map needs Promise.all
const fetchPrice = async (id) => id * 10;
const prices = await Promise.all(products.map((p) => fetchPrice(p.id)));
console.log(prices); // [10, 20]

=== j27 | E | What is the filter() method?
**`filter()` returns a new array containing only the elements for which the callback returns a truthy value; it never changes the original array and the result can be any length, including empty.**

### Signature
`array.filter((element, index, array) => keep, thisArg?)`

### Typical uses
- Search results: items whose name includes a query.
- Removing items immutably: `todos.filter(t => t.id !== idToDelete)`, the standard way to delete from React state.
- Cleaning data: `values.filter(Boolean)` removes `null`, `undefined`, `0`, `""`, `NaN` and `false`.
- Removing duplicates (small arrays): `list.filter((x, i) => list.indexOf(x) === i)`. For large arrays use a `Set`.

### Things to know
- `filter` always walks the **whole** array. If you only need the first match, use `find` (or `some` for a yes/no), which stop early.
- The returned elements are the **same objects**, not copies. Mutating them changes the originals.
- `filter(Boolean)` also drops `0`, which is a bug when zeros are valid values. Be explicit: `filter(x => x != null)`.
- In TypeScript, a type predicate (`(x): x is User => ...`) lets `filter` narrow the resulting type.

### Chaining
`filter` pairs naturally with `map` and `reduce`. For very large arrays, a single `reduce` or loop avoids creating intermediate arrays.
--- code
const users = [
  { name: "Ada", age: 36, active: true },
  { name: "Linus", age: 17, active: false },
  { name: "Grace", age: 45, active: true },
];

const activeAdults = users.filter((u) => u.active && u.age >= 18);
console.log(activeAdults.map((u) => u.name)); // ["Ada", "Grace"]

// Immutable delete (React-style)
const remaining = users.filter((u) => u.name !== "Linus");
console.log(remaining.length, users.length); // 2 3

// Search
const query = "a";
console.log(users.filter((u) => u.name.toLowerCase().includes(query)).length); // 2

// filter(Boolean) drops ALL falsy values, including 0
const raw = [0, 1, null, 2, "", 3, undefined, NaN];
console.log(raw.filter(Boolean)); // [1, 2, 3]
console.log(raw.filter((x) => x != null && !Number.isNaN(x) && x !== "")); // [0, 1, 2, 3]

// Need just one? find stops at the first match
console.log(users.find((u) => u.age > 40)?.name); // Grace

=== j28 | M | What is the reduce() method?
**`reduce()` walks an array and combines its elements into a single result (a number, string, object, array or anything else) by repeatedly calling a reducer function with an accumulator and the current element.**

### Signature
`array.reduce((accumulator, element, index, array) => nextAccumulator, initialValue)`

The value you return becomes the accumulator for the next element. The final accumulator is the result.

### Always pass an initial value
Without one, `reduce` uses the first element as the starting accumulator and starts at index 1. That breaks when the array is empty (it throws a `TypeError`) and when the accumulator should be a different type from the elements (like building an object from an array of numbers).

### Common uses
- Totals and averages.
- Building lookup objects: `users.reduce((map, u) => ({ ...map, [u.id]: u }), {})`.
- Counting occurrences.
- Grouping (though `Object.groupBy` now does this directly).
- Running a list of functions in sequence (pipelines, promise chains).

### When not to use it
`reduce` is powerful but can be hard to read. If `map`, `filter`, `Object.groupBy`, `Object.fromEntries` or a plain `for...of` expresses the idea more clearly, use that.

### Performance tip
Spreading the accumulator on every step (`{ ...acc, [key]: value }`) copies it each time, which is O(n²). For large arrays, mutate the accumulator you created yourself (`acc[key] = value; return acc;`). That is safe because nothing else references it.
--- code
const orders = [
  { customer: "Ada", total: 120 },
  { customer: "Linus", total: 80 },
  { customer: "Ada", total: 50 },
];

const revenue = orders.reduce((sum, o) => sum + o.total, 0);
console.log(revenue); // 250

// Totals per customer: mutate our own accumulator (fast, still pure overall)
const byCustomer = orders.reduce((acc, o) => {
  acc[o.customer] = (acc[o.customer] ?? 0) + o.total;
  return acc;
}, {});
console.log(byCustomer); // { Ada: 170, Linus: 80 }

// Count words
const words = "the cat and the hat".split(" ");
const counts = words.reduce((acc, w) => acc.set(w, (acc.get(w) ?? 0) + 1), new Map());
console.log(Object.fromEntries(counts)); // { the: 2, cat: 1, and: 1, hat: 1 }

// Without an initial value, an empty array throws
try {
  [].reduce((a, b) => a + b);
} catch (e) {
  console.log(e.name); // TypeError
}

// Compose functions with reduce
const pipe = (...fns) => (x) => fns.reduce((v, fn) => fn(v), x);
console.log(pipe((x) => x + 1, (x) => x * 10)(4)); // 50

=== j29 | E | What is forEach()?
**`forEach()` calls a function once for every element of an array, purely for side effects; it always returns `undefined`, cannot be stopped early and does not wait for promises.**

### Signature
`array.forEach((element, index, array) => { ... }, thisArg?)`

### Good uses
Logging, updating external state, adding DOM nodes, sending analytics events: anything where you **do** something per item rather than **produce** a new value.

### Limitations
- **No `break` or `continue`.** A `return` inside the callback only skips to the next item. To stop early use `for...of`, `some`, `every` or `find`.
- **Returns `undefined`**, so it cannot be chained. If you want a new array, use `map` or `filter`.
- **Ignores async.** `items.forEach(async item => await save(item))` fires all saves at once and continues immediately; errors become unhandled rejections. Use `for...of` with `await` for sequential work, or `Promise.all(items.map(...))` for parallel.
- **Skips holes** in sparse arrays.
- Changing the array while iterating (adding or removing items) leads to confusing behaviour.

### forEach vs for...of
`for...of` is just as readable, supports `break`, `continue` and `await`, and works on any iterable (Map, Set, strings, generators). Many style guides now prefer it for side-effect loops. `forEach` remains handy in short chains like `map.forEach((value, key) => ...)`.
--- code
const cart = [
  { name: "Book", qty: 2 },
  { name: "Pen", qty: 0 },
  { name: "Lamp", qty: 1 },
];

cart.forEach((item, i) => console.log(`${i + 1}. ${item.name} x${item.qty}`));

const result = cart.forEach(() => {});
console.log(result); // undefined - cannot chain

// return only skips the current item; it does not stop the loop
cart.forEach((item) => {
  if (item.qty === 0) return;
  console.log("in stock:", item.name); // Book, Lamp
});

// The async trap
const save = (item) => new Promise((r) => setTimeout(() => r(item.name), 20));
const started = [];
cart.forEach(async (item) => started.push(await save(item)));
console.log("after forEach:", started.length); // 0 - nothing was awaited

// Do this instead
for (const item of cart) await save(item); // sequential
const saved = await Promise.all(cart.map(save)); // parallel
console.log(saved); // ["Book", "Pen", "Lamp"]

=== j30 | E | Difference between map and forEach?
**`map` builds and returns a new array from the callback's return values, so it is for transforming data; `forEach` returns `undefined` and exists only for side effects.**

| | `map` | `forEach` |
|---|---|---|
| Returns | New array, same length | `undefined` |
| Purpose | Transform data | Perform side effects |
| Chainable | Yes (`.map().filter()`) | No |
| Uses callback's return value | Yes | No (ignored) |
| Mutates original | No (unless your callback does) | No (unless your callback does) |
| Early exit | No | No |

### How to choose
Ask: "Do I need the result?"
- **Yes**: use `map` (or `filter`/`reduce`).
- **No**, I am logging, saving, rendering imperatively or updating something else: use `forEach` or `for...of`.

### Common mistakes
- Using `map` for side effects and ignoring the result. It works, but creates a throwaway array and hides intent.
- Using `forEach` and pushing into an outer array to build a result. That is exactly what `map` is for.
- Forgetting to return inside `map` with a block body, which gives `[undefined, undefined, ...]`.

### Performance
Both are similarly fast. The difference is clarity and the extra array `map` allocates. Pick based on intent, not speed.
--- code
const prices = [10, 20, 30];

// map: produce a new array
const doubled = prices.map((p) => p * 2);
console.log(doubled); // [20, 40, 60]

// forEach: side effects only, returns undefined
const result = prices.forEach((p) => console.log("price", p));
console.log(result); // undefined

// Anti-pattern: building an array with forEach
const viaForEach = [];
prices.forEach((p) => viaForEach.push(p * 2));
console.log(viaForEach); // works, but map says it better

// Common map bug: block body without return
const broken = prices.map((p) => {
  p * 2;
});
console.log(broken); // [undefined, undefined, undefined]

// map chains, forEach cannot
const summary = prices
  .map((p) => p * 1.2)
  .filter((p) => p > 15)
  .map((p) => p.toFixed(2));
console.log(summary); // ["24.00", "36.00"]

=== j31 | E | What is JSON?
**JSON (JavaScript Object Notation) is a text format for structured data, based on JavaScript object and array syntax, that has become the standard way to exchange data between servers, browsers, APIs and config files.**

### What JSON allows
- Objects with **double-quoted** string keys: `{"name": "Ada"}`.
- Arrays, strings (double quotes only), numbers, `true`, `false` and `null`.

### What JSON does not allow
- Single quotes, trailing commas, comments, or unquoted keys.
- `undefined`, functions, `Symbol`, `NaN`, `Infinity`.
- `Date`, `Map`, `Set`, `BigInt` or class instances as such. They must be converted to supported types first (e.g. a `Date` becomes an ISO string).

### JSON vs JavaScript objects
A JavaScript object is a live value in memory; JSON is just text. You convert between them with `JSON.stringify` (value → text) and `JSON.parse` (text → value). `fetch` responses offer `response.json()`, which parses the body for you.

### Where you see it
- REST and many other web APIs.
- `package.json`, `tsconfig.json` and other config files (some tools accept JSONC, which allows comments).
- `localStorage`, which stores only strings, so objects are saved as JSON.

### Safety
`JSON.parse` only builds data, it never runs code, so it is safe to use on untrusted input (unlike the old practice of `eval`). Still validate the shape of the data before trusting it, for example with a schema library like Zod.
--- code
const user = {
  name: "Ada",
  joined: new Date("2024-01-15T00:00:00Z"),
  tags: new Set(["admin"]),
  score: NaN,
  greet() {},
  nickname: undefined,
};

const text = JSON.stringify(user);
console.log(text);
// {"name":"Ada","joined":"2024-01-15T00:00:00.000Z","tags":{},"score":null}
// date -> string, Set -> {}, NaN -> null, functions and undefined dropped

const back = JSON.parse(text);
console.log(typeof back.joined); // "string" - not a Date any more

// Valid vs invalid JSON
for (const sample of ['{"ok":true}', "{'ok':true}", '{"a":1,}']) {
  try {
    JSON.parse(sample);
    console.log("valid  ", sample);
  } catch {
    console.log("invalid", sample);
  }
}

// Convert unsupported types yourself
const safe = { ...user, tags: [...user.tags] };
console.log(JSON.stringify(safe.tags)); // ["admin"]

=== j32 | M | What is JSON.parse() and JSON.stringify()?
**`JSON.stringify(value)` converts a JavaScript value into a JSON string, and `JSON.parse(text)` converts a JSON string back into a value; both accept an optional function to customise the conversion.**

### JSON.stringify(value, replacer?, space?)
- **`replacer`**: a function `(key, value) => newValue` to transform or drop values (return `undefined` to drop), or an array of keys to include.
- **`space`**: indentation for readable output, e.g. `2`.
- Objects can define **`toJSON()`** to control how they are serialised. `Date` uses this to become an ISO string.
- Drops `undefined`, functions and symbols in objects (they become `null` inside arrays).
- `NaN` and `Infinity` become `null`.
- **Throws** on circular references and on `BigInt` values.

### JSON.parse(text, reviver?)
- Throws a `SyntaxError` on invalid JSON, so wrap untrusted input in `try/catch`.
- **`reviver`**: `(key, value) => newValue`, called bottom-up, perfect for turning date strings back into `Date` objects.

### Deep cloning with JSON
`JSON.parse(JSON.stringify(obj))` used to be the go-to deep clone, but it loses dates, `undefined`, `Map`, `Set` and fails on cycles. Prefer **`structuredClone(obj)`**, which is built in everywhere now.

### Practical tips
- Persist to `localStorage` with `JSON.stringify` and read back with a guarded `JSON.parse`.
- Use the replacer to strip secrets (passwords, tokens) before logging.
--- code
const order = {
  id: 7,
  createdAt: new Date("2025-06-01T10:00:00Z"),
  password: "secret",
  amount: 10n,
};

// Replacer: drop secrets, convert BigInt (which would otherwise throw)
const json = JSON.stringify(
  order,
  (key, value) => (key === "password" ? undefined : typeof value === "bigint" ? value.toString() : value),
  2
);
console.log(json);

// Reviver: turn ISO strings back into Dates
const isoDate = /^\d{4}-\d{2}-\d{2}T/;
const parsed = JSON.parse(json, (key, value) => (typeof value === "string" && isoDate.test(value) ? new Date(value) : value));
console.log(parsed.createdAt instanceof Date, parsed.createdAt.getUTCHours()); // true 10

// toJSON controls serialisation
class Money {
  constructor(cents) { this.cents = cents; }
  toJSON() { return `$${(this.cents / 100).toFixed(2)}`; }
}
console.log(JSON.stringify({ price: new Money(1999) })); // {"price":"$19.99"}

// Safe parse
const safeParse = (text, fallback = null) => {
  try { return JSON.parse(text); } catch { return fallback; }
};
console.log(safeParse("{bad json}", {})); // {}

=== j33 | E | What is 'strict mode'?
**Strict mode is an opt-in, restricted variant of JavaScript (enabled with `"use strict"`) that turns silent mistakes into errors, removes some confusing features and makes code easier for engines to optimise.**

### How to enable it
- Put `"use strict";` at the very top of a script or function.
- It is **on automatically** inside ES modules and class bodies, so most modern code already runs in strict mode.

### What changes
- **Assigning to an undeclared variable throws** a `ReferenceError` instead of creating a global.
- **`this` is `undefined`** in plain function calls instead of the global object.
- **Writing to read-only properties throws**, e.g. on a frozen object or a getter-only property.
- **Deleting non-deletable properties throws.**
- **Duplicate parameter names** are a syntax error.
- **`with` is forbidden** and `eval` cannot add variables to the surrounding scope.
- **Octal literals** like `012` are a syntax error (`0o12` is fine).
- Reserved words such as `let`, `static`, `implements` cannot be used as variable names.

### Why it matters
It catches typos and accidental globals early, makes `this` bugs obvious instead of silently touching `window`, and lets engines optimise more because fewer dynamic features are allowed.

### In practice
If you write ES modules or classes, you are already in strict mode. For old-style scripts, add the directive at the top of the file.
--- code
"use strict";

// 1. No accidental globals
try {
  totl = 10; // typo for `total`
} catch (e) {
  console.log(e.name, "-", e.message); // ReferenceError - totl is not defined
}

// 2. `this` is undefined in a plain call
function whoAmI() {
  return this;
}
console.log(whoAmI()); // undefined (would be the global object in sloppy mode)

// 3. Writing to a frozen object throws instead of failing silently
const config = Object.freeze({ debug: false });
try {
  config.debug = true;
} catch (e) {
  console.log(e.name); // TypeError
}

// 4. Getter-only properties cannot be assigned
const account = { get balance() { return 100; } };
try {
  account.balance = 500;
} catch (e) {
  console.log(e.name); // TypeError
}
console.log(account.balance); // 100

=== j34 | M | What is type coercion?
**Type coercion is JavaScript automatically converting a value from one type to another, either implicitly (when operators or comparisons need a different type) or explicitly (when you call `Number()`, `String()` or `Boolean()`).**

### The three conversions
- **To string**: triggered by `+` when either side is a string, by template literals, and by `String(x)`.
- **To number**: triggered by `-`, `*`, `/`, `%`, unary `+`, comparisons like `<`, and loose `==` with numbers. `Number("")` is `0`, `Number(" 42 ")` is `42`, `Number("4x")` is `NaN`, `Number(null)` is `0`, `Number(undefined)` is `NaN`.
- **To boolean**: triggered by `if`, `&&`, `||`, `!`, and `Boolean(x)`. Only the falsy values become `false`.

### The `+` operator is special
If **either** operand is a string after conversion to a primitive, `+` concatenates. Otherwise it adds. That is why `1 + "2"` is `"12"` but `"3" - 1` is `2`.

### Objects
Objects are first converted to primitives with `Symbol.toPrimitive`, then `valueOf`, then `toString`. `[] + []` is `""`, `[] + {}` is `"[object Object]"`.

### Best practices
- Convert explicitly at boundaries: form inputs and URL params are strings, so call `Number(value)` and validate with `Number.isFinite`.
- Use `===` to avoid coercion in comparisons.
- Be careful with `+` when values might be strings.
- TypeScript catches most accidental coercion at compile time.
--- code
// Implicit
console.log(1 + "2"); // "12"  (+ with a string concatenates)
console.log("3" - 1); // 2     (- always converts to numbers)
console.log("5" * "2"); // 10
console.log(true + 1); // 2
console.log([] + []); // ""
console.log([] + {}); // "[object Object]"
console.log("10" < "9"); // true  (string comparison, char by char)
console.log(10 < "9"); // false (number comparison)

// Explicit
console.log(Number(""), Number(" 42 "), Number("4x"), Number(null), Number(undefined)); // 0 42 NaN 0 NaN
console.log(String(123), String(null), String([1, 2])); // "123" "null" "1,2"
console.log(Boolean("0"), Boolean(0), Boolean([]), Boolean("")); // true false true false

// A classic bug with form values (always strings)
const qtyInput = "2";
console.log(qtyInput + 1); // "21"
console.log(Number(qtyInput) + 1); // 3

// Control conversion with Symbol.toPrimitive
const price = { [Symbol.toPrimitive]: (hint) => (hint === "number" ? 9.99 : "$9.99") };
console.log(+price, `${price}`); // 9.99 "$9.99"

=== j35 | E | What is truthy and falsy?
**Every value in JavaScript becomes `true` or `false` when used in a boolean context; the falsy values are `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`, and everything else is truthy.**

### Boolean contexts
`if`, `while`, the ternary `? :`, `&&`, `||`, `!`, and `Boolean(value)` all convert their operand to a boolean.

### Surprising truthy values
- `"0"` and `"false"`: non-empty strings are truthy.
- `[]` and `{}`: all objects are truthy, even empty ones.
- `new Boolean(false)`: an object, so truthy.
- `-1`, `Infinity`: any non-zero number is truthy.

### Why it matters
Truthiness makes short checks convenient (`if (user)`), but can hide bugs when `0` or `""` are valid values:
- `if (count)` is false when `count` is `0`.
- `value || "default"` replaces a legitimate `0` or `""`.

### Safer patterns
- Use `??` when only `null`/`undefined` should get a default.
- Check emptiness explicitly: `array.length === 0`, `Object.keys(obj).length === 0`, `str.trim() === ""`.
- Use `value != null` to mean "has a value", including `0` and `""`.

### Converting explicitly
`Boolean(x)` or `!!x` produce a real boolean, useful when an API expects `true`/`false` (for example a React prop like `disabled`).
--- code
const falsy = [false, 0, -0, 0n, "", null, undefined, NaN];
console.log(falsy.map(Boolean)); // all false

const surprisinglyTruthy = ["0", "false", " ", [], {}, -1, Infinity];
console.log(surprisinglyTruthy.map(Boolean)); // all true

// The bug: 0 is a valid quantity
const quantity = 0;
if (quantity) console.log("has items");
else console.log("treated as empty!"); // runs - probably not intended

// Defaults: || vs ??
const volume = 0;
console.log(volume || 50); // 50 - wrong, 0 was valid
console.log(volume ?? 50); // 0  - correct

// Explicit emptiness checks
const list = [];
console.log(list ? "truthy" : "falsy", list.length === 0 ? "empty" : "has items"); // truthy empty

// Real booleans for APIs that need them
const isDisabled = !!"";
console.log(isDisabled, typeof isDisabled); // false "boolean"

=== j36 | M | What is short-circuiting?
**Short-circuiting means the logical operators `&&`, `||` and `??` stop evaluating as soon as the result is known, and they return one of their operands (not necessarily a boolean).**

### How each operator decides
- **`a && b`**: if `a` is falsy, returns `a` and never evaluates `b`; otherwise returns `b`.
- **`a || b`**: if `a` is truthy, returns `a` and never evaluates `b`; otherwise returns `b`.
- **`a ?? b`**: if `a` is not `null` or `undefined`, returns `a`; otherwise returns `b`.

### Common patterns
- **Guard before access**: `user && user.name` (now usually `user?.name`).
- **Conditional execution**: `isLoggedIn && showDashboard()`.
- **Defaults**: `options.retries ?? 3`.
- **Conditional rendering in React**: `{items.length > 0 && <List />}`.

### Logical assignment (ES2021)
- `a ||= b` assigns `b` only if `a` is falsy.
- `a &&= b` assigns `b` only if `a` is truthy.
- `a ??= b` assigns `b` only if `a` is `null`/`undefined`.

These also short-circuit: the right side is not evaluated if no assignment happens, which matters for expensive defaults.

### Pitfalls
- In React, `{count && <Badge />}` renders `0` when `count` is `0`, because `&&` returns the falsy operand. Use `count > 0 && ...`.
- Using `||` for defaults replaces valid `0` and `""`. Use `??`.
- Mixing `??` with `&&` or `||` without parentheses is a syntax error.
--- code
const log = (label, value) => (console.log("evaluated", label), value);

console.log(false && log("right", 1)); // false - right side never runs
console.log(true || log("right", 2)); // true  - right side never runs
console.log(null ?? log("fallback", 3)); // runs the fallback, prints 3

// Operators return operands, not booleans
console.log("Ada" && "Grace"); // "Grace"
console.log("" || "default"); // "default"
console.log(0 ?? 42); // 0

// Conditional execution
const user = { name: "Ada", isAdmin: true };
user.isAdmin && console.log("show admin panel");

// Logical assignment
const settings = { theme: "", retries: 0, cache: null };
settings.theme ||= "light"; // "" is falsy -> replaced
settings.retries ??= 3; // 0 is kept
settings.cache ??= new Map(); // null -> replaced
console.log(settings); // { theme: "light", retries: 0, cache: Map(0) {} }

// The React-style pitfall
const count = 0;
console.log(count && "Badge"); // 0  - would render "0"
console.log(count > 0 && "Badge"); // false - renders nothing

=== j37 | E | What is optional chaining?
**Optional chaining (`?.`) safely accesses a property, array item or method on something that might be `null` or `undefined`, returning `undefined` instead of throwing a `TypeError`.**

### The three forms
- Property: `user?.profile?.email`
- Bracket/array: `matrix?.[row]?.[col]`, `obj?.[dynamicKey]`
- Call: `callback?.()`, `user.save?.()` calls the method only if it exists.

### How it short-circuits
As soon as the value on the left of a `?.` is `null` or `undefined`, the **whole rest of the chain** is skipped and the expression returns `undefined`. Arguments of a skipped call are not evaluated either.

### Pairs well with `??`
`user?.settings?.theme ?? "light"` reads a deep value with a default in one line.

### When not to use it
- **Do not sprinkle it everywhere.** If a value must exist, a `TypeError` is a useful signal that something is wrong. Use `?.` only where absence is a normal, expected case.
- It does not protect against other errors: `user?.name.toUpperCase()` still throws if `user` exists but `name` is `undefined`. Each uncertain link needs its own `?.`.
- It cannot be used on the left side of an assignment: `user?.name = "x"` is a syntax error.

### Under the hood
`a?.b` is roughly `a == null ? undefined : a.b`, and the engine evaluates `a` only once.
--- code
const users = [
  { name: "Ada", profile: { email: "ada@example.com", tags: ["admin"] }, notify() { return "sent"; } },
  { name: "Linus" }, // no profile, no notify method
];

for (const u of users) {
  console.log(u.name, u.profile?.email ?? "no email", u.profile?.tags?.[0] ?? "no tags", u.notify?.() ?? "cannot notify");
}
// Ada ada@example.com admin sent
// Linus no email no tags cannot notify

// Without ?. this throws
try {
  users[1].profile.email;
} catch (e) {
  console.log(e.name); // TypeError
}

// Short-circuit: the call's argument is never evaluated
let calls = 0;
const missing = null;
missing?.process(++calls);
console.log(calls); // 0

// Each uncertain link needs its own ?.
const partial = { name: undefined };
try {
  partial?.name.toUpperCase();
} catch (e) {
  console.log("still throws:", e.name); // TypeError
}
console.log(partial?.name?.toUpperCase()); // undefined

=== j38 | E | What is nullish coalescing?
**The nullish coalescing operator (`??`) returns its right-hand value only when the left-hand value is `null` or `undefined`; unlike `||`, it keeps other falsy values such as `0`, `""` and `false`.**

### Why it exists
For years, defaults were written with `||`: `const port = config.port || 3000`. That silently replaces valid values like `0`, an empty string or `false`. `??` treats only "nothing" (`null`/`undefined`) as missing.

### Nullish assignment
`x ??= value` sets `x` only if it is `null` or `undefined`. Handy for lazy initialisation: `cache[key] ??= compute(key)`.

### Rules and gotchas
- It short-circuits: the right side is evaluated only when needed.
- **Cannot be mixed** with `&&` or `||` without parentheses: `a || b ?? c` is a syntax error; write `(a || b) ?? c`.
- Works great after optional chaining: `obj?.deep?.value ?? fallback`.

### Choosing between `||` and `??`
- Use `??` for **missing data**: config options, API fields, function arguments.
- Use `||` when **any falsy value** should be replaced, e.g. turning an empty search string into a placeholder.

### Default parameters vs `??`
Default parameters only replace `undefined`, not `null`. If a caller might pass `null`, use `??` inside the function.
--- code
const config = { port: 0, host: "", debug: false, timeout: null };

console.log(config.port || 3000); // 3000  <- wrong, 0 was intentional
console.log(config.port ?? 3000); // 0

console.log(config.host ?? "localhost"); // ""
console.log(config.debug ?? true); // false
console.log(config.timeout ?? 5000); // 5000 (null -> default)
console.log(config.retries ?? 3); // 3    (undefined -> default)

// Nullish assignment for lazy initialisation
const cache = {};
function getUser(id) {
  cache[id] ??= { id, loadedAt: "now" }; // created once
  return cache[id];
}
console.log(getUser(1) === getUser(1)); // true

// Default params vs ??
function greet(name = "friend") {
  return `Hi ${name}`;
}
const greetSafe = (name) => `Hi ${name ?? "friend"}`;
console.log(greet(null), "|", greetSafe(null)); // Hi null | Hi friend

// Mixing with || needs parentheses
const result = (config.host || null) ?? "fallback";
console.log(result); // fallback

=== j39 | M | What is dynamic typing?
**Dynamic typing means types belong to values, not variables: a variable can hold a number now and a string later, and type checks happen at runtime instead of before the program runs.**

### What it looks like
`let x = 5; x = "five"; x = { five: 5 };` is perfectly valid. Functions accept any arguments, and errors such as calling something that is not a function only appear when that line actually runs.

### Strengths
- Fast to write and prototype.
- Flexible data handling (JSON from APIs, plugins, duck typing: "if it has a `.then`, treat it like a promise").
- No compile step required.

### Weaknesses
- Type errors show up late, often in production, in code paths tests missed.
- Refactoring is riskier: renaming a property cannot be checked automatically.
- Implicit coercion can produce wrong values instead of errors (`"2" + 1`).

### How teams manage it
- **TypeScript** adds static types that are checked at build time and erased at runtime. It is the default for most professional front-end work today.
- **Runtime validation** at boundaries (API responses, form input, `localStorage`) with schema libraries like Zod, because static types cannot verify data that arrives at runtime.
- **JSDoc** type annotations for projects that stay in plain JavaScript.
- Defensive checks with `typeof`, `Array.isArray`, `Number.isFinite`.

### Dynamic vs weak typing
They are different ideas. Dynamic is about **when** types are checked; weak typing is about implicit **conversions**. JavaScript is both dynamic and fairly weakly typed. Python is dynamic but stricter about conversions.
--- code
let value = 42;
console.log(typeof value); // number
value = "forty-two";
console.log(typeof value); // string
value = { answer: 42 };
console.log(typeof value); // object

// Errors only appear when the line runs
function shout(text) {
  return text.toUpperCase();
}
console.log(shout("hi")); // HI
try {
  shout(123);
} catch (e) {
  console.log(e.name, "-", e.message); // TypeError - text.toUpperCase is not a function
}

// Duck typing: check capabilities, not types
const isThenable = (x) => x != null && typeof x.then === "function";
console.log(isThenable(Promise.resolve()), isThenable({ then() {} }), isThenable(42)); // true true false

// Runtime validation at a boundary
function parseUser(data) {
  if (typeof data?.name !== "string" || !Number.isInteger(data?.age)) {
    throw new TypeError("Invalid user payload");
  }
  return { name: data.name, age: data.age };
}
console.log(parseUser({ name: "Ada", age: 36 }));
try {
  parseUser({ name: "Ada", age: "36" });
} catch (e) {
  console.log(e.message); // Invalid user payload
}

=== j40 | M | What is immutability?
**Immutability means never changing a value after it is created; instead of modifying data in place you create a new version with the changes, which makes state changes explicit and easy to detect.**

### Primitives vs objects
Primitives (strings, numbers, booleans) are already immutable: `str.toUpperCase()` returns a new string. Objects and arrays are mutable, so immutability for them is a discipline you choose.

### Why it matters
- **Change detection**: React, Redux, memoisation and many caches compare by reference (`prev === next`). If you mutate in place the reference stays the same and the UI does not update.
- **Predictability**: no hidden changes from other parts of the program holding the same reference.
- **Undo/redo and time travel**: keep old versions around cheaply.
- **Safer concurrency** with workers and async code.

### Tools for immutable updates
- Spread: `{ ...obj, key: value }`, `[...arr, item]`.
- Non-mutating array methods: `map`, `filter`, `slice`, `concat`, and ES2023's `toSorted`, `toReversed`, `toSpliced`, `with`.
- `structuredClone` for a full deep copy.
- Libraries like Immer let you write "mutating" code that produces immutable updates.
- `Object.freeze` to enforce it (shallow only).

### Cost
Copying creates new objects, but only the changed path is copied; unchanged nested objects are shared (structural sharing). For typical UI state this is cheap.
--- code
const state = {
  user: { name: "Ada", settings: { theme: "light" } },
  todos: [{ id: 1, done: false }, { id: 2, done: false }],
};

// Update a nested value without mutating anything
const next = {
  ...state,
  user: { ...state.user, settings: { ...state.user.settings, theme: "dark" } },
  todos: state.todos.map((t) => (t.id === 2 ? { ...t, done: true } : t)),
};

console.log(state.user.settings.theme, next.user.settings.theme); // light dark
console.log(state === next, state.todos === next.todos); // false false
console.log(state.todos[0] === next.todos[0]); // true - unchanged items are shared

// Reference checks detect changes instantly
const changed = (a, b) => a !== b;
console.log(changed(state.user, next.user)); // true

// ES2023 non-mutating array methods
const nums = [3, 1, 2];
console.log(nums.toSorted(), nums.toReversed(), nums.with(0, 9), nums); // original unchanged

// Freeze to enforce (shallow)
const frozen = Object.freeze({ list: [1] });
frozen.list.push(2); // allowed: freeze is shallow
console.log(frozen.list); // [1, 2]

=== j41 | M | What is an execution context?
**An execution context is the environment the engine creates to run a piece of code; it holds that code's variables, its scope chain and its `this` value, and a new one is created for the global code and for every function call.**

### Kinds of execution context
- **Global**: created once when a script starts.
- **Function**: created each time a function is called.
- **Module**: one per ES module.
- **Eval**: for code run through `eval` (rare).

### Two phases
1. **Creation**: the engine sets up the environment. It registers declarations (functions fully, `var` as `undefined`, `let`/`const`/`class` as uninitialised, which is the TDZ), links the outer environment for the scope chain, and decides `this`.
2. **Execution**: code runs line by line, assigning values and calling functions.

This two-phase setup is exactly what produces **hoisting**.

### What each context contains
- A **lexical environment** with the variables and a reference to its outer environment (that link forms the scope chain and makes closures possible).
- The **`this` binding**.
- For functions, the arguments.

### The call stack
Execution contexts are pushed onto the **call stack** when a function is called and popped when it returns. The context on top is the one currently running.

### Why interviewers ask
It ties together hoisting, scope, closures and `this`. If you can explain creation vs execution and how contexts stack, those topics follow naturally.
--- code
// Global execution context: creation phase already knows about these names
console.log(typeof double, typeof factor); // "function" "undefined"

var factor = 2;
function double(n) {
  // A new function execution context is created for every call:
  //   - its own `n` and `result`
  //   - an outer link to the global environment (so `factor` is visible)
  const result = n * factor;
  return result;
}

console.log(double(5)); // 10
console.log(double(7)); // 14 - a fresh context, nothing left over from the last call

// Closures keep a context's environment alive after the call returns
function makeAdder(base) {
  return (n) => base + n; // remembers `base` from makeAdder's context
}
const add10 = makeAdder(10);
console.log(add10(5)); // 15

// `this` is part of the context and is decided per call
const obj = {
  label: "obj",
  whoAmI() {
    return this?.label;
  },
};
const loose = obj.whoAmI;
console.log(obj.whoAmI(), loose.call({ label: "other" })); // obj other

=== j42 | M | What is the Call Stack?
**The call stack is the structure the JavaScript engine uses to track which function is running: each call pushes a frame on top, each return pops it off, and because there is only one stack, only one piece of JavaScript runs at a time.**

### How it works
1. The script starts and the global context sits at the bottom.
2. Calling `a()` pushes `a`. If `a` calls `b()`, `b` is pushed on top.
3. When `b` returns, it is popped and `a` continues from where it left off.
4. When the stack is empty, the event loop can run the next queued task.

### What you see in practice
- **Stack traces** in errors are a snapshot of the call stack at the moment of the throw, top frame first.
- **Stack overflow**: unbounded recursion keeps pushing frames until the engine throws `RangeError: Maximum call stack size exceeded`.
- **Blocking**: a long synchronous loop keeps its frame on the stack, so clicks, timers and rendering wait until it finishes.

### Relationship with async code
`setTimeout`, `fetch` and promises do not put their callbacks on the stack directly. They queue them, and the event loop pushes each callback onto the stack only when the stack is empty. That is why `setTimeout(fn, 0)` still runs after the current synchronous code.

### Debugging
Browser DevTools show the call stack when paused at a breakpoint; async stack traces even connect a callback to the code that scheduled it.
--- code
function third() {
  console.log(new Error("where am I?").stack.split("\n").slice(1, 4).map((l) => l.trim().split(" (")[0]));
  // [ "at third", "at second", "at first" ] - top of the stack first
}
function second() {
  third();
}
function first() {
  second();
}
first();

// Stack overflow from unbounded recursion
function countDown(n) {
  return countDown(n + 1); // no base case
}
try {
  countDown(0);
} catch (e) {
  console.log(e.name, "-", e.message); // RangeError - Maximum call stack size exceeded
}

// Async callbacks wait for an empty stack
setTimeout(() => console.log("3. timer: runs after the stack is empty"), 0);
console.log("1. synchronous");
for (let i = 0; i < 1e6; i++); // busy work keeps the stack occupied
console.log("2. still synchronous");

=== j43 | M | What is the Event Loop?
**The event loop is the mechanism that lets single-threaded JavaScript handle asynchronous work: it repeatedly takes the next task from a queue, runs it to completion on the call stack, drains all microtasks, and (in browsers) lets the page render.**

### The pieces
- **Call stack**: where JavaScript actually runs, one frame at a time.
- **Host APIs** (browser or Node): timers, network, I/O and events run outside the JavaScript thread and queue callbacks when done.
- **Task queue (macrotasks)**: `setTimeout`, `setInterval`, I/O, UI events, `MessageChannel`.
- **Microtask queue**: promise reactions (`.then`, `await` continuations), `queueMicrotask`, `MutationObserver`.

### One iteration of the loop
1. Take the oldest task and run it until the stack is empty.
2. Run **all** microtasks, including ones queued during this step.
3. In browsers, possibly render (style, layout, paint), running `requestAnimationFrame` callbacks just before.
4. Repeat.

### Consequences
- `setTimeout(fn, 0)` is "as soon as possible after the current task and its microtasks", never immediate.
- Promise callbacks always run before the next timer.
- Long synchronous work or an endless microtask loop **blocks rendering** and input. Split heavy work into chunks, or move it to a Web Worker.
- `await` pauses only the async function; the rest of the program keeps going.

### Node.js
Node's loop has phases (timers, poll for I/O, check for `setImmediate`, close callbacks), and `process.nextTick` callbacks run even before promise microtasks.
--- code
console.log("1 script start");

setTimeout(() => console.log("6 timeout (task)"), 0);

Promise.resolve()
  .then(() => console.log("4 promise 1 (microtask)"))
  .then(() => console.log("5 promise 2 (microtask)"));

queueMicrotask(() => console.log("4b queueMicrotask"));

(async () => {
  console.log("2 async fn runs synchronously until await");
  await null;
  console.log("4c after await (microtask)");
})();

console.log("3 script end");

// Real output order:
// 1 script start
// 2 async fn runs synchronously until await
// 3 script end
// 4 promise 1, 4b queueMicrotask, 4c after await  (microtasks, in queue order)
// 5 promise 2
// 6 timeout (task)

=== j44 | M | What is the difference between Microtasks and Macrotasks?
**Macrotasks (tasks) are separate units of work like timers, I/O and events, processed one per event loop turn; microtasks (mainly promise callbacks) run right after the current task finishes, and the whole microtask queue is drained before the next task or render.**

### Sources
- **Macrotasks**: `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI events (click, input), `MessageChannel` / `postMessage`.
- **Microtasks**: `Promise.then/catch/finally`, the code after `await`, `queueMicrotask`, `MutationObserver`. In Node, `process.nextTick` runs even before promise microtasks.

### Ordering rules
1. Run one macrotask (the initial script is the first one).
2. Run **every** microtask in the queue. Microtasks queued while draining are also run in the same pass.
3. Render if needed (browsers).
4. Next macrotask.

So `Promise.resolve().then(a)` always runs before `setTimeout(b, 0)`, even if the timeout was scheduled first.

### Why it matters
- **Predicting output order** in interview puzzles and real bugs.
- **Starvation**: a microtask that keeps queueing more microtasks never lets timers, input or rendering happen. A recursive `setTimeout` instead yields to the browser each time.
- **Batching**: frameworks use microtasks to batch updates, so several state changes in one task cause one re-render.
- **Yielding to the UI**: to keep the page responsive during long work, break it up with `setTimeout`, `MessageChannel` or the newer `scheduler.yield()` (where supported). A `Promise.resolve()` does **not** yield to rendering.
--- code
const order = [];

setTimeout(() => order.push("macrotask: setTimeout"), 0);

Promise.resolve().then(() => {
  order.push("microtask 1");
  // queued during the microtask drain -> still runs before the timeout
  queueMicrotask(() => order.push("microtask 3 (queued by microtask 1)"));
});
queueMicrotask(() => order.push("microtask 2"));

order.push("sync code");

setTimeout(() => {
  console.log(order.join("\n"));
  // sync code
  // microtask 1
  // microtask 2
  // microtask 3 (queued by microtask 1)
  // macrotask: setTimeout
}, 20);

// Yielding: chunk long work with setTimeout so other tasks get a turn
async function processInChunks(items, chunkSize = 1000) {
  let done = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    items.slice(i, i + chunkSize).forEach(() => done++);
    await new Promise((r) => setTimeout(r, 0)); // a real macrotask boundary
  }
  return done;
}
console.log("processed", await processInChunks(Array(5000).fill(0))); // processed 5000

=== j45 | M | What is debounce?
**Debouncing delays running a function until a burst of calls has stopped for a given time, so only the last call in the burst actually runs; it is the standard fix for expensive work triggered by rapid events like typing or resizing.**

### How it behaves
Every call resets a timer. The wrapped function runs only when no new call has arrived for `wait` milliseconds. Ten keystrokes in quick succession produce one search request, after the user pauses.

### Typical uses
- Search-as-you-type and autocomplete requests.
- Validating a form field after the user stops typing.
- Saving a draft automatically.
- Recalculating layout after a window resize finishes.

### Variants
- **Trailing** (default): run after the pause, with the latest arguments.
- **Leading**: run immediately on the first call, then ignore calls until things are quiet. Good for buttons to prevent double submits.
- **maxWait**: guarantee a call at least every N ms even if events never stop (Lodash supports this).
- **cancel / flush**: cancel a pending call (e.g. on unmount) or run it now.

### Debounce vs throttle
Debounce waits for quiet and runs **once at the end**; throttle runs **at most once per interval** while events keep coming. Use debounce when only the final value matters.

### In React
Create the debounced function once (`useMemo`/`useRef`), not on every render, and cancel it on unmount. Often a `useDebounce(value, delay)` hook is simpler.
--- code
function debounce(fn, wait, { leading = false } = {}) {
  let timer = null;
  const debounced = function (...args) {
    const callNow = leading && timer === null;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!leading) fn.apply(this, args); // trailing call with the latest args
    }, wait);
    if (callNow) fn.apply(this, args);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

// Simulate fast typing: only the last value is searched
const search = debounce((q) => console.log("searching for:", q), 100);
["r", "re", "rea", "reac", "react"].forEach((q, i) => setTimeout(() => search(q), i * 20));
// -> searching for: react  (once)

// Leading: run on the first click, ignore the rest of the burst
const submit = debounce(() => console.log("submitted once"), 100, { leading: true });
submit();
submit();
submit();

await new Promise((r) => setTimeout(r, 300));

=== j46 | M | What is throttle?
**Throttling limits a function to run at most once per time interval, no matter how often it is triggered; unlike debounce, it keeps running regularly during a continuous stream of events.**

### How it behaves
The first call runs (leading edge). Further calls within the interval are ignored or, in many implementations, the latest one is remembered and run when the interval ends (trailing edge), so the final state is never lost.

### Typical uses
- Scroll handlers (infinite scroll checks, sticky headers, scroll progress).
- Mouse or pointer move tracking, drag and drop.
- Window resize when you want live updates, not just the final size.
- Rate-limiting button presses or API calls in games and editors.
- Sending analytics or presence updates at a steady rate.

### Leading and trailing
- **Leading**: respond instantly to the first event.
- **Trailing**: also run once after the last event, with the latest arguments, so the UI ends in the correct state.

### Alternatives
For visual updates tied to scrolling or animation, `requestAnimationFrame` is a natural throttle: it runs at most once per frame, in sync with painting. For "is this element visible?" checks, `IntersectionObserver` removes the need for scroll handlers entirely.

### Throttle vs debounce
Throttle = "steady drip while events continue"; debounce = "one call after the storm".
--- code
function throttle(fn, interval) {
  let last = 0;
  let trailingTimer = null;
  let lastArgs = null;
  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      clearTimeout(trailingTimer);
      trailingTimer = null;
      last = now;
      fn.apply(this, args); // leading edge
    } else if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        last = Date.now();
        trailingTimer = null;
        fn.apply(this, lastArgs); // trailing edge with the latest args
      }, remaining);
    }
  };
}

const calls = [];
const onScroll = throttle((y) => calls.push(y), 50);

// 20 "scroll events", 10ms apart (200ms total)
for (let i = 0; i < 20; i++) setTimeout(() => onScroll(i * 10), i * 10);

await new Promise((r) => setTimeout(r, 350));
console.log("events: 20, handler runs:", calls.length); // about 4-5 runs, not 20
console.log("last position handled:", calls.at(-1)); // 190 - the final position is never lost

=== j47 | M | What is currying?
**Currying transforms a function that takes several arguments into a chain of functions that each take one argument, so `f(a, b, c)` becomes `f(a)(b)(c)`; it is mainly used to create specialised functions by fixing some arguments up front.**

### Why it is useful
- **Configuration first, data last**: `const formatPrice = format("en-US")("USD")` creates a reusable helper; you then call `formatPrice(19.99)` many times.
- **Point-free composition**: curried, single-argument functions plug neatly into `map`, `filter` and `pipe`.
- **Event handlers**: `onClick={select(item.id)}` where `select = (id) => (event) => ...`.

### Currying vs partial application
- **Currying** always produces unary functions, one argument at a time.
- **Partial application** fixes some arguments and returns a function expecting the rest, any number at once. `fn.bind(null, a)` is partial application.
In everyday JavaScript the two are often used interchangeably, and "curry" helpers usually accept several arguments per step.

### Trade-offs
- Can make code elegant in functional pipelines.
- Can make stack traces and signatures harder to read if overused.
- Generic `curry` helpers rely on `fn.length`, which does not count rest or default parameters.

### Interview angle
Expect "implement `curry(fn)`", where the trick is collecting arguments until there are `fn.length` of them (see the "Implement currying" question).
--- code
// Manual currying with arrow functions
const multiply = (a) => (b) => a * b;
const double = multiply(2);
console.log(double(21)); // 42
console.log([1, 2, 3].map(multiply(10))); // [10, 20, 30]

// Configuration first, data last
const formatCurrency = (locale) => (currency) => (amount) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
const usd = formatCurrency("en-US")("USD");
const eur = formatCurrency("de-DE")("EUR");
console.log(usd(1234.5), "|", eur(1234.5)); // $1,234.50 | 1.234,50 €

// Event-handler style
const handleSelect = (id) => (event) => `selected ${id} via ${event.type}`;
console.log(handleSelect(7)({ type: "click" })); // selected 7 via click

// Partial application with bind (not strictly currying)
function greet(greeting, name) {
  return `${greeting}, ${name}`;
}
const hello = greet.bind(null, "Hello");
console.log(hello("Ada")); // Hello, Ada

=== j48 | M | What is function composition?
**Function composition combines small functions into a new function where the output of one becomes the input of the next, so `compose(f, g)(x)` equals `f(g(x))`; it lets you build complex transformations from simple, reusable steps.**

### compose vs pipe
- **`compose(f, g, h)(x)`** runs right to left: `f(g(h(x)))`, matching mathematical notation.
- **`pipe(h, g, f)(x)`** runs left to right, which most people find easier to read because it follows the data flow.

### Why it helps
- Each step is a small, pure, individually testable function.
- Pipelines read like a list of steps: trim, lower-case, slugify.
- Steps can be reused and recombined.

### Requirements
Each function should take one input and return one output (curried helpers help here). Composition shines with pure functions, since side effects make the order and result harder to reason about.

### Async pipelines
For functions that return promises, reduce with `await`: `fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(x))`.

### Where you see it
- Middleware chains (Express, Redux).
- Higher-order components in older React code.
- Data transformation utilities (Lodash `flow`, Ramda `pipe`).
- A proposed pipeline operator (`|>`) has been discussed for years but is not part of the language yet, so libraries and helper functions are still the way.
--- code
const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);
const compose = (...fns) => (input) => fns.reduceRight((value, fn) => fn(value), input);

// Small, single-purpose steps
const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const hyphenate = (s) => s.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const slugify = pipe(trim, lower, stripAccents, hyphenate);
console.log(slugify("  Héllo World: JS Composition!  ")); // hello-world-js-composition

// compose = same thing, read right to left
const slugify2 = compose(hyphenate, stripAccents, lower, trim);
console.log(slugify2("Café Menu") === slugify("Café Menu")); // true

// Async pipeline
const pipeAsync = (...fns) => (input) => fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(input));
const fetchUser = async (id) => ({ id, name: "ada lovelace" });
const titleCase = (u) => ({ ...u, name: u.name.replace(/\b\w/g, (c) => c.toUpperCase()) });
const toCard = (u) => `#${u.id} ${u.name}`;
console.log(await pipeAsync(fetchUser, titleCase, toCard)(7)); // #7 Ada Lovelace

=== j49 | E | What is an IIFE?
**An IIFE (Immediately Invoked Function Expression) is a function that is defined and called in the same expression, `(function () { ... })()`, used to run code once inside its own private scope.**

### Why it existed
Before ES modules and block scope, every top-level `var` in a script became a global. Wrapping code in an IIFE kept variables private and prevented collisions between scripts. It was the basis of the **module pattern** and of libraries like jQuery plugins.

### Syntax
The parentheses around the function turn it into an expression so it can be called immediately:
- `(function () { ... })();`
- `(() => { ... })();`
- `(async () => { ... })();` for running `await` where top-level await is not available.

Starting a line with `(` after a line without a semicolon can merge the two lines, which is why older code often starts IIFEs with `;(function...`.

### Is it still useful today?
Much less, because **ES modules** give every file its own scope and `let`/`const` give block scope. It still appears for:
- Running async code in environments without top-level await (older Node scripts, some build tools).
- Creating a private scope inside a classic `<script>` tag or a bookmarklet.
- Computing a `const` value with several steps: `const config = (() => { ... return result; })();`
- Bundler output, which still wraps modules in function scopes.
--- code
// Private state with an IIFE (the classic module pattern)
const counter = (function () {
  let count = 0; // not reachable from outside
  return {
    increment: () => ++count,
    get value() {
      return count;
    },
  };
})();
counter.increment();
counter.increment();
console.log(counter.value, typeof count); // 2 "undefined"

// Computing a const in several steps
const config = (() => {
  const env = "production";
  const base = { retries: 3, debug: false };
  return env === "production" ? base : { ...base, debug: true };
})();
console.log(config); // { retries: 3, debug: false }

// Async IIFE: run await where top-level await isn't available
(async () => {
  const data = await new Promise((resolve) => setTimeout(() => resolve("loaded"), 10));
  console.log("async IIFE:", data); // async IIFE: loaded
})();

await new Promise((r) => setTimeout(r, 30));

=== j50 | M | What is recursion?
**Recursion is when a function solves a problem by calling itself on a smaller version of the same problem, stopping at a base case that can be answered directly.**

### The two parts every recursive function needs
1. **Base case**: the simplest input, answered without recursion. Without it the function never stops and the stack overflows.
2. **Recursive case**: break the problem down and call the function on the smaller piece, making progress towards the base case.

### Where recursion is natural
- **Tree-shaped data**: nested comments, file systems, menus, the DOM, JSON of unknown depth.
- **Divide and conquer**: merge sort, quicksort, binary search.
- **Backtracking**: permutations, sudoku, path finding.
- Deep clone, deep equality and flattening nested arrays.

### Limits in JavaScript
- Each call adds a stack frame. Very deep recursion (tens of thousands of levels) throws `RangeError: Maximum call stack size exceeded`.
- **Tail call optimisation** is in the spec but only Safari implements it, so do not rely on it.
- For very deep or performance-critical cases, convert to a loop with an explicit stack or queue.

### Making it efficient
Naive recursion can repeat work. Fibonacci is the classic example: `fib(40)` makes hundreds of millions of calls. **Memoization** (caching results) fixes that.
--- code
// Base case + recursive case
function factorial(n) {
  if (n <= 1) return 1; // base case
  return n * factorial(n - 1); // smaller problem
}
console.log(factorial(5)); // 120

// Natural fit: tree-shaped data
const fileTree = {
  name: "src",
  children: [
    { name: "index.js" },
    { name: "components", children: [{ name: "Button.js" }, { name: "Modal.js" }] },
  ],
};
const countFiles = (node) => (node.children ? node.children.reduce((n, c) => n + countFiles(c), 0) : 1);
console.log(countFiles(fileTree)); // 3

// Memoization turns exponential into linear
const memo = new Map();
function fib(n) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fib(n - 1) + fib(n - 2);
  memo.set(n, value);
  return value;
}
console.log(fib(50)); // 12586269025
// (beyond fib(78) results exceed Number.MAX_SAFE_INTEGER - use BigInt for those)

// Same traversal without recursion (explicit stack) for very deep data
function countFilesIterative(root) {
  let count = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.children) stack.push(...node.children);
    else count++;
  }
  return count;
}
console.log(countFilesIterative(fileTree)); // 3
