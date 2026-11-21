=== r81 | E | What is a state updater function?
**A state updater function is a function you pass to a state setter, `setCount((prev) => prev + 1)`, instead of a value. React calls it with the latest pending state and uses its return value as the next state. It guarantees correct results when several updates are queued or when the setter is called from a callback that may hold stale state.**

### Terminology
- The **setter** (or "set function") is what `useState` returns: `setCount`.
- The **updater function** is the callback you pass to it: `(prev) => prev + 1`.

### How React processes it
During the next render, React goes through the queue of updates for that state in order. Plain values replace the state; updater functions receive the result so far. Three `setCount((c) => c + 1)` calls produce `+3`; three `setCount(count + 1)` calls produce `+1`.

### When to use it
- Next state depends on the previous state (counters, toggles, appending to arrays).
- Multiple updates in one event.
- Inside effects, intervals or subscriptions that would otherwise need the state as a dependency.
- Inside memoized callbacks (`useCallback`) so they can have empty dependencies.

### Rules
- Must be **pure**: no side effects, no mutation. In Strict Mode development React calls it twice to check.
- Return the new state (for objects, a new object).
- Naming convention: use the first letter of the state (`c` for count) or `prev`.

### `useReducer`
A reducer is the generalization: every update goes through `(state, action) => newState`.
--- code
import { useEffect, useState } from "react";

