=== j1 | E | What is JavaScript?
**JavaScript is a dynamically typed, garbage-collected language that runs in every browser and, through runtimes like Node.js, Deno and Bun, on servers, tools and edge platforms.**

It started as a small scripting language for web pages and is now standardised as **ECMAScript**, with a new edition every year (ES2024, ES2025...). The language itself only defines things like syntax, types, objects and promises. Everything else comes from the **host environment**: the browser adds the DOM, `fetch`, timers and storage, while Node.js adds the file system, network sockets and processes.

### Key characteristics
- **Single-threaded with an event loop.** Your code runs on one thread; slow work (network, timers, I/O) is handed off and its callbacks are queued, so the page stays responsive.
- **Multi-paradigm.** You can write procedural, object-oriented (prototypes and `class`) and functional code (first-class functions, closures).
- **JIT-compiled.** Engines like V8 (Chrome, Node), SpiderMonkey (Firefox) and JavaScriptCore (Safari) parse, interpret and then optimise hot code into machine code at runtime. It is not "just interpreted".
- **Dynamically typed.** Types belong to values, not variables. TypeScript adds static types on top and compiles back to JavaScript.

### In an interview
Mention the split between the language (ECMAScript) and the host APIs, and that the event loop is what lets single-threaded JavaScript handle concurrency.
--- code
// The language: values, functions, objects, promises
const user = { name: "Ada", skills: ["js", "ts"] };
const greet = (u) => `Hi ${u.name}, you know ${u.skills.length} languages`;
console.log(greet(user)); // Hi Ada, you know 2 languages

// Asynchronous work is scheduled, not blocking
setTimeout(() => console.log("3. timer callback"), 0);
Promise.resolve().then(() => console.log("2. microtask"));
console.log("1. synchronous code");

// Modern built-ins keep arriving every year
const grouped = Object.groupBy([1, 2, 3, 4, 5], (n) => (n % 2 ? "odd" : "even"));
console.log(grouped); // { odd: [1, 3, 5], even: [2, 4] }

=== j2 | E | What is the difference between var, let, and const?
**`var` is function-scoped and can be redeclared; `let` and `const` are block-scoped, live in the temporal dead zone until declared, and `const` cannot be reassigned.**

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block `{}` | Block `{}` |
| Hoisted | Yes, initialised to `undefined` | Yes, but uninitialised (TDZ) | Yes, but uninitialised (TDZ) |
| Redeclare in same scope | Allowed | Error | Error |
| Reassign | Allowed | Allowed | Error |
| Creates global object property | Yes (`window.x`) | No | No |

### What `const` really means
`const` freezes the **binding**, not the value. A `const` array or object can still be mutated. Use `Object.freeze` if you need the value itself to be read-only.

### The classic loop bug
With `var`, every callback in a loop shares one variable, so they all see the final value. `let` creates a fresh binding per iteration, which is why the bug disappears.

### Best practice
Default to `const`, use `let` only when you reassign, and avoid `var` in modern code. This makes intent obvious and lets linters catch accidental reassignment.
--- code
// Scope
function demo() {
  if (true) {
    var a = "function scoped";
    let b = "block scoped";
  }
  console.log(a); // "function scoped"
  console.log(typeof b); // "undefined" (b does not exist here)
}
demo();

// const freezes the binding, not the value
const list = [1, 2];
list.push(3); // fine
console.log(list); // [1, 2, 3]
try {
  list = []; // TypeError: Assignment to constant variable
} catch (e) {
  console.log(e.constructor.name); // TypeError
}

// var vs let in loops with async callbacks
for (var i = 0; i < 3; i++) setTimeout(() => console.log("var:", i)); // 3, 3, 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log("let:", j)); // 0, 1, 2

=== j3 | M | What is hoisting in JavaScript?
**Hoisting is the effect of JavaScript creating every declaration in a scope before running that scope's code, so names exist from the top of the scope even though the code that sets them comes later.**

Nothing is physically moved. When the engine enters a scope it first does a setup pass and registers all declarations. What differs is how each kind is initialised:

- **Function declarations** are fully initialised with their body. You can call them before the line where they appear.
- **`var`** is initialised to `undefined`. Reading it early gives `undefined`, not an error.
- **`let`, `const` and `class`** are registered but left uninitialised. Touching them before the declaration line throws a `ReferenceError`. This window is the **temporal dead zone (TDZ)**.
- **Function expressions and arrow functions** follow the rules of the variable that holds them, so `var fn = () => {}` is `undefined` early and `const fn = ...` is in the TDZ.

### Why it matters
- Calling a function declaration before it is defined is legitimate and common (e.g. helper functions at the bottom of a file).
- Relying on `var` being `undefined` early hides bugs. The TDZ exists to turn those silent bugs into loud errors.

### Interview tip
Say "declarations are processed before execution" rather than "moved to the top", and explain the TDZ for `let`/`const`.
--- code
console.log(sayHi()); // "hi" - function declarations are fully hoisted
function sayHi() {
  return "hi";
}

console.log(count); // undefined - var is hoisted and set to undefined
var count = 5;

try {
  console.log(total); // ReferenceError: in the temporal dead zone
} catch (e) {
  console.log(e.name); // ReferenceError
}
let total = 10;

try {
  greet(); // TypeError: greet is not a function (it's undefined right now)
} catch (e) {
  console.log(e.name); // TypeError
}
var greet = function () {
  return "hello";
};
console.log(greet()); // "hello"

=== j4 | E | What are the data types in JavaScript?
**JavaScript has seven primitive types (string, number, bigint, boolean, undefined, null, symbol) and one non-primitive type, object, which includes arrays, functions, dates, maps and everything else.**

### Primitives
Primitives are **immutable** and compared **by value**.
- `string`: text, UTF-16 encoded.
- `number`: 64-bit floating point, which is why `0.1 + 0.2 !== 0.3`. Includes `NaN` and `Infinity`.
- `bigint`: arbitrary-precision integers, written `123n`.
- `boolean`: `true` / `false`.
- `undefined`: a variable that has no value yet.
- `null`: an intentional "no value".
- `symbol`: a unique identifier, often used as a non-colliding property key.

