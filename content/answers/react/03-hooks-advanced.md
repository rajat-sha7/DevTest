=== r51 | E | Difference between useRef and state?
**Both persist across renders, but updating state triggers a re-render and gives the next render a new snapshot, while changing `ref.current` is a silent, immediate mutation that React does not track. Use state for anything that affects what is displayed, and refs for values the UI does not depend on.**

### Comparison
| | `useState` | `useRef` |
|---|---|---|
| Triggers re-render | yes | no |
| Value update | next render (snapshot) | immediately (`ref.current = x`) |
| Mutable | no, replace via setter | yes |
| Read during render | yes | should not (except lazy init) |
| Typical use | UI data | DOM nodes, timer IDs, previous values, flags |

### Classic examples
- **Interval ID:** store it in a ref, so starting and stopping does not re-render.
- **Latest value in a callback:** a ref updated in an effect lets long-lived callbacks read fresh data. React 19.2's `useEffectEvent` now covers most of these cases more safely.
- **Previous prop:** save it in a ref after render to compare later.
- **Click counter shown on screen:** must be state; with a ref the number would never update visibly.

### Common bug
Using a ref for UI data and wondering why the screen does not change, or reading a ref during render to decide output, which makes rendering impure and breaks with concurrent rendering and the React Compiler (its `refs` lint rule flags this).
--- code
import { useRef, useState } from "react";

export function Compare() {
  const [stateCount, setStateCount] = useState(0);
  const refCount = useRef(0);

  return (
    <div>
      <button onClick={() => setStateCount((c) => c + 1)}>
        State: {stateCount} {/* updates on screen */}
      </button>

      <button
        onClick={() => {
          refCount.current += 1; // changes immediately, but nothing re-renders
          console.log("ref is now", refCount.current);
        }}
      >
        Ref (check console)
      </button>
    </div>
  );
}

// Typical correct ref use: remembering the previous value without re-rendering
// const prev = useRef(value);
// useEffect(() => { prev.current = value; }, [value]);

=== r52 | M | What is useMemo?
**`useMemo(compute, deps)` caches the result of a calculation between renders and recomputes it only when a dependency changes. Use it to skip expensive computations, or to keep an object or array reference stable for memoized children and effect dependencies. With the React Compiler, most manual `useMemo` calls become unnecessary.**

### When it helps
- **Expensive work:** filtering or sorting thousands of rows, parsing, heavy math. Measure first: if it takes under about 1ms, memoizing usually is not worth it.
- **Referential stability:** objects or arrays passed to a `React.memo` child or used in a `useEffect` dependency array.

### When it does not help
- Cheap calculations: the comparison and storage overhead can exceed the work.
- Values that change every render anyway.
- As a semantic guarantee: React may discard the cache (for example during development, or for offscreen content), so code must work correctly without it.

### Rules
- Pure function, no side effects.
- List every reactive value used inside in `deps`.
- Called at the top level like any hook.

### React Compiler (1.0)
The compiler automatically memoizes values and JSX at build time with finer granularity than hand-written `useMemo`. Projects using it can remove most `useMemo` calls; the docs keep `useMemo` as an escape hatch, for example to control an effect's dependencies precisely.

### Better alternatives first
Often the fix is structural: move state down so fewer components re-render, or pass JSX as `children`.
--- code
import { memo, useMemo, useState } from "react";

type Row = { id: number; name: string; score: number };

const Chart = memo(function Chart({ data }: { data: Row[] }) {
  console.log("Chart rendered");
  return <p>Chart with {data.length} points</p>;
});

export function Leaderboard({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Recomputed only when rows or query change, not when darkMode toggles
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q)).toSorted((a, b) => b.score - a.score);
  }, [rows, query]);

  return (
    <div className={darkMode ? "dark" : ""}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setDarkMode((d) => !d)}>Theme</button>
      <Chart data={visible} /> {/* stable reference: no re-render on theme toggle */}
    </div>
  );
}

=== r53 | M | What is useCallback?
**`useCallback(fn, deps)` returns the same function reference across renders until a dependency changes. It does not make functions faster; it keeps their identity stable so memoized children (`React.memo`) do not re-render and effects that depend on the function do not re-run. The React Compiler now handles this automatically in most code.**

### Equivalent to
`useCallback(fn, deps)` is the same as `useMemo(() => fn, deps)`.

### When it matters
- Passing a callback to a child wrapped in `React.memo`.
- A function used as a dependency of `useEffect` or another hook in a child or custom hook.
- Returning functions from a custom hook so consumers can depend on them.
- Passing callbacks to context values (memoize the whole value).

### When it does not
- Callbacks passed to plain DOM elements (`<button onClick>`): DOM elements do not care about identity.
- Children that are not memoized: they re-render anyway.

### Avoiding stale closures
If the callback reads state, list it in `deps`, or use the updater form (`setCount((c) => c + 1)`) so the callback needs fewer dependencies.

### Modern alternatives
- **React Compiler:** memoizes callbacks automatically; keep `useCallback` only where you need precise control.
- **`useEffectEvent` (React 19.2):** for functions called from effects that should read the latest props without re-running the effect. It replaces many `useCallback` + ref workarounds.
--- code
import { memo, useCallback, useState } from "react";

const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
}: {
  todo: { id: number; text: string; done: boolean };
  onToggle: (id: number) => void;
}) {
  console.log("render", todo.id);
  return (
    <li>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} /> {todo.text}
    </li>
  );
});

export function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn hooks", done: false },
    { id: 2, text: "Ship", done: false },
  ]);
  const [filter, setFilter] = useState("");

  // Stable identity: typing in the filter does not re-render every TodoItem
  const toggle = useCallback((id: number) => {
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))); // updater: no deps needed
  }, []);

  return (
    <>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul>{todos.filter((t) => t.text.includes(filter)).map((t) => <TodoItem key={t.id} todo={t} onToggle={toggle} />)}</ul>
    </>
  );
}

=== r54 | E | Difference: useMemo vs useCallback?
**`useMemo` caches a value returned by a function; `useCallback` caches the function itself. `useCallback(fn, deps)` is shorthand for `useMemo(() => fn, deps)`. Both recompute only when dependencies change and both exist to avoid unnecessary work or keep references stable.**

### Side by side
| | `useMemo` | `useCallback` |
|---|---|---|
| Returns | the result of calling `compute()` | `fn` itself |
| Typical use | expensive derived data, stable objects/arrays | stable callbacks for memoized children or effect deps |
| Example | `useMemo(() => items.filter(f), [items, f])` | `useCallback((id) => remove(id), [remove])` |

### Shared rules
- Dependencies must include every reactive value used.
- They are performance hints; correct code must not rely on them for behavior.
- Both are pointless if the consumer does not care about identity or the computation is trivial.

### Choosing quickly
- "I need the **result** of a computation" → `useMemo`.
- "I need to pass a **function** that should not change every render" → `useCallback`.

### With the React Compiler
Both are applied automatically at build time; in compiled code you rarely write either. Know them for interviews, older codebases and the escape-hatch cases.
--- code
import { useCallback, useMemo, useState } from "react";

export function ProductPage({ products }: { products: { id: string; price: number }[] }) {
  const [taxRate, setTaxRate] = useState(0.18);

  // useMemo: caches a VALUE
  const totalWithTax = useMemo(
    () => products.reduce((sum, p) => sum + p.price, 0) * (1 + taxRate),
    [products, taxRate]
  );

  // useCallback: caches a FUNCTION
  const formatPrice = useCallback(
    (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount),
    []
  );

  // Same as the useCallback above:
  // const formatPrice = useMemo(() => (amount: number) => ..., []);

  return (
    <div>
      <p>Total: {formatPrice(totalWithTax)}</p>
      <button onClick={() => setTaxRate((r) => (r === 0.18 ? 0.05 : 0.18))}>Toggle tax</button>
    </div>
  );
}

