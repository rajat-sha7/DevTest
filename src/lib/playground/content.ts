import type { TestCase } from "./runner";

export type Mode = "js" | "ts" | "web";
export type FileKey = "js" | "ts" | "html" | "css" | "wjs";

export interface Buffers {
  js: string;
  ts: string;
  html: string;
  css: string;
  wjs: string;
}

export const DEFAULT_JS = `// Press Run (or Cmd/Ctrl + Enter) to execute

function greet(name) {
  return "Hello, " + name + "! Ready to ace the interview?";
}

console.log(greet("Developer"));
console.table([
  { topic: "Closures", done: true },
  { topic: "Promises", done: false },
]);
`;

export const DEFAULT_TS = `// TypeScript: types are stripped, then the code runs

interface Question {
  id: number;
  title: string;
  level: "easy" | "medium" | "hard";
}

const questions: Question[] = [
  { id: 1, title: "What is a closure?", level: "easy" },
  { id: 2, title: "Explain the event loop", level: "medium" },
];

function titles(list: Question[]): string[] {
  return list.map((q) => q.title);
}

console.log(titles(questions));
`;

export const DEFAULT_HTML = `<div class="card">
  <h1>Hello, preview!</h1>
  <p>Edit the HTML, CSS and JS. It updates live.</p>
  <button id="btn">Clicked 0 times</button>
</div>
`;

export const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  background: #fff8ec;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}
.card {
  background: white;
  border: 2px solid #0b1020;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 6px 6px 0 #0b1020;
  text-align: center;
}
button {
  margin-top: 8px;
  padding: 10px 18px;
  font-weight: 700;
  background: #ffd84d;
  border: 2px solid #0b1020;
  border-radius: 10px;
  cursor: pointer;
}
button:active { transform: translateY(2px); }
`;

export const DEFAULT_WJS = `let n = 0;
const btn = document.getElementById("btn");

btn.addEventListener("click", () => {
  n++;
  btn.textContent = "Clicked " + n + (n === 1 ? " time" : " times");
  console.log("count is now", n);
});
`;

export const DEFAULT_BUFFERS: Buffers = {
  js: DEFAULT_JS,
  ts: DEFAULT_TS,
  html: DEFAULT_HTML,
  css: DEFAULT_CSS,
  wjs: DEFAULT_WJS,
};

/* ------------------------------ examples ------------------------------ */

export const JS_EXAMPLES: { name: string; code: string }[] = [
  {
    name: "Closures",
    code: `// A closure remembers the variables around it
function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const a = makeCounter();
const b = makeCounter();

console.log(a(), a(), a()); // 1 2 3
console.log(b());           // 1 - separate scope
`,
  },
  {
    name: "Event loop",
    code: `// Predict the order before you run it
console.log("1. sync start");

setTimeout(() => console.log("4. timeout (macrotask)"), 0);

Promise.resolve().then(() => console.log("3. promise (microtask)"));

console.log("2. sync end");
`,
  },
  {
    name: "Async / await",
    code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchUser(id) {
  await sleep(300);
  return { id, name: "User " + id };
}

console.time("all three");
const users = await Promise.all([fetchUser(1), fetchUser(2), fetchUser(3)]);
console.timeEnd("all three"); // ~300ms, not 900
console.table(users);
`,
  },
  {
    name: "Array methods",
    code: `const people = [
  { name: "Ada", age: 36 },
  { name: "Linus", age: 28 },
  { name: "Grace", age: 45 },
];

console.table(people);
console.log(people.map((p) => p.name));
console.log(people.filter((p) => p.age > 30).length + " people over 30");
console.log("total age:", people.reduce((s, p) => s + p.age, 0));
`,
  },
  {
    name: "Debounce",
    code: `function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const search = debounce((q) => console.log("searching for", q), 100);

search("r");
search("re");
search("rea");
search("react"); // only this one fires
`,
  },
  {
    name: "Prototypes",
    code: `function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return this.name + " makes a sound";
};

const dog = new Animal("Rex");

console.log(dog.speak());
console.log(Object.getPrototypeOf(dog) === Animal.prototype);
console.log(dog.hasOwnProperty("speak"));
console.log(dog);
`,
  },
  {
    name: "Maps & Sets",
    code: `const seen = new Set([1, 2, 2, 3, 3, 3]);
console.log(seen);

const scores = new Map();
scores.set("ada", 10).set("linus", 7);
console.log(scores);

console.group("details");
console.log("unique count:", seen.size);
console.log("ada's score:", scores.get("ada"));
console.groupEnd();
`,
  },
  {
    name: "Error handling",
    code: `function parse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn("could not parse:", e.message);
    return null;
  }
}

console.log(parse('{"ok": true}'));
console.log(parse("{oops"));

// Uncomment to see an error with its line highlighted:
// null.boom();
`,
  },
];

