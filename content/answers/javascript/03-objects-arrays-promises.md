=== j51 | M | What is a prototype in JavaScript?
**A prototype is the object another object falls back to when a property is not found on itself; every object has an internal link (`[[Prototype]]`) to one, and that is how JavaScript shares methods between objects.**

### How lookup works
When you read `obj.method`, the engine checks `obj`'s own properties first. If `method` is not there, it checks `obj`'s prototype, then that object's prototype, and so on until it reaches `null`. Writing a property always writes to the object itself, never to its prototype.

### Where prototypes come from
- Object literals get `Object.prototype` (which provides `toString`, `hasOwnProperty`...).
- Arrays get `Array.prototype` (`map`, `filter`...), which itself links to `Object.prototype`.
- `new Fn()` sets the new object's prototype to `Fn.prototype`.
- `class` instances get `ClassName.prototype`; methods defined in the class body live there.
- `Object.create(proto)` lets you pick the prototype directly.

### Two different "prototype" names
- **`obj.[[Prototype]]`**: the internal link every object has. Read it with `Object.getPrototypeOf(obj)` (the old `__proto__` accessor still works but is legacy).
- **`Fn.prototype`**: a regular property on functions, used as the prototype for objects created with `new Fn()`.

### Why it matters
- Memory: one shared copy of each method instead of one per object.
- Understanding classes: they are syntax over prototypes.
- Avoiding pitfalls: never modify built-in prototypes like `Array.prototype` in app code; it can break libraries and future language features.
--- code
const animal = {
  eats: true,
  describe() {
    return `${this.name} eats: ${this.eats}`;
  },
};

const rabbit = Object.create(animal); // rabbit's prototype is animal
rabbit.name = "Rabbit";

console.log(rabbit.describe()); // Rabbit eats: true  (found on the prototype)
console.log(Object.hasOwn(rabbit, "eats")); // false - inherited
console.log(Object.getPrototypeOf(rabbit) === animal); // true

rabbit.eats = false; // writes to rabbit itself, shadows the prototype
console.log(rabbit.eats, animal.eats); // false true

// Classes use prototypes under the hood
class User {
  constructor(name) {
    this.name = name;
  }
  hello() {
    return `Hi ${this.name}`;
  }
}
const a = new User("Ada");
const b = new User("Grace");
console.log(a.hello === b.hello); // true - one shared method on User.prototype
console.log(Object.getPrototypeOf(a) === User.prototype); // true
console.log(Object.getOwnPropertyNames(a)); // ["name"] - methods are not copied per instance

=== j52 | M | What is the prototype chain?
**The prototype chain is the series of linked prototypes JavaScript walks through when looking up a property, from the object itself up to `Object.prototype` and finally `null`.**

### Example chain for an array
`[1, 2]` → `Array.prototype` → `Object.prototype` → `null`.
That is why an array has `map` (from `Array.prototype`) and `hasOwnProperty` (from `Object.prototype`).

### For a class hierarchy
`dog` → `Dog.prototype` → `Animal.prototype` → `Object.prototype` → `null`.
`extends` links `Dog.prototype` to `Animal.prototype`.

### Rules
- **Reading** walks the chain until the property is found; if it reaches `null`, the result is `undefined`.
- **Writing** creates or updates the property on the object itself (unless a setter higher up intercepts it).
- **`instanceof`** checks whether `Fn.prototype` appears anywhere in the object's chain.
- **`in`** checks the whole chain; **`Object.hasOwn`** checks only the object itself.
- **`for...in`** iterates enumerable properties from the whole chain, which is why it is avoided for plain iteration.

### Performance
Lookups are fast because engines cache object shapes, but very deep chains and changing an object's prototype after creation (`Object.setPrototypeOf`) make optimisations harder. Set the prototype once, at creation.

### Objects with no chain
`Object.create(null)` makes an object with no prototype at all. It is a clean dictionary: no inherited keys like `toString` that could collide with your data.
--- code
class Animal {
  breathe() {
    return "breathing";
  }
}
class Dog extends Animal {
  bark() {
    return "woof";
  }
}
const rex = new Dog();

// Walk the chain manually
const chain = [];
for (let p = Object.getPrototypeOf(rex); p; p = Object.getPrototypeOf(p)) {
  chain.push(p.constructor.name);
}
console.log(chain); // ["Dog", "Animal", "Object"]

console.log(rex.bark(), rex.breathe(), typeof rex.toString); // woof breathing function
console.log(rex instanceof Dog, rex instanceof Animal, rex instanceof Object); // true true true

// in vs hasOwn
console.log("bark" in rex, Object.hasOwn(rex, "bark")); // true false

// The array chain
console.log(Object.getPrototypeOf([]) === Array.prototype); // true
console.log(Object.getPrototypeOf(Array.prototype) === Object.prototype); // true

// A dictionary with no chain
const dict = Object.create(null);
dict.toString = "just data";
console.log(Object.getPrototypeOf(dict), dict.toString); // null "just data"

=== j53 | M | Difference between Class and Prototype inheritance?
**JavaScript classes are syntax built on top of prototypes, so both use the same prototype-based inheritance underneath; classes add clearer syntax plus stricter rules and features that hand-written prototypes lack.**

### Prototype style (pre-2015)
You write a constructor function, attach methods to `Fn.prototype`, call the parent constructor with `Parent.call(this, ...)`, and link prototypes with `Object.create(Parent.prototype)`, remembering to restore `constructor`. It works but is verbose and easy to get wrong.

### Class style
`class Child extends Parent` with `constructor`, `super(...)`, methods, getters and static members in one block. It produces almost the same prototype structure.

### What classes add on top
- **Must be called with `new`**; calling a class as a function throws.
- **Always strict mode** inside the body.
- **Not hoisted for use**: classes are in the TDZ until their declaration runs.
- **`super`** for calling parent constructors and methods.
- **Private fields and methods** (`#secret`), truly inaccessible from outside.
- **Static blocks and public class fields**.
- Methods are **non-enumerable**, so they do not appear in `for...in`.
- Inheriting from built-ins like `Array`, `Error` and `Map` works correctly.

### Is JavaScript "classical" now?
No. Under the hood objects still link to other objects. You can still change prototypes at runtime and mix in behaviour, which classical languages do not allow.

### Recommendation
Use `class` for new code; understand prototypes so you can read older code and debug inheritance.
--- code
// Prototype style
function AnimalFn(name) {
  this.name = name;
}
AnimalFn.prototype.speak = function () {
  return `${this.name} makes a sound`;
};
function DogFn(name) {
  AnimalFn.call(this, name); // call parent constructor
}
DogFn.prototype = Object.create(AnimalFn.prototype); // link prototypes
DogFn.prototype.constructor = DogFn; // restore constructor
DogFn.prototype.speak = function () {
  return `${AnimalFn.prototype.speak.call(this)}: woof`;
};