=== r55 | M | When to use memoization?
**Memoize when you have measured a real performance problem: an expensive calculation that re-runs needlessly, or a slow child component that re-renders with identical props. Otherwise prefer simpler fixes, and in projects using the React Compiler let it memoize automatically.**

### Good reasons
- **Profiler shows** a component or computation taking significant time on frequent renders.
- **Large lists or tables** where each row re-renders on unrelated state changes.
- **Stable references required:** objects or functions used in effect dependencies, context values, or props to `React.memo` components.
- **Expensive derived data:** sorting or filtering thousands of items, heavy formatting, parsing.

### Reasons to skip it
- The work is cheap (under about 1ms): memoization has its own overhead and adds noise.
- The props change on every render anyway.
- The real problem is architecture.

### Fix structure first
1. **Move state down:** keep fast-changing state (input text, hover) in the smallest component that needs it.
2. **Lift content up:** pass expensive subtrees as `children` so they are not re-created by the stateful wrapper.
3. **Split context** so consumers only re-render for values they use.
4. **Virtualize** long lists.
5. **Use transitions** (`useTransition`, `useDeferredValue`) so heavy updates do not block typing.

### React Compiler
Version 1.0 (October 2025) memoizes components, JSX and values automatically and more precisely than hand-written code. It is available in Vite templates (`react-compiler-ts`), Next.js (`reactCompiler: true`) and Expo. With it, manual `memo`, `useMemo` and `useCallback` become rare escape hatches.
--- code
import { useState } from "react";

// Instead of memoizing, move fast-changing state down
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [text, setText] = useState(""); // typing re-renders only this component
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(text); }}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </form>
  );
}

function ExpensiveReport({ query }: { query: string }) {
  // imagine heavy rendering here
  return <p>Report for “{query}”</p>;
}

export function Dashboard() {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchInput onSearch={setQuery} />
      <ExpensiveReport query={query} /> {/* re-renders only on submit, not on every keystroke */}
    </>
  );
}

// With the React Compiler enabled (vite template react-compiler-ts, or Next.js reactCompiler: true),
// components like these are memoized automatically at build time.

=== r56 | M | What is React.memo?
**`memo(Component)` returns a memoized version of a component that skips re-rendering when its props are shallowly equal to the previous props. It helps when a component re-renders often with the same props and its render is expensive. It does not stop re-renders caused by the component's own state or by contexts it reads.**

### How it compares props
- Shallow comparison with `Object.is` for each prop.
- New object, array or function props break it unless their references are stable (`useMemo`, `useCallback`, constants).
- A custom `arePropsEqual(prev, next)` can be passed as the second argument, but it is easy to get wrong and can hide bugs.

### When it helps
- Rows in large lists where the parent re-renders often.
- Heavy components (charts, editors) beneath frequently updating parents.
- Components whose props are primitives or already stable.

### When it does not
- Props change every render anyway.
- The component is cheap to render.
- `children` is passed as JSX: a new element object each render means props are never equal.

### Still re-renders when
- Its own state changes.
- A context it uses changes.
- Its parent passes new references.

### React Compiler
The compiler memoizes components and their JSX automatically, which makes most manual `memo` usage unnecessary. Components optimized this way show a "Memo ✨" badge in React DevTools.
--- code
import { memo, useCallback, useState } from "react";

type RowProps = { id: number; label: string; onSelect: (id: number) => void };

const Row = memo(function Row({ id, label, onSelect }: RowProps) {
  console.log("Row render", id); // logs only when this row's props change
  return <li onClick={() => onSelect(id)}>{label}</li>;
});

