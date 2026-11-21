=== r1 | E | What is React?
**React is an open-source JavaScript library for building user interfaces out of reusable components. You describe what the UI should look like for a given state, and React updates the screen efficiently when that state changes.**

### Core ideas
- **Components:** functions that return UI (JSX). Small pieces compose into whole apps.
- **Declarative:** you write "for this data, show this", not step-by-step DOM instructions.
- **State and props:** data flows down through props; components re-render when their state changes.
- **One-way data flow:** parents pass data to children, children notify parents through callbacks.
- **Learn once, write anywhere:** React DOM for the web, React Native for mobile, plus servers via Server Components.

### Where React is today
- **React 19.3** (September 2026) is the latest version. React 19 added Actions, `use`, `useOptimistic` and `useActionState`. React 19.2 added `<Activity>` and `useEffectEvent`. React 19.3 made View Transitions and Fragment refs stable.
- **React Compiler 1.0** (October 2025) automatically memoizes components.
- **Server Components** let components run on the server, used by frameworks like Next.js and React Router.
- **Governance:** since February 2026, React, React Native and JSX are owned by the React Foundation under the Linux Foundation, not by Meta alone.

### Library, not framework
React handles rendering. Routing, data fetching and bundling come from frameworks (Next.js, React Router, Expo) or from tools like Vite. The React docs recommend starting new apps with a framework.
--- code
// A complete React component: state + event + declarative UI
import { useState } from "react";

export default function Greeting() {
  const [name, setName] = useState("");

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      {/* React re-renders this whenever `name` changes */}
      <p>{name ? `Hello, ${name}!` : "Type your name"}</p>
    </div>
  );
}

// Mounting it (React 18+ API)
// import { createRoot } from "react-dom/client";
// createRoot(document.getElementById("root")!).render(<Greeting />);

=== r2 | E | Why use React?
**Teams use React because it makes complex, interactive UIs manageable: components are reusable and testable, the declarative model removes manual DOM bookkeeping, and the ecosystem (frameworks, libraries, tooling, talent pool) is the largest in front-end development.**

### Practical benefits
- **Reusable components** shared across pages and even across apps or design systems.
- **Declarative updates:** you change state; React figures out the minimal DOM changes.
- **Predictable data flow:** one-way props and explicit state make bugs easier to trace.
- **Rich ecosystem:** Next.js, React Router, TanStack Query, Redux Toolkit, Zustand, React Hook Form, testing libraries and component kits.
- **Cross-platform:** React Native and Expo reuse the same skills for iOS and Android.
- **Server rendering:** Server Components and streaming give fast first loads and good SEO.
- **Performance tooling:** the React Compiler, concurrent rendering (`useTransition`), Suspense and the DevTools Profiler.
- **Stability:** a long track record, gradual upgrades and, since 2026, neutral governance through the React Foundation.

### Trade-offs to mention
- It is a library; you still choose routing, data and build tools (or adopt a framework).
- JSX and the hooks rules have a learning curve.
- Large client-side bundles are possible if you are not careful; Server Components and code splitting help.

### When it is a good fit
Interactive apps, dashboards, design systems, apps with many developers, and products needing web plus mobile. For mostly static content sites, lighter options such as Astro may ship less JavaScript.
--- code
// Reuse: one Button component, many variations
type ButtonProps = {
  variant?: "primary" | "ghost";
  onClick?: () => void;
  children: React.ReactNode;
};