export const TS_EXAMPLES: { name: string; code: string }[] = [
  {
    name: "Generics",
    code: `function first<T>(list: T[]): T | undefined {
  return list[0];
}

const n = first([10, 20, 30]);   // number | undefined
const s = first(["a", "b"]);     // string | undefined

console.log(n, s);

class Stack<T> {
  private items: T[] = [];
  push(x: T) { this.items.push(x); }
  pop(): T | undefined { return this.items.pop(); }
}

const st = new Stack<number>();
st.push(1);
st.push(2);
console.log(st.pop(), st.pop(), st.pop());
`,
  },
  {
    name: "Narrowing",
    code: `type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.r ** 2;
    case "square":
      return s.side ** 2;
  }
}

console.log(area({ kind: "circle", r: 2 }).toFixed(2));
console.log(area({ kind: "square", side: 3 }));
`,
  },
  {
    name: "Utility types",
    code: `interface User {
  id: number;
  name: string;
  email: string;
}

// Partial: every field optional
function update(u: User, patch: Partial<User>): User {
  return { ...u, ...patch };
}

// Pick: only some fields
type Preview = Pick<User, "id" | "name">;

const u: User = { id: 1, name: "Ada", email: "ada@example.com" };
const preview: Preview = { id: u.id, name: u.name };

console.log(update(u, { name: "Ada Lovelace" }));
console.log(preview);
`,
  },
];

export const WEB_EXAMPLES: { name: string; html: string; css: string; js: string }[] = [
  {
    name: "Counter",
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    js: DEFAULT_WJS,
  },
  {
    name: "Todo list",
    html: `<div class="app">
  <h1>Todos</h1>
  <form id="form">
    <input id="input" placeholder="Add a task..." autocomplete="off" />
    <button>Add</button>
  </form>
  <ul id="list"></ul>
</div>
`,
    css: `body { font-family: system-ui, sans-serif; background: #fff8ec; margin: 0; padding: 32px 16px; }
.app { max-width: 380px; margin: 0 auto; }
h1 { margin: 0 0 16px; }
form { display: flex; gap: 8px; }
input { flex: 1; padding: 10px 12px; border: 2px solid #0b1020; border-radius: 10px; font-size: 15px; }
button { padding: 10px 16px; font-weight: 700; background: #ffd84d; border: 2px solid #0b1020; border-radius: 10px; cursor: pointer; }
ul { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 8px; }
li { display: flex; justify-content: space-between; align-items: center; background: white;
     border: 2px solid #0b1020; border-radius: 10px; padding: 10px 12px; box-shadow: 3px 3px 0 #0b1020; }
li.done span { text-decoration: line-through; opacity: .5; }
li button { padding: 2px 8px; background: #ff7ab8; }
`,
    js: `const form = document.getElementById("form");
const input = document.getElementById("input");
const list = document.getElementById("list");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement("li");
  li.innerHTML = "<span></span><button>x</button>";
  li.querySelector("span").textContent = text;
  li.querySelector("span").onclick = () => li.classList.toggle("done");
  li.querySelector("button").onclick = () => li.remove();
  list.appendChild(li);

  console.log("added:", text);
  input.value = "";
});
`,
  },
  {
    name: "Theme toggle",
    html: `<main>
  <h1>Theme toggle</h1>
  <p>Colours come from CSS variables, so one class flips everything.</p>
  <button id="toggle">Switch theme</button>
</main>
`,
    css: `:root { --bg: #fff8ec; --fg: #0b1020; --accent: #ffd84d; }
body.dark { --bg: #0b1020; --fg: #f4f1ea; --accent: #2b4bff; }

body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  text-align: center;
  transition: background .4s, color .4s;
}
button {
  padding: 12px 20px;
  font-weight: 700;
  color: var(--fg);
  background: var(--accent);
  border: 2px solid var(--fg);
  border-radius: 12px;
  cursor: pointer;
  transition: background .4s;
}
`,
    js: `const btn = document.getElementById("toggle");

btn.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  console.log("theme:", dark ? "dark" : "light");
});
`,
  },
];

/* ----------------------------- challenges ----------------------------- */

export interface Challenge {
  id: string;
  title: string;
  level: "Easy" | "Medium" | "Hard";
  brief: string;
  hint: string;
  fn: string;
  starter: string;
  solution: string;
  cases: TestCase[];
}