export function List({ items }: { items: { id: number; label: string }[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const onSelect = useCallback((id: number) => setSelected(id), []); // stable, so memo works

  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>Re-render parent ({tick})</button>
      <p>Selected: {selected ?? "none"}</p>
      <ul>
        {items.map((it) => (
          <Row key={it.id} id={it.id} label={it.label} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

=== r57 | E | What is a custom hook?
**A custom hook is a JavaScript function whose name starts with `use` and that calls other hooks. It extracts reusable stateful logic (fetching, subscriptions, form handling, media queries) out of components. Each component that calls it gets its own independent state.**

### Rules
- Name it `useSomething`, so React and the linter know hook rules apply.
- Call hooks only at its top level, like in components.
- It can take arguments and return anything: a value, a tuple, an object, functions.

### What it shares and what it does not
- Shares **logic**, not **state**. Two components calling `useCounter()` each get their own counter.
- To share state, put it in context or a store and expose it through a hook (`useCart()` reading a Zustand store).

### Good custom hooks
- Focused on one concern: `useOnlineStatus`, `useDebounce`, `useLocalStorage`, `useMediaQuery`, `useIntersection`.
- Describe the **purpose**, not the lifecycle: `useChatRoom(roomId)` rather than `useMount`.
- Return stable function references when consumers may use them as dependencies.
- Clean up their effects.

### Before writing one
Check whether a library already solves it well: TanStack Query or SWR for fetching, React Hook Form for forms, `usehooks-ts` for small utilities. For external stores, build on `useSyncExternalStore`.

### Testing
`renderHook` from React Testing Library renders a hook in isolation.
--- code
import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // sync if the query changed
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Each component gets its own state from the same logic
export function Nav() {
  const isMobile = useMediaQuery("(max-width: 640px)");
  return isMobile ? <button aria-label="Menu">☰</button> : <nav>Home · Docs · Blog</nav>;
}

export function Hero() {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return <div className={prefersReducedMotion ? "" : "animate-fade-in"}>Welcome</div>;
}

=== r58 | E | What are the Rules of Hooks?
**There are two rules: call hooks only at the top level of a function component or custom hook, never inside conditions, loops, nested functions or after an early return; and call hooks only from React function components or custom hooks, never from regular functions or class components. React relies on the call order being identical every render.**

### Rule 1: top level only
- Not in `if`, `for`, `while`, `switch`, `try/catch` blocks.
- Not after a conditional `return`.
- Not inside event handlers, `useMemo`/`useEffect` callbacks or other nested functions.
- The exception is React 19's `use(...)` API, which can be called conditionally.

### Rule 2: only from React functions
- Function components (capitalized) and custom hooks (`use` prefix).
- Not from plain utility functions, class components or code outside React.

### Why
React stores each component's hook state in a list, in call order. If a hook is skipped on one render, every later hook reads the wrong slot.

### How to handle conditional logic
Call the hook unconditionally and put the condition inside it: `useEffect(() => { if (!enabled) return; ... }, [enabled])`. Or split into separate components and render them conditionally.

### Enforcement
`eslint-plugin-react-hooks` (v7) provides `rules-of-hooks` and `exhaustive-deps`, plus React Compiler-powered rules (such as `refs`, `set-state-in-render`, `set-state-in-effect`, purity checks). Its `recommended` config is flat-config by default since v6. The React Compiler also refuses to optimize components that break the rules.

### Also good practice
Components and hooks should be pure: same inputs, same output, no side effects during render.
--- code
import { useEffect, useState } from "react";

export function Profile({ userId }: { userId?: string }) {
  // Wrong: hook after an early return / inside a condition
  // if (!userId) return <p>Sign in</p>;
  // const [user, setUser] = useState(null);

  // Right: always call hooks, then branch
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!userId) return; // condition INSIDE the hook
    let ignore = false;
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((u) => !ignore && setUser(u));
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (!userId) return <p>Sign in</p>;
  return <p>{user ? user.name : "Loading…"}</p>;
}

// eslint.config.js (flat config)
// import reactHooks from "eslint-plugin-react-hooks";
// export default [reactHooks.configs.flat.recommended];

=== r59 | M | What is useReducer?
**`useReducer(reducer, initialState)` manages state with a reducer function `(state, action) => newState`. It returns `[state, dispatch]`; you call `dispatch({ type: "added", item })` and React computes the next state with your reducer. It is useful when state has several fields or when many different events update it.**

### Parts
- **State:** any value, usually an object.
- **Actions:** objects describing what happened (`{ type: "item_removed", id }`).
- **Reducer:** a pure function that returns the next state for each action. No side effects, no mutation (return new objects).
- **Dispatch:** stable across renders, safe to pass down or omit from dependency arrays.
- **Lazy init:** `useReducer(reducer, arg, init)` computes the initial state once.

### Benefits
- All update logic in one place, easy to read and unit test without rendering.
- Event handlers just describe what happened.
- Prevents impossible state combinations when modeling a state machine (`status: "idle" | "loading" | "success" | "error"`).
- Pairs with context to share state and `dispatch` across a subtree (a lightweight Redux).

### Tips
- Name actions after events ("submitted", "item_added"), not setters.
- TypeScript discriminated unions make actions type-safe.
- Immer's `useImmerReducer` lets you write mutating-style reducers.
- Throw or warn on unknown action types.
--- code
import { useReducer } from "react";

type Item = { id: string; name: string; qty: number };
type State = { items: Item[]; coupon?: string };
type Action =
  | { type: "added"; item: Item }
  | { type: "removed"; id: string }
  | { type: "qty_changed"; id: string; qty: number }
  | { type: "coupon_applied"; code: string };

function cartReducer(state: State, action: Action): State {
  switch (action.type) {
    case "added":
      return { ...state, items: [...state.items, action.item] };
    case "removed":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "qty_changed":
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)) };
    case "coupon_applied":
      return { ...state, coupon: action.code };
  }
}

export function Cart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  return (
    <div>
      <button onClick={() => dispatch({ type: "added", item: { id: crypto.randomUUID(), name: "Pen", qty: 1 } })}>Add pen</button>
      {state.items.map((i) => (
        <p key={i.id}>
          {i.name} <input type="number" value={i.qty} onChange={(e) => dispatch({ type: "qty_changed", id: i.id, qty: +e.target.value })} />
          <button onClick={() => dispatch({ type: "removed", id: i.id })}>×</button>
        </p>
      ))}
    </div>
  );
}

=== r60 | M | useReducer vs useState?
**Use `useState` for simple, independent values updated in a few ways. Use `useReducer` when state has several related fields, when the next state depends on the previous in complex ways, or when many events update the same state. Both trigger re-renders the same way; the difference is how you organize update logic.**

### Comparison
| | `useState` | `useReducer` |
|---|---|---|
| Code size | small | more upfront (reducer + actions) |
| Update logic | spread across handlers | centralized in the reducer |
| Readability with many updates | degrades | stays clear |
| Testing | through components | reducer is a pure function, easy to unit test |
| Debugging | `console.log` in handlers | log actions in one place |
| Passing to children | several setters | one stable `dispatch` |

### Signals you should switch to `useReducer`
- Multiple `useState` calls that are always updated together.
- Handlers repeating similar spread logic.
- State that represents a state machine (loading, success, error, retrying).
- Deep updates that are easy to get wrong.

### You can mix
Use `useState` for local toggles and `useReducer` for the main data in the same component.

### Beyond component state
If many components across the app need the same reducer-driven state, combine `useReducer` with context, or move to Redux Toolkit or Zustand.
--- code
import { useReducer, useState } from "react";

// useState: fine for a simple toggle
export function Toggle() {
  const [on, setOn] = useState(false);
  return <button onClick={() => setOn((o) => !o)}>{on ? "On" : "Off"}</button>;
}

// useReducer: a fetch state machine with rules
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string[] }
  | { status: "error"; error: string; retries: number };

type Action = { type: "fetch" } | { type: "resolve"; data: string[] } | { type: "reject"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "fetch":
      return { status: "loading" };
    case "resolve":
      return { status: "success", data: action.data };
    case "reject":
      return { status: "error", error: action.error, retries: state.status === "error" ? state.retries + 1 : 1 };
  }
}

export function Loader() {
  const [state, dispatch] = useReducer(reducer, { status: "idle" });
  async function load() {
    dispatch({ type: "fetch" });
    try {
      const data = await fetch("/api/items").then((r) => r.json());
      dispatch({ type: "resolve", data });
    } catch (e) {
      dispatch({ type: "reject", error: (e as Error).message });
    }
  }
  return <button onClick={load}>{state.status === "loading" ? "Loading…" : "Load"}</button>;
}

=== r61 | M | What is useLayoutEffect?
**`useLayoutEffect` has the same API as `useEffect`, but it runs synchronously after React updates the DOM and before the browser paints. Use it for reading layout (sizes, positions) and making a change that must be visible in the same frame, such as positioning a tooltip, to avoid flicker. It blocks painting, so use it sparingly.**

### Typical uses
- Measure an element (`getBoundingClientRect`) and position a tooltip, popover or dropdown.
- Adjust scroll position before the user sees the update (keep a chat scrolled to the bottom).
- Synchronously sync layout-dependent state, such as whether text overflows.

### Timing
1. React renders and commits DOM changes.
2. `useLayoutEffect` callbacks run (state updates here re-render synchronously before paint).
3. The browser paints.
4. `useEffect` callbacks run.

### Costs
- Blocks the paint, so slow code here delays what the user sees.
- On the server it does nothing (there is no layout). React no longer warns about this since React 19, but the effect only runs on the client, so make the first render correct without it.

### Alternatives
- **CSS** solves many layout needs (`position: sticky`, container queries, anchor positioning).
- **Floating UI** handles tooltip and popover positioning, including collision detection.
- **`useInsertionEffect`** is for CSS-in-JS libraries injecting styles before layout effects; app code rarely needs it.
- **Fragment refs** (React 19.3) can measure a group of children with `getClientRects()` without a wrapper.
--- code
import { useLayoutEffect, useRef, useState } from "react";

export function Tooltip({ anchorRect, text }: { anchorRect: DOMRect; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    // Measure before paint, so the tooltip never flashes in the wrong spot
    const height = ref.current!.getBoundingClientRect().height;
    const above = anchorRect.top - height - 8;
    setTop(above > 0 ? above : anchorRect.bottom + 8); // flip below if no room above
  }, [anchorRect]);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ position: "fixed", left: anchorRect.left, top, background: "#111", color: "#fff", padding: 6 }}
    >
      {text}
    </div>
  );
}

=== r62 | M | Difference: useEffect vs useLayoutEffect?
**Both run after React commits DOM changes, but `useEffect` runs after the browser paints (non-blocking), while `useLayoutEffect` runs before paint (blocking). Use `useEffect` by default; use `useLayoutEffect` only when you must measure or change layout before the user sees the frame.**

### Comparison
| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| Timing | after paint | after DOM mutation, before paint |
| Blocks rendering | no | yes |
| Visual flicker risk | possible for layout changes | avoided |
| Server rendering | does not run | does not run |
| Typical use | fetching, subscriptions, logging, timers | measuring, positioning, scroll adjustments |