// Class style: same structure, less ceremony, more features
class Animal {
  #secret = "hidden"; // truly private
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a sound`;
  }
}
class Dog extends Animal {
  speak() {
    return `${super.speak()}: woof`;
  }
}

console.log(new DogFn("Rex").speak()); // Rex makes a sound: woof
console.log(new Dog("Rex").speak()); // Rex makes a sound: woof
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true - prototypes underneath

try {
  Dog("oops"); // classes must be called with new
} catch (e) {
  console.log(e.name); // TypeError
}

=== j54 | M | What is inheritance in JS?
**Inheritance in JavaScript means an object can use properties and methods defined on another object through the prototype chain; with classes you write it as `class Child extends Parent`.**

### How to inherit
- **Classes**: `extends` plus `super()` in the constructor and `super.method()` to reuse parent logic.
- **`Object.create(proto)`**: create an object whose prototype is `proto`, without any constructor.
- **Constructor functions** with manual prototype linking (legacy).

### Rules for `extends`
- A child constructor must call `super()` **before** using `this`.
- If the child has no constructor, one is generated that passes all arguments to `super`.
- Methods can be **overridden**; `super.method()` calls the parent version.
- Static methods are inherited too.
- You can extend built-ins (`Error`, `Array`, `Map`), which is common for custom error types.

### Composition over inheritance
Deep inheritance trees become rigid: a change in a base class ripples everywhere, and real-world things rarely fit a single hierarchy. Modern JavaScript (and React in particular) tends to prefer **composition**: build objects from small pieces of behaviour, pass functions in, or use mixins. Keep inheritance shallow and use it where there is a genuine "is-a" relationship, like `ValidationError extends Error`.

### Custom errors
`class NotFoundError extends Error` lets callers use `instanceof NotFoundError` to handle specific failures, and sets a useful `name` for logs.
--- code
class Shape {
  constructor(name) {
    this.name = name;
  }
  area() {
    return 0;
  }
  describe() {
    return `${this.name} with area ${this.area().toFixed(2)}`;
  }
  static compare(a, b) {
    return a.area() - b.area();
  }
}

class Circle extends Shape {
  constructor(radius) {
    super("Circle"); // must come before using `this`
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius ** 2; // override
  }
}

class Square extends Shape {
  constructor(side) {
    super("Square");
    this.side = side;
  }
  area() {
    return this.side ** 2;
  }
}

const shapes = [new Circle(1), new Square(3), new Circle(2)];
console.log(shapes.map((s) => s.describe()));
console.log(shapes.toSorted(Shape.compare).map((s) => s.name)); // ["Circle", "Square", "Circle"]

// Inheriting from a built-in: custom errors
class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}
try {
  throw new NotFoundError("User 42");
} catch (e) {
  console.log(e instanceof NotFoundError, e instanceof Error, `${e}`); // true true NotFoundError: User 42 not found
}

=== j55 | M | What is Object.create()?
**`Object.create(proto, descriptors?)` creates a new, empty object whose prototype is set to `proto`, letting you set up inheritance directly without constructors or classes.**

### What it is used for
- **Prototype delegation**: share behaviour by linking objects (`const admin = Object.create(user)`).
- **Pure dictionaries**: `Object.create(null)` gives an object with no prototype, so keys like `"constructor"`, `"toString"` or `"__proto__"` are just data and cannot collide with inherited properties.
- **Legacy inheritance**: `Child.prototype = Object.create(Parent.prototype)` was how constructor functions inherited before `class`.
- **Defining properties with descriptors**: the optional second argument works like `Object.defineProperties`.

### Property descriptors
Each property can be configured with `value`, `writable`, `enumerable` and `configurable` (or `get`/`set`). Properties defined through descriptors default to `false` for all three flags, which surprises people: they are read-only and hidden from `Object.keys` unless you say otherwise.

### Object.create vs `new`
`new Fn()` creates an object linked to `Fn.prototype` **and runs** `Fn`. `Object.create(Fn.prototype)` only does the linking; no constructor runs.

### Today
For dictionaries, a `Map` is often clearer. For inheritance, `class` is more readable. `Object.create` remains the precise tool when you want explicit control over the prototype.
--- code
const userMethods = {
  greet() {
    return `Hi, I'm ${this.name}`;
  },
  isAdmin() {
    return false;
  },
};

const ada = Object.create(userMethods);
ada.name = "Ada";
console.log(ada.greet(), Object.keys(ada)); // Hi, I'm Ada ["name"]

// Specialise by linking another level
const adminMethods = Object.create(userMethods);
adminMethods.isAdmin = () => true;
const root = Object.create(adminMethods, {
  name: { value: "root", enumerable: true }, // writable defaults to false!
});
console.log(root.greet(), root.isAdmin()); // Hi, I'm root true
root.name = "changed"; // ignored (throws in strict mode)
console.log(root.name); // root

// A safe dictionary with no inherited keys
const counts = Object.create(null);
for (const word of ["constructor", "toString", "constructor"]) {
  counts[word] = (counts[word] ?? 0) + 1;
}
console.log(counts.constructor, counts.toString); // 2 1  - just data
const plain = {};
console.log(typeof plain.constructor); // "function" - inherited from Object.prototype

=== j56 | M | What is bind()?
**`fn.bind(thisArg, ...args)` returns a new function with `this` permanently set to `thisArg` and, optionally, some leading arguments pre-filled; unlike `call` and `apply`, it does not run the function.**

### Why you need it
Methods lose their `this` when passed around as callbacks: `setTimeout(user.greet, 100)` calls `greet` with no object. `bind` fixes `this` once so the function works wherever it is called from.

### Typical uses
- Passing methods as callbacks or event handlers.
- **Partial application**: `const double = multiply.bind(null, 2)`.
- Older React class components bound handlers in the constructor (`this.handleClick = this.handleClick.bind(this)`).

### Rules
- A bound function's `this` **cannot be changed again**, not even by `call`, `apply` or another `bind`.
- **`new` overrides it**: calling a bound function with `new` ignores the bound `this` (the pre-filled arguments still apply).
- **Arrow functions ignore `bind`'s `this`** because they never have their own.
- Each `bind` call creates a **new function**, so `removeEventListener` must receive the exact same bound reference you added.

### Modern alternatives
- Arrow functions in class fields (`handle = () => {...}`) keep `this` automatically.
- Inline arrows: `setTimeout(() => user.greet(), 100)`.
--- code
const user = {
  name: "Ada",
  greet(greeting = "Hello") {
    return `${greeting}, I'm ${this?.name}`;
  },
};

const lost = user.greet;
console.log(lost()); // Hello, I'm undefined - `this` was lost

const bound = user.greet.bind(user);
console.log(bound()); // Hello, I'm Ada
setTimeout(bound, 0); // safe as a callback

// Partial application: pre-fill arguments
const sayHi = user.greet.bind(user, "Hi");
console.log(sayHi()); // Hi, I'm Ada

function multiply(a, b) {
  return a * b;
}
const triple = multiply.bind(null, 3);
console.log(triple(7)); // 21

// A bound `this` cannot be changed again
const other = { name: "Grace" };
console.log(bound.call(other)); // Hello, I'm Ada

// Each bind creates a new function
console.log(user.greet.bind(user) === user.greet.bind(user)); // false
// -> keep the reference you pass to addEventListener so you can remove it later

=== j57 | M | What is call()?
**`fn.call(thisArg, arg1, arg2, ...)` calls a function immediately with `this` set to `thisArg` and the arguments passed one by one.**