export function Score() {
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  function bonusRound() {
    // Updater functions: each receives the result of the previous one -> +30
    setScore((s) => s + 10);
    setScore((s) => s + 10);
    setScore((s) => s + 10);
    setLog((l) => [...l, "bonus round"]);
  }

  // No `score` dependency needed thanks to the updater
  useEffect(() => {
    const id = setInterval(() => setScore((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p>Score: {score}</p>
      <button onClick={bonusRound}>Bonus</button>
      <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

=== r82 | E | What is a functional update?
**A functional update is updating state by passing a function to the setter, as in `setItems((prev) => [...prev, item])`, so the new state is computed from the most recent previous state rather than from a possibly stale variable captured in a closure.**

### Why it exists
State values inside a render are snapshots. If an update depends on the current value and the code runs later (after `await`, in a timer, in a subscription, or several times in a row), the captured value may be out of date. The functional form always receives the latest value React has.

### Typical cases
- `setCount((c) => c + 1)` in handlers that may fire quickly.
- `setTodos((ts) => ts.filter((t) => t.id !== id))` in callbacks passed to children.
- `setOpen((o) => !o)` toggles.
- Updates inside `setInterval` or WebSocket listeners registered once.
- Async flows: after `await`, use the functional form to merge results into the latest state.

### Not always necessary
If the new value does not depend on the old one (`setName(e.target.value)`), pass the value directly.

### Class components
`this.setState((prevState, props) => ({ count: prevState.count + props.step }))`.

### Interview example
Explain why `setCount(count + 1); setCount(count + 1);` adds only 1, and fix it with the functional form.
--- code
import { useState } from "react";

type Message = { id: string; text: string };

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [count, setCount] = useState(0);

  async function send(text: string) {
    const optimistic = { id: crypto.randomUUID(), text };
    setMessages((prev) => [...prev, optimistic]); // functional: safe even if more messages arrive

    const saved: Message = await fetch("/api/messages", { method: "POST", body: JSON.stringify({ text }) }).then((r) => r.json());

    // After await, `messages` from this render is stale; the functional form sees the latest list
    setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
  }

  return (
    <div>
      <button onClick={() => send("Hello")}>Send</button>
      <button onClick={() => { setCount(count + 1); setCount(count + 1); }}>Only +1: {count}</button>
      <button onClick={() => { setCount((c) => c + 1); setCount((c) => c + 1); }}>Really +2</button>
      <p>{messages.length} messages</p>
    </div>
  );
}

=== r83 | M | What is referential equality?
**Referential equality means two values are the same reference in memory, checked with `===` or `Object.is`. For objects, arrays and functions, two values with identical contents are not equal unless they are the same reference. React relies on it for dependency arrays, `memo`, context values and state bail-outs.**

### Primitives vs references
- Primitives compare by value: `"a" === "a"`, `1 === 1`.
- Objects compare by reference: `{} === {}` is `false`, `[1] === [1]` is `false`, `(() => {}) === (() => {})` is `false`.
- `Object.is` is like `===` but treats `NaN` as equal to itself and `+0`/`-0` as different. React uses `Object.is`.

### Where it matters in React
- **Dependency arrays:** an object or function created during render is new every render, so effects re-run every time.
- **`React.memo`:** new object or function props make shallow comparison fail, so the child re-renders.
- **Context:** `value={{ user, logout }}` is a new object on every provider render, re-rendering all consumers.
- **State updates:** `setState(sameObject)` bails out; mutating an object and setting it again is ignored because the reference did not change. That is why you must create new objects for updates.

### Getting stable references
- Define constants and pure functions outside components.
- Move objects and functions into effects.
- `useMemo` and `useCallback`, or the React Compiler.
- Depend on primitive fields (`user.id`) instead of objects.
- Keep immutable updates so changed data gets a new reference and unchanged data keeps its old one.
--- code
import { memo, useMemo, useState } from "react";

console.log({} === {});                 // false: different references
const a = { x: 1 };
const b = a;
console.log(a === b);                   // true: same reference
console.log(Object.is(NaN, NaN));       // true

const Child = memo(function Child({ options }: { options: { compact: boolean } }) {
  console.log("Child render");
  return <p>{options.compact ? "Compact" : "Comfortable"}</p>;
});

export function Parent() {
  const [count, setCount] = useState(0);
  const [compact, setCompact] = useState(false);

  // New object every render: memo is defeated
  // const options = { compact };

  // Stable until `compact` changes
  const options = useMemo(() => ({ compact }), [compact]);

  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>Re-render parent ({count})</button>
      <button onClick={() => setCompact((c) => !c)}>Toggle compact</button>
      <Child options={options} />
    </>
  );
}

=== r84 | E | What is a re-render?
**A re-render is React calling a component function again after the first render, to compute its UI for the current props, state and context. A re-render does not necessarily change the DOM: React compares the new output with the previous one and only commits differences.**

### Re-render vs DOM update
- **Render:** React runs your component code and produces new elements.
- **Commit:** React updates the DOM only where the output changed.
A component can re-render many times without any visible change, which is why most re-renders are cheap.

### Why re-renders exist
They are how React keeps UI in sync with state. Every state change re-renders the component that owns it and, by default, all its descendants.

### When they become a problem
- The component does expensive work during render.
- A large subtree re-renders on every keystroke or scroll event.
- Effects run on every render because dependencies are unstable.
Symptoms: input lag, janky animations, poor INP scores.

### Controlling them
- Keep state close to where it is used.
- Pass static subtrees as `children`.
- Memoize with `memo`, `useMemo`, `useCallback` or let the React Compiler do it.
- Use transitions for expensive updates.
- Split context, or use stores with selectors.

### Observing
React DevTools "Highlight updates when components render" and the Profiler's "Why did this render?" show what re-rendered and why.
--- code
import { useState } from "react";

function Clock() {
  console.log("Clock rendered");
  return <p>Static text</p>; // re-renders with the parent, but the DOM never changes
}

export function Parent() {
  const [count, setCount] = useState(0);
  console.log("Parent rendered", count);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Count {count}</button>
      {/* Each click: Parent and Clock re-render, but only the button text node is updated in the DOM */}
      <Clock />
    </div>
  );
}

// Setting the same value again bails out (no re-render of children):
// setCount(count) when count is unchanged

=== r85 | E | What triggers a re-render?
**A component re-renders when its own state changes (`useState`, `useReducer`), when its parent re-renders (by default, regardless of whether props changed), when a context it reads changes, or when an external store it subscribes to via `useSyncExternalStore` changes. Changing a ref or a regular variable never triggers a re-render.**

### The triggers
1. **State update** with a value different from the current one (by `Object.is`).
2. **Parent re-render:** all children re-render by default. Props changing is not required; this surprises many people. `memo` (or the React Compiler) makes the child skip when props are shallowly equal.
3. **Context change:** every component calling `useContext`/`use` for that context re-renders when the provider's value changes, even if memoized.
4. **External store change:** hooks built on `useSyncExternalStore` (Redux's `useSelector`, Zustand) re-render when the selected value changes.
5. **Hook dependencies inside libraries** that set state (data fetching libraries updating on refetch).
6. **Development only:** Strict Mode double-renders; Fast Refresh re-renders on file save.

### What does not
- Mutating `ref.current`.
- Mutating state objects in place (and then not setting new references).
- Changes to module-level variables.
- Calling the setter with the same value (React may render the component once more before bailing out, but children do not re-render).

### Debugging
React DevTools Profiler with "Record why each component rendered" lists the cause for each render: hooks changed, props changed, parent rendered, or context changed.
--- code
import { createContext, memo, use, useRef, useState } from "react";

const ThemeContext = createContext("light");

const Leaf = memo(function Leaf({ label }: { label: string }) {
  const theme = use(ThemeContext); // re-renders on context change even though memoized
  console.log("Leaf render", label, theme);
  return <span>{label} ({theme})</span>;
});

export function Triggers() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("light");
  const clicks = useRef(0);

  return (
    <ThemeContext value={theme}>
      <button onClick={() => setCount((c) => c + 1)}>State change ({count})</button>
      <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>Context change</button>
      <button onClick={() => (clicks.current += 1)}>Ref change (no re-render)</button>
      <Leaf label="memoized" /> {/* skips parent re-renders, not context changes */}
    </ThemeContext>
  );
}

=== r86 | M | What is batching in React 18?
**React 18 introduced automatic batching: state updates are grouped into a single render no matter where they happen, including promises, `setTimeout`, native event handlers and async functions. Before React 18, only updates inside React event handlers were batched. It applies to apps using `createRoot`, which is the only root API in React 19.**

### Before React 18
```
setTimeout(() => {
  setCount((c) => c + 1); // render
  setFlag((f) => !f);     // render again
}, 0);
```

### React 18+
The same code renders **once**. This also applies after `await` in async handlers and in `fetch().then()` callbacks.

### Benefits
- Fewer renders and better performance with no code changes.
- Consistent UI: no intermediate states where only some updates were applied.

### Opting out
`flushSync(() => setX(v))` from `react-dom` renders synchronously. Use it only when you need the DOM updated immediately, such as measuring or scrolling to a new element.

### Migration notes
- `ReactDOM.render` kept the old behavior; it was deprecated in 18 and removed in React 19. Use `createRoot`.
- Code that read the DOM right after a state update in a timeout may need `flushSync`.
- Class `setState` in timeouts is batched too.

### Related React 18 features
Concurrent rendering, `useTransition`, `useDeferredValue`, Suspense on the server with streaming, `useId`, `useSyncExternalStore`.
--- code
import { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  console.log("render", { count, loading });

  async function load() {
    setLoading(true);
    const data: number[] = await fetch("/api/numbers").then((r) => r.json());
    // React 18+: these two updates produce ONE render, even after await
    setCount(data.length);
    setLoading(false);
  }

  function inTimeout() {
    setTimeout(() => {
      setCount((c) => c + 1);
      setLoading((l) => !l); // batched with the line above
    }, 0);
  }

  return (
    <>
      <button onClick={load}>{loading ? "Loading…" : `Loaded ${count}`}</button>
      <button onClick={inTimeout}>Timeout updates</button>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />); // automatic batching requires createRoot

=== r87 | M | What is Strict Mode double render?
**In development, `<StrictMode>` makes React call your component functions twice per render, and also double-invokes `useState`, `useMemo` and `useReducer` initializers, updater functions and reducers. It also runs an extra effect and ref cleanup-and-setup cycle on mount. The goal is to reveal impure rendering and missing cleanups. Production builds render once.**

### What gets double-invoked
- Component bodies (function components and class `render`, `constructor`).
- State initializers, updater functions and reducers.
- `useMemo` callbacks.
- Effects and ref callbacks: setup, cleanup, setup on mount. React 19.3 also does this for effects during hydration.

### What it catches
- **Impure render:** mutating props, pushing to an outer array, generating random values used for keys, incrementing counters during render.
- **Missing cleanup:** two subscriptions, two intervals, duplicated listeners, sockets left open.
- **Non-idempotent effects:** effects that break when run twice, such as one-time analytics without guards.

### Details in recent versions
- React 18 dimmed the second set of console logs; React 19 keeps logs dimmed in DevTools and reuses memoized results from the first render during the second.
- It is only active in development.

### Why it reflects reality
Concurrent rendering can call components more than once before committing, and features like `<Activity>` and Fast Refresh unmount and remount effects. Code that tolerates Strict Mode tolerates these.

### Wrong fix
Removing `<StrictMode>` or adding a "has run" ref to make an effect run once. Add proper cleanup or move the logic to an event handler instead.
--- code
import { StrictMode, useEffect, useState } from "react";

const globalList: string[] = [];

function Impure({ name }: { name: string }) {
  globalList.push(name); // Strict Mode doubles this -> reveals the impurity
  return <p>{globalList.length} items</p>;
}

function Subscription() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // Remove this cleanup and Strict Mode shows duplicated listeners
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return <p>{online ? "Online" : "Offline"}</p>;
}

export function App() {
  return (
    <StrictMode>
      <Impure name="a" />
      <Subscription />
    </StrictMode>
  );
}

=== r88 | H | What is effect tearing?
**Tearing is a visual inconsistency where different parts of the UI show different versions of the same data during a single render. It can happen with concurrent rendering when a component reads from an external mutable store that changes while React has paused rendering. `useSyncExternalStore` (React 18) prevents it.**

### How tearing happens
1. React starts a concurrent (interruptible) render, for example inside a transition.
2. Component A reads `store.value` (version 1).
3. React yields to the browser; an event mutates the store to version 2.
4. React resumes and component B reads version 2.
5. The committed screen shows A with old data and B with new data: torn.

React state and context cannot tear, because React controls when they change. The risk is with **external** stores: global variables, custom event emitters, browser APIs, older state libraries that subscribed in effects.

### The fix: `useSyncExternalStore`
`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`:
- React reads the snapshot during render and checks it again before committing.
- If the store changed mid-render, React re-renders synchronously so everything is consistent.
- `getServerSnapshot` provides the value for SSR and hydration.
- `getSnapshot` must return a cached, immutable value (the same reference if unchanged), or React loops.

### Library support
Redux (`useSelector`), Zustand, Jotai, Valtio and TanStack Store use `useSyncExternalStore` internally. When you write your own store or subscribe to browser APIs (online status, media queries, `localStorage` across tabs), use it too.

### Naming
Some call it "tearing" or "UI tearing"; "effect tearing" refers to stores read in effects or render without synchronization.
--- code
import { useSyncExternalStore } from "react";

// A tiny external store
let state = { temperature: 21 };
const listeners = new Set<() => void>();

export const weatherStore = {
  set(temperature: number) {
    state = { temperature }; // new immutable snapshot
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state, // same reference until it changes
};

// Tear-free read: React guarantees every component sees the same snapshot per render
function useWeather() {
  return useSyncExternalStore(weatherStore.subscribe, weatherStore.getSnapshot, weatherStore.getSnapshot);
}

export function Thermometer() {
  const { temperature } = useWeather();
  return <p>{temperature}°C</p>;
}

export function Advice() {
  const { temperature } = useWeather();
  return <p>{temperature > 25 ? "Wear shorts" : "Bring a jacket"}</p>;
}

=== r89 | H | What is concurrent rendering?
**Concurrent rendering, introduced in React 18, lets React prepare multiple versions of the UI at once and interrupt, pause, resume or abandon rendering work. Urgent updates (typing, clicking) can jump ahead of non-urgent ones (transitions), so the app stays responsive during heavy renders. It is enabled by `createRoot` and used through features like `useTransition`, `useDeferredValue` and Suspense.**

### Before: synchronous rendering
Once React started rendering an update, it ran to completion. A slow render (filtering 10,000 items) blocked the main thread, so keystrokes lagged.

### With concurrent rendering
- Rendering is split into small units of work (fibers). React yields to the browser between units.
- Updates have **priorities**: discrete input is urgent; transitions are interruptible.
- An in-progress transition render can be thrown away if newer data arrives.
- The DOM is only updated in the commit phase, so users never see half-rendered trees.

### Features built on it
- `useTransition` / `startTransition` and Actions.
- `useDeferredValue`.
- Suspense for data, `use(promise)`, and streaming server rendering with selective hydration.
- `<Activity>` (React 19.2) rendering hidden content at low priority.
- `<ViewTransition>` animations (stable in 19.3).
- React 19.3 renders separate transitions independently.

### What it requires from your code
- Pure render functions (React may render more than once).
- Effects with proper cleanup.
- External stores read through `useSyncExternalStore` to avoid tearing.

### It is opt-in per update
Concurrency only kicks in for updates you mark as transitions or deferred; ordinary updates still render synchronously.
--- code
import { useState, useTransition } from "react";

function SlowTab({ name }: { name: string }) {
  const items = Array.from({ length: 300 }, (_, i) => i);
  return (
    <ul>
      {items.map((i) => {
        const start = performance.now();
        while (performance.now() - start < 1) {} // 1ms per item: ~300ms total
        return <li key={i}>{name} item {i}</li>;
      })}
    </ul>
  );
}

export function Tabs() {
  const [tab, setTab] = useState("home");
  const [isPending, startTransition] = useTransition();

  function select(next: string) {
    // Interruptible: clicking another tab mid-render abandons this one
    startTransition(() => setTab(next));
  }

  return (
    <div>
      {["home", "posts", "contact"].map((t) => (
        <button key={t} onClick={() => select(t)} aria-pressed={tab === t}>{t}</button>
      ))}
      {isPending && <span> loading…</span>}
      {tab === "posts" ? <SlowTab name="Post" /> : <p>{tab} content</p>}
    </div>
  );
}

=== r90 | M | What is a transition update?
**A transition update is a state update marked as non-urgent with `startTransition` (or `useTransition`). React renders it in the background, lets urgent updates interrupt it, avoids replacing visible content with Suspense fallbacks, and exposes `isPending` while it is in progress. In React 19, transitions can be async functions called Actions.**

### Urgent vs transition
- **Urgent:** typing, clicking, pressing. Users expect an instant response.
- **Transition:** moving between views, filtering results, loading the next page. A short delay is acceptable as long as input stays responsive.

### Behavior
- If a newer transition starts, React can abandon the old one.
- Suspended components inside a transition keep showing the previous UI instead of a fallback.
- `isPending` is `true` until the transition finishes.
- React 19 **Actions:** `startTransition(async () => { await save(); setData(x); })` keeps `isPending` true for the whole async function; errors go to the nearest error boundary. `useActionState` and `<form action>` use transitions automatically.
- React 19.3: unrelated transitions render independently, so a slow one does not hold up a fast one.

### Where you meet them
- React Router and Next.js navigations are transitions.
- `useDeferredValue` updates behave like transitions.
- `<ViewTransition>` animations trigger for transitions, and `addTransitionType` labels them (for example "slide-forward").

### Limits
- Do not use transitions for controlled input values (the text would lag).
- The callback must call the state update synchronously, or after an `await` with React 19's Action semantics.
--- code
import { startTransition, useState, useTransition, addTransitionType, ViewTransition } from "react";

export function Gallery({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);
  const [isPending, startNav] = useTransition();

  function go(delta: number) {
    startNav(() => {
      addTransitionType(delta > 0 ? "forward" : "back"); // React 19.3: label the transition
      setIndex((i) => (i + delta + photos.length) % photos.length);
    });
  }

  return (
    <div>
      <ViewTransition key={index} enter={{ forward: "slide-in-right", back: "slide-in-left", default: "auto" }}>
        <img src={photos[index]} alt={`Photo ${index + 1}`} width={480} />
      </ViewTransition>
      <button onClick={() => go(-1)}>Prev</button>
      <button onClick={() => go(1)}>Next</button>
      {isPending && <small> loading…</small>}
    </div>
  );
}

// Outside components (no isPending):
export const preloadNext = (fn: () => void) => startTransition(fn);

=== r91 | M | What is React performance optimization?
**React performance optimization is making apps load fast and respond instantly, by shipping less JavaScript, rendering less and less often, keeping the main thread free for user input, and fetching data efficiently. Start by measuring (Profiler, Lighthouse, Core Web Vitals), then fix the biggest bottleneck.**

### Loading performance
- **Ship less code:** route-based code splitting (`lazy`, framework routing), tree shaking, lighter dependencies.
- **Server rendering:** SSR, static generation and Server Components send ready HTML and less JavaScript.
- **Assets:** responsive, modern-format images, `font-display`, preloading critical resources (React 19's `preload`, `preinit`).
- **Data:** avoid request waterfalls; fetch in parallel, prefetch on hover, cache with TanStack Query or SWR.

### Runtime performance
- **Fewer re-renders:** colocate state, pass `children`, split contexts, use selectors in stores.
- **Cheaper renders:** memoization with the **React Compiler** (or `memo`, `useMemo`, `useCallback` manually).
- **Responsiveness:** `useTransition` and `useDeferredValue` for heavy updates; debounce or throttle high-frequency events.
- **Large lists:** virtualization (TanStack Virtual, `react-window`).
- **Avoid layout thrashing:** batch DOM reads and writes; animate `transform` and `opacity`.
- **Offload work:** Web Workers for heavy computation.

### Metrics to track
LCP (loading), INP (responsiveness, replaced FID in 2024) and CLS (layout stability).

### Tools
React DevTools Profiler, Chrome Performance panel with React's Scheduler and Components tracks (React 19.2), Lighthouse, bundle analyzers, and real-user monitoring.

### Principle
Optimize what you can measure; most components do not need optimization.
--- code
import { lazy, Suspense, useDeferredValue, useState } from "react";

// 1. Code split heavy, rarely used UI
const ReportsChart = lazy(() => import("./reports-chart"));

// 2. Keep fast-changing state local
function SearchBox({ onChange }: { onChange: (q: string) => void }) {
  const [q, setQ] = useState("");
  return <input value={q} onChange={(e) => { setQ(e.target.value); onChange(e.target.value); }} />;
}

export function Dashboard({ rows }: { rows: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [showChart, setShowChart] = useState(false);
  const deferred = useDeferredValue(query); // 3. keep typing responsive

  const visible = rows.filter((r) => r.name.toLowerCase().includes(deferred.toLowerCase()));

  return (
    <div>
      <SearchBox onChange={setQuery} />
      <p>{visible.length} matches</p>
      <button onClick={() => setShowChart(true)}>Show chart</button>
      {showChart && (
        <Suspense fallback={<p>Loading chart…</p>}>
          <ReportsChart />
        </Suspense>
      )}
    </div>
  );
}

=== r92 | M | What causes unnecessary re-renders?
**Unnecessary re-renders happen when components render again without anything they display having changed. Common causes are state held too high in the tree, parents re-rendering children by default, new object or function props on every render, context values that change too often or are recreated, and effects that set state needlessly.**

### Main causes
1. **State too high:** typing in a search box whose state lives in the page component re-renders the whole page.
2. **Default cascade:** when a component re-renders, all its children re-render, even with identical props, unless memoized.
3. **Unstable props:** `style={{ ... }}`, `options={{ ... }}`, `onClick={() => ...}` and `items={data.filter(...)}` create new references, defeating `memo`.
4. **Context:** one big context with frequently changing values re-renders every consumer; a provider `value={{...}}` object recreated each render.
5. **Effects syncing derived state:** `useEffect(() => setFiltered(...), [items])` adds an extra render each change.
6. **Components defined inside components:** a new component type each render, so React remounts the subtree.
7. **Store subscriptions without selectors:** subscribing to a whole Redux or Zustand store instead of a slice.
8. **Index or random keys** causing remounts.

### Remedies
- Move state down or lift content up (pass `children`).
- Use the React Compiler, or `memo` + `useMemo` + `useCallback`.
- Split context; memoize provider values.
- Use selectors (`useSelector(s => s.cart.count)`, `useStore(s => s.count)`).
- Compute derived data in render.

### Remember
Re-renders are usually cheap. Fix them when the Profiler shows a real cost.
--- code
import { createContext, memo, useMemo, useState } from "react";

const SettingsContext = createContext({ compact: false, toggle: () => {} });

const Sidebar = memo(function Sidebar({ style }: { style: React.CSSProperties }) {
  console.log("Sidebar render");
  return <aside style={style}>Menu</aside>;
});

const SIDEBAR_STYLE = { width: 240 }; // stable reference, defined once

export function Page() {
  const [query, setQuery] = useState(""); // ideally moved into its own SearchBox component
  const [compact, setCompact] = useState(false);

  // Cause: new value object every render re-renders all consumers
  // <SettingsContext value={{ compact, toggle: () => setCompact(c => !c) }}>
  const settings = useMemo(() => ({ compact, toggle: () => setCompact((c) => !c) }), [compact]);

  return (
    <SettingsContext value={settings}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {/* <Sidebar style={{ width: 240 }} />  new object each keystroke -> re-render */}
      <Sidebar style={SIDEBAR_STYLE} />
    </SettingsContext>
  );
}

=== r93 | M | How to prevent re-renders?
**Prevent wasteful re-renders by structuring state well first (keep it low, pass content as `children`, split contexts, subscribe to store slices), then memoizing where profiling shows a cost: `memo` for components, `useMemo` and `useCallback` for stable props, or the React Compiler to do all of it automatically.**

### Structural techniques (no memoization)
1. **Move state down:** put the input's state inside the input component.
2. **Lift content up:** a stateful wrapper that receives `children` does not re-render them when its state changes.
3. **Split components** so expensive parts do not share state with fast-changing parts.
4. **Split contexts** by concern and update frequency.
5. **Selectors for global stores:** `useStore((s) => s.user.name)`.
6. **Derive, do not sync:** compute values during render instead of setting state in effects.
7. **Stable keys** to avoid remounts.

### Memoization
- `memo(Component)` skips rendering when props are shallowly equal.
- `useMemo` for objects or arrays passed as props; `useCallback` for function props.
- Memoize context provider values.

### Let the compiler do it
React Compiler 1.0 automatically memoizes components and values with fine granularity. Enable it with `babel-plugin-react-compiler`, Vite's `react-compiler-ts` template or Next.js `reactCompiler: true`. Then remove most manual memoization.

### Not "prevent", but "make cheap"
- `useDeferredValue`/`useTransition` let heavy re-renders happen without blocking input.
- Virtualize long lists so re-renders touch fewer rows.
--- code
import { useState } from "react";

function ExpensiveTree() {
  console.log("ExpensiveTree render");
  return <div>Lots of UI…</div>;
}

// Before: every mouse move re-renders ExpensiveTree
// export function Page() {
//   const [pos, setPos] = useState({ x: 0, y: 0 });
//   return <div onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
//     <p>{pos.x},{pos.y}</p><ExpensiveTree /></div>;
// }

// After: state moved into a wrapper, content passed as children
function PointerTracker({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      <p>{pos.x}, {pos.y}</p>
      {children} {/* same element object from the parent: not re-rendered */}
    </div>
  );
}

export function Page() {
  return (
    <PointerTracker>
      <ExpensiveTree />
    </PointerTracker>
  );
}

=== r94 | M | What is memoization in React?
**Memoization is caching the result of work so it is reused when the inputs have not changed. In React it takes three forms: `memo` caches a component's rendered output for equal props, `useMemo` caches a computed value, and `useCallback` caches a function reference. The React Compiler (1.0, 2025) applies memoization automatically at build time.**

### The tools
| Tool | Caches | Recomputes when |
|---|---|---|
| `memo(Component)` | rendered output | props change (shallow compare) |
| `useMemo(fn, deps)` | a value | a dependency changes |
| `useCallback(fn, deps)` | a function | a dependency changes |
| `React.cache(fn)` (Server Components) | function result per request | arguments differ |

### Why it matters
- Avoids expensive recalculations.
- Keeps references stable so memoized children skip rendering and effects do not re-run.

### Costs
- Memory for the cached values.
- Comparison of dependencies on every render.
- Code complexity and the risk of stale values when dependencies are wrong.

### React Compiler
It analyzes components and hooks and inserts memoization automatically, including fine-grained caching of individual JSX elements that is impractical by hand. It requires following the Rules of React (pure components, hooks rules); the `eslint-plugin-react-hooks` compiler rules report code it cannot optimize. With it, write plain code and keep `useMemo`/`useCallback` as escape hatches (for example to stabilize an effect dependency deliberately).

### Rule of thumb without the compiler
Memoize when a measurement shows slow renders, for large lists, or for values that are dependencies of effects or memoized children.
--- code
import { memo, useCallback, useMemo, useState } from "react";

type Point = { x: number; y: number };

// memo: skip re-rendering when props are equal
const Plot = memo(function Plot({ points, onPick }: { points: Point[]; onPick: (p: Point) => void }) {
  return <svg width={200} height={100}>{points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} onClick={() => onPick(p)} />)}</svg>;
});

export function Analytics({ raw }: { raw: number[] }) {
  const [label, setLabel] = useState("");

  // useMemo: cache an expensive derived value
  const points = useMemo(() => raw.map((v, i) => ({ x: i * 10, y: 100 - v })), [raw]);

  // useCallback: cache a function so Plot's props stay equal
  const onPick = useCallback((p: Point) => setLabel(`(${p.x}, ${p.y})`), []);

  return (
    <div>
      <Plot points={points} onPick={onPick} />
      <p>Selected: {label}</p> {/* changing label does not re-render Plot */}
    </div>
  );
}

=== r95 | E | What is lazy loading?
**Lazy loading means loading code or resources only when they are needed instead of upfront. In React you lazy-load components with `React.lazy(() => import("./X"))` inside `<Suspense>`, load routes on demand, defer images with `loading="lazy"`, and import heavy libraries inside event handlers.**

### Component lazy loading
- `const Chart = lazy(() => import("./Chart"))` creates a separate chunk.
- Render it inside `<Suspense fallback={...}>`; the fallback shows while the chunk downloads.
- Load on interaction: only render `<Chart />` after the user opens a tab or modal.

### Route-level
- Routers load each route's code when visited. React Router supports a `lazy` function on route objects; Next.js splits per route automatically.

### Other assets
- Images and iframes: native `loading="lazy"`.
- Libraries: `const { jsPDF } = await import("jspdf")` inside the click handler.
- Data: fetch on scroll or visibility with `IntersectionObserver`.

### Avoiding slow interactions
- **Prefetch** likely chunks on hover or idle: call the same `import()` early, since modules are cached.
- Keep the fallback similar in size to the content to avoid layout shift.
- Do not lazy-load tiny components or above-the-fold content.

### Errors
A failed chunk download (often after a new deployment) throws; wrap lazy components in an error boundary with a retry or reload option.
--- code
import { lazy, Suspense, useState } from "react";

const importEditor = () => import("./rich-text-editor");
const RichTextEditor = lazy(importEditor);

export function Comments() {
  const [editing, setEditing] = useState(false);

  async function exportCsv() {
    const { unparse } = await import("papaparse"); // library loaded only on click
    console.log(unparse([{ id: 1, text: "Nice" }]));
  }

  return (
    <section>
      <img src="/banner.jpg" alt="" loading="lazy" width={800} height={200} />
      <button
        onMouseEnter={importEditor} // prefetch the chunk on hover
        onClick={() => setEditing(true)}
      >
        Write a comment
      </button>
      <button onClick={exportCsv}>Export CSV</button>

      {editing && (
        <Suspense fallback={<div style={{ height: 200 }}>Loading editor…</div>}>
          <RichTextEditor />
        </Suspense>
      )}
    </section>
  );
}

=== r96 | E | What is code splitting?
**Code splitting divides your JavaScript bundle into smaller chunks that load on demand, so users download only the code for what they are viewing. Bundlers (Vite with Rolldown, webpack, Turbopack) create a chunk at every dynamic `import()`; React uses this through `React.lazy`, and routers and frameworks split per route automatically.**

### Split points
- **Routes:** the biggest win. Each page in its own chunk.
- **Heavy components:** charts, editors, maps, date pickers, rendered only when needed.
- **Libraries used rarely:** PDF export, spreadsheet parsing, syntax highlighting.
- **Vendor chunks:** bundlers split shared dependencies so they are cached across routes.

### How it works
`import("./Chart")` returns a promise. The bundler emits `Chart` and its dependencies as a separate file and loads it when the promise is created. `lazy` turns that promise into a component that suspends until loaded.

### Frameworks
- **Next.js:** automatic per-route splitting; Server Components send no JavaScript for themselves.
- **React Router (framework or data mode):** route modules and `lazy` route properties.
- **Vite SPA:** add `lazy()` at route boundaries.

### Trade-offs
- Too many tiny chunks add request overhead.
- Users may wait on navigation; prefetch likely routes on hover or idle.
- Handle chunk load failures after deployments with an error boundary that offers a reload.

### Measuring
Bundle analyzers (`rollup-plugin-visualizer` for Vite, `@next/bundle-analyzer` or `next analyze`) show chunk contents.
--- code
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

// Each page becomes its own chunk
const Home = lazy(() => import("./pages/home"));
const Settings = lazy(() => import("./pages/settings"));
const Reports = lazy(() => import("./pages/reports")); // includes a heavy chart library

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p>Loading page…</p>}>{children}</Suspense>;
}

const router = createBrowserRouter([
  { path: "/", element: <Page><Home /></Page> },
  { path: "/settings", element: <Page><Settings /></Page> },
  { path: "/reports", element: <Page><Reports /></Page> },
]);

export function App() {
  return <RouterProvider router={router} />;
}

=== r97 | M | What is Suspense?
**`<Suspense fallback={...}>` displays a fallback UI while any component inside it is waiting for something: lazily loaded code (`React.lazy`), data read with `use(promise)` or a Suspense-enabled library, or server-rendered content still streaming. When everything inside is ready, React swaps the fallback for the content.**

### What can suspend
- `React.lazy` components loading their chunk.
- `use(promise)` reading an unresolved promise (React 19).
- Suspense-enabled data libraries: TanStack Query's `useSuspenseQuery`, SWR with `suspense: true`, Relay, Apollo.
- Async Server Components and streamed SSR in frameworks like Next.js.
- React 19.3's `use(browser())`: a component that suspends during server rendering and renders only in the browser.

### Behavior
- The nearest `<Suspense>` boundary above a suspending component shows its fallback.
- Nested boundaries reveal content progressively, from outer to inner.
- Inside a **transition** (navigation, `startTransition`), React keeps showing existing content instead of falling back again; use a `key` on the boundary to force a reset.
- On the server, fallbacks are sent first in the HTML stream and replaced as content resolves; React batches reveals to reduce flicker (19.2).
- Suspense does not catch errors; combine with an error boundary.

### Design tips
- Place boundaries around independent regions, not around the whole app or every tiny component.
- Use skeletons that match the final layout to avoid layout shift.
- Start data requests early (in loaders or parents) so components do not fetch in a waterfall.
--- code
import { lazy, Suspense, use } from "react";

const Comments = lazy(() => import("./comments"));

function fetchUser(id: string) {
  return fetch(`/api/users/${id}`).then((r) => r.json() as Promise<{ name: string; bio: string }>);
}

function Profile({ userPromise }: { userPromise: Promise<{ name: string; bio: string }> }) {
  const user = use(userPromise); // suspends until resolved
  return (
    <header>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </header>
  );
}

// The promise must be created outside render (here: once per page load), not inside Profile
const userPromise = fetchUser("42");

export function ProfilePage() {
  return (
    <main>
      <Suspense fallback={<div className="skeleton h-16" />}>
        <Profile userPromise={userPromise} />
        <Suspense fallback={<p>Loading comments…</p>}>
          <Comments />
        </Suspense>
      </Suspense>
    </main>
  );
}

=== r98 | E | What is React.lazy?
**`lazy(load)` defines a component whose code is loaded the first time it renders. `load` is a function returning a promise for a module with a default export, typically `() => import("./Chart")`. While loading, the component suspends, so it must be rendered inside a `<Suspense>` boundary.**

### Rules
- Call `lazy` at **module level**, not inside a component, or the component is re-created and its state reset on every render.
- The module must **default-export** a component. For named exports: `lazy(() => import("./charts").then((m) => ({ default: m.BarChart })))`.
- Wrap with `<Suspense fallback>` somewhere above it.
- The `load` function runs once; the result is cached.

### Preloading
Call the same `import()` early (on hover, on idle, or when a route loader starts) so the chunk is ready before render.

### Error handling
Network failures reject the promise and throw during render. Use an error boundary with a "Retry" or "Reload" button; a common cause is stale chunks after a deployment.

### Server rendering
`lazy` works with streaming SSR in React 18+: the server waits for or streams the component. Frameworks like Next.js offer `next/dynamic` with extra options such as `ssr: false`.

### Typical uses
Route components, modals, charts, editors and admin-only features.
--- code
import { lazy, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

const loadSettings = () => import("./settings-panel");
const SettingsPanel = lazy(loadSettings);

const BarChart = lazy(() => import("./charts").then((m) => ({ default: m.BarChart }))); // named export

export function App() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onMouseEnter={loadSettings} onClick={() => setOpen(true)}>Settings</button>

      <ErrorBoundary fallbackRender={({ resetErrorBoundary }) => (
        <p>Could not load. <button onClick={resetErrorBoundary}>Retry</button></p>
      )}>
        <Suspense fallback={<p>Loading…</p>}>
          {open && <SettingsPanel />}
          <BarChart data={[3, 5, 2]} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

=== r99 | M | Bundle size optimization?
**Reduce bundle size by shipping less code to the browser: split code by route and feature, remove unused code (tree shaking, ES modules, avoiding barrel-file bloat), replace heavy dependencies with lighter ones or native APIs, move work to the server (SSR, Server Components), and measure regularly with a bundle analyzer.**

### Techniques
1. **Analyze first:** `rollup-plugin-visualizer` (Vite), `source-map-explorer`, `@next/bundle-analyzer` or `next analyze`. Find the largest modules.
2. **Code splitting:** `lazy()` for routes and heavy components; dynamic `import()` for rarely used libraries.
3. **Tree shaking:** use ES module builds and named imports (`import { debounce } from "lodash-es"`, not the whole `lodash`). Packages should declare `"sideEffects": false`.
4. **Lighter alternatives:** `date-fns` or `Intl` instead of `moment`; native `fetch` instead of a client library when its features are not needed; `structuredClone` instead of deep-clone libraries.
5. **Avoid duplicate dependencies:** dedupe versions in the lockfile.
6. **Icons:** import individual icons, not the full set.
7. **Polyfills:** target modern browsers (Vite's default targets are modern) and avoid shipping unnecessary polyfills.
8. **Server Components or SSR:** keep markdown parsers, date formatting and data logic on the server.
9. **Compression:** Brotli or gzip on the server or CDN.
10. **Minification:** done by default (Oxc in Vite 8, SWC in Next.js).

### Budgets
Set size budgets in CI and fail builds that exceed them, so regressions are caught early.

### Also measure the user impact
Smaller bundles improve LCP and INP, especially on mobile devices where parsing and executing JavaScript is expensive.
--- code
// vite.config.ts - analyze and split
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [react(), visualizer({ filename: "stats.html", gzipSize: true })],
});

// Before: whole libraries in the main chunk
// import _ from "lodash";
// import moment from "moment";
// import * as Icons from "lucide-react";

// After: named imports, native APIs, lazy-loaded heavy features
import debounce from "lodash-es/debounce";
import { Search } from "lucide-react";
import { lazy } from "react";

export const formatDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
export const onSearch = debounce((q: string) => console.log(q), 300);
export const SearchIcon = Search;
export const MarkdownEditor = lazy(() => import("./markdown-editor"));

=== r100 | E | What is tree shaking?
**Tree shaking is dead-code elimination for JavaScript modules: the bundler analyzes static `import` and `export` statements and drops exports that are never used from the final bundle. It works with ES modules and is done automatically in production builds by Vite (Rolldown), webpack, Turbopack and esbuild.**

### Requirements
- **ES modules (`import`/`export`):** they are static, so the bundler knows at build time what is used. CommonJS (`require`) is dynamic and largely not shakable.
- **No side effects on import:** if importing a module runs code (polyfills, global CSS, registering plugins), the bundler must keep it. Packages declare `"sideEffects": false` (or a list of files) in `package.json` to allow removal.
- **Production mode:** minifiers remove the unused code.

### Habits that help
- Named imports: `import { format } from "date-fns"`.
- Import from specific paths when a package lacks good ESM support.
- Avoid `import * as lib` combined with dynamic access (`lib[name]`).
- Be careful with large barrel files (`index.ts` re-exporting everything); they can slow builds and sometimes keep extra code.

### What it cannot remove
- Code that is used conditionally at runtime (it cannot know the condition).
- Side-effectful modules.
- Unused class methods or object properties in many cases.

### Verify
Inspect the bundle with an analyzer, or check that removing an import changes the output size.
--- code
// utils/math.ts
export function add(a: number, b: number) {
  return a + b;
}
export function hugeMatrixInverse(m: number[][]) {
  // imagine 50KB of code here
  return m;
}

// app.ts - only `add` is imported, so hugeMatrixInverse is dropped in production
import { add } from "./utils/math";
console.log(add(2, 3));

// Prevents tree shaking: namespace import + dynamic access
// import * as math from "./utils/math";
// const fn = (math as Record<string, Function>)[userChoice];

// package.json of a library that is safe to shake
// { "type": "module", "sideEffects": ["*.css"] }

=== r101 | M | Folder structure best practice?
**Organize by feature (domain) rather than by file type once an app grows: each feature folder holds its components, hooks, API calls, types and tests, while truly shared pieces live in `components/ui`, `hooks` and `lib`. Keep imports flowing from app to features to shared code, and let your framework's routing conventions shape the top level.**

### Feature-based layout (recommended for medium and large apps)
```
src/
  app/            routes, providers, app shell
  features/
    auth/         components, hooks, api.ts, types.ts, tests
    cart/
    products/
  components/ui/  shared design-system components (Button, Modal)
  hooks/          shared generic hooks
  lib/            api client, utils, config
  types/
```

### Type-based layout (fine for small apps)
`components/`, `hooks/`, `pages/`, `services/`, `utils/`. It becomes hard to navigate as files multiply.

### Principles
- **Colocation:** keep things close to where they are used; move them to shared folders only when reused.
- **Unidirectional imports:** shared code never imports from features; features avoid importing each other's internals (expose a small `index.ts` public API if needed). Tools like `eslint-plugin-boundaries` enforce this.
- **Consistent naming:** kebab-case files, one component per file for significant components.
- **Tests next to code:** `cart-summary.test.tsx` beside `cart-summary.tsx`.
- **Avoid deep nesting** beyond three or four levels.
- **Path aliases** (`@/features/cart`) instead of `../../../`.

### Frameworks
Next.js (`app/` routes) and React Router framework mode (`app/routes/`) define the routing layer; keep feature code in `features/` or colocated `_components` folders.
--- code
// src/features/cart/
// ├── components/cart-summary.tsx
// ├── components/cart-item.tsx
// ├── hooks/use-cart.ts
// ├── api.ts
// ├── types.ts
// ├── cart-summary.test.tsx
// └── index.ts            <- public API of the feature

// src/features/cart/index.ts
export { CartSummary } from "./components/cart-summary";
export { useCart } from "./hooks/use-cart";
export type { CartItem } from "./types";

// src/app/checkout-page.tsx
// import { CartSummary, useCart } from "@/features/cart";  // import via the public API
// import { Button } from "@/components/ui/button";          // shared UI
// import { formatPrice } from "@/lib/format";                // shared utils

// tsconfig.json
// { "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }

=== r102 | E | Smart vs Dumb components?
**"Smart" components handle logic: they fetch data, hold state and decide what happens. "Dumb" (presentational) components only render what they receive through props and report user actions through callbacks. Separating them makes UI pieces reusable and easy to test, though with hooks the split is now a guideline rather than a strict rule.**

### Smart (container) components
- Fetch and transform data, manage state, call APIs.
- Know about stores, routers and contexts.
- Pass data and callbacks down.

### Dumb (presentational) components
- Render from props; little or no state (maybe UI state like "is open").
- No knowledge of where data comes from.
- Easy to reuse, test, and showcase in Storybook.

### Modern perspective
- **Custom hooks** now hold most "smart" logic. A component can call `useProducts()` and still be simple, so dedicated container components are less necessary.
- **Server Components** (in frameworks) are natural "smart" components: they fetch data on the server and pass it to interactive Client Components.
- Dan Abramov, who popularized the pattern in 2015, later noted that he no longer suggests splitting components this way dogmatically.

### When the split still helps
- Design-system components that must never fetch data.
- Testing complex UI states with plain props.
- Rendering the same UI with different data sources.
--- code
// Presentational: pure UI, easy to test and reuse
type Product = { id: string; name: string; price: number };

export function ProductGrid({ products, onAdd }: { products: Product[]; onAdd: (id: string) => void }) {
  if (products.length === 0) return <p>No products found.</p>;
  return (
    <ul className="grid grid-cols-3 gap-4">
      {products.map((p) => (
        <li key={p.id}>
          {p.name} - ${p.price}
          <button onClick={() => onAdd(p.id)}>Add</button>
        </li>
      ))}
    </ul>
  );
}

// Smart: data + behavior via hooks
import { useQuery, useMutation } from "@tanstack/react-query";

export function ProductGridContainer({ category }: { category: string }) {
  const { data = [], isPending } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetch(`/api/products?category=${category}`).then((r) => r.json()),
  });
  const addToCart = useMutation({ mutationFn: (id: string) => fetch(`/api/cart/${id}`, { method: "POST" }) });

  if (isPending) return <p>Loading…</p>;
  return <ProductGrid products={data} onAdd={(id) => addToCart.mutate(id)} />;
}