### Example of the difference
A tooltip positioned in `useEffect` first paints at a default position, then jumps: a visible flicker. In `useLayoutEffect`, measurement and correction happen before paint, so the user sees only the final position.

### Performance
Work in `useLayoutEffect` delays every frame it runs in. Keep it small, avoid network calls there, and prefer CSS solutions.

### Order of execution
On each commit: DOM updates, refs attached, layout effect cleanups and setups, paint, then passive effect cleanups and setups. Cleanups always run before the next setup of the same effect.

### Rule of thumb
"Does the user see something wrong for one frame if I use `useEffect`?" If yes, use `useLayoutEffect`. If no, `useEffect`.
--- code
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function useMeasuredWidth(useLayout: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const hook = useLayout ? useLayoutEffect : useEffect; // demo only: never switch hooks at runtime
  hook(() => {
    setWidth(ref.current!.offsetWidth);
  }, []);
  return [ref, width] as const;
}

export function FlickerDemo() {
  // With useEffect the first paint shows width 0, then updates: a flash
  const [refA, widthA] = useMeasuredWidth(false);
  // With useLayoutEffect the first paint already shows the right width
  const [refB, widthB] = useMeasuredWidth(true);

  return (
    <>
      <div ref={refA}>useEffect width: {widthA}px</div>
      <div ref={refB}>useLayoutEffect width: {widthB}px</div>
    </>
  );
}

=== r63 | H | What is useImperativeHandle?
**`useImperativeHandle(ref, () => handle, deps)` customizes what a parent receives through a ref. Instead of exposing the whole DOM node, a component exposes a small object of methods such as `focus()`, `scrollToBottom()` or `play()`. In React 19, `ref` arrives as a normal prop, so you no longer need `forwardRef` to use it.**

### When to use it
- Imperative actions that do not fit props: focus, select text, scroll, play or pause media, open a native dialog, trigger an animation.
- Hiding internals: expose `focus()` but not the input node, so parents cannot mutate styles or the DOM.
- Combining several inner refs into one API.

### When not to
If it can be expressed as props (`isOpen`, `value`), use props. Imperative handles make data flow harder to follow and should be the exception.

### How it works
1. The component receives `ref` as a prop (React 19), or via `forwardRef` in React 18 and earlier.
2. It keeps its own internal refs to DOM nodes.
3. `useImperativeHandle(ref, () => ({ focus() { inputRef.current?.focus(); } }), [])` sets `ref.current` to that object.
4. The parent calls `childRef.current?.focus()` in an event handler or effect.

### TypeScript
Define a handle type and use `React.Ref<Handle>` for the prop; the parent uses `useRef<Handle>(null)`.
--- code
import { useImperativeHandle, useRef } from "react";

export type VideoHandle = { play: () => void; pause: () => void; seek: (t: number) => void };

// React 19: ref is a regular prop, no forwardRef needed
function VideoPlayer({ src, ref }: { src: string; ref?: React.Ref<VideoHandle> }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => void videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (t) => {
      if (videoRef.current) videoRef.current.currentTime = t;
    },
  }), []);

  return <video ref={videoRef} src={src} width={480} />;
}

export function Lesson() {
  const player = useRef<VideoHandle>(null);
  return (
    <div>
      <VideoPlayer ref={player} src="/lesson-1.mp4" />
      <button onClick={() => player.current?.play()}>Play</button>
      <button onClick={() => player.current?.pause()}>Pause</button>
      <button onClick={() => player.current?.seek(60)}>Jump to 1:00</button>
    </div>
  );
}

=== r64 | M | What is forwardRef?
**`forwardRef` wraps a function component so it can receive a `ref` from its parent and pass it to a child element, typically a DOM node. It was required up to React 18. In React 19, function components receive `ref` as a regular prop, so `forwardRef` is no longer needed and the React team plans to deprecate and remove it.**

### React 18 and earlier
`const Input = forwardRef<HTMLInputElement, Props>((props, ref) => <input ref={ref} {...props} />)`. Without it, `ref` was stripped from props and never reached the component.

### React 19
- `function Input({ ref, ...props }) { return <input ref={ref} {...props} /> }`.
- Works with `useImperativeHandle` the same way.
- A codemod converts `forwardRef` usage.
- `forwardRef` still works in 19 for compatibility; libraries that support React 18 still use it.
- Class components still receive refs to their instance, not as a prop.

### Why expose refs
Reusable inputs, buttons and wrappers in design systems need to let parents focus them, measure them, or let libraries (popovers, form libraries such as React Hook Form's `register`) attach to the underlying DOM node.

### Related React 19 ref changes
- Ref callbacks can return a cleanup function.
- `element.ref` is deprecated; refs are props.
- String refs were removed.
- `useRef` requires an argument in TypeScript types (`useRef(null)`).
--- code
import { forwardRef, useRef } from "react";

// React 18 style (still works, but unnecessary in React 19)
export const OldInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function OldInput(props, ref) {
  return <input ref={ref} className="input" {...props} />;
});

// React 19 style: ref is just a prop
export function Input({ ref, ...props }: React.ComponentProps<"input">) {
  return <input ref={ref} className="input" {...props} />;
}

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Input ref={inputRef} placeholder="Search" />
      <button onClick={() => inputRef.current?.focus()}>Focus search</button>
    </div>
  );
}

=== r65 | E | What is useId?
**`useId()` generates a unique ID string that stays the same between server and client renders, so it is safe for server rendering and hydration. Use it to connect accessibility attributes, such as a `<label htmlFor>` with an `<input id>`, or `aria-describedby` with a hint element, in reusable components.**

### Why not `Math.random()` or a counter
- Random IDs differ between the server HTML and the client render, causing hydration mismatches.
- Global counters break with streaming and concurrent rendering, where components can render in different orders.
`useId` derives the ID from the component's position in the tree, so it matches on both sides.

### Usage
- Call once per component and derive related IDs: `const id = useId(); id + "-hint"`.
- The ID contains special characters (React 19.2 uses an `_r_` prefix, earlier versions used colons or `«r»`), so it is valid for `id` attributes but awkward in CSS selectors; do not use it in `querySelector` without escaping.
- `identifierPrefix` on `createRoot`/`hydrateRoot` avoids clashes when several React roots share a page.

### Not for
- **List keys:** keys should come from your data.
- **Database or entity IDs:** use `crypto.randomUUID()` when creating records.

### Accessibility pattern
Every reusable form field should use `useId` so multiple instances on one page never share IDs.
--- code
import { useId } from "react";

export function PasswordField({ label = "Password" }: { label?: string }) {
  const id = useId(); // e.g. "_r_1_" - identical on server and client

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>At least 12 characters, including a number.</p>
    </div>
  );
}

// Two instances on the same page get different ids, no collisions
export function ChangePassword() {
  return (
    <form>
      <PasswordField label="Current password" />
      <PasswordField label="New password" />
    </form>
  );
}

=== r66 | M | What is useTransition?
**`useTransition()` returns `[isPending, startTransition]`. Wrapping a state update in `startTransition` marks it as non-urgent, so React keeps the UI responsive: urgent updates like typing and clicks interrupt it, the old UI stays on screen instead of showing Suspense fallbacks, and `isPending` lets you show a subtle loading indicator.**