### What it is used for
- **Borrowing methods**: use a method from one object on another, e.g. `Array.prototype.slice.call(arguments)` (historically) or `Object.prototype.toString.call(value)` for precise type checks.
- **Calling a parent constructor** in constructor-function inheritance: `Parent.call(this, name)`.
- **Running a function with a specific context** once, without permanently binding it.

### call vs apply vs bind
- `call(this, a, b)`: run now, arguments listed individually.
- `apply(this, [a, b])`: run now, arguments as an array.
- `bind(this, a, b)`: do not run; return a new function with `this` fixed.

A memory trick: **A**pply takes an **A**rray, **C**all takes **C**ommas.

### Details
- In strict mode `thisArg` is used exactly as given, even `null` or a primitive. In sloppy mode `null`/`undefined` become the global object and primitives are boxed.
- Arrow functions ignore the `thisArg`.
- With spread syntax, `fn.call(ctx, ...args)` covers almost everything `apply` used to be needed for.

### Modern note
Many uses have cleaner alternatives: `Array.from(arguments)` or rest parameters instead of borrowing `slice`, and `super(...)` in classes instead of `Parent.call(this)`.
--- code
"use strict";

function introduce(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

const ada = { name: "Ada" };
const grace = { name: "Grace" };

console.log(introduce.call(ada, "Hello", "!")); // Hello, I'm Ada!
console.log(introduce.call(grace, "Hi", ".")); // Hi, I'm Grace.

// Borrowing a method for a precise type check
const typeOf = (v) => Object.prototype.toString.call(v).slice(8, -1);
console.log(typeOf([]), typeOf(null), typeOf(new Date()), typeOf(/x/)); // Array Null Date RegExp

// Borrowing an array method for an array-like object
const arrayLike = { 0: "a", 1: "b", length: 2 };
console.log(Array.prototype.map.call(arrayLike, (s) => s.toUpperCase())); // ["A", "B"]

// Calling a parent constructor (pre-class inheritance)
function Person(name) {
  this.name = name;
}
function Employee(name, role) {
  Person.call(this, name); // run Person with the new Employee as `this`
  this.role = role;
}
console.log(new Employee("Ada", "engineer")); // Employee { name: "Ada", role: "engineer" }

=== j58 | M | What is apply()?
**`fn.apply(thisArg, argsArray)` calls a function immediately with `this` set to `thisArg` and its arguments taken from an array (or array-like object); it is `call` with an array instead of a list.**

### Classic uses
- **Passing an array as separate arguments** before spread existed: `Math.max.apply(null, numbers)`.
- **Forwarding arguments** in wrappers: `return fn.apply(this, arguments)` keeps both the original `this` and every argument, which is how many debounce, memoize and logging helpers were written.
- **Borrowing methods** for array-like objects.

### apply vs spread
Since ES2015, `Math.max(...numbers)` and `fn.call(ctx, ...args)` replace most uses of `apply` and read better. `apply` is still handy when you have both a context and an existing array or `arguments` object to pass through.

### Limit on argument count
Engines limit how many arguments a single call can receive (often around 65k to a few hundred thousand). `Math.max.apply(null, hugeArray)` or `Math.max(...hugeArray)` can throw a `RangeError` for very large arrays. Use `reduce` or a loop for those.

### Reflect.apply
`Reflect.apply(fn, thisArg, args)` is the same operation as a standalone function. It is safer when `fn` might have its own property called `apply`, and it is commonly used inside Proxy traps.
--- code
const numbers = [5, 1, 9, 3];

console.log(Math.max.apply(null, numbers)); // 9 (classic)
console.log(Math.max(...numbers)); // 9 (modern equivalent)

function describe(city, country) {
  return `${this.name} lives in ${city}, ${country}`;
}
const ada = { name: "Ada" };
console.log(describe.apply(ada, ["London", "UK"])); // Ada lives in London, UK

// Forwarding `this` and all arguments in a wrapper
function logCalls(fn) {
  return function (...args) {
    console.log(`calling ${fn.name} with`, args);
    return fn.apply(this, args);
  };
}
const user = {
  name: "Grace",
  greet: logCalls(function greet(greeting) {
    return `${greeting}, ${this.name}`;
  }),
};
console.log(user.greet("Hello")); // calling greet with ["Hello"] -> Hello, Grace

// Reflect.apply: same operation as a plain function
console.log(Reflect.apply(Math.min, null, numbers)); // 1

// Very large arrays: use reduce instead of spreading/apply
const big = Array.from({ length: 200_000 }, (_, i) => i);
console.log(big.reduce((max, n) => (n > max ? n : max), -Infinity)); // 199999

=== j59 | E | What is a shallow copy?
**A shallow copy creates a new top-level object or array, but nested objects inside it are still shared by reference with the original.**

### Ways to make one
- Arrays: `[...arr]`, `arr.slice()`, `Array.from(arr)`, `arr.concat()`.
- Objects: `{ ...obj }`, `Object.assign({}, obj)`.

### What is copied and what is shared
- **Primitive values** at the top level are copied, so changing `copy.name` does not affect the original.
- **Nested objects and arrays** are references to the same memory, so changing `copy.address.city` also changes `original.address.city`.

### When a shallow copy is enough
- The data is flat (only primitives).
- You only change top-level fields.
- You are doing immutable updates and will also copy each nested level you change (`{ ...state, user: { ...state.user, name } }`). This is exactly how React and Redux updates work and is efficient because unchanged branches are shared.

### What spread does not copy
- The prototype (the copy is a plain object, so class methods are lost).
- Non-enumerable properties and getters as getters (they are evaluated into plain values).
- Symbols are copied by spread and `Object.assign`.

### When you need more
Use a **deep copy** (`structuredClone`) when you plan to mutate nested data freely and need the original to stay untouched.
--- code
const original = {
  name: "Ada",
  tags: ["admin"],
  address: { city: "London" },
};

const copy = { ...original };

copy.name = "Grace"; // top-level primitive: independent
copy.address.city = "Paris"; // nested object: shared!
copy.tags.push("editor"); // nested array: shared!

console.log(original.name); // Ada
console.log(original.address.city); // Paris
console.log(original.tags); // ["admin", "editor"]
console.log(copy.address === original.address); // true

// Correct immutable update: copy each level you change
const updated = { ...original, address: { ...original.address, city: "Rome" } };
console.log(original.address.city, updated.address.city); // Paris Rome

// Arrays behave the same way
const matrix = [[1, 2], [3, 4]];
const rows = [...matrix];
rows[0].push(99);
console.log(matrix[0]); // [1, 2, 99] - inner arrays are shared

// Spread loses the prototype
class Point {
  constructor(x) { this.x = x; }
  move() { return this.x + 1; }
}
const p = { ...new Point(1) };
console.log(p.x, typeof p.move); // 1 "undefined"

=== j60 | M | What is a deep copy?
**A deep copy duplicates an object and everything nested inside it, so the copy shares no references with the original and can be changed freely without side effects.**

### The modern way: `structuredClone`
Available in all modern browsers, Node.js 17+, Deno and Bun.
- Handles nested objects and arrays, `Date`, `Map`, `Set`, `RegExp`, typed arrays, `ArrayBuffer`, `Error`, `Blob` and more.
- Handles **circular references**.
- Does **not** copy functions, DOM nodes or class identity (instances become plain objects). It throws a `DataCloneError` for functions and symbols.

### `JSON.parse(JSON.stringify(obj))`
The old trick. It only works for plain JSON data: it turns dates into strings, drops `undefined` and functions, converts `NaN` to `null`, loses `Map`/`Set`, and throws on circular references.

### Library or custom
Lodash's `cloneDeep` handles more cases (including keeping prototypes). A custom recursive clone gives full control, for example to preserve class instances. Writing one is a common interview exercise (see "Deep clone an object").

### When to deep copy
- Before mutating data you do not own (a cached API response, a config object).
- To snapshot state for undo, history or tests.

### When not to
Deep copying large structures is expensive. For UI state updates, copying only the path you change (structural sharing) is faster and keeps unchanged references stable for memoisation.
--- code
const original = {
  name: "Ada",
  joined: new Date("2024-01-01T00:00:00Z"),
  roles: new Set(["admin"]),
  settings: { theme: "dark", shortcuts: ["ctrl+s"] },
};
original.self = original; // circular reference

const copy = structuredClone(original);
copy.settings.theme = "light";
copy.settings.shortcuts.push("ctrl+z");
copy.roles.add("editor");

console.log(original.settings.theme, original.settings.shortcuts); // dark ["ctrl+s"]
console.log(original.roles.size, copy.roles.size); // 1 2
console.log(copy.joined instanceof Date, copy.self === copy); // true true

// The JSON trick loses information and fails on cycles
const flat = { joined: new Date(0), missing: undefined, nan: NaN };
console.log(JSON.parse(JSON.stringify(flat))); // { joined: "1970-01-01T00:00:00.000Z", nan: null }
try {
  JSON.stringify(original);
} catch (e) {
  console.log(e.name); // TypeError (circular structure)
}

// structuredClone cannot copy functions
try {
  structuredClone({ fn() {} });
} catch (e) {
  console.log(e.name); // DataCloneError
}

=== j61 | E | Difference between find() and filter()?
**`find()` returns the first element that matches (or `undefined`) and stops searching immediately; `filter()` returns a new array of all matching elements (possibly empty) and always checks every element.**

| | `find` | `filter` |
|---|---|---|
| Returns | One element or `undefined` | Array (can be empty) |
| Stops early | Yes, at the first match | No, checks all |
| Use for | Looking up one item by id, name, etc. | Getting every matching item |

### Related methods
- **`findIndex`**: index of the first match, or `-1`.
- **`findLast` / `findLastIndex`** (ES2023): search from the end, handy for "the most recent X".
- **`some`**: just `true`/`false`, stops at the first match.
- **`includes`**: for primitive values (`list.includes("a")`).

### Common mistakes
- Using `filter(...)[0]` to get one item: it works but scans the whole array.
- Forgetting `find` can return `undefined`: use optional chaining (`find(...)?.name`) or handle the "not found" case.
- Checking `if (filter(...))`: an empty array is truthy, so this is always true. Check `.length` or use `some`.

### Lookups in big lists
If you look up by id repeatedly, build a `Map` once (`new Map(items.map(i => [i.id, i]))`) and use `map.get(id)`, which is O(1) instead of O(n) per lookup.
--- code
const users = [
  { id: 1, name: "Ada", role: "admin" },
  { id: 2, name: "Linus", role: "user" },
  { id: 3, name: "Grace", role: "admin" },
];

console.log(users.find((u) => u.role === "admin")); // { id: 1, name: "Ada", role: "admin" }
console.log(users.filter((u) => u.role === "admin").map((u) => u.name)); // ["Ada", "Grace"]

console.log(users.find((u) => u.id === 99)); // undefined
console.log(users.filter((u) => u.id === 99)); // []
console.log(users.find((u) => u.id === 99)?.name ?? "not found"); // not found

// Searching from the end
console.log(users.findLast((u) => u.role === "admin").name); // Grace

// The empty-array trap
if (users.filter((u) => u.role === "owner")) console.log("always runs - [] is truthy");
console.log(users.some((u) => u.role === "owner")); // false - the right check

// Repeated lookups: build a Map once
const byId = new Map(users.map((u) => [u.id, u]));
console.log(byId.get(2).name); // Linus

=== j62 | E | Difference between slice() and splice()?
**`slice(start, end)` returns a copy of part of an array without changing it; `splice(start, deleteCount, ...items)` changes the original array in place by removing and/or inserting items, and returns the removed ones.**

| | `slice` | `splice` |
|---|---|---|
| Mutates original | No | Yes |
| Returns | New array with the selected part | Array of removed items |
| `end` / count | End index (exclusive) | How many items to remove |
| Also on strings | Yes (`"hello".slice(1, 3)`) | No |

### slice details
- Negative indexes count from the end: `arr.slice(-2)` gives the last two items.
- `arr.slice()` with no arguments makes a shallow copy.

### splice details
- Remove: `arr.splice(1, 2)` removes two items starting at index 1.
- Insert: `arr.splice(1, 0, "x")` inserts without removing.
- Replace: `arr.splice(1, 1, "x")` swaps one item.

### Immutable alternative: `toSpliced` (ES2023)
`arr.toSpliced(1, 1, "x")` does what `splice` does but returns a new array and leaves the original alone. This is what you want for React state, where mutating with `splice` would not trigger a re-render.

### Memory trick
s**p**lice = changes in **p**lace.
--- code
const letters = ["a", "b", "c", "d", "e"];

// slice: copy part of the array, original unchanged
console.log(letters.slice(1, 3)); // ["b", "c"]
console.log(letters.slice(-2)); // ["d", "e"]
console.log(letters); // ["a", "b", "c", "d", "e"]

// splice: modifies in place, returns removed items
const removed = letters.splice(1, 2); // remove 2 items at index 1
console.log(removed, letters); // ["b", "c"] ["a", "d", "e"]

letters.splice(1, 0, "x", "y"); // insert without removing
console.log(letters); // ["a", "x", "y", "d", "e"]

letters.splice(-1, 1, "z"); // replace the last item
console.log(letters); // ["a", "x", "y", "d", "z"]

// Immutable splice for state updates
const todos = ["write", "test", "ship"];
const withoutTest = todos.toSpliced(1, 1);
console.log(withoutTest, todos); // ["write", "ship"] ["write", "test", "ship"]

// slice works on strings too
console.log("JavaScript".slice(0, 4)); // Java

=== j63 | E | Difference between push() and unshift()?
**`push()` adds items to the end of an array and `unshift()` adds them to the beginning; both mutate the array and return its new length, but `unshift` is slower on large arrays because every existing element must move.**

### The four "stack and queue" methods
| Method | Where | Action | Returns |
|---|---|---|---|
| `push(...items)` | End | Add | New length |
| `pop()` | End | Remove | Removed item |
| `unshift(...items)` | Start | Add | New length |
| `shift()` | Start | Remove | Removed item |

### Performance
- `push` and `pop` are O(1) (amortised): nothing else moves.
- `unshift` and `shift` are O(n): every element is re-indexed. On arrays with thousands of items in a hot loop this adds up. For queues with heavy use, consider a dedicated queue structure (a linked list or a circular buffer), or push and read with an index pointer.

### Return values trip people up
Both return the **new length**, not the array. `const arr2 = arr.push(4)` gives a number.

### Immutable versions
For state updates use spread: `[...list, item]` (append) or `[item, ...list]` (prepend).

### Data structure use
- `push` + `pop` = **stack** (last in, first out), e.g. undo history.
- `push` + `shift` = **queue** (first in, first out), e.g. a task list.
--- code
const queue = ["b", "c"];

console.log(queue.push("d")); // 3 - returns the new length
console.log(queue.unshift("a")); // 4
console.log(queue); // ["a", "b", "c", "d"]

console.log(queue.pop(), queue.shift(), queue); // "d" "a" ["b", "c"]

// Immutable versions for state
const list = [2, 3];
console.log([...list, 4], [1, ...list], list); // [2, 3, 4] [1, 2, 3] [2, 3]

// Stack (undo history)
const undoStack = [];
undoStack.push("type A");
undoStack.push("type B");
console.log("undo:", undoStack.pop()); // undo: type B

// Performance difference on a large array
const big = Array.from({ length: 50_000 }, (_, i) => i);
let t = performance.now();
for (let i = 0; i < 1_000; i++) big.push(i);
const pushMs = performance.now() - t;
t = performance.now();
for (let i = 0; i < 1_000; i++) big.unshift(i);
const unshiftMs = performance.now() - t;
console.log(`unshift slower than push: ${unshiftMs > pushMs}`); // unshift slower than push: true

=== j64 | E | What is includes()?
**`includes(value, fromIndex?)` returns `true` if an array (or string) contains the given value and `false` otherwise; it is the readable, modern replacement for `indexOf(value) !== -1`.**

### How it compares values
Arrays use the **SameValueZero** algorithm: like `===`, except that `NaN` equals `NaN`. So `[NaN].includes(NaN)` is `true`, while `[NaN].indexOf(NaN)` is `-1`.

### Strings
`"hello world".includes("world")` checks for a substring and is **case-sensitive**. Lower-case both sides for case-insensitive search.

### Objects are compared by reference
`[{ id: 1 }].includes({ id: 1 })` is `false`, because the literal creates a different object. To check by content use `some`: `list.some(item => item.id === 1)`.

### Use cases
- Allow-lists: `["admin", "editor"].includes(user.role)`.
- Replacing long `||` chains: `["png", "jpg", "webp"].includes(ext)`.
- Simple search in strings.

### Performance
`includes` is a linear scan (O(n)). For many lookups against a large list, build a `Set` once and use `set.has(value)`, which is O(1).

### fromIndex
Starts searching at that index; negative values count from the end.
--- code
const roles = ["admin", "editor", "viewer"];
console.log(roles.includes("editor")); // true
console.log(roles.includes("Editor")); // false - case-sensitive

// Clean allow-list check
const canEdit = (role) => ["admin", "editor"].includes(role);
console.log(canEdit("viewer"), canEdit("admin")); // false true

// NaN: includes finds it, indexOf does not
console.log([1, NaN].includes(NaN), [1, NaN].indexOf(NaN)); // true -1

// Objects are compared by reference
const items = [{ id: 1 }, { id: 2 }];
console.log(items.includes({ id: 1 })); // false
console.log(items.some((i) => i.id === 1)); // true

// Strings
const title = "Learning JavaScript in 2026";
console.log(title.includes("Script"), title.toLowerCase().includes("javascript")); // true true

// Many lookups: use a Set
const blocked = new Set(["spam.com", "bad.io"]);
const emails = ["a@ok.com", "b@spam.com"];
console.log(emails.filter((e) => !blocked.has(e.split("@")[1]))); // ["a@ok.com"]

=== j65 | E | What is indexOf()?
**`indexOf(value, fromIndex?)` returns the first index where a value appears in an array or string, or `-1` if it is not found; `lastIndexOf` searches from the end.**

### How it compares
Arrays use **strict equality (`===`)**. That means:
- Objects are matched only if it is the exact same reference.
- `NaN` is never found, because `NaN !== NaN`.

### When to use it
- When you actually need the **position**: to remove an item with `splice`, insert next to it, or find a substring's start.
- Strings: `"hello".indexOf("l")` is `2`.

### When to use something else
- **Just checking existence**: `includes` reads better and handles `NaN`.
- **Matching by a condition** (objects, partial matches): `findIndex(item => item.id === 3)`.
- **Searching from the end by condition**: `findLastIndex`.

### Common bug
`if (list.indexOf(x))` is wrong: index `0` is falsy (so a match at the start looks like "not found"), and `-1` is truthy. Always compare with `-1`, or use `includes`.

### Removing duplicates
`list.filter((x, i) => list.indexOf(x) === i)` keeps only the first occurrence of each value. It is O(n²), so for large arrays `[...new Set(list)]` is far faster.
--- code
const colors = ["red", "green", "blue", "green"];

console.log(colors.indexOf("green")); // 1
console.log(colors.lastIndexOf("green")); // 3
console.log(colors.indexOf("purple")); // -1
console.log(colors.indexOf("green", 2)); // 3 (search starts at index 2)

// The classic bug: index 0 is falsy
if (colors.indexOf("red")) console.log("never logged even though red is there");
if (colors.indexOf("red") !== -1) console.log("red found at index 0");

// Remove a specific item by position
const tags = ["js", "css", "html"];
const i = tags.indexOf("css");
if (i !== -1) tags.splice(i, 1);
console.log(tags); // ["js", "html"]

// Objects need findIndex
const users = [{ id: 1 }, { id: 2 }];
console.log(users.indexOf({ id: 2 }), users.findIndex((u) => u.id === 2)); // -1 1

// Strings
console.log("hello world".indexOf("o"), "hello world".lastIndexOf("o")); // 4 7

=== j66 | M | What is flat()?
**`flat(depth = 1)` returns a new array with nested arrays flattened into it up to the given depth; `flat(Infinity)` flattens completely, and `flatMap` maps and flattens one level in a single step.**

### Behaviour
- Default depth is **1**: only one level of nesting is removed.
- `flat(2)`, `flat(3)`... for deeper levels; `flat(Infinity)` for any depth.
- **Empty slots are removed** from sparse arrays.
- Returns a new array; the original is untouched.
- Only arrays are flattened; other iterables (Sets, strings) stay as single elements.

### flatMap
`arr.flatMap(fn)` is the same as `arr.map(fn).flat()` but more efficient. It is very handy when each item should produce **zero, one or many** results:
- Return `[]` to drop an item (filter and map in one pass).
- Return `[a, b]` to expand one item into several.

### Use cases
- Combining results from several requests: `pages.flatMap(p => p.items)`.
- Expanding nested data like categories and their products.
- Turning a tree of menu items into a flat list (with recursion, or `flat(Infinity)` for plain nested arrays).

### Interview angle
You may be asked to implement flattening without `flat`: recursion with `reduce`, or an iterative version using a stack (see "Flatten a nested array").
--- code
const nested = [1, [2, [3, [4, [5]]]]];

console.log(nested.flat()); // [1, 2, [3, [4, [5]]]]
console.log(nested.flat(2)); // [1, 2, 3, [4, [5]]]
console.log(nested.flat(Infinity)); // [1, 2, 3, 4, 5]

console.log([1, , 3, [4, , 6]].flat()); // [1, 3, 4, 6] - holes removed

// flatMap: map + flatten one level
const orders = [
  { id: 1, items: ["pen", "book"] },
  { id: 2, items: [] },
  { id: 3, items: ["lamp"] },
];
console.log(orders.flatMap((o) => o.items)); // ["pen", "book", "lamp"]

// flatMap as filter + map in one pass
const nums = [1, 2, 3, 4, 5, 6];
console.log(nums.flatMap((n) => (n % 2 === 0 ? [n * 10] : []))); // [20, 40, 60]

// Expand one item into several
const sentences = ["hello world", "flat map"];
console.log(sentences.flatMap((s) => s.split(" "))); // ["hello", "world", "flat", "map"]

=== j67 | M | What is sort()?
**`sort(compareFn?)` sorts an array in place and returns the same array; without a compare function it converts items to strings and sorts them by UTF-16 code units, which gives wrong results for numbers.**

### The default-sort trap
`[10, 9, 1, 100].sort()` gives `[1, 10, 100, 9]` because `"10" < "9"` as strings. Always pass a compare function for numbers.

### Compare functions
`(a, b) => result`:
- negative: `a` comes first
- positive: `b` comes first
- `0`: keep their relative order

Patterns:
- Numbers ascending: `(a, b) => a - b`; descending: `(a, b) => b - a`.
- Strings, human-friendly: `(a, b) => a.localeCompare(b)`, which handles accents and case. Pass options like `{ numeric: true }` to sort "file2" before "file10".
- By several keys: compare the first key, and fall back to the next when it is `0` (`a.last.localeCompare(b.last) || a.age - b.age`).

### Stability
Since ES2019, `sort` is **stable**: items that compare equal keep their original order. That makes multi-pass sorting reliable.

### Mutation
`sort` changes the original array, which causes bugs with React state or shared data. Use **`toSorted(compareFn)`** (ES2023) to get a sorted copy, or `[...arr].sort(...)`.

### Performance
Engines use TimSort, O(n log n). For huge data or heavy compare functions, pre-compute sort keys once.
--- code
const nums = [10, 9, 1, 100, 25];
console.log([...nums].sort()); // [1, 10, 100, 25, 9]  <- string order!
console.log([...nums].sort((a, b) => a - b)); // [1, 9, 10, 25, 100]
console.log(nums.toSorted((a, b) => b - a), nums); // sorted copy, original untouched

// Human-friendly string sorting
const files = ["file10.txt", "File2.txt", "file1.txt", "éclair.txt"];
console.log(files.toSorted((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })));
// ["éclair.txt", "file1.txt", "File2.txt", "file10.txt"]

