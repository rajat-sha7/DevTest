=== r171 | M | How to fix infinite re-render?
**An infinite re-render loop happens when rendering causes a state update that causes another render, endlessly. React stops it with "Too many re-renders" (state set during render) or "Maximum update depth exceeded" (effects or handlers updating state every commit). Find the update that runs unconditionally and make it conditional, move it to an event handler, or remove it by deriving the value.**

### Common causes and fixes
1. **Calling a setter during render:** `setCount(count + 1)` in the component body. Move it to an event handler or effect, or derive the value.
2. **Calling a handler instead of passing it:** `onClick={setOpen(true)}` runs during render. Use `onClick={() => setOpen(true)}`.
3. **Effect without dependencies that sets state:** `useEffect(() => setData(compute()))` runs after every render. Add a dependency array.
4. **Effect that sets one of its own dependencies:** `useEffect(() => setItems([...items, x]), [items])`. Rethink: usually the work belongs in an event handler.
5. **Unstable object or function dependencies:** an object created in render, used in an effect that sets state, recreated every render. Move it inside the effect or memoize it.
6. **Syncing derived state:** `useEffect(() => setFullName(first + " " + last), [first, last])` is not infinite, but costs extra renders; compute `fullName` during render.
7. **Store selectors returning new objects** (Zustand v5, Redux): `useStore((s) => ({ a: s.a, b: s.b }))` creates a new object each time. Use `useShallow` or select primitives.
8. **Parent and child updating each other** via effects. Lift state to one owner.

### Debugging
- Read the component stack in the error.
- Add a `console.count("render")` to find the looping component.
- React DevTools Profiler shows the update cause.
- The React Compiler lint rules `set-state-in-render` and `set-state-in-effect` flag many of these patterns.
--- code
import { useEffect, useMemo, useState } from "react";

export function Profile({ first, last, userId }: { first: string; last: string; userId: string }) {
  const [open, setOpen] = useState(false);

  // Bug 1: setter during render -> "Too many re-renders"
  // const [renders, setRenders] = useState(0); setRenders(renders + 1);

  // Bug 2: handler called during render
  // <button onClick={setOpen(true)}>Open</button>

  // Bug 3: derived state synced by an effect (extra renders; loops if deps are wrong)
  // const [fullName, setFullName] = useState("");
  // useEffect(() => setFullName(`${first} ${last}`), [first, last]);
  const fullName = `${first} ${last}`; // fix: derive during render

  // Bug 4: unstable dependency recreated every render
  // const options = { id: userId };
  // useEffect(() => { load(options).then(setUser); }, [options]);
  const options = useMemo(() => ({ id: userId }), [userId]);
  const [user, setUser] = useState<unknown>(null);
  useEffect(() => {
    let ignore = false;
    fetch(`/api/users/${options.id}`).then((r) => r.json()).then((u) => !ignore && setUser(u));
    return () => { ignore = true; };
  }, [options]);

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open {fullName}</button>
      {open && <pre>{JSON.stringify(user)}</pre>}
    </div>
  );
}

=== r172 | E | Key issues in list?
**Key problems in lists come from missing, duplicate, unstable or index-based keys. They cause React to reuse the wrong DOM nodes and component state, so inputs show the wrong text, checkboxes jump between rows, animations glitch, and items remount needlessly. Use stable, unique IDs from your data.**

### The issues
1. **Missing keys:** React warns and falls back to indexes.
2. **Index as key** with lists that change order, insert at the top, filter or delete. State stays with positions instead of items.
3. **Random keys during render** (`Math.random()`, `crypto.randomUUID()` inline): every render remounts every item, losing state and focus and hurting performance.
4. **Duplicate keys:** React warns, and items may be skipped or duplicated in the DOM.
5. **Keys on the wrong element:** the key must be on the outermost element returned by `map`, not an inner child.
6. **Keys that change for the same item** (for example built from mutable fields like a title): editing the title remounts the row.

### Fixes
- Use database IDs, slugs or other stable identifiers.
- Generate IDs once, when data is created or loaded, not during render.
- Combine fields if needed: `` key={`${order.id}-${line.sku}`} ``.
- Index keys are fine only for static lists that never change.

### Keys as a tool
Changing a key on purpose resets a component, for example `<Form key={selectedUserId} />`.
--- code
import { useState } from "react";

type Row = { id: string; label: string };

function EditableRow({ row }: { row: Row }) {
  const [note, setNote] = useState(""); // local state tied to the component instance
  return (
    <li>
      {row.label} <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note" />
    </li>
  );
}

export function KeyBugs() {
  const [rows, setRows] = useState<Row[]>([{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]);
  const addTop = () => setRows((r) => [{ id: crypto.randomUUID(), label: `New ${r.length}` }, ...r]); // id created once

  return (
    <div>
      <button onClick={addTop}>Add to top</button>

      {/* Bug: index keys - notes shift to the wrong row after "Add to top" */}
      <ul>{rows.map((row, i) => <EditableRow key={i} row={row} />)}</ul>

      {/* Bug: random keys - every row remounts on each render, notes are lost */}
      {/* <ul>{rows.map((row) => <EditableRow key={Math.random()} row={row} />)}</ul> */}

      {/* Correct: stable ids from the data */}
      <ul>{rows.map((row) => <EditableRow key={row.id} row={row} />)}</ul>
    </div>
  );
}

=== r173 | E | State not updating immediately?
**State does not update immediately because calling a setter only schedules a re-render; the variable in the current render is a constant snapshot. You see the new value in the next render. Use the value you computed, use updater functions for sequential updates, react to changes in effects or during render, and use `flushSync` only if you must read the updated DOM right away.**

### The classic surprise
```
setCount(count + 1);
console.log(count); // old value
```
`count` is a `const` captured by this render. React re-renders the component later with the new value.

### Fixes depending on what you need
1. **Use the new value now:** compute it first, `const next = count + 1; setCount(next); save(next);`.
2. **Multiple updates based on the previous value:** `setCount((c) => c + 1)` repeated works; `setCount(count + 1)` repeated does not.
3. **Do something after the state changes:** usually do it in the same event handler with the computed value; if it is synchronization with an external system, use `useEffect` with the state as a dependency.
4. **Read the updated DOM** (scroll to a new item): `flushSync(() => setItems(...))` then read the DOM.
5. **Async code reading state later:** functional updates, or refs for the latest value; React 19.2's `useEffectEvent` for effect callbacks.

### Batching
React 18+ batches all updates in an event into one render, so several setters still produce one re-render with all new values.

### Not a bug
This snapshot behavior is what makes rendering predictable and enables concurrent rendering.
--- code
import { useState } from "react";
import { flushSync } from "react-dom";

export function Quantity({ onSave }: { onSave: (qty: number) => Promise<void> }) {
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<string[]>([]);

  async function addOne() {
    const next = qty + 1;   // compute the new value once
    setQty(next);           // schedules a re-render
    console.log(qty);       // still the old value (snapshot)
    await onSave(next);     // use `next`, not `qty`
  }

  function addThree() {
    setQty((q) => q + 1);   // updater functions chain correctly
    setQty((q) => q + 1);
    setQty((q) => q + 1);
  }

  function addItemAndScroll() {
    flushSync(() => setItems((i) => [...i, `Item ${i.length + 1}`])); // DOM updated synchronously
    document.querySelector("#items li:last-child")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div>
      <p>Qty: {qty}</p>
      <button onClick={addOne}>+1 and save</button>
      <button onClick={addThree}>+3</button>
      <button onClick={addItemAndScroll}>Add item</button>
      <ul id="items">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

=== r174 | M | Async bugs in React?
**Async bugs in React usually come from work that finishes after the component's situation has changed: responses arriving out of order (race conditions), updates after unmount or after the user navigated, stale values captured by closures, double execution in Strict Mode, and unhandled promise rejections. Fix them with cancellation (`AbortController`), ignore flags, functional updates, proper cleanup, and data libraries that handle these cases.**

### Common bugs
1. **Race conditions:** typing "re" then "react" fires two requests; if "re" answers last, its results overwrite "react".
2. **Updates after unmount or navigation:** a slow request finishes and sets state on a screen the user left (React 18 removed the warning, but the work is wasted and can show wrong data).
3. **Stale closures:** a callback after `await` reads old state; `setItems([...items, x])` loses concurrent updates.
4. **Strict Mode double effects:** effects that start requests run twice in development; without cleanup you get duplicate requests or duplicated data.
5. **Double submits:** users click twice before the first request finishes.
6. **Unhandled errors:** rejected promises in effects or handlers that never show feedback.
7. **Async in `useEffect` directly:** `useEffect(async () => ...)` returns a promise instead of a cleanup function.

### Fixes
- `AbortController` per request, aborted in cleanup.
- `let ignore = false` in effects, set to `true` in cleanup.
- Functional state updates after `await`.
- Disable buttons while pending (`useTransition`, `useActionState`'s `isPending`).
- `try/catch` with user-visible errors; error boundaries for Actions and Suspense.
- Define an inner async function in effects.
- Prefer TanStack Query, SWR or route loaders, which cancel, deduplicate and order requests for you.
--- code
import { useEffect, useState, useTransition } from "react";

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // useEffect(async () => ...) would be a bug: effects must return a cleanup, not a promise
    const controller = new AbortController();

    async function run() {
      try {
        setError(null);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setResults(await res.json());
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message); // ignore cancelled requests
      }
    }
    run();
    return () => controller.abort(); // a newer query (or unmount) cancels the old request
  }, [query]);

  return error ? <p role="alert">{error}</p> : <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>;
}