### Objects
Everything that is not a primitive is an object: plain objects, arrays, functions, `Date`, `Map`, `Set`, class instances. Objects are **mutable** and compared **by reference**, so two objects with the same contents are not equal.

### Auto-boxing
`"hi".toUpperCase()` works because the engine temporarily wraps the primitive in a `String` object to call the method. You almost never need `new String()` yourself.

### Gotchas
- `typeof null` is `"object"` (a historical bug).
- `typeof []` is `"object"`; use `Array.isArray`.
- `typeof function(){}` is `"function"`, though functions are objects.
--- code
// The seven primitives
console.log(typeof "text", typeof 42, typeof 10n, typeof true); // string number bigint boolean
console.log(typeof undefined, typeof Symbol("id")); // undefined symbol
console.log(typeof null); // object  <- the famous quirk

// Everything else is an object (functions report "function")
console.log(typeof { a: 1 }, typeof [1, 2], typeof new Date()); // object object object
console.log(typeof (() => {})); // function
console.log(Array.isArray([1, 2])); // true
console.log(null === null); // true

// Primitives compare by value, objects by reference
console.log("a" === "a"); // true
console.log({ a: 1 } === { a: 1 }); // false
const obj = { a: 1 };
const sameRef = obj;
console.log(obj === sameRef); // true

// Floating point
console.log(0.1 + 0.2); // 0.30000000000000004
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // true

=== j5 | E | What is the typeof operator?
**`typeof` returns a string describing the type of a value: "string", "number", "bigint", "boolean", "undefined", "symbol", "function" or "object".**

It is mainly used for runtime checks before you use a value, for example to see whether an optional callback was passed or a global exists.

### Results worth remembering
- `typeof null` → `"object"`. A bug from the first version of JavaScript that can never be fixed without breaking the web. Check `value === null` instead.
- `typeof []` → `"object"`. Use `Array.isArray(value)`.
- `typeof NaN` → `"number"`. Use `Number.isNaN(value)`.
- `typeof class {}` → `"function"`. Classes are functions underneath.
- `typeof undeclaredVariable` → `"undefined"`, with no error. That made it the classic way to feature-detect globals. (Variables in the TDZ still throw.)

### Better tools for specific checks
- `Array.isArray(x)` for arrays.
- `x instanceof Date` (or `Map`, `Set`, a class) for objects created by a constructor in the same realm.
- `Object.prototype.toString.call(x)` returns `"[object Date]"`, `"[object RegExp]"` and so on, and works across iframes.

### Interview tip
Write a small `getType` helper that handles `null` and arrays. It shows you know the quirks and how to work around them.
--- code
console.log(typeof "hi"); // "string"
console.log(typeof 42); // "number"
console.log(typeof 42n); // "bigint"
console.log(typeof true); // "boolean"
console.log(typeof undefined); // "undefined"
console.log(typeof Symbol()); // "symbol"
console.log(typeof (() => {})); // "function"
console.log(typeof null); // "object"  <- quirk
console.log(typeof [1, 2]); // "object"  <- use Array.isArray
console.log(typeof notDeclaredAnywhere); // "undefined", no error

// A precise type helper
function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  return typeof value;
}
console.log(getType(null), getType([]), getType(new Date()), getType(/x/), getType(new Map()));
// null array date regexp map

=== j6 | E | What is the difference between == and ===?
**`===` (strict equality) compares value and type with no conversion; `==` (loose equality) converts the operands to a common type first, which leads to surprising results.**

### How `==` converts
The rules are long, but the common cases are:
- `null == undefined` is `true`, and neither equals anything else.
- If one side is a number and the other a string, the string is converted to a number.
- Booleans are converted to numbers first (`true` → 1, `false` → 0).
- Objects are converted to primitives (via `valueOf` / `toString`) before comparing.

That is why `"" == 0`, `"0" == false` and `[] == false` are all `true`, yet `"" == "0"` is `false`. Loose equality is not even transitive.

### What `===` still does not handle
- `NaN === NaN` is `false`. Use `Number.isNaN(x)`.
- `+0 === -0` is `true`. Use `Object.is(a, b)` if the difference matters.
- Objects are compared by reference, so two equal-looking objects are not `===`.

`Object.is` is "same value" equality: like `===` but `Object.is(NaN, NaN)` is `true` and `Object.is(0, -0)` is `false`.

### Best practice
Always use `===`. The one widely accepted exception is `value == null`, which checks for both `null` and `undefined` in one go.
--- code
console.log(5 == "5"); // true  (string converted to number)
console.log(5 === "5"); // false (different types)

console.log("" == 0); // true
console.log("0" == false); // true
console.log("" == "0"); // false  <- loose equality is not transitive
console.log([] == false); // true

console.log(null == undefined); // true
console.log(null === undefined); // false
console.log(null == 0); // false

console.log(NaN === NaN); // false
console.log(Number.isNaN(NaN)); // true
console.log(Object.is(NaN, NaN)); // true
console.log(Object.is(0, -0)); // false

// The accepted shortcut: check for null OR undefined
function hasValue(x) {
  return x != null;
}
console.log(hasValue(0), hasValue(""), hasValue(null), hasValue(undefined)); // true true false false

=== j7 | E | What is a function in JavaScript?
**A function is a callable object that wraps reusable logic; in JavaScript functions are first-class values, so they can be stored in variables, passed as arguments, returned from other functions and given properties.**

### Ways to create one
- **Function declaration**: `function add(a, b) {}`. Hoisted, has its own `this` and `arguments`.
- **Function expression**: `const add = function (a, b) {}`. Not usable before the line it is defined on.
- **Arrow function**: `const add = (a, b) => a + b`. Shorter, no own `this`, `arguments` or `prototype`, cannot be used with `new`.
- **Method shorthand**: `{ add(a, b) {} }` inside objects and classes.
- Also: generator functions (`function*`), async functions and class constructors.

### Parameters
- Default values: `function greet(name = "friend")`.
- Rest parameters: `function sum(...nums)` collects extra arguments into an array.
- Missing arguments are `undefined`; extra ones are ignored.

### Why "first-class" matters
Because functions are values, JavaScript supports callbacks, higher-order functions (`map`, `filter`), closures, and patterns like middleware and event handlers.

### Return values
A function without a `return` (or with a bare `return`) returns `undefined`.
--- code
// Declaration (hoisted)
function add(a, b = 0) {
  return a + b;
}