// Multi-key sort: by role, then by age (stable sort keeps ties in order)
const people = [
  { name: "Ada", role: "dev", age: 36 },
  { name: "Linus", role: "admin", age: 28 },
  { name: "Grace", role: "dev", age: 30 },
];
const sorted = people.toSorted((a, b) => a.role.localeCompare(b.role) || a.age - b.age);
console.log(sorted.map((p) => `${p.role}:${p.name}`)); // ["admin:Linus", "dev:Grace", "dev:Ada"]

// sort returns the SAME array (mutation)
const arr = [3, 1, 2];
console.log(arr.sort() === arr); // true

=== j68 | E | What is reverse()?
**`reverse()` reverses the order of an array's elements in place and returns that same array; use `toReversed()` (ES2023) when you need a reversed copy instead.**

### Mutation is the main gotcha
Because `reverse` changes the original, calling it on React state, props, a shared module-level array, or the result of a function you do not own causes subtle bugs. Typical example: reversing a list for display also flips the data used elsewhere.

### Non-mutating options
- `arr.toReversed()`: modern and explicit.
- `[...arr].reverse()`: works everywhere.
- `arr.slice().reverse()`: the older idiom.

### Reversing strings
Strings have no `reverse` method. The common approach is `[...str].reverse().join("")`. Use spread rather than `split("")`, because spread splits by code points and keeps emoji and other astral characters intact. (For complex grapheme clusters such as flags or family emoji, use `Intl.Segmenter`.)