export function SaveButton({ save }: { save: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(save)}>{pending ? "Saving…" : "Save"}</button>; // no double submit
}

=== r175 | M | What are memory leaks?
**A memory leak in a React app is memory that stays allocated after it is no longer needed, usually because something outside React still references a component's closures or DOM nodes: event listeners, timers, subscriptions, observers, sockets or third-party widgets that were never cleaned up, or caches that grow without limit. Over time the app gets slower and can crash, especially in long-lived single-page apps.**

### Common sources
- `window`/`document` listeners added in effects without `removeEventListener`.
- `setInterval`/`setTimeout` not cleared.
- WebSockets, `EventSource`, Firebase or store subscriptions not closed.
- `IntersectionObserver`, `ResizeObserver`, `MutationObserver` not disconnected.
- Third-party libraries (maps, charts, editors) not destroyed.
- Unbounded caches or arrays in module scope, such as storing every message forever.
- Detached DOM nodes held in refs or closures by long-lived objects.
- Global event buses where handlers are registered on every mount.

### Prevention
- Return a cleanup from every effect that subscribes or schedules work.
- Use ref callback cleanups (React 19) for observers attached to DOM nodes.
- Cap caches (LRU), use `WeakMap`/`WeakRef` for metadata keyed by objects.
- Let data libraries manage caching with garbage collection (`gcTime` in TanStack Query).
- Test with Strict Mode: double mount and unmount reveals missing cleanups.

### Finding leaks
Chrome DevTools Memory panel: take heap snapshots before and after repeating an action (open and close a modal ten times), compare retained objects, and look for "Detached" DOM nodes and growing listener counts. The Performance monitor shows JS heap size and listener counts over time.
--- code
import { useEffect, useRef, useState } from "react";

export function LivePrices({ symbols }: { symbols: string[] }) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const chartRef = useRef<{ destroy(): void } | null>(null);

  useEffect(() => {
    const ws = new WebSocket("wss://prices.example.com");
    ws.onopen = () => ws.send(JSON.stringify({ subscribe: symbols }));
    ws.onmessage = (e) => {
      const { symbol, price } = JSON.parse(e.data);
      setPrices((p) => ({ ...p, [symbol]: price }));
    };

    const onVisibility = () => document.hidden ? ws.send('{"pause":true}') : ws.send('{"pause":false}');
    document.addEventListener("visibilitychange", onVisibility);

    const id = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"ping":1}'), 30_000);

    return () => {
      // Every resource created above is released here
      ws.close();
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(id);
      chartRef.current?.destroy();
    };
  }, [symbols]);

  // React 19: ref callback cleanup for observers
  const observe = (node: HTMLDivElement) => {
    const ro = new ResizeObserver(() => {});
    ro.observe(node);
    return () => ro.disconnect();
  };

  return <div ref={observe}>{Object.entries(prices).map(([s, p]) => <p key={s}>{s}: {p}</p>)}</div>;
}

=== r176 | M | Race conditions in fetching?
**A fetching race condition happens when several requests are in flight and they resolve in a different order than they were sent, so an older response overwrites a newer one. In React this typically occurs when props or state that drive a fetch change quickly (search input, switching tabs or user IDs). Prevent it by cancelling or ignoring stale requests, or by using a data library that keys results by input.**

### Example
User types "rea" then "react". Requests go out in that order, but "rea" is slower and returns last, so the list shows results for "rea" while the input says "react".

### Fixes
1. **`AbortController`:** create one per effect run, pass `signal` to `fetch`, abort in the cleanup. The stale request rejects with `AbortError`, which you ignore. Also saves bandwidth.
2. **Ignore flag:** `let ignore = false;` in the effect and `ignore = true` in cleanup; only set state if `!ignore`. Works for any promise, including SDKs that do not support abort.
3. **Request IDs:** compare a counter stored in a ref with the ID of the response.
4. **Data libraries:** TanStack Query and SWR store results per key (`["search", query]`), so a late response for an old key never replaces the current one; they also pass an `AbortSignal` to your query function.
5. **Router loaders:** React Router cancels in-flight loader requests when a newer navigation starts.
6. **Transitions:** React 19.3 renders transitions independently, but data correctness still depends on handling stale responses.

### Related
- Debouncing reduces the number of requests, but does not by itself prevent out-of-order responses.
- Server-side: make mutations idempotent so retried or duplicated requests do not corrupt data.
--- code
import { useEffect, useRef, useState } from "react";

type Profile = { id: string; name: string };

// Fix 1 + 2: abort the stale request AND ignore its result
export function ProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    setProfile(null);

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: Profile) => {
        if (!ignore) setProfile(data); // a response for an old userId is dropped
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [userId]);

  return <p>{profile ? profile.name : "Loading…"}</p>;
}

// Fix 3: request ids for promise-based SDKs without abort support
export function useLatest<T>(load: () => Promise<T>, deps: unknown[]) {
  const latest = useRef(0);
  const [data, setData] = useState<T>();
  useEffect(() => {
    const id = ++latest.current;
    load().then((d) => id === latest.current && setData(d));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}

=== r177 | M | Stale data issues?
**Stale data means the UI shows information that no longer matches the server or the current inputs: an old list after a mutation, a previous user's data after switching accounts, values captured in closures, or cached responses that never refresh. Fix it by defining freshness rules, invalidating caches after writes, keying data by its inputs, and revalidating on focus, reconnect or intervals.**

### Typical causes
1. **No invalidation after mutation:** you create a todo, but the list query is not refetched.
2. **Wrong cache keys:** `["user"]` instead of `["user", userId]`, so different users share one entry.
3. **Copying server data into local state:** `useState(props.items)` never updates when props change.
4. **Long `staleTime` without revalidation**, or HTTP caching headers that are too aggressive.
5. **Stale closures:** intervals or listeners reading old state.
6. **Optimistic updates without rollback or refetch.**
7. **Multiple tabs:** another tab changed the data.
8. **Logout or account switch** without clearing caches.

### Fixes
- **TanStack Query / SWR:** keys that include all inputs; `invalidateQueries` or `mutate` after writes; `refetchOnWindowFocus`, `refetchOnReconnect`, `refetchInterval` for live data; `queryClient.clear()` on logout.
- **Frameworks:** Next.js `updateTag`/`revalidateTag` after mutations; React Router revalidates loaders after actions automatically.
- **Real-time:** WebSockets or Server-Sent Events that update or invalidate the cache.
- **Do not mirror props in state;** read props directly or reset with a `key`.
- **Show freshness:** "Updated 2 minutes ago" and a refresh button for data where it matters.
- **`BroadcastChannel`** or the `storage` event to sync tabs.
--- code
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Todo = { id: string; title: string };

export function useTodos(listId: string) {
  return useQuery({
    queryKey: ["todos", listId],          // key includes every input
    queryFn: () => fetch(`/api/lists/${listId}/todos`).then((r) => r.json() as Promise<Todo[]>),
    staleTime: 30_000,                    // fresh for 30s
    refetchOnWindowFocus: true,           // revalidate when the user returns
  });
}

export function useAddTodo(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      fetch(`/api/lists/${listId}/todos`, { method: "POST", body: JSON.stringify({ title }) }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos", listId] }), // no stale list after a write
  });
}

// On logout, drop every cached response for the previous user
export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    await fetch("/api/logout", { method: "POST" });
    queryClient.clear();
  };
}

// Cross-tab sync: tell other tabs to refetch
const channel = new BroadcastChannel("todos");
export const notifyOtherTabs = (listId: string) => channel.postMessage({ listId });

=== r178 | M | Debounce in React?
**Debouncing delays running a function until a burst of events has stopped for a set time, for example calling a search API only after the user stops typing for 300ms. In React, either debounce the value with a `useDebounce` hook and use it as an effect or query dependency, or keep a stable debounced function in a ref or memo so it is not recreated every render.**

### Two approaches
1. **Debounced value:** `const debouncedQuery = useDebounce(query, 300)`. The input updates instantly; effects or queries depend on `debouncedQuery`. Simple and declarative.
2. **Debounced callback:** create the debounced function once (`useMemo(() => debounce(fn, 300), [])` or a `useDebouncedCallback` hook) and call it from `onChange`. Cancel it on unmount.

### Pitfalls
- Creating `debounce(fn)` inline in render makes a new timer every render, so it never debounces.
- The debounced function captures stale props or state unless it reads the latest values (via a ref, `useEffectEvent`, or by passing values as arguments).
- Forgetting to cancel on unmount can fire after the component is gone.
- Debouncing does not prevent out-of-order responses; still cancel or ignore stale requests.