// Expression and arrow
const multiply = function (a, b) {
  return a * b;
};
const square = (n) => n * n;

// Rest parameters
const sum = (...nums) => nums.reduce((total, n) => total + n, 0);

// Functions are values: pass them and return them
const apply = (fn, ...args) => fn(...args);
const makeGreeter = (greeting) => (name) => `${greeting}, ${name}!`;

console.log(add(2)); // 2
console.log(multiply(3, 4)); // 12
console.log(apply(square, 5)); // 25
console.log(sum(1, 2, 3, 4)); // 10
console.log(makeGreeter("Hello")("Ada")); // Hello, Ada!

// Functions are objects, so they have properties
console.log(add.name, add.length); // "add" 1 (params before the first default)

=== j8 | E | What is an arrow function?
**An arrow function (`(a, b) => a + b`) is a compact function expression that does not have its own `this`, `arguments`, `super` or `new.target`; it uses those from the surrounding scope.**

### Syntax variations
- One parameter: `x => x * 2` (parentheses optional).
- Expression body returns automatically: `(a, b) => a + b`.
- Block body needs an explicit `return`: `(a, b) => { return a + b; }`.
- Returning an object literal needs parentheses: `() => ({ ok: true })`.

### Lexical `this`
This is the real reason arrow functions exist. Inside a method, a callback written as a normal function gets its own `this` (often `undefined`), while an arrow function keeps the method's `this`. That makes arrows ideal for callbacks inside methods, timers and promise chains.

### When NOT to use an arrow function
- **Object methods** that need `this` to be the object: `{ count: 0, inc: () => this.count++ }` will not work.
- **Constructors**: arrows cannot be called with `new` and have no `prototype`.
- **Event handlers** that rely on `this` being the element (use `event.currentTarget` instead, or a normal function).
- When you need the `arguments` object (use rest parameters instead anyway).

### Interview tip
Explain that `this` in an arrow is decided where the arrow is **defined**, not where it is **called**.
--- code
const double = (n) => n * 2;
const makeUser = (name) => ({ name, createdAt: 2026 }); // parentheses to return an object
console.log(double(4), makeUser("Ada"));

class Timer {
  seconds = 0;
  start() {
    // arrow keeps `this` from start(), so it points to the Timer instance
    const id = setInterval(() => {
      this.seconds++;
      if (this.seconds === 3) {
        clearInterval(id);
        console.log("done at", this.seconds); // done at 3
      }
    }, 10);
  }
}
new Timer().start();

const counter = {
  count: 0,
  isCounterArrow: () => this === counter, // arrow: `this` comes from outside the object
  incMethod() {
    this.count++;
    return this.count;
  },
};
console.log(counter.isCounterArrow()); // false - the arrow did not get the object as `this`
console.log(counter.incMethod()); // 1

=== j9 | E | What is a callback function?
**A callback is a function you pass to another function so it can be called later, either right away (synchronous callbacks like `map`) or when something finishes (asynchronous callbacks like timers and event handlers).**

### Synchronous callbacks
Array methods (`map`, `filter`, `sort`), `forEach`, and custom higher-order functions call your function immediately, as part of their own work.

### Asynchronous callbacks
`setTimeout`, `addEventListener`, and older Node APIs (`fs.readFile(path, cb)`) store your function and call it later from the event loop. Node's convention is the **error-first callback**: `(err, result) => {}`.

### Problems with async callbacks
- **Callback hell**: nested callbacks that are hard to read and harder to handle errors in.
- **Inversion of control**: you trust the other code to call your callback exactly once, with the right arguments.
- **Error handling**: `try/catch` around the outer call cannot catch errors thrown later inside the callback.

Promises and `async/await` were created to fix these problems. Today callbacks are still everywhere for events and array methods, while one-off async results usually use promises.

### Tip
You can turn a callback API into a promise with `new Promise(...)`, or in Node with `util.promisify`.
--- code
// Synchronous callback: called immediately by map
const prices = [10, 20, 30];
const withTax = prices.map((p) => p * 1.2);
console.log(withTax); // [12, 24, 36]

// Asynchronous, error-first callback (Node style)
function loadUser(id, callback) {
  setTimeout(() => {
    if (id <= 0) callback(new Error("Invalid id"));
    else callback(null, { id, name: "Ada" });
  }, 50);
}

loadUser(1, (err, user) => {
  if (err) return console.log("Failed:", err.message);
  console.log("Loaded:", user.name); // Loaded: Ada
});

// Wrapping a callback API in a promise
const loadUserAsync = (id) =>
  new Promise((resolve, reject) => loadUser(id, (err, user) => (err ? reject(err) : resolve(user))));

const user = await loadUserAsync(2);
console.log("Awaited:", user.id); // Awaited: 2

=== j10 | M | What is a closure?
**A closure is a function together with the variables from the scope where it was created; the function keeps access to those variables even after the outer function has returned.**

Every function in JavaScript remembers its **lexical environment**, the variables in scope where it was written. When an inner function is returned or passed somewhere else, that environment stays alive as long as the function can still be called.

### What closures are used for
- **Private state**: variables that only the returned functions can read or change (counters, caches, module internals).
- **Function factories**: `makeMultiplier(3)` returns a function that remembers `3`.
- **Callbacks and event handlers** that need data from when they were set up.
- **Memoization, debounce, throttle, once**: they all keep state in a closure.
- **React hooks** rely on closures; "stale closures" are a common bug there.

### Things to watch for
- **Shared variables in loops**: with `var`, all closures share one variable. Use `let`.
- **Memory**: a closure keeps its variables alive. Holding onto large data inside long-lived closures (e.g. event listeners never removed) can cause leaks.
- **Stale values**: a closure sees the variable, not a snapshot. If the variable changes, the closure sees the new value; if a new variable is created each render (as in React), an old closure keeps seeing the old one.