=== r103 | E | Container vs Presentational?
**The container/presentational pattern splits a feature into a container component that owns data, state and side effects, and a presentational component that receives everything as props and only renders. It is the same idea as smart vs dumb components; today the container role is usually played by a custom hook or a Server Component.**

### Responsibilities
| Container | Presentational |
|---|---|
| fetches data, subscribes to stores | renders markup and styles |
| handles business logic and mutations | raises events via callback props |
| knows routing, auth, APIs | knows nothing about data sources |
| few or no styles | most of the styling |

### Benefits
- Presentational components are reusable and trivially testable with props.
- Visual changes do not touch data logic and vice versa.
- Storybook stories can show every state (empty, loading, error) with fake props.

### How it looks in modern React
1. **Custom hook as the container:** `const { todos, addTodo } = useTodos()` inside a component that renders `<TodoList todos={todos} onAdd={addTodo} />`.
2. **Server Component as the container:** fetch data on the server, render a Client Component with the data (Next.js, React Router RSC).
3. **Route loaders as the container:** React Router loaders fetch data; the route component reads it with `useLoaderData` and renders presentational children.

### Avoid over-engineering
Not every component needs a pair. Split when the logic is complex or the UI is reused with different data.
--- code
// Presentational
type Todo = { id: string; title: string; done: boolean };