### Debounce vs alternatives
- **`useDeferredValue`:** keeps typing responsive for expensive rendering, but it does not reduce network requests.
- **Throttle:** runs at most once per interval during continuous events (scroll, resize).
- **TanStack Query with a debounced key:** caches each query and handles cancellation.

### Typical delays
200 to 400ms for search; 500ms to 2s for autosave.
--- code
import { useEffect, useMemo, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // restart the timer on every change
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 300) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }); // always call the latest fn (no stale closure)
  const debounced = useMemo(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const run = (...args: A) => { clearTimeout(id); id = setTimeout(() => fnRef.current(...args), delay); };
    run.cancel = () => clearTimeout(id);
    return run;
  }, [delay]);
  useEffect(() => debounced.cancel, [debounced]); // cancel on unmount
  return debounced;
}

export function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!debouncedQuery) return setResults([]);
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: ctrl.signal })
      .then((r) => r.json()).then(setResults).catch(() => {});
    return () => ctrl.abort();
  }, [debouncedQuery]);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>
    </>
  );
}

=== r179 | M | Throttle in React?
**Throttling limits how often a function runs during continuous events, for example at most once every 100ms while scrolling or resizing, while still running regularly during the activity (unlike debounce, which waits for a pause). In React, create the throttled handler once, attach it in an effect with cleanup, and prefer `requestAnimationFrame` for visual updates or browser APIs like `IntersectionObserver` that avoid scroll listeners entirely.**

### When to throttle
- Scroll position tracking (progress bars, "back to top" buttons, sticky headers).
- Window resize calculations.
- Pointer or mouse move handlers (drag, drawing, cursor sharing).
- Rate-limiting API calls during continuous actions (sending cursor positions over a WebSocket).

### Implementations
- **Timestamp-based:** run if enough time has passed since the last call; optionally schedule a trailing call so the final position is not missed.
- **`requestAnimationFrame`:** at most once per frame (about 16ms at 60Hz), synchronized with painting. Best for visual updates.
- **Libraries:** `lodash-es/throttle` or `es-toolkit` with `leading` and `trailing` options.

### React specifics
- Do not create the throttled function in render without memoization; it would reset every render.
- Use `{ passive: true }` for scroll and touch listeners so the browser can scroll smoothly.
- Clean up listeners and pending timers or animation frames.
- Avoid storing every event in state; store derived values (for example a boolean "scrolled past header") to minimize re-renders.

### Often better than throttling
- `IntersectionObserver` for "is this element visible" (lazy loading, infinite scroll, active section).
- CSS `position: sticky` and scroll-driven animations for purely visual effects.
--- code
import { useEffect, useState } from "react";

function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let last = 0;
  let trailing: ReturnType<typeof setTimeout> | undefined;
  const run = (...args: A) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    clearTimeout(trailing);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      trailing = setTimeout(() => { last = Date.now(); fn(...args); }, remaining); // don't miss the final event
    }
  };
  run.cancel = () => clearTimeout(trailing);
  return run;
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = throttle(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.round((window.scrollY / max) * 100) : 0);
    }, 100); // at most 10 updates per second

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      update.cancel();
    };
  }, []);

  return <div style={{ position: "fixed", top: 0, left: 0, height: 4, width: `${progress}%`, background: "#4f46e5" }} />;
}

=== r180 | M | Cleanup issues?
**Cleanup issues happen when effects or refs set something up but do not fully undo it, or undo the wrong thing. Symptoms include duplicated event handlers, timers that keep running after a component unmounts, requests updating the wrong screen, memory leaks, and bugs that appear only in development under Strict Mode. Every effect that subscribes, schedules or connects must return a symmetric cleanup.**

### Typical mistakes
1. **No cleanup at all** for listeners, intervals, sockets or observers.
2. **Removing a different function:** `removeEventListener("resize", () => update())` creates a new function, so nothing is removed. Keep a reference to the same function.
3. **Different options:** a listener added with `{ capture: true }` must be removed with the same capture flag.
4. **Cleanup using values from the wrong render:** reading `ref.current` in cleanup when it may have changed; copy it to a variable inside the effect.
5. **Not aborting fetches:** results arrive after navigation or for an outdated input.
6. **Async cleanup:** cleanups must be synchronous; start async teardown but do not `await` it in the cleanup.
7. **Third-party instances** (maps, charts, players) not destroyed, so a second instance is created on remount.
8. **Fighting Strict Mode** with "run once" refs instead of making setup and cleanup symmetric.

### Checks
- Mount, unmount and remount the component (Strict Mode does this in development; `<Activity>` does it when hiding and showing). Nothing should duplicate or break.
- Watch listener counts and heap size in Chrome DevTools.

### React 19 helps
Ref callbacks can return cleanup functions, so observers and libraries attached to DOM nodes can be cleaned up next to where they are set up.
--- code
import { useEffect, useRef } from "react";

export function Chart({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current; // copy: the ref may change before cleanup runs
    if (!el) return;

    const onResize = () => console.log("resize", el.clientWidth); // keep the SAME function reference
    window.addEventListener("resize", onResize, { passive: true });

    const controller = new AbortController();
    fetch("/api/annotations", { signal: controller.signal }).catch(() => {});

    const chart = createChart(el, data); // third-party instance

    return () => {
      window.removeEventListener("resize", onResize);   // same reference, same options
      controller.abort();
      chart.destroy();                                   // avoid a second chart on remount
    };
    // Wrong: window.removeEventListener("resize", () => onResize()); // different function, nothing removed
  }, [data]);

  return <div ref={containerRef} style={{ height: 240 }} />;
}

declare function createChart(el: HTMLElement, data: number[]): { destroy(): void };

=== r181 | E | Build a counter app
**A counter app holds a number in state with `useState` and updates it from buttons using functional updates. A good interview version adds a configurable step, limits (min and max), reset, and accessible labels, and keeps derived values like "at limit" computed during render.**

### Requirements to cover
1. Show the current count.
2. Increment and decrement buttons.
3. Reset to the initial value.
4. Optional step input and bounds.
5. Disable buttons at the limits.

### Key points to talk through
- **Functional updates** (`setCount((c) => c + step)`) avoid stale values when clicks happen quickly.
- **Clamping** with `Math.min`/`Math.max` keeps the count in range.
- **Derived state:** `atMin` and `atMax` are computed, not stored.
- **Controlled number input** for the step, with validation (`Number.isFinite`, minimum of 1).
- **Accessibility:** buttons have `aria-label`s, the count is announced with `aria-live="polite"`.
- **Extensions:** persist to `localStorage`, keyboard shortcuts (arrow keys), or a `useCounter` custom hook that returns `{ count, increment, decrement, reset }` for reuse and testing.

### Testing
Render it, click increment twice with `user-event`, assert the displayed value, and check that the decrement button is disabled at the minimum.
--- code
import { useState } from "react";

type Props = { initial?: number; min?: number; max?: number };

export function Counter({ initial = 0, min = -Infinity, max = Infinity }: Props) {
  const [count, setCount] = useState(initial);
  const [step, setStep] = useState(1);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const atMin = count <= min; // derived, not stored
  const atMax = count >= max;

  return (
    <section aria-label="Counter">
      <p aria-live="polite" style={{ fontSize: 32 }}>{count}</p>

      <button aria-label="Decrement" disabled={atMin} onClick={() => setCount((c) => clamp(c - step))}>−</button>
      <button aria-label="Increment" disabled={atMax} onClick={() => setCount((c) => clamp(c + step))}>+</button>
      <button onClick={() => setCount(initial)}>Reset</button>

      <label>
        Step{" "}
        <input
          type="number"
          min={1}
          value={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            setStep(Number.isFinite(n) && n >= 1 ? n : 1);
          }}
        />
      </label>
    </section>
  );
}

// <Counter initial={0} min={0} max={10} />

=== r182 | M | Build a todo app
**A todo app keeps an array of todo objects (`{ id, text, done }`) in state, adds items from a form, toggles and deletes them immutably, filters by status, and shows counts derived during render. `useReducer` keeps the update logic in one place, and persisting to `localStorage` is a common extension.**

### Features to implement
1. Add a todo (trimmed, non-empty) with a generated ID.
2. Toggle done, edit, delete.
3. Filter: all, active, completed.
4. Remaining count and "clear completed".
5. Persist between reloads.

### Design decisions to explain
- **Reducer** for add, toggle, delete and clear actions; pure and testable.
- **Stable IDs** with `crypto.randomUUID()` when creating, used as keys.
- **Immutable updates** (`map`, `filter`, spread).
- **Derived data:** visible todos and counts computed from `todos` and `filter`.
- **Lazy initial state** reading `localStorage` once; an effect writes changes back.
- **Form handling:** React 19 form action or `onSubmit` with `preventDefault`; reset the input after adding.
- **Accessibility:** a labeled input, checkboxes with labels, filter buttons with `aria-pressed`.

### Extensions
Drag to reorder, due dates, syncing with an API using TanStack Query and optimistic updates (`useOptimistic`), undo with a history stack.
--- code
import { useEffect, useReducer, useState } from "react";

type Todo = { id: string; text: string; done: boolean };
type Action = { type: "added"; text: string } | { type: "toggled"; id: string } | { type: "deleted"; id: string } | { type: "cleared" };
type Filter = "all" | "active" | "done";