### What transitions do
- **Interruptible rendering:** if the user types again, React abandons the in-progress render and starts over with the latest value.
- **No unwanted fallbacks:** when a transition causes a component to suspend, React keeps showing the previous content.
- **Async functions (React 19):** `startTransition(async () => { await save(); setX(...) })` is an **Action**; `isPending` stays true until it finishes, and errors bubble to error boundaries.
- **Independent rendering (React 19.3):** separate transitions no longer block each other.

### Typical uses
- Switching tabs that render heavy content.
- Filtering a large list (combined with an urgent update for the input itself).
- Navigation in routers (React Router and Next.js wrap navigations in transitions).
- Form submissions and mutations (Actions).

### Rules
- The function you pass runs synchronously; state updates inside it (and after `await` in React 19) are marked as transitions. If you set state after an `await` in an older pattern, wrap that update in another `startTransition`.
- Controlled input values must not be updated inside a transition, or typing lags.
- There is a standalone `startTransition` import for use outside components (no `isPending`).

### Related
`useDeferredValue` defers a value instead of an update. `addTransitionType` (stable in React 19.3) labels transitions for `<ViewTransition>` animations.
--- code
import { useState, useTransition } from "react";

function HeavyList({ filter }: { filter: string }) {
  const items = Array.from({ length: 20_000 }, (_, i) => `Item ${i}`);
  return <ul>{items.filter((i) => i.includes(filter)).slice(0, 200).map((i) => <li key={i}>{i}</li>)}</ul>;
}

export function FilterableList() {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value); // urgent: input stays responsive
          startTransition(() => setFilter(e.target.value)); // non-urgent: can be interrupted
        }}
      />
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        <HeavyList filter={filter} />
      </div>
    </div>
  );
}

// React 19 Action: async transition with pending state
// const [saving, start] = useTransition();
// <button disabled={saving} onClick={() => start(async () => { await saveDraft(text); })}>Save</button>

=== r67 | M | What is useDeferredValue?
**`useDeferredValue(value, initialValue?)` returns a lagging copy of a value. On urgent updates React first re-renders with the old deferred value, then renders again in the background with the new one, interrupting that background render if the value changes again. Use it to keep input responsive while a slow part of the UI catches up.**

### `useTransition` vs `useDeferredValue`
- **`useTransition`:** you control the state update and wrap it in `startTransition`.
- **`useDeferredValue`:** you receive a value (often a prop or state you do not control) and defer the expensive rendering that depends on it.

### Patterns
- **Search as you type:** `const deferredQuery = useDeferredValue(query)` and render results from `deferredQuery`. The input updates immediately.
- **Show stale content while loading:** with Suspense-enabled data, the old results stay visible while new ones load, instead of a fallback flashing.
- **Detect staleness:** `const isStale = query !== deferredQuery` to dim results.
- **Initial value (React 19):** `useDeferredValue(value, "")` renders the initial value first, then the real value in the background, useful for a fast first render.

### Requirements
- The slow component must be memoized (`memo`, or compiled by the React Compiler), otherwise it re-renders with the urgent update anyway and nothing is gained.
- It is not debouncing: there is no fixed delay, and on fast devices the deferred render happens almost immediately. For limiting network requests, still debounce.

### Pairs well with
`<Suspense>` and `use(promise)` for data, and `<ViewTransition>` animations (deferred updates can trigger them).
--- code
import { memo, useDeferredValue, useState } from "react";

const SlowResults = memo(function SlowResults({ query }: { query: string }) {
  const start = performance.now();
  while (performance.now() - start < 30) {} // simulate slow rendering
  return <p>Results for “{query}”</p>;
});

export function Search() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // lags behind while rendering
  const isStale = query !== deferredQuery;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" />
      <div style={{ opacity: isStale ? 0.5 : 1, transition: "opacity 150ms" }}>
        <SlowResults query={deferredQuery} />
      </div>
    </div>
  );
}

=== r68 | M | What is batching?
**Batching means React groups multiple state updates into a single re-render instead of rendering after each one. Since React 18, batching is automatic everywhere: in event handlers, promises, `setTimeout`, native event listeners and any other context.**

### Before and after React 18
- **React 17 and earlier:** only updates inside React event handlers were batched. Updates in `setTimeout`, promises or native listeners each caused a separate render.
- **React 18+ with `createRoot`:** all updates are batched automatically (the legacy `ReactDOM.render` root kept old behavior and was removed in React 19).

### Why it matters
- Fewer renders, better performance.
- No intermediate "half-updated" UI where one state value changed but another has not yet.

### Consequences
- Reading state right after setting it shows the old value; the new value appears in the next render.
- Several setters in one handler produce one render.
- Updater functions (`setX((prev) => ...)`) are queued and applied in order during that render.

### Opting out
`flushSync(() => setX(value))` from `react-dom` forces a synchronous render and DOM update. Use it only when you must read the updated DOM immediately (for example to scroll to a newly added element) because it hurts performance.

### Related
Transitions are batched separately from urgent updates and can be interrupted.
--- code
import { useState } from "react";
import { flushSync } from "react-dom";

export function BatchDemo() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  console.log("render", { count, flag });

  async function handleClick() {
    // One render for both updates (event handler)
    setCount((c) => c + 1);
    setFlag((f) => !f);

    await new Promise((r) => setTimeout(r, 100));

    // Still one render for both updates (React 18+ batches after await too)
    setCount((c) => c + 1);
    setFlag((f) => !f);
  }

  function forceSync() {
    flushSync(() => setCount((c) => c + 1)); // DOM updated immediately here
    console.log(document.getElementById("count")?.textContent);
  }

  return (
    <div>
      <p id="count">{count}</p>
      <button onClick={handleClick}>Batched updates</button>
      <button onClick={forceSync}>flushSync</button>
    </div>
  );
}

=== r69 | M | What is a stale closure in hooks?
**A stale closure happens when a function created during an earlier render keeps using the props or state from that render, even though newer values exist. Common symptoms are an interval that always logs the initial count, or an event listener that sends outdated data.**

### Why it happens
Each render creates new functions that close over that render's values. If an old function stays alive (registered in a `setInterval`, a subscription, an effect with missing dependencies, a memoized callback with incomplete deps), it keeps seeing old values.

### Fixes
1. **Correct dependencies:** list every reactive value in `useEffect`, `useCallback` and `useMemo` dependency arrays, so functions are recreated with fresh values. The `exhaustive-deps` lint rule helps.
2. **Updater functions:** `setCount((c) => c + 1)` reads the latest state without capturing `count`.
3. **`useEffectEvent` (React 19.2):** wrap logic that should always read the latest props or state but must not re-trigger an effect. The Effect Event function always sees current values.
4. **Refs:** store the latest value in a ref (`latest.current = value` in an effect) and read the ref in long-lived callbacks. The older pattern, now mostly replaced by `useEffectEvent`.
5. **`useReducer`:** dispatching actions avoids reading state inside the callback.

### Interview example
`useEffect(() => { const id = setInterval(() => setCount(count + 1), 1000); return () => clearInterval(id); }, [])` stops at 1, because `count` is always 0 inside the closure. Use `setCount((c) => c + 1)`.
--- code
import { useEffect, useEffectEvent, useState } from "react";

export function StaleDemo({ userName }: { userName: string }) {
  const [count, setCount] = useState(0);

  // Bug: stale closure, count is always 0 inside the interval
  // useEffect(() => {
  //   const id = setInterval(() => setCount(count + 1), 1000);
  //   return () => clearInterval(id);
  // }, []);

  // Fix 1: updater function
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Fix 2 (React 19.2): Effect Event reads the latest userName and count
  const logTick = useEffectEvent(() => {
    console.log(`${userName} has watched for ${count}s`);
  });

  useEffect(() => {
    const id = setInterval(logTick, 5000); // not restarted when userName or count change
    return () => clearInterval(id);
  }, []);

  return <p>{count}s</p>;
}