### Iterating backwards without copying
If you only need to loop in reverse, a classic `for (let i = arr.length - 1; i >= 0; i--)` avoids creating a new array. `findLast`/`findLastIndex` search from the end directly.

### Return value
`reverse` returns the same array reference (useful for chaining, dangerous if you assumed a copy).
--- code
const steps = ["plan", "build", "test", "ship"];

const reversedCopy = steps.toReversed();
console.log(reversedCopy, steps); // ["ship", "test", "build", "plan"] ["plan", "build", "test", "ship"]

const same = steps.reverse(); // mutates!
console.log(same === steps, steps); // true ["ship", "test", "build", "plan"]

// Reversing strings safely
const reverseString = (s) => [...s].reverse().join("");
console.log(reverseString("hello")); // olleh
console.log("hi👋".split("").reverse().join("") === "👋ih"); // false - split breaks the emoji
console.log(reverseString("hi👋")); // 👋ih

// Grapheme-aware reverse for complex emoji
const reverseGraphemes = (s) =>
  [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].map((x) => x.segment).reverse().join("");
console.log(reverseGraphemes("a👨‍👩‍👧b")); // b👨‍👩‍👧a

// Loop backwards without copying
for (let i = reversedCopy.length - 1; i >= 0; i--) console.log(i, reversedCopy[i]);