function reducer(todos: Todo[], a: Action): Todo[] {
  switch (a.type) {
    case "added": return [...todos, { id: crypto.randomUUID(), text: a.text, done: false }];
    case "toggled": return todos.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t));
    case "deleted": return todos.filter((t) => t.id !== a.id);
    case "cleared": return todos.filter((t) => !t.done);
  }
}

const load = (): Todo[] => { try { return JSON.parse(localStorage.getItem("todos") ?? "[]"); } catch { return []; } };

export function TodoApp() {
  const [todos, dispatch] = useReducer(reducer, undefined, load);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => localStorage.setItem("todos", JSON.stringify(todos)), [todos]);

  const visible = todos.filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done));
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <section>
      <form action={(fd) => { const text = String(fd.get("text")).trim(); if (text) dispatch({ type: "added", text }); }}>
        <label htmlFor="new">New todo</label> <input id="new" name="text" autoComplete="off" /> <button>Add</button>
      </form>
      <ul>
        {visible.map((t) => (
          <li key={t.id}>
            <label><input type="checkbox" checked={t.done} onChange={() => dispatch({ type: "toggled", id: t.id })} /> {t.text}</label>
            <button aria-label={`Delete ${t.text}`} onClick={() => dispatch({ type: "deleted", id: t.id })}>×</button>
          </li>
        ))}
      </ul>
      <p>{remaining} left</p>
      {(["all", "active", "done"] as Filter[]).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}
      <button onClick={() => dispatch({ type: "cleared" })}>Clear completed</button>
    </section>
  );
}

=== r183 | M | Search with debounce
**A debounced search keeps the input responsive by updating its value on every keystroke, but only fetches results after the user pauses (for example 300ms). Implement it with a `useDebounce` hook for the query, an effect (or TanStack Query) keyed on the debounced value, `AbortController` to cancel stale requests, and clear loading, empty and error states.**

### Steps
1. Controlled input with `query` state.
2. `debouncedQuery = useDebounce(query, 300)`.
3. Skip fetching for empty or very short queries.
4. Fetch in an effect depending on `debouncedQuery`, with an `AbortController` aborted in cleanup.
5. Track `status`: idle, loading, success, error.
6. Render results, "no results" and error messages.
7. Optional: show stale results dimmed while loading, highlight matched text, keyboard navigation of results.

### Points to mention
- Debouncing reduces requests; aborting prevents race conditions where an old response overwrites a newer one. You need both.
- Encode the query with `encodeURIComponent`.
- Cache recent results (a `Map` in a ref, or TanStack Query with `queryKey: ["search", debouncedQuery]` and `placeholderData: keepPreviousData`).
- Put the query in the URL (`?q=`) so searches are shareable.
- Accessibility: `role="search"`, a label, and `aria-live` for the result count.
--- code
import { useEffect, useState } from "react";

function useDebounce<T>(value: T, delay: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

type Result = { id: number; title: string };
type Status = "idle" | "loading" | "success" | "error";

export function DebouncedSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetch(`https://dummyjson.com/products/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { products: Result[] }) => { setResults(data.products); setStatus("success"); })
      .catch((e) => e.name !== "AbortError" && setStatus("error"));
    return () => controller.abort(); // cancel when the query changes
  }, [debouncedQuery]);

  return (
    <div role="search">
      <label htmlFor="q">Search products</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p aria-live="polite">
        {status === "loading" && "Searching…"}
        {status === "error" && "Something went wrong."}
        {status === "success" && `${results.length} results`}
      </p>
      <ul style={{ opacity: status === "loading" ? 0.6 : 1 }}>{results.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}

=== r184 | H | Infinite scroll logic
**Infinite scroll loads the next page of data when the user nears the end of the list. The robust way is to place a sentinel element after the last item and watch it with `IntersectionObserver` (not scroll events), fetch the next page when it becomes visible, append results, and stop when there are no more pages. Guard against duplicate requests, handle errors with retry, and virtualize very long lists.**

### Steps
1. State: `items`, `page` or `cursor`, `hasMore`, `loading`, `error`.
2. Render items plus a sentinel `<div>` at the end.
3. Observe the sentinel with `IntersectionObserver` (`rootMargin: "200px"` to prefetch before the bottom).
4. When it intersects and you are not already loading and `hasMore`, fetch the next page.
5. Append items, update the cursor and `hasMore` from the API response.
6. Disconnect the observer in cleanup.

### Pitfalls to mention
- **Duplicate fetches:** the sentinel can fire several times; check a loading flag (a ref avoids stale closures).
- **Cursor vs offset pagination:** cursors avoid duplicates and gaps when data changes while scrolling.
- **Race conditions:** abort or ignore requests when filters change, and reset the list.
- **Accessibility and UX:** provide a "Load more" button fallback, keep focus stable, announce new items, and let users reach the footer.
- **Performance:** thousands of DOM nodes slow the page; virtualize (TanStack Virtual) and keep scroll restoration in mind.

### Libraries
TanStack Query's `useInfiniteQuery` handles pages, `fetchNextPage`, `hasNextPage` and caching.
--- code
import { useCallback, useEffect, useRef, useState } from "react";

type Post = { id: number; title: string };
type Page = { posts: Post[]; total: number; skip: number; limit: number };

export function InfiniteFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return; // prevent duplicate requests
    loadingRef.current = true;
    setError(false);
    try {
      const res = await fetch(`https://dummyjson.com/posts?limit=10&skip=${posts.length}&select=title`);
      const page: Page = await res.json();
      setPosts((prev) => [...prev, ...page.posts]);
      setHasMore(page.skip + page.limit < page.total);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
    }
  }, [posts.length, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div>
      <ul>{posts.map((p) => <li key={p.id} style={{ padding: 16 }}>{p.title}</li>)}</ul>
      {error && <button onClick={loadMore}>Retry</button>}
      {hasMore ? <div ref={sentinelRef} aria-hidden>Loading more…</div> : <p>You've reached the end.</p>}
    </div>
  );
}

=== r185 | M | Pagination implementation
**Pagination splits a list into pages and lets users move between them. Keep the current page (ideally in the URL), compute `totalPages` from the total count and page size, fetch or slice only the current page, and render previous and next buttons plus a compact range of page numbers with ellipses. Server-side pagination is the norm for real data.**

### Client-side vs server-side
- **Client-side:** all data is already loaded; slice with `items.slice((page - 1) * size, page * size)`. Fine for small datasets.
- **Server-side:** request `?page=2&limit=20` (offset) or `?cursor=abc` (cursor) and render what comes back. Needed for large or changing data.

### Implementation points
- Store `page` in the URL (`useSearchParams`) so it survives reloads and can be shared; validate and clamp it.
- `totalPages = Math.max(1, Math.ceil(total / pageSize))`.
- Disable "Previous" on page 1 and "Next" on the last page.
- Show a window of page numbers around the current page with ellipses for long ranges.
- Keep previous data visible while the next page loads (TanStack Query `placeholderData: keepPreviousData`) to avoid layout jumps.
- Reset to page 1 when filters change.
- Scroll to the top of the list after changing pages and move focus for keyboard users.

### Accessibility
Wrap controls in `<nav aria-label="Pagination">`, mark the current page with `aria-current="page"`, and give buttons clear labels.
--- code
import { useSearchParams } from "react-router";

function pageRange(current: number, total: number, delta = 1): (number | "…")[] {
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= delta) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return pages;
}

export function Pagination({ total, pageSize = 20 }: { total: number; pageSize?: number }) {
  const [params, setParams] = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(params.get("page")) || 1)); // validate + clamp

  const go = (p: number) => {
    setParams((prev) => { prev.set("page", String(p)); return prev; });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav aria-label="Pagination">
      <button disabled={page === 1} onClick={() => go(page - 1)}>Previous</button>
      {pageRange(page, totalPages).map((p, i) =>
        p === "…" ? <span key={`gap-${i}`}>…</span> : (
          <button key={p} aria-current={p === page ? "page" : undefined} onClick={() => go(p)}>{p}</button>
        )
      )}
      <button disabled={page === totalPages} onClick={() => go(page + 1)}>Next</button>
    </nav>
  );
}

// Data for the current page (server-side):
// useQuery({ queryKey: ["orders", page], queryFn: () => fetch(`/api/orders?page=${page}&limit=20`).then(r => r.json()),
//            placeholderData: keepPreviousData });

=== r186 | M | Form validation logic
**Form validation logic checks each field against rules, collects error messages per field, decides when to show them (on blur, then live while correcting, and on submit), blocks submission while invalid, and focuses the first invalid field. A clean implementation separates a pure `validate(values)` function from the form component so the rules are easy to test and reuse.**

### Building blocks
1. **Values state** (or uncontrolled inputs read via `FormData`).
2. **A pure validator:** `validate(values) => errors`, returning `{ email?: string; password?: string }`.
3. **Touched state:** show a field's error only after it was blurred or the form was submitted.
4. **Submit handler:** run validation, focus the first invalid field, otherwise submit.
5. **Server errors:** merge field errors returned by the API.