=== r70 | M | How to avoid infinite loops in useEffect?
**Infinite loops happen when an effect updates state that is also one of its dependencies (or when there is no dependency array), so each update re-runs the effect. Fix them by listing correct dependencies, avoiding state updates that are not needed, comparing before setting, keeping object and function dependencies stable, and moving derived data out of effects.**

### Common causes and fixes
1. **No dependency array** with `setState` inside: add the correct array.
2. **Setting a dependency in the effect:** `useEffect(() => setCount(count + 1), [count])`. Ask whether the effect is needed at all; if it computes derived data, calculate during render instead.
3. **Objects or arrays created in render as dependencies:** `const options = { page }` is new every render. Move it inside the effect, depend on primitives, or memoize.
4. **Functions as dependencies:** move them into the effect, define them outside the component, wrap in `useCallback`, or use `useEffectEvent` for non-reactive logic.
5. **Fetching then storing an object that is a dependency:** depend on the ID, not the fetched object.
6. **Parent passes a new callback each render** that the child's effect depends on: stabilize it in the parent (or with the React Compiler).

### Guards
Only update when something actually changed: `if (next !== current) setValue(next)`.

### Tools
- `exhaustive-deps` ESLint rule and the React Compiler lint rule `set-state-in-effect`.
- React throws "Maximum update depth exceeded" for synchronous loops; check the component stack it prints.
- React DevTools Profiler shows which value changed on each render.
--- code
import { useEffect, useMemo, useState } from "react";

type Item = { id: number; price: number };

export function CartTotal({ items, page }: { items: Item[]; page: number }) {
  // Bug: loop - effect sets state it depends on
  // const [total, setTotal] = useState(0);
  // useEffect(() => { setTotal(items.reduce((s, i) => s + i.price, 0)); }, [items, total]);

  // Fix: derived data needs no effect or state
  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);

  // Bug: new object every render -> effect runs every render
  // const query = { page, size: 20 };
  // useEffect(() => { fetchItems(query); }, [query]);

  // Fix: depend on primitives, build objects inside the effect
  const [rows, setRows] = useState<Item[]>([]);
  useEffect(() => {
    let ignore = false;
    const query = new URLSearchParams({ page: String(page), size: "20" });
    fetch(`/api/items?${query}`)
      .then((r) => r.json())
      .then((data) => !ignore && setRows(data));
    return () => {
      ignore = true;
    };
  }, [page]);

  return <p>Total: {total} ({rows.length} rows on page {page})</p>;
}

=== r71 | M | What is a dependency warning?
**A dependency warning comes from the `react-hooks/exhaustive-deps` ESLint rule: "React Hook useEffect has a missing dependency: 'x'". It means the effect (or `useMemo`/`useCallback`) reads a reactive value that is not listed in its dependency array, which risks stale values. The fix is almost never to silence it, but to list the value or restructure the code.**

### What counts as a dependency
Props, state, context values, and anything computed from them during render, including functions and objects defined in the component body. Not needed: state setters, `dispatch`, refs, imported modules, values defined outside the component, and Effect Events from `useEffectEvent`.

### How to resolve it
1. **Add the dependency** if the effect should re-run when it changes.
2. **Move the value inside the effect** if only the effect uses it (functions, option objects).
3. **Move it outside the component** if it does not use props or state.
4. **Use an updater function** to stop reading state: `setItems((prev) => [...prev, item])`.
5. **Use `useEffectEvent`** (React 19.2) for logic that should read the latest values but should not cause the effect to re-run, such as logging or showing a notification with the current theme.
6. **Split the effect** if it does two unrelated things.

### Why not disable the rule
`// eslint-disable-next-line react-hooks/exhaustive-deps` hides real bugs (stale closures, missed updates) and stops the React Compiler from safely optimizing that code.

### Setup
`eslint-plugin-react-hooks` v7 with the flat `recommended` config; it also includes React Compiler-powered rules.
--- code
import { useEffect, useEffectEvent, useState } from "react";

export function Notifications({ userId, soundOn }: { userId: string; soundOn: boolean }) {
  const [items, setItems] = useState<string[]>([]);

  // Warning version:
  // useEffect(() => {
  //   const es = new EventSource(`/api/notify/${userId}`);
  //   es.onmessage = (e) => { setItems([...items, e.data]); if (soundOn) beep(); };
  //   return () => es.close();
  // }, [userId]); // missing: items, soundOn

  const onNotification = useEffectEvent((text: string) => {
    if (soundOn) new Audio("/ding.mp3").play(); // reads latest soundOn, not a dependency
    setItems((prev) => [...prev, text]); // updater: no need to read items
  });

  useEffect(() => {
    const es = new EventSource(`/api/notify/${userId}`);
    es.onmessage = (e) => onNotification(String(e.data));
    return () => es.close();
  }, [userId]); // complete: only reconnect when the user changes

  return <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

=== r72 | E | What is cleanup in hooks?
**Cleanup is the function returned from `useEffect`, `useLayoutEffect` or `useInsertionEffect` (and, in React 19, from callback refs) that undoes what the setup did. React calls it before re-running the effect with new values and when the component unmounts, which prevents leaks, duplicate subscriptions and updates from stale async work.**

### What needs cleanup
| Setup | Cleanup |
|---|---|
| `addEventListener` | `removeEventListener` |
| `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| `fetch` | `AbortController.abort()` or an `ignore` flag |
| WebSocket / EventSource | `.close()` |
| `IntersectionObserver` / `ResizeObserver` | `.disconnect()` |
| Third-party widget init | its `destroy()` |
| Store subscription | the returned `unsubscribe` |
| Animation (`requestAnimationFrame`) | `cancelAnimationFrame` |

### When it runs
- Before the next setup when dependencies change (with the old values).
- On unmount.
- When an `<Activity>` boundary becomes hidden (React 19.2).
- In development Strict Mode, once immediately after the first mount to verify symmetry.

### Ref cleanup (React 19)
`<div ref={(node) => { const ro = new ResizeObserver(cb); ro.observe(node); return () => ro.disconnect(); }} />`. Previously React called the ref with `null`.

### A good test
If an effect is set up, cleaned up and set up again (as Strict Mode does), the user should not notice anything.
--- code
import { useEffect, useState } from "react";

export function LiveCursor({ roomId }: { roomId: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const ws = new WebSocket(`wss://cursors.example.com/${roomId}`);
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ x: e.clientX, y: e.clientY }));
      });
    };
    window.addEventListener("pointermove", onMove);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      ws.close();
    };
  }, [roomId]);

  // React 19 ref cleanup
  const observe = (node: HTMLDivElement) => {
    const ro = new ResizeObserver(() => console.log("resized"));
    ro.observe(node);
    return () => ro.disconnect();
  };

  return <div ref={observe}>Cursor at {pos.x}, {pos.y}</div>;
}

=== r73 | E | What is a side effect?
**A side effect is anything a function does beyond computing its return value: changing something outside itself, such as making network requests, modifying the DOM directly, setting timers, writing to storage, logging, or mutating external variables. In React, rendering must be free of side effects; they belong in event handlers or effects.**

### Examples
- Fetching data or posting to an API.
- Subscribing to WebSockets, events or stores.
- Starting timers.
- Reading or writing `localStorage`, cookies, `document.title`.
- Imperative DOM manipulation, focusing elements, integrating third-party widgets.
- Analytics and logging.
- Mutating objects created outside the component (including props and state).