=== j69 | E | What is every()?
**`every(predicate)` returns `true` if the callback returns a truthy value for every element, and stops at the first element that fails; it returns `true` for an empty array.**

### Typical uses
- Validation: `fields.every(f => f.value.trim() !== "")` to enable a submit button.
- Permission checks: `requiredRoles.every(r => user.roles.includes(r))`.
- Type checks: `values.every(Number.isFinite)`.
- "All selected?" checkbox logic.

### Short-circuiting
It stops as soon as one element fails, so it is efficient even on large arrays when a failure appears early.

### The empty array case
`[].every(anything)` is `true`. This is called **vacuous truth**: there is no element that fails. It is logically correct but can surprise you; for example "all items are paid" is `true` for an empty cart. Add an explicit length check when "empty" should mean "no".

### every vs some
- `every`: all must pass (logical AND).
- `some`: at least one must pass (logical OR).
- `!list.some(x => bad(x))` is the same as `list.every(x => !bad(x))`.

### TypeScript tip
`every` accepts a type predicate, so `values.every((v): v is string => typeof v === "string")` narrows `values` to `string[]` inside the `if`.
--- code
const form = [
  { name: "email", value: "ada@example.com" },
  { name: "password", value: "hunter22" },
  { name: "nickname", value: "  " },
];

const isComplete = form.every((f) => f.value.trim() !== "");
console.log(isComplete); // false (stops at "nickname")