### Rules commonly checked
Required fields, email format, length limits, password strength, matching confirmation, numeric ranges, dates in the future, and async checks such as username availability (debounced).

### UX and accessibility
- `aria-invalid` and `aria-describedby` linking inputs to their messages.
- Messages that say how to fix the problem ("At least 12 characters").
- Do not disable the submit button just because the form is invalid; let users submit and see errors.
- Preserve input on errors.
- Use `noValidate` on the form if you replace native browser messages.

### In production
Use a schema library (Zod) with React Hook Form or TanStack Form, and validate again on the server.
--- code
import { useRef, useState } from "react";

type Values = { email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Values, string>>;

export function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.email.trim()) e.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email";
  if (v.password.length < 12) e.password = "Use at least 12 characters";
  else if (!/\d/.test(v.password)) e.password = "Include at least one number";
  if (v.confirm !== v.password) e.confirm = "Passwords do not match";
  return e;
}

export function SignupForm() {
  const [values, setValues] = useState<Values>({ email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errors = validate(values); // derived on every render
  const show = (f: keyof Values) => touched[f] && errors[f];

  const field = (name: keyof Values, type = "text") => (
    <div>
      <label htmlFor={name}>{name}</label>
      <input id={name} name={name} type={type} value={values[name]} aria-invalid={!!show(name)} aria-describedby={`${name}-err`}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })} onBlur={() => setTouched({ ...touched, [name]: true })} />
      <p id={`${name}-err`} role="alert">{show(name) || ""}</p>
    </div>
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    const first = Object.keys(errors)[0];
    if (first) return formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    console.log("submit", values);
  }

  return <form ref={formRef} onSubmit={onSubmit} noValidate>{field("email", "email")}{field("password", "password")}{field("confirm", "password")}<button>Sign up</button></form>;
}

=== r187 | M | Modal component
**A good modal renders above the page, traps focus inside while open, closes on Escape and backdrop click, returns focus to the opener when closed, prevents background scrolling and interaction, and is announced to screen readers as a dialog. The simplest robust implementation today uses the native `<dialog>` element with `showModal()`, which provides focus trapping, Escape handling and an inert background for free.**

### Native `<dialog>` approach
- `dialogRef.current.showModal()` when `open` becomes true; `close()` when false.
- The browser makes the rest of the page inert, traps focus, and closes on Escape (listen to the `close` and `cancel` events to sync state).
- Style the backdrop with `dialog::backdrop`.
- Detect backdrop clicks by checking whether the click target is the dialog element itself.

### Portal approach
`createPortal(children, document.body)` renders outside parent containers that clip or stack content (overflow hidden, z-index). Then you must implement focus trapping, `aria-modal`, Escape handling, scroll locking and `inert` on the background yourself, or use a library.

### Accessibility checklist
- `aria-labelledby` pointing at the title (and `aria-describedby` for the description).
- Initial focus on the first meaningful control (or the dialog itself).
- Return focus to the trigger on close.
- Do not rely on the backdrop as the only way to close; include a visible close button.

### Libraries
Radix Dialog, React Aria `Modal`, Headless UI `Dialog`, and shadcn/ui handle these details.
--- code
import { useEffect, useId, useRef } from "react";

type ModalProps = { open: boolean; onClose: () => void; title: string; children: React.ReactNode };

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal(); // focus trap, inert background, Escape support
    if (!open && dialog.open) dialog.close();       // browser restores focus to the opener
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose} // fired on Escape and on close()
      onClick={(e) => e.target === e.currentTarget && onClose()} // backdrop click
      style={{ padding: 0, border: "none", borderRadius: 12 }}
    >
      <div style={{ padding: 24, minWidth: 320 }}>
        <h2 id={titleId}>{title}</h2>
        {children}
        <button onClick={onClose} autoFocus>Close</button>
      </div>
    </dialog>
  );
}

// Usage
// const [open, setOpen] = useState(false);
// <button onClick={() => setOpen(true)}>Delete account</button>
// <Modal open={open} onClose={() => setOpen(false)} title="Delete account?"><p>This cannot be undone.</p></Modal>
// CSS: dialog::backdrop { background: rgb(0 0 0 / 0.5); }

=== r188 | M | Tabs component
**A tabs component shows one panel at a time with a row of tab buttons. Store the active tab (controlled or uncontrolled), render buttons with `role="tab"` inside a `role="tablist"`, connect each tab to its panel with `aria-controls` and `aria-labelledby`, mark the active one with `aria-selected`, and support arrow-key navigation with roving `tabIndex`, following the WAI-ARIA Tabs pattern.**

### Requirements
1. Data-driven or compound API (`<Tabs><Tab/><Panel/></Tabs>`).
2. Active state with an optional `defaultValue` and `onChange`.
3. Keyboard: Left and Right arrows move between tabs, Home and End jump to the first and last; only the active tab is in the Tab order (`tabIndex={0}`, others `-1`).
4. ARIA roles and relationships; IDs generated with `useId`.
5. Inactive panels hidden (`hidden` attribute or not rendered).

### Design choices to discuss
- **Unmount vs hide inactive panels:** unmounting saves work but loses state; React 19.2's `<Activity mode="hidden">` keeps state while hidden and pauses effects.
- **Sync with the URL** (`?tab=billing`) so tabs are linkable.
- **Lazy-load heavy panels.**
- **Automatic vs manual activation:** activate on focus (arrow keys) or require Enter/Space.

### Libraries
Radix Tabs, React Aria Tabs, Headless UI Tab.
--- code
import { Activity, useId, useRef, useState } from "react";

type TabItem = { id: string; label: string; content: React.ReactNode };

export function Tabs({ items, defaultId }: { items: TabItem[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? items[0].id);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = items.length - 1;
    const next = e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(items[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Settings">
        {items.map((t, i) => (
          <button key={t.id} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`${baseId}-tab-${t.id}`}
            aria-selected={active === t.id} aria-controls={`${baseId}-panel-${t.id}`} tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)} onKeyDown={(e) => onKeyDown(e, i)}>
            {t.label}
          </button>
        ))}
      </div>
      {items.map((t) => (
        <Activity key={t.id} mode={active === t.id ? "visible" : "hidden"}> {/* keeps panel state when switching */}
          <div role="tabpanel" id={`${baseId}-panel-${t.id}`} aria-labelledby={`${baseId}-tab-${t.id}`} tabIndex={0}>{t.content}</div>
        </Activity>
      ))}
    </div>
  );
}

=== r189 | E | Accordion component
**An accordion is a list of headers that expand and collapse their content sections. Track which items are open (one at a time or several), render each header as a button inside a heading with `aria-expanded` and `aria-controls`, and show or hide the panel. The native `<details>` and `<summary>` elements provide a no-JavaScript version, and since 2024 browsers support `<details name="...">` for exclusive accordions.**

### Requirements
1. Toggle an item by clicking its header (Enter and Space work automatically on buttons).
2. Single-open or multi-open mode.
3. ARIA: header button with `aria-expanded`, `aria-controls`, panel with `role="region"` and `aria-labelledby`.
4. Optional animation of height and preserved content state.

### State design
- **Single mode:** `openId: string | null`.
- **Multi mode:** `open: Set<string>`, updated immutably (`new Set(prev)`).
- Controlled API (`value`, `onValueChange`) for parents that need to drive it.

### Native alternative
```
<details name="faq"><summary>Shipping</summary><p>3-5 days</p></details>
```
Elements with the same `name` act as an exclusive group in modern browsers, and the content is findable with Ctrl+F.

### Animation
Animate `grid-template-rows: 0fr` to `1fr`, or use CSS `interpolate-size: allow-keywords` where supported, rather than measuring heights in JavaScript.
--- code
import { useId, useState } from "react";

type Item = { id: string; title: string; content: React.ReactNode };