### Where they go in React
1. **Event handlers** for effects caused by a user action (submitting a form, clicking "Buy"). This is the preferred place.
2. **`useEffect`** for synchronizing with an external system because the component is displayed (connecting to a chat room while the room view is visible).
3. **Actions** (React 19): async transitions and form actions for mutations, with pending and error handling.
4. **Data libraries and frameworks** for fetching: TanStack Query, SWR, loaders, Server Components.

### Why rendering must be pure
React may render a component multiple times, pause or discard renders (concurrent rendering), and Strict Mode intentionally double-renders in development. Side effects during render would run unpredictably. The React Compiler also assumes components and hooks are pure.
--- code
import { useEffect, useState } from "react";

let renderCount = 0; // module-level variable

export function Article({ id }: { id: string }) {
  const [liked, setLiked] = useState(false);

  // Side effect during render: impure, runs an unpredictable number of times
  // renderCount++; localStorage.setItem("lastArticle", id); fetch(`/api/view/${id}`);

  // Effect: synchronize with an external system while displayed
  useEffect(() => {
    document.title = `Article ${id}`;
    navigator.sendBeacon?.("/api/view", id);
  }, [id]);

  // Event handler: side effect caused by a specific user action
  async function like() {
    setLiked(true);
    await fetch(`/api/articles/${id}/like`, { method: "POST" });
  }

  return <button onClick={like} disabled={liked}>{liked ? "Liked" : "Like"} {renderCount}</button>;
}

=== r74 | M | What is the render cycle?
**The render cycle is how React turns a state change into updated pixels: an update is triggered, React renders the affected components to compute new JSX, reconciles it with the previous tree, commits the DOM changes, and then runs layout effects, lets the browser paint, and runs passive effects.**

### Steps
1. **Trigger:** initial `root.render`, `setState`, `dispatch`, context value change, or `useSyncExternalStore` store change.
2. **Schedule:** React queues the update with a priority (urgent input vs transition) and batches updates.
3. **Render:** React calls the component that changed and its descendants (unless memoized), producing new elements. This phase must be pure and may be paused, restarted or thrown away.
4. **Reconcile:** diff against the previous fiber tree using element types and keys.
5. **Commit:** apply DOM mutations, update refs (running ref cleanups), run layout effect cleanups and setups.
6. **Paint:** the browser draws the frame.
7. **Passive effects:** `useEffect` cleanups and setups run.

### What does not re-render
Parents and siblings of the updated component, unless they also changed. Memoized children with equal props also skip rendering.

### Concurrent features
- Transitions render in the background and can be interrupted by urgent updates.
- Suspense boundaries can show fallbacks while parts of the tree wait for data.
- `<Activity mode="hidden">` content renders at low priority and keeps state without running effects.

### Interview tip
Separate "render" (calling your function) from "commit" (touching the DOM). A component can render without anything changing in the DOM.
--- code
import { useEffect, useLayoutEffect, useState } from "react";

function Child({ value }: { value: number }) {
  console.log("  render Child", value);
  return <p>Child sees {value}</p>;
}

export function RenderCycle() {
  const [value, setValue] = useState(0);
  console.log("1) render RenderCycle", value);

  useLayoutEffect(() => {
    console.log("3) layout effect (DOM updated, not painted yet)");
  }, [value]);

  useEffect(() => {
    console.log("4) passive effect (after paint)");
  }, [value]);

  return (
    <div>
      {/* 2) commit: React updates only the text nodes that changed */}
      <button onClick={() => setValue((v) => v + 1)}>Trigger update</button>
      <Child value={value} />
    </div>
  );
}

=== r75 | M | What is hook call order?
**React identifies each hook by the order in which it is called during a component's render, not by name. On every render the component must call the same hooks in the same order, so the first `useState` always maps to the first state slot, the second to the second, and so on.**

### How React stores hooks
Each component instance (fiber) has a linked list of hook states. During render, React walks the list as your code calls hooks: `useState` number 1 reads slot 1, `useEffect` number 2 reads slot 2. There are no names or keys involved.

### What breaks the order
- Calling a hook inside an `if`, loop or `switch`.
- An early `return` before some hooks.
- Calling hooks inside nested functions or event handlers.
- Calling hooks a variable number of times (in a `.map()`).

If a hook is skipped, every later hook reads another hook's state. React detects some of this and throws "Rendered fewer hooks than expected" or warns that the order changed.

### The `use` exception
React 19's `use(promise)` and `use(context)` can be called conditionally because they do not store state in the hook list.

### How to write conditional logic correctly
- Call all hooks at the top, then branch in JSX.
- Put conditions inside effects: `useEffect(() => { if (!enabled) return; ... })`.
- Extract a child component and render it conditionally; its hooks belong to its own instance.
- For a dynamic number of items, render a component per item.
--- code
import { useEffect, useState } from "react";

export function Order({ showCoupon }: { showCoupon: boolean }) {
  // Render 1 (showCoupon = true):  slot1 useState(qty), slot2 useState(coupon), slot3 useEffect
  // Render 2 (showCoupon = false): if useState(coupon) were inside `if`, slot2 would be the effect -> broken

  // Wrong:
  // const [qty, setQty] = useState(1);
  // if (showCoupon) { const [coupon, setCoupon] = useState(""); }
  // useEffect(() => {}, [qty]);

  // Right: same order every render
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  useEffect(() => {
    document.title = `Qty ${qty}`;
  }, [qty]);

  return (
    <div>
      <input type="number" value={qty} onChange={(e) => setQty(+e.target.value)} />
      {showCoupon && <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon" />}
    </div>
  );
}

=== r76 | E | Why hooks cannot be conditional?
**Hooks cannot be called conditionally because React matches each hook call to its stored state purely by call order. If a condition skips a hook on some renders, the order shifts and later hooks receive the wrong state, producing bugs or errors such as "Rendered fewer hooks than expected".**

### Illustration
Render 1 calls `useState(name)`, `useState(email)`, `useEffect`. If on render 2 the `name` hook is skipped, React gives the `email` hook the stored `name` value and the effect the `email` slot. The data is silently mixed up.

### Why React chose call order
- No need to invent unique keys for every hook.
- Custom hooks compose naturally: a hook can call other hooks and each gets its own slots.
- It is fast and simple.

### What to do instead
1. **Condition inside the hook:** `useEffect(() => { if (!isOpen) return; ... }, [isOpen])`.
2. **Always call, ignore the result** when not needed.
3. **Conditional components:** `{isAdmin && <AdminTools />}`; `AdminTools` has its own hooks.
4. **Pass a flag to custom hooks:** `useQuery({ enabled: !!userId })` (TanStack Query) or a `null` key in SWR.
5. **`use()`** (React 19) for reading promises or context can be called inside `if`, loops and after early returns.

### Enforcement
The `rules-of-hooks` ESLint rule reports conditional hook calls at build time, and the React Compiler skips components that break the rules.
--- code
import { use, useEffect, useState } from "react";
import { ThemeContext } from "./theme";

export function Panel({ isOpen, userId }: { isOpen: boolean; userId?: string }) {
  // Wrong: conditional hook
  // if (isOpen) { useEffect(() => trapFocus(), []); }

  // Right: hook always called, condition inside
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && console.log("close");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  // OK: `use` may be called after an early return or inside conditions (React 19)
  const theme = use(ThemeContext);

  return (
    <div className={theme}>
      {userId && <p>Editing as {userId}</p>}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
    </div>
  );
}

=== r77 | E | Custom hook example?
**A classic example is `useLocalStorage(key, initialValue)`: it works like `useState` but persists the value in `localStorage`, reads it lazily on first render, handles JSON errors, and stays in sync across browser tabs through the `storage` event.**

### What makes it a good custom hook
- **Familiar API:** returns `[value, setValue]` like `useState`, including updater functions.
- **Lazy initialization:** reads storage only once.
- **Safe parsing:** falls back to the initial value on invalid JSON or when storage is unavailable (private mode, server rendering).
- **Cross-tab sync:** listens for `storage` events and updates when another tab changes the key.
- **Cleanup:** removes the listener on unmount.

### Variations
- `useSessionStorage` with the same shape.
- A version built on `useSyncExternalStore` for multiple components on the same page sharing one key.
- Libraries: `usehooks-ts` provides a well-tested `useLocalStorage`.

### Server rendering note
`localStorage` does not exist on the server. In SSR frameworks, render the initial value on the server and read storage after hydration (or use `useSyncExternalStore` with a server snapshot) to avoid hydration mismatches.
--- code
import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue; // invalid JSON or storage blocked
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(e.newValue ? JSON.parse(e.newValue) : initialValue); // other tabs
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initialValue]);

  return [value, set] as const;
}