export function Button({ variant = "primary", onClick, children }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white"
      : "bg-transparent text-indigo-600 border border-indigo-600";
  return (
    <button className={`rounded px-4 py-2 ${styles}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Toolbar() {
  return (
    <div className="flex gap-2">
      <Button onClick={() => alert("Saved")}>Save</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  );
}

=== r3 | E | What are components?
**Components are the building blocks of a React UI: JavaScript functions that accept inputs (props) and return JSX describing what should appear on screen. They can hold state, respond to events, and be nested and reused like custom HTML elements.**

### Key properties
- **Names start with a capital letter** (`<UserCard />`), so React can tell them apart from HTML tags (`<div>`).
- **Pure rendering:** given the same props and state, a component should return the same JSX, without side effects during render.
- **Composition:** components render other components, building a tree.
- **Encapsulation:** each component manages its own state and logic.
- **Reuse:** render the same component many times with different props.

### Kinds you will hear about
- **Function components:** the standard today, using hooks for state and effects.
- **Class components:** legacy style with `render()` and lifecycle methods; still supported.
- **Server Components:** run only on the server (in frameworks like Next.js), can be `async` and fetch data, and ship no JavaScript.
- **Client Components:** interactive components, marked with `"use client"` in Server Component frameworks.

### Good practices
- Keep components small and focused on one job.
- Lift shared state to the closest common parent.
- Separate data fetching from presentation when it helps testing.
- Define components at the top level, never inside another component (that remounts them on every render).
--- code
// A small component tree
type User = { id: number; name: string; role: string };

function Avatar({ name }: { name: string }) {
  return <span className="avatar">{name[0]}</span>;
}

function UserCard({ user }: { user: User }) {
  return (
    <article>
      <Avatar name={user.name} />
      <h3>{user.name}</h3>
      <p>{user.role}</p>
    </article>
  );
}

export default function Team({ users }: { users: User[] }) {
  return (
    <section>
      {users.map((u) => (
        <UserCard key={u.id} user={u} />
      ))}
    </section>
  );
}

=== r4 | E | Difference between Functional and Class components?
**Function components are plain functions that return JSX and use hooks for state, effects and context. Class components extend `React.Component`, keep state in `this.state`, and use lifecycle methods. Function components are the modern standard; class components are legacy but still supported.**

### Comparison
| | Function component | Class component |
|---|---|---|
| Syntax | `function Card(props) {}` | `class Card extends React.Component` |
| State | `useState`, `useReducer` | `this.state`, `this.setState` |
| Side effects | `useEffect`, `useLayoutEffect` | `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` |
| Context | `useContext` / `use` | `static contextType` |
| `this` binding | not needed | must bind handlers or use arrow fields |
| Logic reuse | custom hooks | HOCs, render props |
| React Compiler, Server Components | supported | not supported |

### Why function components won
- Less boilerplate and no `this` confusion.
- Custom hooks share logic without wrapper components.
- Related logic (subscribe and unsubscribe) lives together in one effect instead of being split across lifecycle methods.
- All new React features (hooks such as `useActionState`, `use`, `useOptimistic`, the React Compiler, Server Components) are for function components.

### When you still see classes
- **Error boundaries:** there is still no hook for `componentDidCatch`, so they are written as classes (or with a library like `react-error-boundary`, or a framework helper).
- Older codebases. React 19 removed some class-only legacy features: string refs and legacy context (`contextTypes`).
--- code
// Function component
import { useEffect, useState, Component } from "react";

export function ClockFn() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id); // cleanup = componentWillUnmount
  }, []);
  return <p>{time.toLocaleTimeString()}</p>;
}

// Equivalent class component
export class ClockClass extends Component<{}, { time: Date }> {
  state = { time: new Date() };
  private id?: ReturnType<typeof setInterval>;

  componentDidMount() {
    this.id = setInterval(() => this.setState({ time: new Date() }), 1000);
  }
  componentWillUnmount() {
    clearInterval(this.id);
  }
  render() {
    return <p>{this.state.time.toLocaleTimeString()}</p>;
  }
}

=== r5 | E | What is JSX?
**JSX is a syntax extension for JavaScript that lets you write HTML-like markup inside JavaScript. A compiler (Babel, SWC, Oxc or esbuild) turns it into function calls that create React elements, so JSX is just JavaScript expressions with a friendlier syntax.**

### Rules
- **One root element** per expression; use a Fragment `<>...</>` to group without an extra DOM node.
- **Close every tag:** `<img />`, `<br />`.
- **camelCase attributes:** `className` instead of `class`, `htmlFor` instead of `for`, `onClick`, `tabIndex`.
- **`{}` embeds JavaScript expressions:** variables, function calls, ternaries, `.map()`. Statements like `if` or `for` do not go inside braces.
- **`style` takes an object:** `style={{ fontSize: 16 }}`.
- **Components start with a capital letter.**

### What JSX is not
- Not HTML: it is compiled away and follows JavaScript rules.
- Not required: you can call `createElement` or `jsx()` yourself, but nobody does.
- Not a template language with its own logic; it uses plain JavaScript.

### Safety
Values inside `{}` are escaped automatically, so user input like `<script>` renders as text. Only `dangerouslySetInnerHTML` bypasses this.

### TypeScript
`.tsx` files type-check JSX: props, children and event types are all verified.
--- code
// JSX with expressions, conditionals, lists and attributes
type Product = { id: string; name: string; price: number; inStock: boolean };

export function ProductList({ products, currency = "USD" }: { products: Product[]; currency?: string }) {
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency });

  return (
    <>
      <h2 className="title">Products ({products.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} - {fmt.format(p.price)}
            {!p.inStock && <span className="badge"> Sold out</span>}
          </li>
        ))}
      </ul>
      {products.length === 0 ? <p>No products yet.</p> : null}
      <label htmlFor="q">Search</label>
      <input id="q" tabIndex={0} />
    </>
  );
}

=== r6 | M | How does JSX work under the hood?
**A compiler transforms JSX into JavaScript function calls. With the modern "automatic" JSX runtime (React 17+), `<h1 className="x">Hi</h1>` becomes `jsx("h1", { className: "x", children: "Hi" })` imported from `react/jsx-runtime`. These calls return plain objects called React elements, which React then renders to the DOM.**

### The two transforms
- **Classic (before React 17):** `React.createElement("h1", { className: "x" }, "Hi")`. Every file needed `import React from "react"`.
- **Automatic (React 17+, required by React 19):** the compiler inserts `import { jsx, jsxs } from "react/jsx-runtime"` itself. You no longer import React just for JSX. `jsxs` is used when there are multiple static children; `jsxDEV` in development adds source info.

### What a React element is
An immutable plain object, roughly `{ $$typeof: Symbol.for("react.transitional.element"), type: "h1", key: null, props: { className: "x", children: "Hi" } }`. It is a description, not a DOM node. React 19 changed the internal `$$typeof` symbol and removed `element.ref` access (ref is now a normal prop).

### Lowercase vs uppercase
- `<div>` compiles to the string `"div"`: a host (DOM) element.
- `<Card>` compiles to the variable `Card`: React calls that function with props.

### Then what?
React builds a tree of elements, compares it with the previous one (reconciliation), and commits the minimal DOM changes.

### Tools that compile JSX
Babel, SWC (Next.js), Oxc (Vite 8 with `@vitejs/plugin-react` v6), esbuild and TypeScript (`"jsx": "react-jsx"`).
--- code
// What you write
const greeting = (
  <h1 className="title" id="main">
    Hello, <strong>{"Ada"}</strong>
  </h1>
);

// Roughly what the automatic runtime compiles it to
import { jsx, jsxs } from "react/jsx-runtime";

const compiled = jsxs("h1", {
  className: "title",
  id: "main",
  children: ["Hello, ", jsx("strong", { children: "Ada" })],
});

// Both produce a plain object (a React element), not a DOM node:
console.log(compiled.type);            // "h1"
console.log(compiled.props.className); // "title"

// Component types are passed by reference, not as strings:
// <Card title="x" />  ->  jsx(Card, { title: "x" })
export { greeting, compiled };

=== r7 | E | What is the Virtual DOM?
**The Virtual DOM is the in-memory tree of React elements that describes the UI. When state changes, React renders a new tree, compares it with the previous one, and applies only the differences to the real DOM, which is slower to manipulate directly.**

### How it fits together
1. Components return JSX, which becomes React elements (plain objects).
2. React keeps a working tree of these (internally called **fibers**) plus the current one on screen.
3. On an update, React re-renders the affected components into a new tree.
4. **Reconciliation** diffs old and new trees.
5. **Commit** applies the minimal set of DOM operations (insert, update attributes, remove).

### What it is good for
- **Declarative code:** you re-describe the whole UI; React computes the changes.
- **Batching:** many state updates can become one DOM update.
- **Scheduling:** concurrent rendering can pause, prioritize or discard work before committing.
- **Portability:** the same model drives React Native, React Three Fiber and other renderers.

### Common misconception
The Virtual DOM is not magic speed. Diffing has a cost; hand-written DOM updates can be faster. Its value is making UI updates predictable and fast enough by default. Other frameworks (Svelte, Solid) use compile-time or fine-grained reactivity instead.

### Related modern pieces
- **React Compiler** reduces how much of the tree re-renders.
- **Server Components** render on the server and send a serialized tree (the RSC payload), not a Virtual DOM diff.
--- code
// Each render produces a new element tree; React diffs it
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  // Render 1 tree: <div><h1>0</h1><button>+1</button></div>
  // Render 2 tree: <div><h1>1</h1><button>+1</button></div>
  // Diff result: only the <h1> text node changes in the real DOM
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}

// Roughly, the "virtual" description is just objects:
const tree = {
  type: "div",
  props: { children: [{ type: "h1", props: { children: 0 } }, { type: "button", props: { children: "+1" } }] },
};
export { tree };

=== r8 | M | How does React update the DOM?
**React updates the DOM in two phases. In the render phase it calls your components to compute the new UI and diffs it against the previous tree. In the commit phase it applies the needed DOM mutations in one go, then runs layout effects and, after paint, regular effects.**

### Step by step
1. **Trigger:** a state update (`setState`, a reducer dispatch, a context change, or the initial `root.render`).
2. **Schedule:** updates are queued and batched automatically (React 18+). Urgent updates (typing) get higher priority than transitions.
3. **Render phase:** React calls the components that need updating and builds a new fiber tree. This phase is pure and can be interrupted, paused or restarted in concurrent mode.
4. **Reconciliation:** compares element types and keys to decide what to keep, update, move or remove.
5. **Commit phase (synchronous):**
   - Apply DOM insertions, updates and deletions.
   - Attach refs (and run ref cleanup functions from React 19).
   - Run `useLayoutEffect` callbacks (before the browser paints).
6. **Browser paints.**
7. **Passive effects:** `useEffect` callbacks run after paint.

### Reconciliation rules
- **Different element type** (`<div>` to `<span>`, `ComponentA` to `ComponentB`): tear down the old subtree and build a new one; state is lost.
- **Same type:** keep the DOM node and update changed attributes; component state is preserved.
- **Lists:** `key` props match items between renders.

### Why it matters
Knowing the phases explains why you should not cause side effects during render, why `useLayoutEffect` exists for measurements, and why state "does not update immediately".
--- code
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function Phases() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  console.log("1. render phase: compute JSX, no side effects here");

  useLayoutEffect(() => {
    // 2. after DOM mutation, before paint: safe to measure
    console.log("2. layout effect, height =", boxRef.current?.offsetHeight);
  }, [open]);

  useEffect(() => {
    // 3. after paint: subscriptions, fetching, logging
    console.log("3. passive effect");
  }, [open]);

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}>Toggle</button>
      <div ref={boxRef}>{open && <p>Now you see me</p>}</div>
    </div>
  );
}

=== r9 | M | What is reconciliation?
**Reconciliation is React's algorithm for comparing the previous and next element trees after a render and working out the smallest set of changes to apply. It uses two heuristics: elements of different types produce different trees, and `key` props identify which list items are the same between renders.**

### The heuristics
1. **Type comparison at each position:**
   - Same host type (`div` to `div`): keep the DOM node, update changed props.
   - Same component type: keep the instance and its state, re-render with new props.
   - Different type: unmount the old subtree (state and DOM are destroyed) and mount a new one.
2. **Keys for children lists:** React matches children by `key` instead of index, so reordering, inserting or deleting items keeps the right state with the right item.

These heuristics make diffing O(n) instead of the O(n³) of a general tree diff.

### Fiber
Since React 16 reconciliation runs on the **Fiber** architecture: work is split into units that can be paused, prioritized and resumed, which enables concurrent features like `useTransition` and Suspense.

### Practical consequences
- **Do not define components inside components:** a new function each render means a new type, so React remounts it and loses state.
- **Use stable, unique keys** in lists, not array indexes when items can move.
- **Reset state on purpose** by changing a component's `key`, for example `<Profile key={userId} />`.
- **Conditional wrappers** (`cond ? <div><Form /></div> : <Form />`) change the tree shape and remount `Form`.
--- code
import { useState } from "react";

function Field({ label }: { label: string }) {
  const [value, setValue] = useState(""); // state lives with the component instance
  return (
    <label>
      {label} <input value={value} onChange={(e) => setValue(e.target.value)} />
    </label>
  );
}

export function Demo({ userId }: { userId: string }) {
  const [asAdmin, setAsAdmin] = useState(false);

  return (
    <div>
      <button onClick={() => setAsAdmin((a) => !a)}>Toggle</button>
      {/* Same type at same position: state is preserved across toggles */}
      <Field label={asAdmin ? "Admin name" : "Name"} />

      {/* Different key: React treats it as a new component and resets its state */}
      <Field key={userId} label="Notes for this user" />
    </div>
  );
}

=== r10 | E | What is a key in React?
**A `key` is a special prop you give to elements in a list so React can identify each item across renders. Keys must be unique among siblings and stable over time, which is why IDs from your data are the usual choice.**

### Rules
- Put the key on the outermost element returned inside `.map()`, not on an inner child.
- Unique among **siblings**, not globally.
- Stable: the same item should keep the same key across renders.
- Keys are not passed to your component as a prop; pass the ID separately if the child needs it.
- Fragments in a list need `<Fragment key={id}>` (the short `<>` syntax cannot take a key).

### Good keys
- Database IDs, UUIDs, slugs.
- IDs generated **once** when an item is created (`crypto.randomUUID()` in the add handler).

### Bad keys
- `Math.random()` or `crypto.randomUUID()` during render: every render gets a new key, so every item remounts.
- Array **index** when the list can be reordered, filtered or have items inserted. Fine for static lists that never change order.

### Keys outside lists
A key on any element tells React "this is a different instance when the key changes". Changing `key` is the idiomatic way to reset a component's state, for example `<ChatRoom key={roomId} />`.

### Warning
Without keys, React warns "Each child in a list should have a unique key prop" and falls back to index keys.
--- code
import { Fragment, useState } from "react";

type Todo = { id: string; text: string };

export function Todos() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "a1", text: "Write tests" },
    { id: "b2", text: "Ship it" },
  ]);

  function add(text: string) {
    // Generate the id once, when the item is created
    setTodos((t) => [{ id: crypto.randomUUID(), text }, ...t]);
  }

  return (
    <>
      <button onClick={() => add("New task")}>Add</button>
      <dl>
        {todos.map((t) => (
          <Fragment key={t.id}>
            <dt>{t.text}</dt>
            <dd>id: {t.id}</dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}

=== r11 | E | Why are keys important?
**Keys let React match list items between renders. With correct keys, React moves, inserts and removes DOM nodes and keeps each item's state attached to the right item. With missing or unstable keys, React may reuse the wrong nodes, causing lost input, wrong checkbox states, broken animations and wasted re-renders.**

### What goes wrong with index keys
If you prepend an item to a list keyed by index, every item's key shifts by one. React thinks item 0 changed its content rather than a new item appearing, so:
- Internal state (input text, focus, checked state) stays with the **position**, not the data.
- All items re-render and their DOM is patched instead of one node being inserted.

### What goes wrong with random keys
Generating keys during render (`Math.random()`) makes every item new on every render: React unmounts and remounts all of them, destroying state and hurting performance.

### Correct approach
- Use stable IDs from the data.
- If data has no IDs, generate them once when the data is loaded or created.
- Index keys are acceptable only when the list is static: never reordered, filtered or inserted into.

### Bonus: keys reset state
Because a new key means a new component instance, `<Editor key={documentId} />` resets the editor when the document changes, without manual effects.
--- code
import { useState } from "react";

function Row({ label }: { label: string }) {
  return (
    <li>
      {label} <input placeholder="type a note" />
    </li>
  );
}

export function KeyDemo() {
  const [items, setItems] = useState([
    { id: "x", label: "Apples" },
    { id: "y", label: "Bananas" },
  ]);

  const prepend = () => setItems((i) => [{ id: crypto.randomUUID(), label: "Cherries" }, ...i]);

  return (
    <div>
      <button onClick={prepend}>Prepend</button>
      {/* Bug: type in "Apples", prepend, and the note moves to "Cherries" */}
      <ul>{items.map((it, index) => <Row key={index} label={it.label} />)}</ul>
      {/* Correct: notes stay with their item */}
      <ul>{items.map((it) => <Row key={it.id} label={it.label} />)}</ul>
    </div>
  );
}

=== r12 | E | What are props?
**Props (properties) are the inputs a parent passes to a child component, written like HTML attributes. They are read-only in the child: a component must never modify its props, only render from them or call callback props to ask the parent for changes.**

### What can be a prop
Strings, numbers, booleans, objects, arrays, functions (callbacks), JSX elements, and `children` (the content between the tags). Since React 19, `ref` is also a regular prop for function components.

### Patterns
- **Destructuring with defaults:** `function Button({ size = "md", children })`. Default values in destructuring replace `defaultProps` for function components (removed in React 19).
- **Callbacks up:** `onChange`, `onSelect` let children tell parents something happened.
- **Spreading:** `<input {...rest} />` forwards remaining props; use with care.
- **Typing:** TypeScript interfaces or types document and check props.

### Rules
- Props flow **down** only (one-way data flow).
- Treat props as immutable. To change what is displayed, the parent updates its state and passes new props.
- When a parent re-renders, children receive new props and re-render too (unless memoized).

### Props vs state
Props are configured by the parent; state is owned and changed by the component itself.
--- code
type AlertProps = {
  tone?: "info" | "error";
  title: string;
  onDismiss?: () => void;
  children?: React.ReactNode;
};

export function Alert({ tone = "info", title, onDismiss, children }: AlertProps) {
  // props.title = "x"; // never mutate props
  return (
    <div role="alert" className={tone === "error" ? "bg-red-100" : "bg-blue-100"}>
      <strong>{title}</strong>
      <div>{children}</div>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  );
}

export function Page() {
  return (
    <Alert tone="error" title="Payment failed" onDismiss={() => console.log("closed")}>
      Your card was declined. Try another card.
    </Alert>
  );
}

=== r13 | E | Difference between props and state?
**Props are data passed into a component by its parent and are read-only inside it. State is data a component owns and can change over time with a setter, which causes it to re-render. Props configure a component; state remembers things.**

### Side by side
| | Props | State |
|---|---|---|
| Owner | parent | the component itself |
| Mutable by the component | no | yes, via `setState`/`dispatch` |
| Purpose | configuration, data from outside | interactive data that changes |
| Changes cause re-render | when the parent passes new values | when the setter is called |
| Declared with | function parameters | `useState`, `useReducer` |

### How they work together
A parent's state often becomes a child's props. The child reads the value and calls a callback prop to request a change; the parent updates its state; the new value flows down again. This is "lifting state up".

### Common mistakes
- **Copying props into state** (`useState(props.value)`) and expecting it to update when the prop changes; the initial value is used only on mount. Use the prop directly, or reset with a `key`.
- **Storing derived data in state.** If it can be computed from props or other state (`fullName`, filtered lists), compute it during render.
- **Mutating either one.** Always create new objects or arrays when updating state.
--- code
import { useState } from "react";

// Child: reads props, never owns `count`
function CounterDisplay({ count, onIncrement }: { count: number; onIncrement: () => void }) {
  return (
    <p>
      Count: {count} <button onClick={onIncrement}>+1</button>
    </p>
  );
}

// Parent: owns state and passes it down as props
export function CounterPage() {
  const [count, setCount] = useState(0);
  const doubled = count * 2; // derived: compute, don't store

  return (
    <>
      <CounterDisplay count={count} onIncrement={() => setCount((c) => c + 1)} />
      <p>Doubled: {doubled}</p>
    </>
  );
}

=== r14 | E | What is state?
**State is data that a component remembers between renders and that can change over time, such as form input, a toggle, fetched results or the current step of a wizard. In function components you create it with `useState` or `useReducer`; calling the setter tells React to re-render the component with the new value.**

### Characteristics
- **Local and private:** each instance of a component has its own state.
- **Persistent across renders:** unlike regular variables, which reset every render.
- **Triggers re-renders** when updated with a different value (compared with `Object.is`).
- **A snapshot:** during one render, the state value is fixed. Setting state schedules the next render; it does not change the variable in the current one.

### What belongs in state
- Values that change and affect what is rendered.
- Not things you can compute from props or other state (derive them instead).
- Not values that never change (constants) or that do not affect rendering (use `useRef`).

### Updating correctly
- Replace, do not mutate: `setUser({ ...user, name })`, `setList([...list, item])`.
- Use the updater form when the next value depends on the previous: `setCount((c) => c + 1)`.
- Group related values in one object or use `useReducer` for complex transitions.

### Where else state lives
URL (search params), server cache (TanStack Query, SWR), context or stores (Zustand, Redux) for shared global state, and form libraries for form state.
--- code
import { useState } from "react";

type Step = "cart" | "address" | "payment";

export function Checkout() {
  const [step, setStep] = useState<Step>("cart");
  const [address, setAddress] = useState({ city: "", zip: "" });

  let normalVariable = 0; // resets to 0 on every render; changing it never re-renders

  return (
    <div>
      <p>Step: {step}</p>
      {step === "address" && (
        <input
          placeholder="City"
          value={address.city}
          onChange={(e) => setAddress({ ...address, city: e.target.value })} // new object
        />
      )}
      <button onClick={() => setStep(step === "cart" ? "address" : "payment")}>Next</button>
      <button onClick={() => normalVariable++}>Does nothing visible ({normalVariable})</button>
    </div>
  );
}

=== r15 | E | How to update state?
**Call the setter returned by `useState` (or `dispatch` from `useReducer`) with a new value or an updater function. Never mutate state directly: create new objects and arrays so React can detect the change and re-render.**

### Two forms
- **Direct value:** `setName("Ada")`.
- **Updater function:** `setCount((prev) => prev + 1)`. Use it whenever the next value depends on the previous one, especially for multiple updates in a row or inside async callbacks, to avoid stale values.

### Objects
- `setUser({ ...user, email })` copies and overrides.
- Nested: `setUser((u) => ({ ...u, address: { ...u.address, city } }))`.
- For deep updates, Immer (`useImmer`, or `produce`) lets you write "mutating" code that produces a new object.

### Arrays
- Add: `[...list, item]` or `[item, ...list]`.
- Remove: `list.filter((x) => x.id !== id)`.
- Update: `list.map((x) => (x.id === id ? { ...x, done: true } : x))`.
- Sort or reverse: copy first, or use ES2023 `toSorted()` and `toReversed()`.
- Avoid `push`, `splice`, `sort` and direct assignment on state arrays.

### Things to know
- State updates are **batched** and applied on the next render; reading the variable right after `setX` still gives the old value.
- Setting the same value (by `Object.is`) bails out of re-rendering.
- Do not call setters during render (infinite loop), except for the rare "adjust state when a prop changes" pattern with a guard.
--- code
import { useState } from "react";

type Item = { id: number; name: string; qty: number };

export function Cart() {
  const [items, setItems] = useState<Item[]>([{ id: 1, name: "Pen", qty: 1 }]);
  const [count, setCount] = useState(0);

  const add = () => setItems((prev) => [...prev, { id: Date.now(), name: "Notebook", qty: 1 }]);
  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));
  const increment = (id: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));

  const addThree = () => {
    // Updater form: each call sees the latest value, so count goes up by 3
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  };

  return (
    <div>
      {items.map((i) => (
        <p key={i.id}>
          {i.name} x{i.qty} <button onClick={() => increment(i.id)}>+</button>
          <button onClick={() => remove(i.id)}>Remove</button>
        </p>
      ))}
      <button onClick={add}>Add item</button>
      <button onClick={addThree}>Clicked {count}</button>
    </div>
  );
}

=== r16 | M | Is state update asynchronous?
**State updates are not applied immediately: calling a setter schedules a re-render, and the new value is only visible in the next render. React batches multiple updates (automatically everywhere since React 18) into one render. The setter itself is not a Promise, so you cannot `await` it.**

### What this means in practice
- After `setCount(count + 1)`, `count` still holds the old value in the current function. Each render sees a fixed **snapshot** of state.
- Several `setX` calls in one event handler, timeout, promise callback or native event produce **one** re-render (automatic batching, React 18+). Before React 18, only updates inside React event handlers were batched.
- `setCount(count + 1)` three times adds 1, not 3, because all three use the same snapshot. Use `setCount((c) => c + 1)` to chain.

### Reacting to the new value
- Compute it first and use it: `const next = count + 1; setCount(next); save(next);`.
- Or derive work from state in render, or (for side effects) in `useEffect` with the value as a dependency.
- Class components: `this.setState(update, callback)` runs `callback` after the update.

### Forcing a synchronous update
`flushSync(() => setX(v))` from `react-dom` forces React to apply the update and update the DOM immediately, for example to scroll to a newly added item. Use rarely; it hurts performance.

### Concurrent rendering
Updates inside `startTransition` are lower priority and can be interrupted. In React 19.3, separate transitions also render independently, so one slow transition does not hold up another.
--- code
import { useState } from "react";
import { flushSync } from "react-dom";

export function SnapshotDemo() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  function handleClick() {
    setCount(count + 1);
    console.log(count); // still the OLD value: state is a snapshot for this render
  }

  function addAndScroll() {
    flushSync(() => setItems((i) => [...i, `Item ${i.length + 1}`]));
    // DOM is already updated here
    document.getElementById("list")?.lastElementChild?.scrollIntoView();
  }

  return (
    <div>
      <button onClick={handleClick}>Count {count}</button>
      <button onClick={addAndScroll}>Add + scroll</button>
      <ul id="list" style={{ maxHeight: 80, overflow: "auto" }}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

=== r17 | E | What is setState()?
**`setState` is the class component method for updating state: `this.setState(partialState)` or `this.setState((prevState, props) => partialState)`. It shallow-merges the update into `this.state` and schedules a re-render. In function components, the equivalent is the setter returned by `useState`, which replaces the value instead of merging.**

### Class component `setState`
- **Merges** at the top level: `this.setState({ name })` keeps other keys.
- **Updater form:** `this.setState((prev) => ({ count: prev.count + 1 }))` when depending on previous state.
- **Callback:** `this.setState(update, () => { /* runs after re-render */ })`.
- **Batched:** multiple calls are combined into one render (in all contexts since React 18).
- Never assign `this.state = ...` outside the constructor; React will not re-render.

### Function component setters (`useState`)
- **Replace** the value: `setUser({ ...user, name })` is needed to keep other fields.
- Same updater form: `setCount((c) => c + 1)`.
- No callback argument; use `useEffect` or compute the value up front.
- Bail out if the new value is identical (`Object.is`).

### Interview point
Explain the merge vs replace difference and that both are batched and not applied immediately.
--- code
import { Component, useState } from "react";

// Class component: setState merges
export class ProfileClass extends Component<{}, { name: string; age: number }> {
  state = { name: "Ada", age: 36 };

  birthday = () => {
    this.setState(
      (prev) => ({ age: prev.age + 1 }), // name is preserved by merging
      () => console.log("after update:", this.state.age)
    );
  };

  render() {
    return <button onClick={this.birthday}>{this.state.name} is {this.state.age}</button>;
  }
}

// Function component: the setter replaces, so spread to keep fields
export function ProfileFn() {
  const [profile, setProfile] = useState({ name: "Ada", age: 36 });
  const birthday = () => setProfile((p) => ({ ...p, age: p.age + 1 }));
  return <button onClick={birthday}>{profile.name} is {profile.age}</button>;
}

=== r18 | E | What is 'lifting state up'?
**Lifting state up means moving state from child components to their closest common parent, so that several children can share and stay in sync with the same data. The parent holds the state and passes the value down as props, plus callbacks the children call to change it.**

### When to lift
- Two siblings need the same data (a filter input and the list it filters).
- A child's value must be known by the parent (form fields used on submit).
- Components must stay in sync (accordion panels where only one can be open).

### How
1. Remove the state from the children.
2. Add it to the nearest common parent.
3. Pass the value down as a prop.
4. Pass a callback such as `onChange` so children can request updates.

The children become **controlled** components: their output is fully determined by props.

### Single source of truth
Each piece of state should live in exactly one place. Duplicating it in several components leads to inconsistent UI.

### When lifting gets painful
If you lift too high, many intermediate components just pass props through (prop drilling). Options: composition (pass components as `children`), context for widely needed values, or a store (Zustand, Redux) for app-wide state. Keep state as low as possible, as high as necessary.
--- code
import { useState } from "react";

function SearchBox({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {
  return <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Filter" />;
}

function FruitList({ query }: { query: string }) {
  const fruits = ["Apple", "Banana", "Cherry", "Mango"];
  const visible = fruits.filter((f) => f.toLowerCase().includes(query.toLowerCase()));
  return <ul>{visible.map((f) => <li key={f}>{f}</li>)}</ul>;
}

// State lifted to the common parent: both children stay in sync
export function FruitFilter() {
  const [query, setQuery] = useState("");
  return (
    <section>
      <SearchBox query={query} onQueryChange={setQuery} />
      <FruitList query={query} />
    </section>
  );
}

=== r19 | E | What is prop drilling?
**Prop drilling is passing props through several layers of components that do not use them, only so a deeply nested component can receive them. It makes code verbose, couples intermediate components to data they do not care about, and makes refactoring harder.**

### Why it happens
State is lifted to a high-level component (often the app root), but the consumer is many levels down: `App > Layout > Sidebar > Menu > UserBadge`.

### Is it always bad?
No. Passing props two or three levels is explicit and easy to follow. It becomes a problem when many intermediate components forward the same props.

### Solutions
1. **Composition:** pass components as `children` or slot props so the parent renders the consumer directly. Often the simplest fix.
2. **Context:** `createContext` plus `useContext` (or React 19's `use(Context)`) for values many components need: theme, current user, locale. Render `<UserContext value={user}>` directly in React 19.
3. **State libraries:** Zustand, Jotai or Redux Toolkit for frequently changing global state with selective subscriptions.
4. **Server state libraries:** TanStack Query or SWR let any component read cached server data by key.
5. **Frameworks:** Server Components can fetch data right where it is used.

### Context caveat
Every consumer re-renders when the context value changes. Split contexts or use a store when values change often.
--- code
import { createContext, use, useState } from "react";

type User = { name: string };

// Drilling: Layout and Sidebar only forward `user`
// <Layout user={user}><Sidebar user={user}><UserBadge user={user} /></Sidebar></Layout>

// Fix with context (React 19 syntax)
const UserContext = createContext<User | null>(null);

function UserBadge() {
  const user = use(UserContext); // read directly, no drilling
  return <span>{user?.name ?? "Guest"}</span>;
}

function Sidebar() {
  return <aside><UserBadge /></aside>; // no user prop needed
}

export function App() {
  const [user] = useState<User>({ name: "Ada" });
  return (
    <UserContext value={user}>
      <Sidebar />
    </UserContext>
  );
}

=== r20 | E | What is the component lifecycle?
**The component lifecycle is the sequence a component goes through: it mounts (appears on screen), updates (re-renders when props, state or context change) and unmounts (is removed). Class components hook into it with lifecycle methods; function components use effects that run after mounting and updating and clean up before re-running or unmounting.**

### The three phases
1. **Mount:** React calls the component, inserts its DOM, then runs effects.
2. **Update:** triggered by new props, state changes, context changes or a parent re-render. React re-renders, commits changes, runs cleanups of changed effects, then the effects again.
3. **Unmount:** React runs all cleanup functions and removes the DOM.

### Function components
- `useEffect(() => { ...; return cleanup }, deps)`: runs after paint on mount and when deps change; cleanup runs before the next run and on unmount.
- `useLayoutEffect`: same timing but before the browser paints.
- Think in **synchronization** ("keep this effect in sync with these values") rather than lifecycle events.

### Strict Mode in development
React mounts, unmounts and remounts components once to surface missing cleanups. React 19.3 also double-invokes effects during hydration. This does not happen in production.

### Related
- `<Activity mode="hidden">` (React 19.2) keeps a component's state while hidden but runs its effect cleanups, and re-runs effects when shown again.
- Ref callbacks can return cleanup functions in React 19.
--- code
import { useEffect, useState } from "react";

function Lifecycle({ userId }: { userId: string }) {
  console.log("render (mount or update)");

  useEffect(() => {
    console.log("effect: mounted or userId changed ->", userId);
    const controller = new AbortController();
    fetch(`/api/users/${userId}`, { signal: controller.signal }).catch(() => {});
    return () => {
      console.log("cleanup: before next effect or on unmount");
      controller.abort();
    };
  }, [userId]);

  return <p>User {userId}</p>;
}

export function Parent() {
  const [show, setShow] = useState(true);
  const [id, setId] = useState("1");
  return (
    <>
      <button onClick={() => setShow((s) => !s)}>{show ? "Unmount" : "Mount"}</button>
      <button onClick={() => setId((i) => String(Number(i) + 1))}>Next user</button>
      {show && <Lifecycle userId={id} />}
    </>
  );
}

=== r21 | M | What are the common lifecycle methods in class components?
**The common class lifecycle methods are `constructor`, `render`, `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` and `shouldComponentUpdate`, plus the less common `getDerivedStateFromProps`, `getSnapshotBeforeUpdate`, and the error boundary methods `getDerivedStateFromError` and `componentDidCatch`.**

### Mounting
1. `constructor(props)`: initialize state (or use class fields).
2. `static getDerivedStateFromProps(props, state)`: rare; sync state with props before render.
3. `render()`: return JSX; must be pure.
4. `componentDidMount()`: after insertion into the DOM. Fetch data, subscribe, measure.

### Updating
1. `getDerivedStateFromProps` again.
2. `shouldComponentUpdate(nextProps, nextState)`: return `false` to skip rendering (or extend `PureComponent`).
3. `render()`.
4. `getSnapshotBeforeUpdate(prevProps, prevState)`: read DOM info (like scroll position) right before changes apply.
5. `componentDidUpdate(prevProps, prevState, snapshot)`: react to changes; compare with previous values before calling `setState` to avoid loops.

### Unmounting
`componentWillUnmount()`: remove listeners, cancel timers and requests.

### Error handling
`static getDerivedStateFromError(error)` and `componentDidCatch(error, info)` make the component an **error boundary**. This is the main reason classes are still written today.

### Removed or legacy
`componentWillMount`, `componentWillReceiveProps` and `componentWillUpdate` are legacy (`UNSAFE_` prefixed). String refs and legacy context were removed in React 19.

### Hook equivalents
`componentDidMount`/`DidUpdate`/`WillUnmount` map to `useEffect`; `shouldComponentUpdate` to `React.memo`; `getSnapshotBeforeUpdate` to `useLayoutEffect`.
--- code
import { Component, createRef } from "react";

type Props = { messages: string[] };

export class ChatLog extends Component<Props> {
  private listRef = createRef<HTMLUListElement>();

  componentDidMount() {
    window.addEventListener("resize", this.onResize);
  }

  getSnapshotBeforeUpdate(prev: Props) {
    // Capture whether the user was scrolled to the bottom before new messages render
    const el = this.listRef.current!;
    return prev.messages.length < this.props.messages.length
      ? el.scrollHeight - el.scrollTop - el.clientHeight < 10
      : null;
  }

  componentDidUpdate(_prev: Props, _state: unknown, wasAtBottom: boolean | null) {
    if (wasAtBottom) this.listRef.current!.scrollTop = this.listRef.current!.scrollHeight;
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
  }

  onResize = () => console.log("resized");

  render() {
    return <ul ref={this.listRef} style={{ maxHeight: 200, overflow: "auto" }}>
      {this.props.messages.map((m, i) => <li key={i}>{m}</li>)}
    </ul>;
  }
}

=== r22 | E | What is the render method?
**`render()` is the one required method of a class component: it reads `this.props` and `this.state` and returns what to display (JSX, a string, a number, `null`, an array or a portal). It must be pure, meaning no side effects and no state updates. In function components, the function body itself plays the role of `render`.**

### Rules for render
- **Pure:** same props and state give the same output. No fetching, subscriptions, timers or DOM mutation.
- **No `setState`** inside it; that causes an infinite loop.
- **Can be called many times** and at unpredictable moments (concurrent rendering, Strict Mode double rendering in development), so it must be cheap and side-effect free.
- Return `null` to render nothing.

### What it is not
- It does not touch the DOM itself. It returns a description; React decides when and how to update the DOM in the commit phase.
- Not to be confused with `root.render(<App />)` from `react-dom/client`, which mounts the app (replacing `ReactDOM.render`, removed in React 19).

### Where side effects go
`componentDidMount` and `componentDidUpdate` in classes, or `useEffect` and event handlers in function components.

### Performance
Heavy computation in render runs on every update. Memoize with `useMemo` (or let the React Compiler do it), or move work out of the component.
--- code
import { Component } from "react";
import { createRoot } from "react-dom/client";

type Props = { items: string[] };

class List extends Component<Props> {
  render() {
    // Pure: only reads props/state and returns a description
    if (this.props.items.length === 0) return null;
    return (
      <ul>
        {this.props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
}

// Function component: the body is the render
function ListFn({ items }: Props) {
  if (items.length === 0) return null;
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

// Mounting the app (ReactDOM.render was removed in React 19)
const container = document.getElementById("root");
if (container) createRoot(container).render(<><List items={["a"]} /><ListFn items={["b"]} /></>);

=== r23 | E | What is a Fragment?
**A Fragment groups multiple elements without adding an extra node to the DOM. Write `<>...</>` for the short form, or `<Fragment key={id}>...</Fragment>` when you need a key in a list. Since React 19.3, `<Fragment ref={...}>` also gives you a Fragment ref to act on all its child DOM nodes.**

### Why use it
- A component must return a single root; Fragments satisfy this without a wrapper `<div>`.
- Wrapper divs can break layouts (CSS Grid or Flex children) and HTML validity (`<tr>` must contain `<td>`, not `<div>`).
- Fewer DOM nodes.

### Short vs long syntax
- `<>...</>`: cannot take attributes.
- `<Fragment>`: accepts `key` (for lists) and, from React 19.3, `ref`.

### Fragment refs (React 19.3, stable)
`<Fragment ref={fragmentRef}>` gives a `FragmentInstance` that represents the Fragment's first-level DOM children. Its methods include `addEventListener`, `removeEventListener`, `dispatchEvent`, `focus`, `focusLast`, `blur`, `observeUsing` (for IntersectionObserver or ResizeObserver), `getClientRects` and `scrollIntoView`. It is useful for focus management or observing visibility of a group of elements without a wrapper.

### State behavior
Switching between `<>` with children and children without a wrapper at the same position keeps state only when the tree shape is the same; adding or removing a wrapper changes the structure.
--- code
import { Fragment, useEffect, useRef } from "react";

type Row = { id: string; term: string; desc: string };

// Fragments with keys in a list (a <div> would be invalid inside <dl>)
export function Glossary({ rows }: { rows: Row[] }) {
  return (
    <dl>
      {rows.map((r) => (
        <Fragment key={r.id}>
          <dt>{r.term}</dt>
          <dd>{r.desc}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

// React 19.3: Fragment ref, observe a group of nodes without a wrapper element
export function TrackVisibility({ children }: { children: React.ReactNode }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => console.log("visible:", entries.some((e) => e.isIntersecting)));
    ref.current?.observeUsing(io);
    return () => ref.current?.unobserveUsing(io);
  }, []);
  return <Fragment ref={ref}>{children}</Fragment>;
}

=== r24 | E | What is Strict Mode?
**`<StrictMode>` is a development-only tool that wraps part of your app and turns on extra checks to find bugs early. It double-invokes component functions, initializers and reducers, runs effects and ref callbacks an extra mount-unmount-mount cycle, and warns about deprecated APIs. It renders no UI and has no effect in production.**

### What it does
- **Double rendering:** calls components, `useState`/`useMemo` initializers and reducers twice to expose impure rendering (side effects during render).
- **Double effects:** mounts, unmounts and re-mounts each component once, so missing effect cleanups show up as bugs (duplicate subscriptions, leaked listeners). React 19.3 also double-invokes effects during **hydration**.
- **Double ref callbacks** (React 19) to check that ref cleanups work.
- **Deprecated API warnings**, such as legacy lifecycle methods.
- React 19 reuses memoized results from the first render during the second, and DevTools dim the logs from the second render.

### Why it is useful
These checks simulate what can happen in real apps: concurrent rendering may call components more than once, and features like `<Activity>` or Fast Refresh unmount and remount effects. Code that survives Strict Mode is safe for them.

### Usage
Wrap the root (`<StrictMode><App /></StrictMode>`) in `main.tsx`; Vite and most templates do this by default. Next.js enables it in the App Router (`reactStrictMode`).

### Common confusion
"My effect runs twice and fetches twice" in development is Strict Mode doing its job. Add a cleanup (abort the request, ignore stale results) rather than removing Strict Mode.
--- code
// main.tsx
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

function Chat({ roomId }: { roomId: string }) {
  useEffect(() => {
    const socket = new WebSocket(`wss://chat.example.com/${roomId}`);
    console.log("connect", roomId);
    // Without this cleanup, Strict Mode reveals two open sockets in development
    return () => {
      console.log("disconnect", roomId);
      socket.close();
    };
  }, [roomId]);
  return <p>Room {roomId}</p>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Chat roomId="general" />
  </StrictMode>
);
// Dev console: connect, disconnect, connect  (production: connect)