export function TodoListView({ todos, onToggle }: { todos: Todo[]; onToggle: (id: string) => void }) {
  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} /> {t.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

// Container logic as a custom hook
import { useState } from "react";

function useTodos(initial: Todo[]) {
  const [todos, setTodos] = useState(initial);
  const toggle = (id: string) => setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  return { todos, toggle };
}

// Thin container component wiring them together
export function TodoListContainer() {
  const { todos, toggle } = useTodos([{ id: "1", title: "Write docs", done: false }]);
  return <TodoListView todos={todos} onToggle={toggle} />;
}

=== r104 | E | What is Atomic Design?
**Atomic Design, by Brad Frost, is a methodology for building UI systems in five levels: atoms (basic elements like buttons and inputs), molecules (small groups like a search field with a button), organisms (sections like a header), templates (page layouts without real content) and pages (templates filled with real data). It maps naturally onto React's component composition.**

### The levels
1. **Atoms:** `Button`, `Input`, `Label`, `Icon`, `Avatar`. Smallest reusable pieces.
2. **Molecules:** `SearchBar` (input + button), `FormField` (label + input + error).
3. **Organisms:** `Header` (logo + nav + search), `ProductCard`, `CommentList`.
4. **Templates:** layout structure such as `DashboardLayout` with slots for content.
5. **Pages:** a template with real data, typically your route components.

### Benefits
- A shared vocabulary between designers and developers.
- Encourages reuse and consistency.
- Pairs with design tokens, Storybook and Figma component libraries.

### Criticisms and practical advice
- Teams often argue whether something is a molecule or organism; do not let classification slow you down.
- Strict folders like `atoms/`, `molecules/` can make features harder to find; many teams use the ideas but keep a `components/ui` folder for primitives and feature folders for the rest.
- Modern design systems (shadcn/ui, Radix-based kits) follow a similar layering: primitives, composed components, blocks.
--- code
// Atom
export function Button(props: React.ComponentProps<"button">) {
  return <button className="rounded bg-indigo-600 px-3 py-1.5 text-white" {...props} />;
}

// Atom
export function Input(props: React.ComponentProps<"input">) {
  return <input className="rounded border px-2 py-1.5" {...props} />;
}

// Molecule: combines atoms
export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); onSearch(String(new FormData(e.currentTarget).get("q"))); }}>
      <Input name="q" placeholder="Search…" aria-label="Search" />
      <Button type="submit">Go</Button>
    </form>
  );
}