export function Accordion({ items, multiple = false }: { items: Item[]; multiple?: boolean }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const baseId = useId();

  function toggle(id: string) {
    setOpen((prev) => {
      const next = multiple ? new Set(prev) : new Set<string>();
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const headerId = `${baseId}-h-${item.id}`;
        const panelId = `${baseId}-p-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button id={headerId} aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(item.id)}>
                {item.title} {isOpen ? "−" : "+"}
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={headerId} hidden={!isOpen}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// <Accordion items={[{ id: "ship", title: "Shipping", content: <p>3-5 days</p> }, { id: "ret", title: "Returns", content: <p>30 days</p> }]} />

=== r190 | M | Dropdown menu
**A dropdown menu toggles a list of actions from a trigger button and must close when clicking outside, pressing Escape, or choosing an item. Implement open state, an outside-click listener (`pointerdown` on `document` that ignores clicks inside the menu), keyboard support (arrow keys to move between items, Escape to close and return focus), and ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="menu"` and `role="menuitem"`).**

### Requirements
1. Trigger button toggles the menu.
2. Close on outside click, Escape, item selection and when focus leaves.
3. Keyboard: Down/Up arrows move through items, Home/End, Enter activates; focus returns to the trigger on close.
4. Positioning that avoids overflow (flip above when near the bottom).

### Implementation notes
- Use a ref on the wrapper and check `wrapper.contains(event.target)` in a document `pointerdown` listener, added only while open and removed in cleanup.
- Manage item focus with refs and roving `tabIndex`.
- Use `useId` to link the trigger and menu.

### Modern platform features
- **Popover API:** `<button popovertarget="menu">` and `<div id="menu" popover>` give top-layer rendering, light dismiss (outside click and Escape) and no z-index problems, with no JavaScript.
- **CSS anchor positioning** places the popover relative to the button.

### Libraries
Radix Dropdown Menu, React Aria Menu, Headless UI Menu and Floating UI handle typeahead, submenus, collision detection and screen reader details.
--- code
import { useEffect, useId, useRef, useState } from "react";

const actions = ["Edit", "Duplicate", "Archive", "Delete"];

export function ActionsMenu({ onSelect }: { onSelect: (a: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false); // outside click
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus(); // return focus
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const n = actions.length;
    if (e.key === "Escape") return close();
    const next = e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowUp" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next >= 0) { e.preventDefault(); itemRefs.current[next]?.focus(); }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "inline-block" }}>
      <button ref={triggerRef} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>Actions ▾</button>
      {open && (
        <div id={menuId} role="menu" style={{ position: "absolute", top: "100%", left: 0, background: "white", boxShadow: "0 4px 12px #0002" }}>
          {actions.map((a, i) => (
            <button key={a} ref={(el) => { itemRefs.current[i] = el; }} role="menuitem" tabIndex={-1}
              onKeyDown={(e) => onKeyDown(e, i)} onClick={() => { onSelect(a); close(); }} style={{ display: "block", width: "100%" }}>
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

=== r191 | M | Dark mode toggle
**A dark mode toggle stores the user's preference ("light", "dark" or "system"), applies it by setting a class or `data-theme` attribute on `<html>` that switches CSS variables, follows `prefers-color-scheme` when set to system, persists the choice in `localStorage` (or a cookie for server rendering), and avoids a flash of the wrong theme by applying it before React hydrates.**

### Steps
1. **CSS variables:** `:root { --bg: white; --fg: black; }` and `[data-theme="dark"] { --bg: #0b1020; --fg: #f8fafc; }`; set `color-scheme` so form controls and scrollbars match.
2. **State:** `"light" | "dark" | "system"` with lazy initialization from `localStorage`.
3. **Resolve system:** `matchMedia("(prefers-color-scheme: dark)")`, listening for changes.
4. **Apply:** an effect sets `document.documentElement.dataset.theme` to the resolved theme.
5. **Persist:** save the preference on change.
6. **No flash:** a small inline script in `<head>` sets the attribute before first paint; in SSR apps read a cookie on the server. Libraries such as `next-themes` do this.

### Details
- Tailwind v4: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` to drive `dark:` utilities from the attribute.
- Give the toggle an accessible name and state (`aria-pressed` or a labeled select).
- Respect the system setting by default.
- Images and charts may need dark variants.
--- code
import { useEffect, useState } from "react";

type Pref = "light" | "dark" | "system";

function getSystem() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [pref, setPref] = useState<Pref>(() => (localStorage.getItem("theme") as Pref) ?? "system");
  const [system, setSystem] = useState<"light" | "dark">(getSystem);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(mql.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolved = pref === "system" ? system : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    localStorage.setItem("theme", pref);
  }, [pref, resolved]);

  return { pref, setPref, resolved };
}

export function ThemeToggle() {
  const { pref, setPref, resolved } = useTheme();
  return (
    <label>
      Theme ({resolved}){" "}
      <select value={pref} onChange={(e) => setPref(e.target.value as Pref)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

// In index.html <head>, before the app loads, to avoid a flash:
// <script>document.documentElement.dataset.theme = (localStorage.theme === "dark" || (localStorage.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)) ? "dark" : "light";</script>

=== r192 | M | API fetch + loader
**Fetching with a loader means representing the request as explicit states (idle, loading, success, error), showing a spinner or skeleton while loading, rendering data on success, and showing an error with a retry button on failure. In React 19 you can also express it declaratively: pass a promise to a component that reads it with `use()`, with `<Suspense>` providing the loader and an error boundary handling failures.**

### Imperative version (`useEffect`)
1. A single `status` state (avoid separate booleans that can contradict).
2. Start the request in an effect; abort it in cleanup.
3. Check `res.ok`, parse JSON, set data.
4. Catch errors (ignore `AbortError`).
5. Provide `retry` by bumping a counter in the dependency array.

### Declarative version (Suspense + `use`)
1. Create the promise outside render: in an event handler, a parent, a router loader, or a cache.
2. `const data = use(promise)` inside the child.
3. `<Suspense fallback={<Spinner />}>` shows the loader.
4. An error boundary renders the failure UI; resetting it with a new promise retries.

### Good loading UX
- Skeletons matching the final layout.
- Avoid flashing spinners for very fast responses.
- Keep old data visible when refreshing.
- Announce state changes with `aria-busy` and live regions.

### In production
TanStack Query or SWR handle caching, retries and deduplication; React Router loaders and Server Components load data before render.
--- code
import { Suspense, use, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

type User = { id: number; firstName: string; email: string };

// 1) Imperative: explicit states + abort + retry
export function UserCardEffect({ id }: { id: number }) {
  const [state, setState] = useState<{ status: "loading" | "success" | "error"; user?: User; error?: string }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetch(`https://dummyjson.com/users/${id}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((user: User) => setState({ status: "success", user }))
      .catch((e) => e.name !== "AbortError" && setState({ status: "error", error: e.message }));
    return () => ctrl.abort();
  }, [id, attempt]);

  if (state.status === "loading") return <p aria-busy="true">Loading user…</p>;
  if (state.status === "error") return <p role="alert">{state.error} <button onClick={() => setAttempt((a) => a + 1)}>Retry</button></p>;
  return <p>{state.user!.firstName} ({state.user!.email})</p>;
}

// 2) Declarative: use() + Suspense + error boundary (React 19)
const fetchUser = (id: number) => fetch(`https://dummyjson.com/users/${id}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed")))) as Promise<User>;

function UserCard({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <p>{user.firstName} ({user.email})</p>;
}

export function UserSection() {
  const [promise, setPromise] = useState(() => fetchUser(1)); // created once, not during every render
  return (
    <ErrorBoundary fallbackRender={({ resetErrorBoundary }) => <button onClick={() => { setPromise(fetchUser(1)); resetErrorBoundary(); }}>Retry</button>}>
      <Suspense fallback={<p>Loading user…</p>}><UserCard userPromise={promise} /></Suspense>
    </ErrorBoundary>
  );
}

=== r193 | M | Error Boundary implementation
**An error boundary is a class component that implements `static getDerivedStateFromError(error)` to switch to fallback UI and `componentDidCatch(error, info)` to log the error with its component stack. It renders `children` normally and the fallback after an error, and should offer a way to reset (a retry button or reset keys that change on navigation).**

### Implementation steps
1. State: `{ error: Error | null }`.
2. `static getDerivedStateFromError(error)` returns `{ error }` during render.
3. `componentDidCatch(error, info)` reports to monitoring with `info.componentStack`.
4. `render()` returns the fallback when `error` is set, otherwise `children`.
5. `reset()` clears the error so children render again.
6. `componentDidUpdate` resets when `resetKeys` change (for example the route or the selected item).

### Usage guidelines
- Wrap the app root, each route, and risky widgets separately.
- Fallbacks should explain the problem and offer an action.
- Errors in event handlers and async code outside rendering are not caught; handle them with `try/catch` or send them to state and throw during render.
- With Suspense data (`use`, `useSuspenseQuery`) and React 19 Actions, rejected promises reach the boundary.

### React 19 notes
- Root options `onCaughtError` and `onUncaughtError` centralize reporting.
- Caught errors are no longer re-thrown, reducing duplicate console noise.

### Library alternative
`react-error-boundary` provides `<ErrorBoundary>`, `FallbackComponent`, `resetKeys`, `onReset` and a `useErrorBoundary()` hook to trigger the boundary from event handlers.
--- code
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: (error: Error, reset: () => void) => ReactNode; resetKeys?: unknown[] };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error }; // switch to fallback on the next render
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to Sentry, Datadog, etc.
    console.error("Boundary caught:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    const changed = (this.props.resetKeys ?? []).some((k, i) => !Object.is(k, prev.resetKeys?.[i]));
    if (this.state.error && changed) this.reset(); // e.g. user navigated elsewhere
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.fallback?.(this.state.error, this.reset) ?? (
        <div role="alert">
          <p>Something went wrong.</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// <ErrorBoundary resetKeys={[location.pathname]} fallback={(e, reset) => <p>{e.message} <button onClick={reset}>Retry</button></p>}>
//   <Dashboard />
// </ErrorBoundary>

=== r194 | M | Custom hook (useFetch)
**A `useFetch` hook wraps a request in reusable state: it takes a URL (and options), returns `{ data, error, loading, refetch }`, aborts in-flight requests when the URL changes or the component unmounts, ignores stale responses, and treats non-2xx responses as errors. It is a great interview exercise, though production apps usually use TanStack Query or SWR for caching, deduplication and retries.**

### Requirements
1. Generic type for the response: `useFetch<User>(url)`.
2. `loading`, `data` and `error` states (or a single `status`).
3. Abort with `AbortController` in cleanup.
4. Handle `res.ok`, JSON parsing errors and network errors.
5. `refetch()` to retry or refresh.
6. Allow skipping (`url = null`).
7. Avoid infinite loops: options objects passed inline are new each render; serialize them or depend on primitives.

### Possible extensions
- Simple in-memory cache keyed by URL.
- Stale-while-revalidate: show cached data while refetching.
- Response validation with Zod.
- Retry with exponential backoff.
- A Suspense version that throws promises (or returns a promise for `use()`).

### Why libraries are better in production
They handle caching across components, request deduplication, background refetching, garbage collection, pagination, optimistic updates, devtools and SSR hydration. Mention this trade-off explicitly.
--- code
import { useCallback, useEffect, useState } from "react";

type State<T> = { data: T | null; error: Error | null; loading: boolean };

export function useFetch<T>(url: string | null, init?: RequestInit) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: !!url });
  const [version, setVersion] = useState(0);
  const initKey = JSON.stringify(init ?? {}); // stable dependency for inline options

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null })); // keep old data while refetching

    fetch(url, { ...JSON.parse(initKey), signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as T;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState((s) => ({ ...s, error, loading: false }));
      });

    return () => controller.abort(); // URL changed or unmounted: drop the old request
  }, [url, initKey, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, refetch };
}

// Usage
export function Todo({ id }: { id: number }) {
  const { data, error, loading, refetch } = useFetch<{ todo: string; completed: boolean }>(`https://dummyjson.com/todos/${id}`);
  if (loading && !data) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message} <button onClick={refetch}>Retry</button></p>;
  return <p>{data?.completed ? "✅" : "⬜"} {data?.todo}</p>;
}

=== r195 | M | useLocalStorage hook
**`useLocalStorage(key, initialValue)` behaves like `useState` but persists the value in `localStorage`. It reads the stored value lazily on first render, writes on every change, handles invalid JSON and unavailable storage, supports updater functions, and stays in sync across tabs and across components on the same page. Building it on `useSyncExternalStore` makes it concurrency-safe and SSR-friendly.**

### Requirements
1. Same API as `useState`: `[value, setValue]`, where `setValue` accepts a value or an updater function.
2. Lazy read on mount, with `initialValue` as the fallback.
3. JSON serialization with `try/catch` (storage can be full, disabled or contain corrupt data).
4. **Cross-tab sync:** the browser fires a `storage` event in other tabs.
5. **Same-tab sync:** components using the same key on one page should update together; dispatch a custom event when writing.
6. **SSR:** `localStorage` does not exist on the server; return `initialValue` from the server snapshot to avoid hydration mismatches.
7. Optional `remove()`.

### Why `useSyncExternalStore`
`localStorage` is an external store. `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` subscribes to changes and avoids tearing. `getSnapshot` must return a stable value for unchanged data, so return the raw string and parse it with `useMemo`.

### Caveats
- `localStorage` is synchronous and limited (about 5MB); do not store large data or secrets (any script can read it).
- For large or structured data, use IndexedDB (via `idb-keyval`, Dexie).
--- code
import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "local-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); // other tabs
  window.addEventListener(EVENT, callback);     // same tab
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => { try { return localStorage.getItem(key); } catch { return null; } }, // string: stable snapshot
    () => null // server snapshot
  );

  const value = useMemo<T>(() => {
    if (raw === null) return initialValue;
    try { return JSON.parse(raw) as T; } catch { return initialValue; }
  }, [raw, initialValue]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch (e) {
        console.warn("localStorage write failed", e); // quota exceeded or disabled
      }
      window.dispatchEvent(new Event(EVENT)); // notify other hooks on this page
    },
    [key, value]
  );

  const remove = useCallback(() => { localStorage.removeItem(key); window.dispatchEvent(new Event(EVENT)); }, [key]);
  return [value, setValue, remove] as const;
}

// const [cart, setCart] = useLocalStorage<string[]>("cart", []);
// setCart((c) => [...c, "pen"]);

=== r196 | H | Optimized list rendering
**To render large lists efficiently: give every row a stable key, keep row components cheap and memoized (or rely on the React Compiler) with stable props, avoid passing new objects or callbacks per row, keep fast-changing state out of the list's parent, defer expensive filtering with `useDeferredValue`, and virtualize so only visible rows are in the DOM. Measure with the Profiler before and after.**

### Techniques
1. **Stable keys:** IDs, never indexes or random values.
2. **Memoized rows:** `memo(Row)` so unchanged rows skip rendering when one row changes. Pass primitives or stable references; use one stable callback that takes an ID instead of a new arrow per row.
3. **Normalize data:** pass `item` objects whose references only change when that item changes (immutable updates do this naturally).
4. **Colocate state:** a row's hover or edit state lives in the row, not the parent.
5. **Defer expensive work:** `useDeferredValue` for filter text, `useMemo` for sorted or filtered arrays.
6. **Virtualize:** TanStack Virtual or `react-window` render only the visible window plus overscan, keeping DOM size constant for 10,000+ items.
7. **CSS containment:** `content-visibility: auto` with `contain-intrinsic-size` lets the browser skip offscreen rendering for moderately long lists without virtualization.
8. **Pagination or infinite loading** to avoid fetching everything.
9. **Avoid layout thrash:** fixed or estimated row heights for virtualization.

### React Compiler
With it enabled, memoization of rows and callbacks happens automatically; virtualization is still needed for very large lists, because the cost is DOM size, not React rendering.
--- code
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Item = { id: string; name: string; done: boolean };

const Row = memo(function Row({ item, onToggle }: { item: Item; onToggle: (id: string) => void }) {
  return (
    <label style={{ display: "flex", gap: 8, height: 36, alignItems: "center" }}>
      <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} /> {item.name}
    </label>
  );
});

export function BigList({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const parentRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => items.filter((i) => i.name.toLowerCase().includes(deferredQuery.toLowerCase())), [items, deferredQuery]);
  const onToggle = useCallback((id: string) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))), []);

  const virtualizer = useVirtualizer({ count: visible.length, getScrollElement: () => parentRef.current, estimateSize: () => 36, overscan: 8 });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Filter ${items.length} items`} />
      <div ref={parentRef} style={{ height: 400, overflow: "auto" }}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((v) => (
            <div key={visible[v.index].id} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${v.start}px)` }}>
              <Row item={visible[v.index]} onToggle={onToggle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

=== r197 | M | Drag and drop basics
**Basic drag and drop in React can use the native HTML Drag and Drop API: mark items `draggable`, store the dragged item's ID in `onDragStart` (via `dataTransfer` or state), call `preventDefault()` in `onDragOver` to allow dropping, and reorder the array immutably in `onDrop`. For production, especially touch support, keyboard accessibility and smooth animations, use a library such as dnd kit or Pragmatic drag and drop.**

### Native API events
- **`onDragStart`** on the dragged element: set `e.dataTransfer.setData("text/plain", id)` and `effectAllowed`.
- **`onDragOver`** on drop targets: `e.preventDefault()` is required, or dropping is not allowed.
- **`onDragEnter` / `onDragLeave`:** highlight drop targets.
- **`onDrop`:** read the data and update state.
- **`onDragEnd`:** clean up visual state whether or not the drop succeeded.

### Reordering logic
Remove the dragged item from its index and insert it at the target index, returning a new array. Keep it as a pure function so it is easy to test.

### Limitations of the native API
- Poor or no support on touch devices (mobile Safari support is limited).
- Not keyboard accessible by default.
- Limited control over the drag preview and animations.

### Accessibility
Provide an alternative: "Move up" and "Move down" buttons, or keyboard drag with Space to pick up and arrow keys to move, plus live-region announcements ("Item moved to position 3"). dnd kit includes keyboard sensors and screen reader announcements.

### Libraries
- **dnd kit:** React-first, sortable lists, sensors for mouse, touch and keyboard.
- **Pragmatic drag and drop** (Atlassian): small, framework-agnostic, built on the native API.
--- code
import { useState } from "react";

export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

type Card = { id: string; title: string };

export function SortableList({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function move(from: number, to: number) {
    if (to < 0 || to >= cards.length || from === to) return;
    setCards((c) => reorder(c, from, to));
    setAnnouncement(`${cards[from].title} moved to position ${to + 1}`);
  }

  return (
    <>
      <ul>
        {cards.map((card, index) => (
          <li key={card.id} draggable
            onDragStart={(e) => { setDragId(card.id); e.dataTransfer.setData("text/plain", card.id); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); setOverId(card.id); }} // required to allow dropping
            onDrop={(e) => { e.preventDefault(); const from = cards.findIndex((c) => c.id === e.dataTransfer.getData("text/plain")); move(from, index); }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            style={{ opacity: dragId === card.id ? 0.4 : 1, borderTop: overId === card.id ? "2px solid #4f46e5" : "2px solid transparent", padding: 8 }}>
            {card.title}
            {/* Keyboard-accessible alternative */}
            <button aria-label={`Move ${card.title} up`} onClick={() => move(index, index - 1)}>↑</button>
            <button aria-label={`Move ${card.title} down`} onClick={() => move(index, index + 1)}>↓</button>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </>
  );
}

=== r198 | H | Authentication flow
**A complete authentication flow covers loading the current session on startup, signing in, protecting routes, sending credentials with API requests, handling expired sessions, and signing out. In a React SPA the safest common setup keeps the session in an `httpOnly` cookie set by the server, exposes the user through an auth context or query, guards routes with a component or router middleware, and redirects back to the original page after login.**

### Steps
1. **Bootstrap:** on load, call `/api/me` (cookie sent automatically with `credentials: "include"`). Show a loading state until it resolves.
2. **Login:** submit credentials (or start OAuth or a passkey ceremony); the server sets the session cookie and returns the user; store the user in context.
3. **Protect routes:** if there is no user, redirect to `/login?next=/original` (or `state.from`); otherwise render the route.
4. **API calls:** include credentials; on a 401, try a refresh once (if using refresh tokens), otherwise clear the user and redirect to login.
5. **Logout:** call the server to clear the cookie, reset client caches (`queryClient.clear()`), redirect.
6. **Authorization:** check roles for UI, but the server must enforce permissions on every endpoint.

### Why not `localStorage` tokens
Tokens in `localStorage` can be stolen by any XSS. If you need bearer tokens, keep the access token in memory (short-lived) and the refresh token in an `httpOnly` cookie.

### Security details
CSRF protection for cookie-based APIs (`SameSite=Lax` cookies plus a CSRF token or origin checks for state-changing requests), rate-limited login, generic error messages ("Invalid email or password"), HTTPS only.

### In practice
Use an auth provider or library (Auth0, Clerk, WorkOS, Supabase, Better Auth) and your router's middleware or loaders.
--- code
import { createContext, use, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";

type User = { id: string; name: string; role: "user" | "admin" };
type AuthValue = { user: User | null; status: "loading" | "ready"; login: (email: string, pw: string) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
export const useAuth = () => { const v = use(AuthContext); if (!v) throw new Error("No AuthProvider"); return v; };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then(setUser).finally(() => setStatus("ready"));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await fetch("/api/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!r.ok) throw new Error("Invalid email or password");
    setUser(await r.json());
  };
  const logout = async () => { await fetch("/api/logout", { method: "POST", credentials: "include" }); setUser(null); };

  return <AuthContext value={{ user, status, login, logout }}>{children}</AuthContext>;
}

export function RequireAuth() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <p>Checking session…</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const next = new URLSearchParams(useLocation().search).get("next") ?? "/";
  return (
    <form action={async (fd) => { await login(String(fd.get("email")), String(fd.get("password"))); navigate(next, { replace: true }); }}>
      <input name="email" type="email" required /> <input name="password" type="password" required /> <button>Sign in</button>
    </form>
  );
}

=== r199 | M | Role-based routing
**Role-based routing shows or blocks routes depending on the user's role or permissions. Define the allowed roles per route, check them in a guard component or router middleware before rendering (redirect unauthenticated users to login and show a 403 page for authenticated users without access), hide navigation links they cannot use, and always enforce the same permissions on the server.**

### Design
1. **Model permissions, not just roles:** map roles to permissions (`admin` → `users:manage`, `reports:view`) and check permissions in routes and UI. Roles can change without code changes everywhere.
2. **Route metadata:** attach required permissions to route definitions (in the route config, a `handle` property, or a wrapper component).
3. **Guard:**
   - No user: redirect to login with `next`.
   - User lacks permission: render a "403: you don't have access" page (better than silently redirecting).
4. **Navigation:** filter menu items with the same `can()` function.
5. **Server enforcement:** every API checks the permission; client checks only shape the UI.

### In React Router (data mode)
Use middleware or loaders that throw `redirect("/login")` or a `data("Forbidden", { status: 403 })` response, which the route's `ErrorBoundary` renders. This avoids rendering the protected component at all.

### Edge cases
- Roles loaded asynchronously: show a loading state, not a 403 flash.
- Role changes during a session: refetch the user, or handle 403 responses from the API by refreshing permissions.
- Multi-tenant apps: roles per organization (`user.roles[orgId]`).
--- code
import { Navigate, Outlet, createBrowserRouter, NavLink } from "react-router";
import { useAuth } from "./auth";

type Permission = "reports:view" | "users:manage" | "billing:manage";
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  viewer: ["reports:view"],
  admin: ["reports:view", "users:manage", "billing:manage"],
};
export const can = (role: string | undefined, p: Permission) => !!role && ROLE_PERMISSIONS[role]?.includes(p);

function RequirePermission({ permission }: { permission: Permission }) {
  const { user, status } = useAuth();
  if (status === "loading") return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(user.role, permission)) return <p role="alert">403: you don't have access to this page.</p>;
  return <Outlet />;
}

export function Nav() {
  const { user } = useAuth();
  return (
    <nav>
      {can(user?.role, "reports:view") && <NavLink to="/reports">Reports</NavLink>}
      {can(user?.role, "users:manage") && <NavLink to="/admin/users">Users</NavLink>}
    </nav>
  );
}

export const router = createBrowserRouter([
  { element: <RequirePermission permission="reports:view" />, children: [{ path: "/reports", element: <h1>Reports</h1> }] },
  { element: <RequirePermission permission="users:manage" />, children: [{ path: "/admin/users", element: <h1>Manage users</h1> }] },
  { path: "/login", element: <h1>Login</h1> },
]);

=== r200 | H | Mini Dashboard app
**A mini dashboard combines a layout (sidebar, header, main area), several widgets (KPI cards, a chart, a recent-activity table) that load data independently, filters stored in the URL, and good loading, empty and error states. A strong interview answer separates layout from widgets, fetches in parallel with TanStack Query (or route loaders), wraps each widget in its own Suspense or error boundary, and keeps the UI responsive with transitions.**

### Architecture
1. **Layout:** `DashboardLayout` with `<Outlet />` (React Router) or nested layouts (Next.js), responsive sidebar.
2. **Filters in the URL:** date range and team via `useSearchParams`, so views are shareable.
3. **Data per widget:** each widget has its own query keyed by the filters (`["kpis", range]`, `["revenue", range]`), so they load in parallel and refetch independently.
4. **Isolation:** each widget inside its own error boundary and loading state, so one failing API does not break the page.
5. **Responsiveness:** `useTransition` when changing filters keeps old data visible; `placeholderData: keepPreviousData` avoids flashing skeletons.
6. **Charts:** a charting library (Recharts, visx, ECharts), lazy-loaded since chart code is heavy.
7. **Tables:** sorting and pagination; virtualization for large datasets.
8. **Accessibility:** semantic landmarks (`header`, `nav`, `main`), table headers, chart summaries in text.

### Performance
Code split heavy widgets, cache with sensible `staleTime`, refetch on focus for fresh numbers, and enable the React Compiler.

### Extensions
Real-time updates via WebSocket that update the query cache, saved views, CSV export, dark mode, role-based widgets.
--- code
import { lazy, Suspense, useTransition } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

const RevenueChart = lazy(() => import("./revenue-chart")); // heavy chart code split out
type Range = "7d" | "30d" | "90d";

const getJson = <T,>(url: string) => fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(`HTTP ${r.status}`))));