export const CHALLENGES: Challenge[] = [
  {
    id: "counter",
    title: "Closure counter",
    level: "Easy",
    brief: "makeCounter() should return a function that returns 1, then 2, then 3, and each counter keeps its own count.",
    hint: "Declare a variable inside makeCounter and return a function that updates it.",
    fn: "makeCounter",
    starter: `function makeCounter() {
  // your code here
}
`,
    solution: `function makeCounter() {
  let n = 0;
  return () => ++n;
}
`,
    cases: [
      { label: "counts 1, 2, 3", run: "const c = makeCounter(); return [c(), c(), c()];", expect: [1, 2, 3] },
      { label: "counters are independent", run: "const a = makeCounter(); const b = makeCounter(); a(); a(); return b();", expect: 1 },
    ],
  },
  {
    id: "reverse",
    title: "Reverse the words",
    level: "Easy",
    brief: 'reverseWords("frontend interviews are fun") should return "fun are interviews frontend".',
    hint: "split, reverse, join.",
    fn: "reverseWords",
    starter: `function reverseWords(sentence) {
  // your code here
}
`,
    solution: `function reverseWords(sentence) {
  return sentence.split(" ").reverse().join(" ");
}
`,
    cases: [
      { label: "four words", run: 'return reverseWords("frontend interviews are fun");', expect: "fun are interviews frontend" },
      { label: "one word", run: 'return reverseWords("hello");', expect: "hello" },
      { label: "two words", run: 'return reverseWords("a b");', expect: "b a" },
    ],
  },
  {
    id: "unique",
    title: "Remove duplicates",
    level: "Easy",
    brief: "unique(list) returns a new array without duplicates, keeping the first occurrence of each value.",
    hint: "A Set only stores unique values.",
    fn: "unique",
    starter: `function unique(list) {
  // your code here
}
`,
    solution: `function unique(list) {
  return [...new Set(list)];
}
`,
    cases: [
      { label: "numbers", run: "return unique([1, 2, 2, 3, 3, 3, 4]);", expect: [1, 2, 3, 4] },
      { label: "strings", run: 'return unique(["a", "b", "a"]);', expect: ["a", "b"] },
      { label: "empty array", run: "return unique([]);", expect: [] },
    ],
  },
  {
    id: "palindrome",
    title: "Palindrome check",
    level: "Medium",
    brief: "isPalindrome(text) is true if the text reads the same backwards, ignoring case, spaces and punctuation.",
    hint: "Lower-case it and strip everything that is not a letter or digit first.",
    fn: "isPalindrome",
    starter: `function isPalindrome(text) {
  // your code here
}
`,
    solution: `function isPalindrome(text) {
  const s = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return s === s.split("").reverse().join("");
}
`,
    cases: [
      { label: "racecar", run: 'return isPalindrome("racecar");', expect: true },
      { label: "not a palindrome", run: 'return isPalindrome("Hello");', expect: false },
      { label: "with punctuation", run: 'return isPalindrome("A man, a plan, a canal: Panama");', expect: true },
    ],
  },
  {
    id: "flatten",
    title: "Flatten deeply",
    level: "Medium",
    brief: "flatten(arr) turns any depth of nested arrays into one flat array.",
    hint: "Recursion, or arr.flat(Infinity).",
    fn: "flatten",
    starter: `function flatten(arr) {
  // your code here
}
`,
    solution: `function flatten(arr) {
  return arr.reduce(
    (out, x) => out.concat(Array.isArray(x) ? flatten(x) : x),
    []
  );
}
`,
    cases: [
      { label: "deeply nested", run: "return flatten([1, [2, [3, [4]]]]);", expect: [1, 2, 3, 4] },
      { label: "already flat", run: "return flatten([1, 2, 3]);", expect: [1, 2, 3] },
      { label: "empty nested", run: "return flatten([[], [[]]]);", expect: [] },
    ],
  },
  {
    id: "memoize",
    title: "Memoize",
    level: "Hard",
    brief: "memoize(fn) returns a function that caches results by argument, so fn runs only once per unique input.",
    hint: "Keep a Map outside the returned function, keyed by the argument.",
    fn: "memoize",
    starter: `function memoize(fn) {
  // your code here
}
`,
    solution: `function memoize(fn) {
  const cache = new Map();
  return (x) => {
    if (!cache.has(x)) cache.set(x, fn(x));
    return cache.get(x);
  };
}
`,
    cases: [
      {
        label: "returns correct values",
        run: "const f = memoize((x) => x * 2); return [f(2), f(3)];",
        expect: [4, 6],
      },
      {
        label: "calls the original once per input",
        run: "let calls = 0; const f = memoize((x) => { calls++; return x * 2; }); f(2); f(2); f(3); f(3); return calls;",
        expect: 2,
      },
    ],
  },
];