// Organism: combines molecules and atoms
export function Header({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <header className="flex items-center justify-between p-4">
      <a href="/">Acme</a>
      <SearchBar onSearch={onSearch} />
    </header>
  );
}

=== r105 | M | What is scalable architecture?
**A scalable React architecture keeps the codebase easy to change as features, data and team size grow. It relies on clear module boundaries (feature folders with public APIs), separation of UI, state and data access, consistent patterns for server and client state, a shared design system, type safety and automated tests, plus performance practices such as code splitting.**

### Building blocks
1. **Feature-based structure** with explicit boundaries; shared code does not depend on features.
2. **Server state vs client state:** server data in TanStack Query, SWR, route loaders or Server Components; UI and app state in component state, context, or a small store (Zustand, Redux Toolkit).
3. **Data access layer:** typed API clients (OpenAPI or tRPC generated types), validation with Zod at the boundary.
4. **Design system:** accessible primitives and tokens (Radix, React Aria, shadcn/ui) used everywhere.
5. **Routing and framework:** Next.js or React Router framework mode for code splitting, data loading and SSR conventions.
6. **TypeScript in strict mode** across the codebase.
7. **Testing pyramid:** unit tests for logic, component tests with Testing Library, E2E with Playwright.
8. **Tooling:** ESLint (with `eslint-plugin-react-hooks` compiler rules), Prettier or Biome, CI checks, bundle budgets.
9. **Performance by default:** React Compiler, lazy routes, virtualization, image optimization.
10. **Monorepo** (Turborepo, Nx, pnpm workspaces) when several apps share packages.