function Kpis({ range }: { range: Range }) {
  const { data, isPending } = useQuery({ queryKey: ["kpis", range], queryFn: () => getJson<{ label: string; value: string }[]>(`/api/kpis?range=${range}`), placeholderData: keepPreviousData });
  if (isPending) return <div className="h-20 animate-pulse bg-slate-100" />;
  return <div className="grid grid-cols-3 gap-4">{data!.map((k) => <article key={k.label}><p>{k.label}</p><strong>{k.value}</strong></article>)}</div>;
}

function RecentOrders({ range }: { range: Range }) {
  const { data = [] } = useQuery({ queryKey: ["orders", range], queryFn: () => getJson<{ id: string; total: number }[]>(`/api/orders?range=${range}`) });
  return <table><thead><tr><th>Order</th><th>Total</th></tr></thead><tbody>{data.map((o) => <tr key={o.id}><td>{o.id}</td><td>${o.total}</td></tr>)}</tbody></table>;
}

const Widget = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section aria-label={title}><h2>{title}</h2>
    <ErrorBoundary fallback={<p role="alert">{title} failed to load.</p>}><Suspense fallback={<p>Loading…</p>}>{children}</Suspense></ErrorBoundary>
  </section>
);

export function Dashboard() {
  const [params, setParams] = useSearchParams();
  const range = (params.get("range") as Range) ?? "30d";
  const [isPending, startTransition] = useTransition();

  return (
    <main style={{ opacity: isPending ? 0.7 : 1 }}>
      <header><h1>Dashboard</h1>
        <select value={range} onChange={(e) => startTransition(() => setParams({ range: e.target.value }))}>
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
        </select>
      </header>
      <Widget title="Key metrics"><Kpis range={range} /></Widget>
      <Widget title="Revenue"><RevenueChart range={range} /></Widget>
      <Widget title="Recent orders"><RecentOrders range={range} /></Widget>
    </main>
  );
}