### Interview tip
Show a counter with private state and explain why `count` is still alive after `createCounter` returns.
--- code
function createCounter() {
  let count = 0; // private: only the functions below can reach it
  return {
    increment: () => ++count,
    decrement: () => --count,
    get value() {
      return count;
    },
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
console.log(counter.value); // 2
console.log(counter.count); // undefined - not reachable from outside

// Function factory
const makeMultiplier = (factor) => (n) => n * factor;
const triple = makeMultiplier(3);
console.log(triple(5)); // 15

// once(): closure state used to run something a single time
function once(fn) {
  let done = false, result;
  return (...args) => (done ? result : ((done = true), (result = fn(...args))));
}
const init = once(() => {
  console.log("initialised"); // runs only the first time
  return 42;
});
console.log(init(), init()); // 42 42

=== j11 | E | What is scope?
**Scope is the set of rules that decides where a variable can be seen; JavaScript has global scope, module scope, function scope and block scope, and it resolves names lexically, by where code is written.**

### The scopes
- **Global scope**: variables visible everywhere. In browsers, `var` at the top level of a classic script also becomes a property of `window`.
- **Module scope**: each ES module has its own top-level scope. Nothing leaks into the global scope unless you export it.
- **Function scope**: variables declared inside a function (with any keyword) are only visible inside it.
- **Block scope**: `let`, `const` and `class` inside `{ }` (if, for, plain blocks) are only visible in that block.

### The scope chain
When code reads a variable, the engine looks in the current scope, then the enclosing one, and so on outward to the global scope. If it finds nothing it throws a `ReferenceError`. Inner scopes can read outer variables; outer scopes cannot see inner ones.

### Lexical scoping
Scope is decided by where the function is **defined**, not where it is **called**. This is what makes closures work.

### Shadowing
Declaring a variable with the same name in an inner scope hides the outer one inside that scope.

### Good habits
Keep variables in the smallest scope that works, prefer `const`/`let`, and use modules instead of globals.
--- code
const appName = "DevQnA"; // module/global scope

function outer() {
  const role = "admin"; // function scope

  if (true) {
    const temp = "only in this block"; // block scope
    console.log(appName, role, temp); // all visible here
  }

  function inner() {
    const role = "viewer"; // shadows outer `role`
    console.log(role, appName); // viewer DevQnA
  }
  inner();
  console.log(role); // admin
  console.log(typeof temp); // "undefined" - block variable is gone
}
outer();

// Lexical scope: decided where the function is written
const x = "global x";
function readX() {
  return x;
}
function caller() {
  const x = "caller x";
  return readX();
}
console.log(caller()); // "global x"

=== j12 | E | What is block scope?
**Block scope means a variable declared with `let`, `const` or `class` inside a pair of braces exists only inside those braces, including `if`, `for`, `while`, `try`, `switch` and bare `{ }` blocks.**

Before ES2015 JavaScript only had function scope: a `var` inside an `if` was visible in the whole function. `let` and `const` added block scope, which matches how most other languages work and removes a whole class of bugs.

### Where it helps
- **Loops**: `for (let i = 0; ...)` creates a new `i` for each iteration. Callbacks created inside the loop each capture their own value.
- **Temporary variables**: helpers you only need inside an `if` disappear afterwards, so they cannot be misused later.
- **Avoiding accidental overwrites**: the same name can be reused safely in separate blocks.
- **`switch` cases**: wrap a case body in `{ }` to declare `const` variables without "already declared" errors.

### Temporal dead zone
Block-scoped variables exist from the start of the block but cannot be read before their declaration line; doing so throws a `ReferenceError`.

### `var` ignores blocks
`var` inside a block is still function-scoped, which is a common source of confusion in older code.
--- code
if (true) {
  let message = "inside";
  const limit = 10;
  var leaked = "var ignores the block";
}
console.log(typeof message, typeof limit); // undefined undefined
console.log(leaked); // "var ignores the block"

// switch: braces give each case its own block
function describe(n) {
  switch (n) {
    case 1: {
      const label = "one";
      return label;
    }
    case 2: {
      const label = "two"; // no "already declared" error
      return label;
    }
    default:
      return "many";
  }
}
console.log(describe(1), describe(2), describe(9)); // one two many

// Each loop iteration gets its own `i`
const fns = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f())); // [0, 1, 2]

=== j13 | E | What is global scope?
**Global scope is the outermost scope: anything declared there can be read from anywhere in the program, which makes it convenient but risky.**

### How things become global
- Top-level declarations in a **classic script** (`<script>` without `type="module"`).
- `var` and function declarations at the top level of a classic script also become properties of the **global object** (`window` in browsers). `let`/`const` are global but do not become `window` properties.
- Assigning to an undeclared variable (`count = 1`) in sloppy mode silently creates a global. Strict mode throws instead.
- Explicitly: `globalThis.config = {...}`.

### Modules change the picture
In ES modules (and Node's CommonJS files) each file has its own **module scope**. Top-level variables are private to the module unless exported. This is why modern code rarely creates globals by accident.

### `globalThis`
A standard way to reach the global object in any environment: `window` in browsers, `self` in workers, `global` in Node.

### Why to avoid globals
- **Name collisions** with other scripts, libraries or browser features.
- **Hidden dependencies**: any code can change the value, which makes bugs hard to trace.
- **Testing**: globals leak state between tests.

Prefer modules, pass values as arguments, and keep truly shared state in one well-defined place.
--- code
"use strict";

// globalThis works everywhere (browser, worker, Node)
globalThis.appVersion = "2.1.0";
console.log(appVersion); // readable from anywhere: "2.1.0"

function readVersion() {
  return appVersion; // found by walking up the scope chain
}
console.log(readVersion());

// Strict mode stops accidental globals
try {
  undeclaredCounter = 1; // ReferenceError in strict mode
} catch (e) {
  console.log(e.name); // ReferenceError
}

// Shadowing a global inside a function
function useLocal() {
  const appVersion = "local";
  return appVersion;
}
console.log(useLocal(), globalThis.appVersion); // local 2.1.0

delete globalThis.appVersion; // clean up

=== j14 | M | What is local scope?
**Local scope is the scope inside a function (or block): variables declared there are created when the function runs, are invisible from outside, and normally disappear when the call ends.**

### Key behaviours
- **Each call gets a fresh scope.** Calling a function twice creates two independent sets of local variables, which is what makes recursion work.
- **Parameters are local variables.** Reassigning a parameter does not affect the caller's variable. (Mutating an object passed in does, because both refer to the same object.)
- **Inner code can see outer variables, not the reverse.** A function can read variables from enclosing scopes through the scope chain.
- **Locals can outlive the call** if a closure still references them; otherwise they become eligible for garbage collection.

### Why local scope is good
- Functions are self-contained and easier to test.
- No collisions with variables elsewhere.
- Memory is freed when the function finishes.

### Common mistakes
- Forgetting `let`/`const` (in sloppy mode this creates a global instead of a local).
- Expecting reassignment of a parameter to change the original argument.
- Expecting a local declared in one function to be visible in another function called from it. Scope follows where code is written, not the call chain.
--- code
function calculateTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0); // local
  const tax = subtotal * taxRate; // local
  return subtotal + tax;
}
console.log(calculateTotal([{ price: 10 }, { price: 20 }], 0.1)); // 33
console.log(typeof subtotal); // "undefined" - not visible outside