// const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");

=== r78 | M | How to share logic via hooks?
**Extract the stateful logic into a custom hook (`useSomething`) that calls built-in hooks and returns what components need. Every component that calls it gets its own copy of the state with the same behavior. To share the same state, put it in context or an external store and expose it through a hook.**

### Steps
1. Find repeated logic: the same `useState` + `useEffect` pattern in several components.
2. Move it into `function useX(params) { ... }`.
3. Return a clear API: a value, a tuple, or an object with values and actions.
4. Replace the duplicated code with `const x = useX(...)`.

### Sharing logic vs sharing state
- **Logic:** `useOnlineStatus()` in two components subscribes twice and gives each its own state, which is fine because both read the same browser value.
- **State:** a shopping cart must be the same everywhere. Use context + `useReducer`, or a store like Zustand, and expose `useCart()`.
- **External sources:** build on `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` for browser APIs or custom stores; it is concurrency-safe and supports SSR.

### Composition
Custom hooks can call other custom hooks: `useSearch` uses `useDebounce` and `useQuery`.

### Compared to older patterns
Higher-order components and render props also share logic but add wrapper layers and prop collisions. Hooks share logic without changing the component tree.

### Testing
Use `renderHook` from React Testing Library, and test the store or reducer separately.
--- code
import { useSyncExternalStore } from "react";

// One external store shared by every component (state is shared, not copied)
type CartItem = { id: string; name: string };
let items: CartItem[] = [];
const listeners = new Set<() => void>();

export const cartStore = {
  add(item: CartItem) {
    items = [...items, item];
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => items,
};

// The hook exposes the shared state to any component
export function useCart() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, () => items);
}

export function CartBadge() {
  const cart = useCart();
  return <span>🛒 {cart.length}</span>;
}

export function AddButton() {
  return <button onClick={() => cartStore.add({ id: crypto.randomUUID(), name: "Pen" })}>Add</button>;
}

=== r79 | M | Hook performance optimization?
**Optimize hooks by avoiding work instead of caching it: derive values during render instead of syncing them with effects, keep state as local as possible, stabilize dependencies, split contexts, use transitions for heavy updates, and memoize only measured hot spots. With the React Compiler, most manual `useMemo`, `useCallback` and `memo` usage can be dropped.**

### Checklist
1. **Remove unnecessary effects:** derived data computed in render avoids an extra render pass per change.
2. **Lazy initial state:** `useState(() => expensive())` runs the computation once.
3. **Colocate state:** fast-changing state (input text, hover) in the smallest component, so fewer components re-render.
4. **Stable dependencies:** move objects and functions inside effects, depend on primitives, use updater functions, and `useEffectEvent` for non-reactive logic.
5. **Context:** memoize provider values and split contexts by update frequency. For large global state, use a store with selectors (Zustand, Redux) so components subscribe to slices.
6. **Transitions:** `useTransition` and `useDeferredValue` keep typing responsive during heavy renders.
7. **Memoization:** `useMemo` for measured expensive computations, `useCallback` + `memo` for expensive children.
8. **Avoid creating components inside components** (remounts and lost state).
9. **Virtualize long lists.**
10. **Debounce or throttle** high-frequency events (scroll, resize, typing that triggers fetches).

### React Compiler
Version 1.0 memoizes automatically at build time. Enable it via the Vite `react-compiler-ts` template, `babel-plugin-react-compiler`, or `reactCompiler: true` in Next.js, and use the `eslint-plugin-react-hooks` compiler rules to find code it cannot optimize.

### Measure
Use the React DevTools Profiler and Chrome's React Performance tracks before and after changes.
--- code
import { useDeferredValue, useMemo, useState } from "react";

type Product = { id: string; name: string; price: number };

export function Catalog({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const deferredQuery = useDeferredValue(query); // typing stays responsive

  // Derived in render (memoized because the list is large); no effect + state pair
  const visible = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    const filtered = products.filter((p) => p.name.toLowerCase().includes(q));
    return filtered.toSorted((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price));
  }, [products, deferredQuery, sort]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setSort((s) => (s === "asc" ? "desc" : "asc"))}>Price {sort}</button>
      <p>{visible.length} products</p>
    </div>
  );
}

=== r80 | E | What is lazy initialization in useState?
**Lazy initialization means passing a function to `useState` instead of a value: `useState(() => computeInitial())`. React calls that function only on the first render and ignores it afterwards, so expensive setup work (parsing `localStorage`, building large structures) does not run on every render.**

### Why it matters
`useState(expensive())` calls `expensive()` on **every** render, even though React only uses the result the first time. The arrow-function form runs it once.

### Good candidates
- Reading and parsing `localStorage` or `sessionStorage`.
- Creating large arrays or maps.
- Parsing the URL or decoding a token.
- Creating class instances such as a `Map` of caches.

### Details
- Pass the function itself: `useState(createTodos)`, not `useState(createTodos())`.
- The initializer must be pure. In Strict Mode development React calls it twice to check.
- It receives no arguments.
- `useReducer` has the same idea through its third argument: `useReducer(reducer, arg, init)`.
- For values that need to be created once but never change and do not need re-renders, a lazily initialized `useRef` (`if (ref.current === null) ref.current = create()`) is an alternative.

### Not a fix for
Values that depend on props changing later. The initializer only runs on mount; use a `key` to remount, or derive during render.
--- code
import { useState } from "react";

function loadSettings() {
  console.log("parsing settings"); // with lazy init: logged once, not on every render
  try {
    return JSON.parse(localStorage.getItem("settings") ?? "") as { fontSize: number; compact: boolean };
  } catch {
    return { fontSize: 16, compact: false };
  }
}

export function Settings() {
  // Wrong: loadSettings() runs on every render
  // const [settings, setSettings] = useState(loadSettings());

  // Right: runs only on the first render
  const [settings, setSettings] = useState(loadSettings);

  return (
    <label>
      <input
        type="checkbox"
        checked={settings.compact}
        onChange={(e) => {
          const next = { ...settings, compact: e.target.checked };
          setSettings(next);
          localStorage.setItem("settings", JSON.stringify(next));
        }}
      />
      Compact mode (font {settings.fontSize}px)
    </label>
  );
}