### Organizational aspects
- Conventions documented in a README or ADRs.
- Code owners per feature.
- Feature flags for incremental releases.

### Interview tip
Give concrete choices and the reason for each, rather than listing every tool.
--- code
// lib/api/client.ts - one typed, validated access point to the backend
import { z } from "zod";

export async function api<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return schema.parse(await res.json()); // fail fast on contract changes
}

// features/orders/api.ts - feature-level data access
const Order = z.object({ id: z.string(), total: z.number(), status: z.enum(["pending", "paid", "shipped"]) });
export const getOrders = () => api("/orders", z.array(Order));

// features/orders/hooks/use-orders.ts - server state via TanStack Query
import { useQuery } from "@tanstack/react-query";
export const useOrders = () => useQuery({ queryKey: ["orders"], queryFn: getOrders, staleTime: 30_000 });

=== r106 | E | What is global state?
**Global state is data that many components across different parts of the app need to read or update, such as the logged-in user, theme, locale, feature flags, cart contents or notifications. It lives outside individual components, in context, a store (Zustand, Redux Toolkit, Jotai), the URL, or a server-state cache.**

### Kinds of "global" data
1. **Server state:** data from APIs (products, profile). Best handled by TanStack Query, SWR, RTK Query, route loaders or Server Components, which add caching, refetching and deduplication.
2. **Client app state:** cart, wizard progress, UI preferences, modals. Context or a store.
3. **URL state:** filters, search terms, pagination, selected tab. Shareable and survives reloads.
4. **Form state:** usually local to a form; form libraries manage it.
5. **Session data:** the current user, often provided by an auth library.