// Each call has its own locals
function makeId(prefix) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
const userId = makeId("user");
const orderId = makeId("order");
console.log(userId(), userId(), orderId()); // user-1 user-2 order-1

// Reassigning a parameter vs mutating it
function update(value, obj) {
  value = 99; // only changes the local copy
  obj.changed = true; // changes the shared object
}
let num = 1;
const data = {};
update(num, data);
console.log(num, data); // 1 { changed: true }

=== j15 | H | What is the 'this' keyword?
**`this` is a value set when a function is called (not where it is defined), and it refers to the object the function is acting on; arrow functions are the exception, taking `this` from the surrounding scope.**

### The rules, in priority order
1. **`new` binding**: `new Fn()` sets `this` to the newly created object.
2. **Explicit binding**: `fn.call(obj)`, `fn.apply(obj)` or `fn.bind(obj)` set `this` to `obj`.
3. **Implicit binding**: `obj.method()` sets `this` to `obj` (whatever is left of the dot at call time).
4. **Default binding**: a plain call `fn()` gives `undefined` in strict mode (and in modules and classes), or the global object in sloppy mode.

**Arrow functions** ignore all of these and use `this` from where they were written.

### Losing `this`
The most common bug: passing a method as a callback (`setTimeout(obj.method)` or `onClick={this.handle}`) detaches it from the object, so the call becomes a plain call and `this` is `undefined`. Fixes: `bind`, an arrow wrapper, or class field arrow methods.

### Other contexts
- In a class body and ES modules, code runs in strict mode.
- In DOM event handlers written as normal functions, `this` is the element the listener is attached to (`event.currentTarget`).
- At the top level of a module `this` is `undefined`; in a classic browser script it is `window`.
--- code
"use strict";

const user = {
  name: "Ada",
  greet() {
    return `Hi, I am ${this?.name}`;
  },
};

console.log(user.greet()); // implicit: Hi, I am Ada

const detached = user.greet;
console.log(detached()); // default (strict): Hi, I am undefined

console.log(detached.call({ name: "Linus" })); // explicit: Hi, I am Linus
const bound = user.greet.bind(user);
console.log(bound()); // bound: Hi, I am Ada

function Person(name) {
  this.name = name; // `new` binding: this = new object
}
console.log(new Person("Grace").name); // Grace

class Clock {
  ticks = 0;
  tick = () => ++this.ticks; // arrow class field: always this instance
}
const clock = new Clock();
const fn = clock.tick; // safe to pass around
fn();
fn();
console.log(clock.ticks); // 2

=== j16 | E | What is NaN?
**`NaN` ("Not a Number") is a special numeric value that represents the result of an invalid or undefined math operation; its type is still `"number"`.**

### Where it comes from
- Converting non-numeric text: `Number("abc")`, `parseInt("hello")`.
- Invalid math: `0 / 0`, `Math.sqrt(-1)`, `Infinity - Infinity`.
- Any arithmetic involving `NaN`: `NaN + 5` is `NaN`, so it spreads through calculations.
- Arithmetic with `undefined`: `undefined + 1`.

### Its strangest property
`NaN` is the only value not equal to itself: `NaN === NaN` is `false`. That means you cannot check for it with `===`.

### How to check for it
- **`Number.isNaN(x)`**: `true` only if `x` is actually `NaN`. Use this.
- **Global `isNaN(x)`**: converts first, so `isNaN("hello")` is `true` even though "hello" is a string. Usually not what you want.
- **`Object.is(x, NaN)`**: also works.
- **`Number.isFinite(x)`**: rejects `NaN` and `Infinity` in one go; ideal for validating numeric input.

### Array methods
`[NaN].indexOf(NaN)` is `-1` (uses `===`), but `[NaN].includes(NaN)` is `true` (uses SameValueZero).

### In practice
Validate input with `Number.isFinite(Number(value))` before using it, so a single `NaN` does not quietly poison a whole calculation.
--- code
console.log(typeof NaN); // "number"
console.log(Number("abc"), 0 / 0, Math.sqrt(-1)); // NaN NaN NaN
console.log(NaN === NaN); // false

console.log(Number.isNaN(NaN)); // true
console.log(Number.isNaN("hello")); // false
console.log(isNaN("hello")); // true  <- global isNaN converts first

console.log([NaN].indexOf(NaN)); // -1
console.log([NaN].includes(NaN)); // true

// NaN spreads through calculations
const total = [10, "x", 5].reduce((sum, v) => sum + Number(v), 0);
console.log(total); // NaN

// Safe numeric parsing
function toNumber(input, fallback = 0) {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}
console.log(toNumber("42"), toNumber("4 2"), toNumber("abc"), toNumber("1e3")); // 42 0 0 1000