const scores = [72, 88, 95];
console.log(scores.every((s) => s >= 70)); // true
console.log(["1", 2, 3].every((v) => typeof v === "number")); // false

// Required permissions
const user = { roles: ["editor", "reviewer", "viewer"] };
const canPublish = ["editor", "reviewer"].every((r) => user.roles.includes(r));
console.log(canPublish); // true

// Vacuous truth: empty arrays pass
const cart = [];
console.log(cart.every((item) => item.paid)); // true
console.log(cart.length > 0 && cart.every((item) => item.paid)); // false - usually what you mean

// Short-circuit in action
let checked = 0;
[1, 2, -3, 4, 5].every((n) => (checked++, n > 0));
console.log("checked", checked, "items"); // checked 3 items

=== j70 | E | What is some()?
**`some(predicate)` returns `true` if the callback returns a truthy value for at least one element, stopping at the first match; it returns `false` for an empty array.**

### Typical uses
- "Is there any error?": `fields.some(f => f.error)`.
- Permission checks where any role is enough: `["admin", "owner"].some(r => user.roles.includes(r))`.
- Checking if a list contains an object matching a condition (where `includes` cannot help, because objects are compared by reference).
- "Has the user changed anything?" by comparing fields.

### Short-circuiting
`some` stops at the first truthy result, which makes it efficient. Use it instead of `filter(...).length > 0`, which walks the whole array and allocates a new one.

### some vs find vs includes
- `some`: you only need **yes or no**, with a condition.
- `find`: you need the **matching item** itself.
- `includes`: you are checking for an exact **primitive value**.

### Empty arrays
`[].some(anything)` is `false`: there is no element that matches.

### Logical relationship with every
`list.some(fn)` is equivalent to `!list.every(x => !fn(x))`.
--- code
const fields = [
  { name: "email", error: null },
  { name: "password", error: "Too short" },
  { name: "name", error: null },
];

console.log(fields.some((f) => f.error)); // true - at least one error

const user = { roles: ["viewer", "owner"] };
const isPrivileged = ["admin", "owner"].some((r) => user.roles.includes(r));
console.log(isPrivileged); // true

// Objects: includes can't match by content, some can
const cart = [{ sku: "A1" }, { sku: "B2" }];
console.log(cart.includes({ sku: "B2" }), cart.some((i) => i.sku === "B2")); // false true

// Prefer some over filter(...).length
const big = Array.from({ length: 100_000 }, (_, i) => i);
let visited = 0;
const hasBig = big.some((n) => (visited++, n > 10));
console.log(hasBig, "visited only", visited); // true visited only 12

console.log([].some(Boolean)); // false - nothing matches in an empty array

=== j71 | E | What is a Promise?
**A Promise is an object representing a value that will be available later: the eventual success or failure of an asynchronous operation; you attach handlers with `.then`, `.catch` and `.finally`, or wait for it with `await`.**

### Why promises exist
They replaced deeply nested callbacks with a chainable, composable model where errors flow to a single handler, and they are the foundation of `async/await`.

### Creating one
`new Promise((resolve, reject) => { ... })` runs the executor immediately. Call `resolve(value)` on success or `reject(error)` on failure. In practice you mostly **consume** promises returned by APIs like `fetch` rather than creating them. Shortcuts: `Promise.resolve(value)`, `Promise.reject(error)`, and `Promise.withResolvers()` (ES2024), which returns `{ promise, resolve, reject }` for cases where you resolve from outside.

### Consuming
- `.then(onSuccess)` returns a **new** promise, which enables chaining.
- `.catch(onError)` handles any rejection earlier in the chain.
- `.finally(fn)` runs either way, for cleanup like hiding a spinner.
- `await promise` inside an `async` function.

### Key properties
- A promise settles **once**; later `resolve`/`reject` calls are ignored.
- Handlers always run **asynchronously**, as microtasks, even if the promise is already resolved.
- Unhandled rejections produce warnings (and can crash Node.js), so always handle errors.

### Combinators
`Promise.all`, `allSettled`, `race` and `any` run several promises together.
--- code
function delay(ms, value, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (shouldFail ? reject(new Error(`Failed: ${value}`)) : resolve(value)), ms);
  });
}

delay(20, "data")
  .then((v) => v.toUpperCase())
  .then((v) => console.log("then:", v)) // then: DATA
  .catch((e) => console.log("caught:", e.message))
  .finally(() => console.log("finally: cleanup"));

// Same thing with async/await
try {
  const v = await delay(10, "with await");
  console.log(v);
  await delay(10, "boom", true);
} catch (e) {
  console.log("caught:", e.message); // caught: Failed: boom
}

// Handlers are always async (microtasks), even for resolved promises
Promise.resolve("already done").then((v) => console.log("2.", v));
console.log("1. this logs first");

// Resolve from outside with Promise.withResolvers (ES2024)
const { promise, resolve } = Promise.withResolvers();
setTimeout(() => resolve("resolved externally"), 10);
console.log(await promise);

=== j72 | M | What are the states of a Promise?
**A promise is always in one of three states: pending (not finished yet), fulfilled (finished with a value) or rejected (finished with a reason, usually an `Error`); once it leaves pending it is settled and can never change again.**

### The states
- **Pending**: the initial state. The operation is still running.
- **Fulfilled**: `resolve(value)` was called with a non-promise value. `.then` handlers receive the value.
- **Rejected**: `reject(reason)` was called or the executor threw. `.catch` handlers receive the reason.

"Settled" is the umbrella term for fulfilled or rejected.

### Resolved is not the same as fulfilled
Calling `resolve(anotherPromise)` makes the promise **follow** the other one. It is "resolved" (locked in) but still pending until that other promise settles, and it may end up rejected. That is also why returning a promise from `.then` waits for it.

### Immutability of the outcome
- Only the first `resolve` or `reject` counts; the rest are ignored.
- Handlers added after settlement still run, receiving the stored value.

### Inspecting the state
There is no public `promise.state` property. In tests or debugging you can use `Promise.race` with a sentinel value, or the browser and Node consoles show `<pending>`, `<fulfilled>` or `<rejected>` when you log a promise.

### Why it matters
It explains why a promise can safely be shared and awaited from multiple places: everyone receives the same final result.
--- code
const pendingForever = new Promise(() => {});
const fulfilled = Promise.resolve(42);
const rejected = Promise.reject(new Error("nope"));
rejected.catch(() => {}); // handle it so it isn't reported as unhandled

// Peek at the state with a race against a sentinel (handy in tests)
async function stateOf(p) {
  const pending = Symbol("pending");
  try {
    return (await Promise.race([p, Promise.resolve(pending)])) === pending ? "pending" : "fulfilled";
  } catch {
    return "rejected";
  }
}
console.log(await stateOf(pendingForever), await stateOf(fulfilled), await stateOf(rejected));
// pending fulfilled rejected

// Settles only once
const once = new Promise((resolve, reject) => {
  resolve("first");
  resolve("second"); // ignored
  reject(new Error("too late")); // ignored
});
console.log(await once); // first