### Choosing a mechanism
- **Context:** rarely changing values (theme, user, locale).
- **Zustand / Jotai:** simple, hook-based stores with selective subscriptions.
- **Redux Toolkit:** large apps needing strict patterns, middleware, DevTools time-travel, and RTK Query.
- **URL:** anything users may bookmark or share.

### Pitfalls
- Putting everything in global state makes components harder to reuse and causes broad re-renders.
- Duplicating server data in a client store leads to stale copies; prefer a server-state cache.
- Keep state as local as possible and make it global only when several distant components truly share it.
--- code
// A small global store with Zustand
import { create } from "zustand";

type CartItem = { id: string; name: string; qty: number };
type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  clear: () => void;
};

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === item.id);
      return existing
        ? { items: s.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)) }
        : { items: [...s.items, { ...item, qty: 1 }] };
    }),
  clear: () => set({ items: [] }),
}));

// Any component, anywhere, subscribes to just the slice it needs
export function CartBadge() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  return <span>🛒 {count}</span>;
}

=== r107 | E | What is Context API?
**The Context API lets a component provide a value that any descendant can read directly, without passing props through every level. You create a context with `createContext`, provide a value by rendering the context (React 19: `<MyContext value={...}>`), and read it with `useContext(MyContext)` or `use(MyContext)`.**

### Three steps
1. `const LocaleContext = createContext("en")`: the argument is the default when no provider is found.
2. `<LocaleContext value={locale}>{children}</LocaleContext>` (or `<LocaleContext.Provider value>` before React 19).
3. `const locale = useContext(LocaleContext)` in any descendant.

### Good use cases
Theme, locale, current user, feature flags, dependency injection (API clients), and state for compound components (Tabs, Accordion).

### Behavior to know
- All consumers re-render when the value changes (by `Object.is`). Memoize object values with `useMemo`.
- The nearest provider wins; providers can be nested to override values.
- Context is not a state manager by itself. It distributes a value; pair it with `useState` or `useReducer` for updates.