=== j17 | E | What is the difference between null and undefined?
**`undefined` means a value has not been set (the language's default), while `null` means "intentionally empty" (a value a developer chose to assign).**

### Where `undefined` appears automatically
- A declared variable with no value: `let x;`
- A missing function argument.
- A missing object property or array element.
- A function with no `return`.

### Where `null` appears
Only when someone sets it: `user.avatar = null`, or APIs that return `null` for "nothing found" (`document.querySelector`, `String.prototype.match`, `JSON.parse("null")`).

### Differences that bite
- `typeof undefined` is `"undefined"`; `typeof null` is `"object"`.
- `null == undefined` is `true`, but `null === undefined` is `false`.
- **Default parameters** apply for `undefined` only: passing `null` keeps `null`.
- **JSON**: `JSON.stringify({ a: undefined, b: null })` gives `{"b":null}`; `undefined` properties are dropped.
- **Arithmetic**: `null + 1` is `1`, `undefined + 1` is `NaN`.

### Handling both
- `value ?? fallback` replaces both `null` and `undefined` (but not `0` or `""`).
- `obj?.prop` stops safely if `obj` is either.
- `value == null` checks for both in one expression.

### Convention
Many teams use `undefined` for "not provided" and `null` for "explicitly cleared", and stay consistent.
--- code
let notSet;
const user = { name: "Ada", avatar: null };

console.log(notSet); // undefined
console.log(user.email); // undefined (missing property)
console.log(user.avatar); // null (set on purpose)

console.log(typeof undefined, typeof null); // "undefined" "object"
console.log(null == undefined, null === undefined); // true false

// Default parameters only replace undefined
const greet = (name = "friend") => `Hi ${name}`;
console.log(greet(undefined), greet(null)); // "Hi friend" "Hi null"

// JSON drops undefined, keeps null
console.log(JSON.stringify({ a: undefined, b: null })); // {"b":null}

// Arithmetic
console.log(null + 1, undefined + 1); // 1 NaN

// Handle both with ?? and ?.
console.log(user.avatar ?? "default.png"); // default.png
console.log(user.settings?.theme ?? "light"); // light

=== j18 | E | What are template literals?
**Template literals are strings written with backticks that support embedded expressions (`${...}`), real multi-line text and, through tagged templates, custom processing of the string parts and values.**

### Interpolation
Any expression can go inside `${ }`: variables, calls, ternaries, arithmetic. The result is converted to a string.

### Multi-line strings
Line breaks inside backticks are kept as-is, no `\n` needed. Indentation is kept too, which is something to watch for.

### Tagged templates
A function placed in front of a template (`` tag`...` ``) receives the string pieces and the values separately and can return anything. This powers:
- Safe HTML or SQL builders that escape values.
- Styling libraries (`` styled.div`...` ``).
- GraphQL queries (`` gql`...` ``).
- `String.raw`, which keeps backslashes literal: `` String.raw`C:\new` ``.

### Pitfalls
- Building HTML with plain interpolation of user input is an XSS risk. Escape the values or use a tag that does.
- Building SQL with interpolation is an injection risk. Use parameterised queries.
- `${obj}` prints `[object Object]`; use `JSON.stringify` for debugging.
--- code
const user = { name: "Ada", items: 3, total: 42.5 };

console.log(`Hi ${user.name}, you have ${user.items} item${user.items === 1 ? "" : "s"}`);
console.log(`Total with tax: ${(user.total * 1.2).toFixed(2)}`);

const receipt = `Receipt
  Name:  ${user.name}
  Total: ${user.total}`;
console.log(receipt); // keeps the line breaks and indentation

// Tagged template that escapes values for HTML
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function html(strings, ...values) {
  return strings.reduce((out, str, i) => out + str + (i < values.length ? escape(values[i]) : ""), "");
}
const comment = '<img src=x onerror="alert(1)">';
console.log(html`<p>${comment}</p>`); // <p>&#60;img src=x onerror=&#34;alert(1)&#34;&#62;</p>

console.log(String.raw`C:\new\folder`); // C:\new\folder (backslashes kept)

=== j19 | E | What is destructuring?
**Destructuring is syntax for unpacking values from arrays (by position) or objects (by property name) into variables, with support for defaults, renaming, nesting and collecting the rest.**

### Object destructuring
- Basic: `const { name, age } = user`.
- Rename: `const { name: fullName } = user`.
- Default: `const { role = "viewer" } = user` (applies only when the value is `undefined`).
- Nested: `const { address: { city } } = user`.
- Rest: `const { password, ...safeUser } = user` copies everything except `password`.

### Array destructuring
- By position: `const [first, second] = list`.
- Skip items: `const [, , third] = list`.
- Rest: `const [head, ...tail] = list`.
- Swap without a temp variable: `[a, b] = [b, a]`.

### In function parameters
`function render({ title, size = "md" }) {}` documents the options a function takes and gives defaults in one place. Add `= {}` as a parameter default so calling with no argument does not throw.

### Pitfalls
- Destructuring `null` or `undefined` throws a `TypeError`. Provide a default (`= {}`) or use optional chaining before it.
- Nested destructuring throws if an intermediate object is missing.
- A statement starting with `{` is read as a block; wrap assignments in parentheses: `({ a, b } = obj)`.
--- code
const user = {
  name: "Ada",
  role: undefined,
  password: "secret",
  address: { city: "London", zip: "N1" },
};

const { name: fullName, role = "viewer", address: { city } } = user;
console.log(fullName, role, city); // Ada viewer London

const { password, ...safeUser } = user; // drop a field
console.log(safeUser); // { name, role, address } - no password

const [first, , third = "none", ...others] = ["a", "b", undefined, "d", "e"];
console.log(first, third, others); // a none ["d", "e"]

let a = 1, b = 2;
[a, b] = [b, a]; // swap
console.log(a, b); // 2 1

// Parameters with defaults; `= {}` makes the argument optional
function createButton({ label = "OK", size = "md", disabled = false } = {}) {
  return `${label} (${size}${disabled ? ", disabled" : ""})`;
}
console.log(createButton({ label: "Save", disabled: true })); // Save (md, disabled)
console.log(createButton()); // OK (md)

=== j20 | E | What are default parameters?
**Default parameters let you give a function parameter a fallback value that is used when the argument is missing or explicitly `undefined`.**

### How they behave
- Defaults apply only for `undefined`. Passing `null`, `0`, `false` or `""` keeps that value.
- Defaults are **evaluated at call time**, every time. `function f(list = [])` gets a new array on each call, which avoids the shared-default bug some other languages have.
- A default can use earlier parameters: `function range(start, end = start + 10)`.
- A default can call a function: `function save(id = crypto.randomUUID())`.
- Parameters with defaults (and everything after them) are not counted in `fn.length`.

### Combine with destructuring
`function connect({ host = "localhost", port = 5432 } = {})` gives each option a default and makes the whole options object optional.

### Required parameters
A neat trick: `function f(id = required("id"))` where `required` throws. The error only happens when the argument is missing.

### Before ES2015
Code used `x = x || defaultValue`, which wrongly replaced `0`, `""` and `false`. Default parameters (or `??`) fix that.
--- code
function greet(name = "friend", greeting = `Hello`) {
  return `${greeting}, ${name}!`;
}
console.log(greet()); // Hello, friend!
console.log(greet("Ada")); // Hello, Ada!
console.log(greet(undefined, "Hi")); // Hi, friend!
console.log(greet(null)); // Hello, null!  <- null is a real value

// Evaluated on every call: no shared array between calls
function addItem(item, list = []) {
  list.push(item);
  return list;
}
console.log(addItem("a"), addItem("b")); // ["a"] ["b"]

// Defaults can use earlier parameters
const range = (start, end = start + 3) => Array.from({ length: end - start }, (_, i) => start + i);
console.log(range(5)); // [5, 6, 7]

// Required parameter pattern
const required = (name) => {
  throw new Error(`${name} is required`);
};
function fetchUser(id = required("id")) {
  return { id };
}
try {
  fetchUser();
} catch (e) {
  console.log(e.message); // id is required
}

console.log(greet.length); // 0 (params with defaults are not counted)

=== j21 | E | What is the spread operator?
**The spread syntax (`...`) expands an iterable (array, string, Set, Map) into individual elements, or an object into its own properties, inside array literals, object literals and function calls.**

### Common uses
- **Copy an array**: `const copy = [...list]`.
- **Merge arrays**: `[...a, ...b]`.
- **Pass array items as arguments**: `Math.max(...numbers)`.
- **Copy or merge objects**: `{ ...defaults, ...options }`. Later properties win, which makes it perfect for "defaults + overrides".
- **Immutable updates**: `{ ...state, user: { ...state.user, name: "Ada" } }`, as used in React and Redux.
- **Convert iterables**: `[...new Set(list)]` removes duplicates, `[..."hello"]` splits a string into characters (correctly handling emoji).

### Important: spread is shallow
Spread copies only the top level. Nested objects are still shared, so changing `copy.address.city` also changes the original. For a deep copy use `structuredClone`.

### Other details
- Object spread copies **own enumerable** properties only, not the prototype or getters as getters (they are evaluated into values).
- Spreading a huge array into a function call can exceed the argument limit; prefer `reduce` or a loop for very large inputs.
- Spread vs rest: same `...` syntax, opposite job. Spread expands, rest collects.
--- code
const nums = [3, 9, 1];
console.log(Math.max(...nums)); // 9

const merged = [...nums, ...[7, 8]];
console.log(merged); // [3, 9, 1, 7, 8]

console.log([...new Set([1, 1, 2, 3, 3])]); // [1, 2, 3]
console.log([..."héllo👋"]); // ["h", "é", "l", "l", "o", "👋"]

const defaults = { theme: "light", fontSize: 14, beta: false };
const userPrefs = { fontSize: 16 };
console.log({ ...defaults, ...userPrefs }); // fontSize 16 wins

// Immutable update of nested state
const state = { user: { name: "Ada", address: { city: "London" } }, count: 1 };
const next = { ...state, user: { ...state.user, name: "Grace" } };
console.log(state.user.name, next.user.name); // Ada Grace

// Spread is shallow!
const shallow = { ...state };
shallow.user.address.city = "Paris";
console.log(state.user.address.city); // Paris - nested object was shared

const deep = structuredClone(state);
deep.user.address.city = "Rome";
console.log(state.user.address.city); // still Paris

=== j22 | E | What is the rest operator?
**Rest syntax (`...name`) collects the remaining items into a single array or object: extra function arguments into an array, leftover array elements, or leftover object properties.**

### Rest parameters
`function sum(...numbers)` gathers all arguments into a real array (unlike the old `arguments` object, which is array-like and does not exist in arrow functions). It must be the last parameter, and there can be only one.

### Rest in destructuring
- Arrays: `const [first, ...others] = list`.
- Objects: `const { id, ...data } = record` is a clean way to remove a property without mutating the original.

### Rest vs spread
They use the same `...` but do opposite things:
- **Rest** appears where values are **received** (parameters, the left side of destructuring) and **collects** them.
- **Spread** appears where values are **provided** (calls, array/object literals) and **expands** them.

### Practical patterns
- Variadic helpers: `log(level, ...messages)`.
- Forwarding arguments: `(...args) => original(...args)` in wrappers like debounce and memoize.
- Omitting fields before sending data: `const { password, ...publicUser } = user`.
- Splitting props in React components: `function Button({ variant, ...rest }) { return <button {...rest} /> }`.
--- code
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3, 4)); // 10
console.log(sum()); // 0