=== r25 | E | What is a controlled component?
**A controlled component is a form element whose value is driven by React state: you pass `value` (or `checked`) from state and update that state in `onChange`. React is the single source of truth, so the input always shows exactly what the state says.**

### How it works
1. State holds the value: `const [email, setEmail] = useState("")`.
2. The input reads it: `value={email}`.
3. Every keystroke calls `onChange`, which updates state.
4. React re-renders and the input shows the new state.

### Benefits
- Instant validation and formatting (uppercase, masks, max length).
- Conditionally disable submit buttons or show errors as the user types.
- Easy to reset or prefill from state.
- One source of truth for multi-field logic.

### Costs
- A re-render on every keystroke. Usually fine, but huge forms can become slow. Libraries like React Hook Form use uncontrolled inputs for performance.
- More boilerplate per field.

### Rules
- Provide `onChange` (or `readOnly`) whenever you pass `value`, otherwise React warns and the field is frozen.
- Never switch an input between controlled and uncontrolled: avoid `value={undefined}` turning into a string. Initialize with `""`.
- Checkboxes and radios use `checked`; `<select>` and `<textarea>` use `value`.

### React 19 forms
With form Actions (`<form action={fn}>`), many forms do not need controlled inputs at all: read values from `FormData` on submit.
--- code
import { useState } from "react";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [plan, setPlan] = useState("free");

  const emailValid = /^\S+@\S+\.\S+$/.test(email);

  return (
    <form onSubmit={(e) => { e.preventDefault(); console.log({ email, agree, plan }); }}>
      <input value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="Email" />
      {email && !emailValid && <p role="alert">Enter a valid email</p>}

      <select value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>

      <label>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree
      </label>

      <button disabled={!emailValid || !agree}>Sign up</button>
    </form>
  );
}