### Patterns
- Export a custom hook (`useLocale()`) that throws when used outside the provider.
- Split state and dispatch into two contexts so components that only dispatch do not re-render on state changes.
- React 19.3: Server Components can render providers exported from `"use client"` modules directly.

### When to use a store instead
Frequently changing values read by many components (cursor positions, large normalized data): stores like Zustand or Redux let components subscribe to slices.
--- code
import { createContext, use, useMemo, useState } from "react";

type Locale = "en" | "hi" | "fr";
const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void } | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale() {
  const ctx = use(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

const greetings: Record<Locale, string> = { en: "Hello", hi: "नमस्ते", fr: "Bonjour" };

export function Greeting() {
  const { locale, setLocale } = useLocale();
  return (
    <p>
      {greetings[locale]}{" "}
      <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
        <option value="en">EN</option><option value="hi">HI</option><option value="fr">FR</option>
      </select>
    </p>
  );
}

=== r108 | M | Context vs Redux?
**Context is React's built-in way to pass a value down the tree; it does not manage state or optimize updates, and every consumer re-renders when the value changes. Redux (today, Redux Toolkit) is a state management library with a central store, reducers, middleware, selective subscriptions and DevTools. Use Context for low-frequency shared values and Redux for large, frequently changing, complex app state.**

### Comparison
| | Context (+ useState/useReducer) | Redux Toolkit |
|---|---|---|
| Install | built in | `@reduxjs/toolkit`, `react-redux` |
| Purpose | dependency injection of a value | predictable global state management |
| Re-renders | all consumers on any value change | only components whose selected slice changed |
| Middleware, side effects | none built in | thunks, listener middleware, RTK Query |
| DevTools | React DevTools only | Redux DevTools with time-travel and action log |
| Boilerplate | low | moderate (much less than classic Redux) |
| Server data caching | no | RTK Query |

### When Context is enough
Theme, locale, auth user, feature flags, small apps, and component-library internals.

### When Redux shines
- Large teams wanting strict, consistent patterns.
- Complex state transitions with many actions.
- Need for action history, debugging and time-travel.
- Existing Redux codebases.

### Other options in between
Zustand and Jotai offer store-like selective subscriptions with very little boilerplate. For server data, TanStack Query or RTK Query rather than either Context or plain Redux.

### Interview answer
"They solve different problems; Context transports values, Redux manages state. I pick based on update frequency, app size and team needs."
--- code
// Redux Toolkit store with selective subscriptions
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] as { id: string; qty: number }[] },
  reducers: {
    added(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      item ? item.qty++ : state.items.push({ id: action.payload, qty: 1 }); // Immer makes this immutable
    },
  },
});

const store = configureStore({ reducer: { cart: cartSlice.reducer } });
type RootState = ReturnType<typeof store.getState>;

function CartCount() {
  // Re-renders only when the count changes, not on every store update
  const count = useSelector((s: RootState) => s.cart.items.reduce((n, i) => n + i.qty, 0));
  return <span>{count}</span>;
}

function AddButton({ id }: { id: string }) {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(cartSlice.actions.added(id))}>Add</button>;
}

export const App = () => <Provider store={store}><CartCount /><AddButton id="pen" /></Provider>;

=== r109 | E | What is Redux?
**Redux is a predictable state container: the entire app state lives in a single store, it can only change by dispatching actions (plain objects describing what happened), and pure reducer functions compute the next state. Components read state with selectors and dispatch actions. Today Redux is written with Redux Toolkit, the official recommended approach.**

### Core principles
1. **Single source of truth:** one store holds the global state tree.
2. **State is read-only:** the only way to change it is to dispatch an action.
3. **Changes are made with pure functions:** reducers `(state, action) => newState`, no side effects.

### Data flow
UI event → `dispatch(action)` → middleware (logging, async) → reducers → new state → subscribed components re-render with selected data.

### React integration
`react-redux` provides `<Provider store>`, `useSelector(selector)` and `useDispatch()`. `useSelector` uses `useSyncExternalStore`, so it is concurrency-safe and only re-renders when the selected value changes.

### Why people use it
- Predictable updates that are easy to trace and test.
- Redux DevTools: action history, state diffs, time-travel debugging.
- Middleware ecosystem.
- RTK Query for server data caching.

### Criticisms (mostly of "classic" Redux)
Boilerplate (action types, action creators, switch reducers, immutable updates by hand) and overuse for simple state. Redux Toolkit removes most boilerplate, and many apps choose lighter tools (Zustand, Context, TanStack Query) when they do not need Redux's structure.

### Current versions
Redux Toolkit 2.x and React Redux 9.x.
--- code
// Classic Redux concepts (for understanding; use Redux Toolkit in real apps)
type State = { count: number };
type Action = { type: "counter/incremented" } | { type: "counter/added"; amount: number };

function counterReducer(state: State = { count: 0 }, action: Action): State {
  switch (action.type) {
    case "counter/incremented":
      return { count: state.count + 1 };
    case "counter/added":
      return { count: state.count + action.amount };
    default:
      return state;
  }
}

// Modern equivalent with Redux Toolkit
import { configureStore, createSlice } from "@reduxjs/toolkit";

const counter = createSlice({
  name: "counter",
  initialState: { count: 0 },
  reducers: {
    incremented: (s) => void s.count++,
    added: (s, a: { payload: number }) => void (s.count += a.payload),
  },
});

export const store = configureStore({ reducer: { counter: counter.reducer, legacy: counterReducer } });
store.dispatch(counter.actions.added(5));
console.log(store.getState().counter.count); // 5

=== r110 | M | What is Redux Toolkit?
**Redux Toolkit (RTK) is the official, recommended way to write Redux. It provides `configureStore` (good defaults, DevTools, thunk middleware), `createSlice` (reducers and action creators together, with Immer for "mutating" syntax), `createAsyncThunk`, `createEntityAdapter`, the listener middleware, and RTK Query for data fetching and caching.**

### Main APIs
- **`configureStore`:** combines slice reducers, adds the thunk middleware, enables Redux DevTools, and adds dev checks for mutations and non-serializable values.
- **`createSlice`:** define `name`, `initialState` and `reducers`; get actions and the reducer automatically. Immer lets you write `state.items.push(x)` safely.
- **`createAsyncThunk`:** dispatches `pending`, `fulfilled` and `rejected` actions around an async function; handle them in `extraReducers`.
- **`createEntityAdapter`:** normalized collections with ready-made CRUD reducers and selectors.
- **`createListenerMiddleware`:** run side effects in response to actions (a lighter alternative to sagas).
- **`createSelector`** (from Reselect) for memoized derived data.
- **RTK Query (`createApi`):** declares endpoints and generates hooks (`useGetPostsQuery`, `useAddPostMutation`) with caching, deduplication, invalidation tags and polling.

### Why it exists
Classic Redux required lots of boilerplate and made it easy to mutate state accidentally. RTK encodes the Redux team's best practices.

### TypeScript
Infer `RootState` and `AppDispatch` from the store and create typed hooks: `useAppSelector = useSelector.withTypes<RootState>()`.

### Version
RTK 2.x (with React Redux 9.x) supports React 18 and 19 and ships modern ESM builds.
--- code
import { configureStore, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

type Post = { id: number; title: string };

export const fetchPosts = createAsyncThunk("posts/fetch", async () => {
  const res = await fetch("/api/posts");
  return (await res.json()) as Post[];
});

const postsSlice = createSlice({
  name: "posts",
  initialState: { items: [] as Post[], status: "idle" as "idle" | "loading" | "failed" },
  reducers: {
    postAdded(state, action: { payload: Post }) {
      state.items.push(action.payload); // Immer: safe "mutation"
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (s) => void (s.status = "loading"))
      .addCase(fetchPosts.fulfilled, (s, a) => {
        s.status = "idle";
        s.items = a.payload;
      })
      .addCase(fetchPosts.rejected, (s) => void (s.status = "failed"));
  },
});

export const store = configureStore({ reducer: { posts: postsSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const { postAdded } = postsSlice.actions;