function log(level, ...messages) {
  console.log(`[${level.toUpperCase()}]`, messages.join(" "));
}
log("info", "server", "started", "on", 3000); // [INFO] server started on 3000

const [winner, ...runnersUp] = ["Ada", "Grace", "Linus"];
console.log(winner, runnersUp); // Ada ["Grace", "Linus"]

const record = { id: 7, name: "Ada", password: "hunter2" };
const { password, ...publicUser } = record;
console.log(publicUser); // { id: 7, name: "Ada" }

// Forwarding arguments in a wrapper
function withTiming(fn) {
  return (...args) => {
    const start = performance.now();
    const result = fn(...args); // spread them back out
    console.log(`${fn.name} took ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  };
}
console.log(withTiming(sum)(5, 5)); // 10

=== j23 | E | What is an array?
**An array is an ordered, zero-indexed list of values of any type; in JavaScript it is a special object whose keys are indexes and whose `length` updates automatically.**

### Creating arrays
- Literal: `[1, 2, 3]`.
- `Array.from(iterable, mapFn)`: from a Set, string, NodeList, or `{ length: n }`.
- `Array.of(7)`: a single-element array (unlike `new Array(7)`, which makes 7 empty slots).
- `new Array(n).fill(0)`: pre-filled array.

### Mutating vs non-mutating methods
- **Mutate**: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`.
- **Return new arrays**: `map`, `filter`, `slice`, `concat`, `flat`, and the ES2023 copies **`toSorted`, `toReversed`, `toSpliced`, `with(index, value)`**. These are ideal for React state.
- **Search**: `find`, `findIndex`, `findLast`, `findLastIndex`, `includes`, `indexOf`, `some`, `every`.
- **Access**: `at(-1)` reads from the end.
- **Group**: `Object.groupBy(array, fn)` (ES2024).

### Things to know
- `typeof [] === "object"`; use `Array.isArray`.
- Arrays can have holes (`[1, , 3]`), which some methods skip.
- Setting `length` truncates the array.
- Arrays are compared by reference, so `[1] === [1]` is `false`.
--- code
const scores = [72, 95, 88, 60];

console.log(scores.length, scores[0], scores.at(-1)); // 4 72 60

// Non-mutating (good for state updates)
const sorted = scores.toSorted((a, b) => b - a);
const updated = scores.with(1, 100);
console.log(sorted, updated, scores); // original unchanged

// Transform, filter, aggregate
const passed = scores.filter((s) => s >= 70).map((s) => `${s}%`);
const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
console.log(passed, average); // ["72%", "95%", "88%"] 78.75

// Search
console.log(scores.find((s) => s > 90), scores.findLast((s) => s > 70), scores.includes(60));

// Create arrays
console.log(Array.from({ length: 5 }, (_, i) => i * i)); // [0, 1, 4, 9, 16]
console.log(Array.from(new Set("banana"))); // ["b", "a", "n"]

// Group (ES2024)
console.log(Object.groupBy(scores, (s) => (s >= 70 ? "pass" : "fail")));

console.log(Array.isArray(scores), typeof scores); // true "object"

=== j24 | E | What is an object?
**An object is a collection of key-value pairs (properties), where keys are strings or symbols and values can be anything, including functions (methods); almost everything non-primitive in JavaScript is an object.**

### Creating objects
- Literal: `{ name: "Ada", greet() {} }`, the most common.
- Class instances: `new User()`.
- `Object.create(proto)`: with a chosen prototype, or `Object.create(null)` for a dictionary with no inherited keys.
- `Object.fromEntries(pairs)`: from `[key, value]` pairs.

### Working with properties
- Read: `obj.name` or `obj["name"]` (bracket notation for dynamic keys).
- Check existence: `Object.hasOwn(obj, "key")` (modern replacement for `hasOwnProperty`) or `"key" in obj` (includes inherited keys).
- Delete: `delete obj.key`.
- Iterate: `Object.keys`, `Object.values`, `Object.entries`, or `for...in` (includes inherited enumerable keys).
- Computed keys: `{ [dynamicKey]: value }`.
- Shorthand: `{ name, age }` instead of `{ name: name, age: age }`.

### Reference semantics
Variables hold a reference to the object. Assigning or passing it does not copy it, so two variables can change the same object. Copy with spread (shallow) or `structuredClone` (deep).

### Locking objects
`Object.freeze` (no changes), `Object.seal` (no new or deleted keys), `Object.preventExtensions` (no new keys).

### Map vs object
Use a `Map` for dynamic keys, non-string keys, frequent additions and removals, or when you need insertion-ordered iteration with a size.
--- code
const key = "level";
const user = {
  name: "Ada",
  skills: ["js"],
  [key]: 3, // computed key
  greet() {
    return `Hi, I'm ${this.name}`;
  },
};

console.log(user.greet(), user["level"]); // Hi, I'm Ada 3
console.log(Object.keys(user)); // ["name", "skills", "level", "greet"]
console.log(Object.hasOwn(user, "name"), "toString" in user); // true true (inherited)

for (const [k, v] of Object.entries(user)) {
  if (typeof v !== "function") console.log(k, "=>", v);
}

// Build an object from pairs, and transform one
const prices = Object.fromEntries([["apple", 1], ["pear", 2]]);
const doubled = Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, v * 2]));
console.log(doubled); // { apple: 2, pear: 4 }