// "Resolved" with a promise -> follows it, and can still end up rejected
const follower = new Promise((resolve) => resolve(Promise.reject(new Error("inner failure"))));
try {
  await follower;
} catch (e) {
  console.log("follower rejected:", e.message); // follower rejected: inner failure
}

// Late handlers still receive the stored value
setTimeout(() => fulfilled.then((v) => console.log("late handler got", v)), 10);
await new Promise((r) => setTimeout(r, 20));

=== j73 | E | What is async/await?
**`async`/`await` is syntax for working with promises that reads like synchronous code: an `async` function always returns a promise, and `await` pauses that function until a promise settles, giving you its value or throwing its error.**

### How it works
- `async function f() { return 1; }` returns `Promise<1>`.
- `await somePromise` suspends the function (not the whole program). The rest of the function continues as a microtask once the promise settles.
- A rejected promise makes `await` **throw**, so you handle errors with ordinary `try/catch`.
- `await` works with any "thenable" and with plain values (which are wrapped).

### Where you can use `await`
- Inside `async` functions (including arrow functions and class methods).
- At the **top level of ES modules** (top-level await), e.g. to load config before exporting.

### Sequential vs parallel
A common performance bug is awaiting independent operations one after another:
- **Sequential**: `const a = await getA(); const b = await getB();` takes the sum of both times.
- **Parallel**: `const [a, b] = await Promise.all([getA(), getB()]);` takes the time of the slowest.
Await in sequence only when the second call depends on the first.

### Pitfalls
- Forgetting `await` gives you a pending promise instead of the value.
- `forEach(async ...)` does not wait. Use `for...of` or `Promise.all`.
- Errors thrown after an `await` are rejections of the returned promise; the caller must handle them.
--- code
const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

async function getUser(id) {
  await wait(30);
  return { id, name: "Ada" }; // becomes the promise's value
}
async function getPosts(userId) {
  await wait(30);
  return [`post by ${userId}`];
}

console.log(getUser(1) instanceof Promise); // true - async functions return promises

// Sequential: second call depends on the first
const user = await getUser(1);
const posts = await getPosts(user.id);
console.log(user.name, posts); // Ada ["post by 1"]

// Parallel: independent calls
let t = Date.now();
await getUser(1);
await getPosts(1);
const sequentialMs = Date.now() - t;

t = Date.now();
await Promise.all([getUser(1), getPosts(1)]);
const parallelMs = Date.now() - t;
console.log(`parallel is faster: ${parallelMs < sequentialMs}`); // parallel is faster: true

// Forgetting await
const notAwaited = getUser(2);
console.log(notAwaited.name); // undefined - it's a Promise
console.log((await notAwaited).name); // Ada

=== j74 | M | How to handle errors in async/await?
**Wrap awaited calls in `try/catch` (with `finally` for cleanup); a rejected promise makes `await` throw, so you handle async errors exactly like synchronous ones, and any error you do not catch rejects the async function's own promise.**

### Patterns
- **`try/catch/finally`** around one or more awaits. Use `finally` for cleanup (hide a loading spinner, release a lock).
- **Catch at the right level**: handle errors where you can do something useful (show a message, retry, fall back). Otherwise let them propagate to a central handler.
- **`.catch` on a single call** for a quick fallback: `const data = await load().catch(() => defaultData);`
- **Check `response.ok` with fetch**: `fetch` only rejects on network failure, not on HTTP 404 or 500. Throw yourself when `!response.ok`.
- **`Promise.allSettled`** when several operations run together and you want every result, including failures.
- **Error causes** (ES2022): `throw new Error("Failed to load profile", { cause: err })` adds context without losing the original error.
- **Custom error classes** (`class HttpError extends Error`) so callers can branch with `instanceof`.

### Things that are not caught
- Promises you did not `await` (fire-and-forget). Their rejection escapes the `try`. Either await them or attach `.catch`.
- Errors inside callbacks that run later (e.g. inside `setTimeout`).

### Last line of defence
Browsers fire `unhandledrejection`; Node has `process.on("unhandledRejection")`. Log there, but do not rely on it for normal flow.
--- code
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// Simulated fetch that can fail at the HTTP level
async function fakeFetch(url) {
  await new Promise((r) => setTimeout(r, 10));
  if (url.includes("missing")) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => ({ name: "Ada" }) };
}

async function loadProfile(url) {
  const res = await fakeFetch(url);
  if (!res.ok) throw new HttpError(res.status, `Request failed: ${res.status}`);
  return res.json();
}

async function showProfile(url) {
  let loading = true;
  try {
    const profile = await loadProfile(url);
    return `Hello ${profile.name}`;
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return "Profile not found";
    throw new Error("Could not show profile", { cause: err }); // add context, keep the original
  } finally {
    loading = false; // always runs
    console.log("loading:", loading);
  }
}

console.log(await showProfile("/api/me")); // Hello Ada
console.log(await showProfile("/api/missing")); // Profile not found

// Quick fallback for a single call
const settings = await loadProfile("/api/missing").catch(() => ({ name: "Guest" }));
console.log(settings.name); // Guest

=== j75 | M | What is Promise.all()?
**`Promise.all(iterable)` runs promises concurrently and returns a single promise that fulfills with an array of all results (in the original order) once every one succeeds, or rejects immediately with the first error.**

### Behaviour
- **Order is preserved**: results match the input order, not the order they finished.
- **Fail-fast**: as soon as one promise rejects, the combined promise rejects with that reason. The other operations keep running in the background (promises cannot be cancelled), but their results are ignored.
- Non-promise values in the array are treated as already fulfilled.
- An empty array fulfills immediately with `[]`.

### When to use it
When you need **all** results and the operations are independent: loading a page's user, settings and notifications at once; uploading several files; fetching several pages of data.

### Related combinators
- **`Promise.allSettled`**: wait for all and get each outcome, success or failure. Use when partial success is fine.
- **`Promise.race`**: settles with the first promise to settle (success or failure). Good for timeouts.
- **`Promise.any`**: fulfills with the first **success**; rejects with an `AggregateError` only if all fail.

### Watch out for
- **Too much concurrency**: `Promise.all(10_000 requests)` fires everything at once. Batch the work or use a concurrency limit.
- **Cancellation**: pair it with an `AbortController` if you want the other requests to stop when one fails.
--- code
const task = (name, ms, fail = false) =>
  new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error(`${name} failed`)) : resolve(name)), ms));

// All succeed: results come back in input order, not finish order
const t = Date.now();
const results = await Promise.all([task("user", 60), task("settings", 20), task("notifications", 40)]);
console.log(results); // ["user", "settings", "notifications"]
console.log(`took about the slowest one, not the sum: ${Date.now() - t < 100}`); // true

// Fail-fast: rejects with the first error
try {
  await Promise.all([task("a", 50), task("b", 10, true), task("c", 30)]);
} catch (e) {
  console.log(e.message); // b failed
}

// Non-promise values are allowed
console.log(await Promise.all([1, Promise.resolve(2), task("three", 5)])); // [1, 2, "three"]

// Limit concurrency by processing in batches
async function inBatches(items, size, worker) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(worker))));
  }
  return out;
}
console.log(await inBatches([1, 2, 3, 4, 5], 2, async (n) => n * n)); // [1, 4, 9, 16, 25]