// References: both names point to the same object
const alias = user;
alias.name = "Grace";
console.log(user.name); // Grace

const frozen = Object.freeze({ x: 1 });
frozen.x = 2; // ignored (throws in strict mode)
console.log(frozen.x); // 1

=== j25 | E | How do you loop through arrays?
**Use `for...of` for simple iteration, array methods (`map`, `filter`, `reduce`, `forEach`) for transformations, and a classic `for` loop when you need the index or early exits with full control; avoid `for...in` for arrays.**

### The options
- **`for...of`**: reads values, supports `break`, `continue` and `await`. Use `array.entries()` to get `[index, value]`.
- **Classic `for (let i = 0; ...)`**: full control over the index, direction and step. Fastest in hot loops, though rarely necessary.
- **`forEach(fn)`**: runs a function for each item. Cannot `break`, and it does **not** wait for `async` callbacks.
- **`map` / `filter` / `reduce`**: when you are building a new value from the array. Prefer these over pushing into a result array in a loop.
- **`some` / `every` / `find`**: stop early as soon as the answer is known.
- **`for...in`**: iterates keys as strings, includes inherited enumerable properties and does not guarantee intent. Use it for objects, not arrays.

### Async work
- Sequential: `for (const item of items) await process(item)`.
- Parallel: `await Promise.all(items.map(process))`.
- `items.forEach(async (item) => ...)` starts everything without waiting, which is a frequent bug.

### Rule of thumb
If you are producing a value, use the matching array method. If you are performing side effects, especially with `break` or `await`, use `for...of`.
--- code
const fruits = ["apple", "banana", "cherry"];

for (const fruit of fruits) console.log(fruit);

for (const [i, fruit] of fruits.entries()) console.log(i, fruit);

for (let i = fruits.length - 1; i >= 0; i--) console.log("reverse:", fruits[i]);

// Early exit
for (const fruit of fruits) {
  if (fruit.startsWith("b")) {
    console.log("found", fruit);
    break;
  }
}
console.log(fruits.some((f) => f.length > 5)); // true, stops at "banana"

// Building new values
const upper = fruits.map((f) => f.toUpperCase());
const totalChars = fruits.reduce((n, f) => n + f.length, 0);
console.log(upper, totalChars);

// Async: sequential vs parallel
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
for (const f of fruits) console.log("sequential", await wait(10, f));
console.log("parallel", await Promise.all(fruits.map((f) => wait(10, f))));
