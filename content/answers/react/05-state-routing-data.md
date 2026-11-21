=== r111 | E | What is a Store?
**In Redux, the store is the single object that holds the whole application state and exposes three core methods: `getState()` to read it, `dispatch(action)` to request changes, and `subscribe(listener)` to be notified of updates. With Redux Toolkit you create it with `configureStore`, and React components access it through `<Provider>` and hooks.**

### What the store does
- Holds the current state tree.
- Runs dispatched actions through middleware, then through the root reducer to produce the next state.
- Notifies subscribers after each dispatch (React Redux uses `useSyncExternalStore` internally to subscribe safely).

### Creating one
`configureStore({ reducer: { cart: cartReducer, user: userReducer } })` combines slice reducers, adds the thunk middleware and DevTools, and enables development checks.

### In React
- Wrap the app in `<Provider store={store}>`.
- `useSelector((state) => state.cart.items)` reads a slice.
- `useDispatch()` returns `dispatch`.

### Good practices
- One store per app (per request on the server, to avoid sharing state between users in SSR).
- Keep the state serializable (no class instances, functions or promises) so DevTools and persistence work.
- Normalize collections (`ids` + `entities`) with `createEntityAdapter`.
- Do not put server cache data you could manage with RTK Query or TanStack Query into hand-written slices.

### The word "store" elsewhere
Zustand, Jotai and other libraries also call their containers stores; the idea is the same: state outside components with a subscription API.
--- code
import { configureStore, createSlice } from "@reduxjs/toolkit";

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: "light" as "light" | "dark" },
  reducers: { toggled: (s) => void (s.mode = s.mode === "light" ? "dark" : "light") },
});

export const store = configureStore({
  reducer: { theme: themeSlice.reducer },
});

// The three core store methods
const unsubscribe = store.subscribe(() => {
  console.log("state changed:", store.getState().theme.mode);
});

store.dispatch(themeSlice.actions.toggled()); // logs "dark"
console.log(store.getState()); // { theme: { mode: "dark" } }
unsubscribe();

// In React:
// <Provider store={store}><App /></Provider>
// const mode = useSelector((s: RootState) => s.theme.mode);

=== r112 | E | What is a Reducer?
**A reducer is a pure function `(state, action) => newState` that decides how state changes in response to an action. It must not mutate its arguments, call APIs, generate random values or have other side effects; it only computes and returns the next state. Reducers are used by Redux and by React's `useReducer`.**

### Rules
1. **Pure:** same state and action always give the same result.
2. **Immutable updates:** return new objects and arrays instead of modifying existing ones (Redux Toolkit uses Immer, so "mutating" code in `createSlice` is safe because Immer produces a new copy).
3. **No side effects:** no fetching, logging to servers, timers or `Date.now()` inside. Put those in thunks, listeners, effects or event handlers, and pass values in the action payload.
4. **Return the existing state** for actions it does not handle.

### Why pure functions
- Predictable and easy to unit test: call it with inputs and check the output.
- Enable time-travel debugging and replaying actions.
- Safe with React's Strict Mode, which calls `useReducer` reducers twice in development.

### Organizing reducers
- One reducer per feature slice, combined at the store level.
- Handle actions as events ("todo/added") rather than setters.
- Derive values with selectors instead of storing duplicated data.

### Testing example
`expect(cartReducer(initial, added({ id: "pen" }))).toEqual({...})`, with no store or component needed.
--- code
type Todo = { id: string; text: string; done: boolean };
type Action =
  | { type: "todo/added"; id: string; text: string }
  | { type: "todo/toggled"; id: string }
  | { type: "todo/cleared_done" };

// Pure: no Date.now(), no random ids, no fetch. Ids come in the action payload.
export function todosReducer(state: Todo[] = [], action: Action): Todo[] {
  switch (action.type) {
    case "todo/added":
      return [...state, { id: action.id, text: action.text, done: false }];
    case "todo/toggled":
      return state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case "todo/cleared_done":
      return state.filter((t) => !t.done);
    default:
      return state;
  }
}

// Easy to test without React
const s1 = todosReducer([], { type: "todo/added", id: "1", text: "Write tests" });
const s2 = todosReducer(s1, { type: "todo/toggled", id: "1" });
console.log(s2[0].done, s1[0].done); // true false (s1 untouched)

=== r113 | E | What is an Action?
**An action is a plain object that describes something that happened in the app, with a `type` string and usually a `payload`: `{ type: "cart/itemAdded", payload: { id: "pen" } }`. Dispatching an action is the only way to change Redux state; reducers read it and compute the new state.**

### Shape
- **`type`:** required, conventionally `"domain/eventName"`, for example `"todos/todoAdded"`.
- **`payload`:** the data needed to perform the update.
- Optional `meta` and `error` fields (Flux Standard Action convention).
- Must be serializable so DevTools, logging and persistence work.

### Action creators
Functions that build actions: `todoAdded("Buy milk")`. Redux Toolkit's `createSlice` generates them automatically, and `createAction` creates standalone ones. A `prepare` callback can add generated values such as IDs and timestamps outside the reducer.

### Naming advice
Model actions as **events** ("user logged in", "order placed") rather than setters ("SET_USER"). Many reducers can respond to the same event, and DevTools logs read like a story of what the user did.

### Async actions
Thunks (`createAsyncThunk`) are functions, not plain action objects; middleware runs them, and they dispatch real actions (`pending`, `fulfilled`, `rejected`).

### Outside Redux
`useReducer` uses the same idea; actions there do not need a `type` field by convention, but it is a good habit.
--- code
import { createAction, createSlice, nanoid } from "@reduxjs/toolkit";

// Standalone action creator with a prepare callback (adds id + timestamp outside the reducer)
export const noteAdded = createAction("notes/noteAdded", (text: string) => ({
  payload: { id: nanoid(), text, createdAt: new Date().toISOString() },
}));

console.log(noteAdded("Hello"));
// { type: "notes/noteAdded", payload: { id: "V1StGXR8_Z5jdHi6B-myT", text: "Hello", createdAt: "..." } }

// Slice-generated action creators
const notesSlice = createSlice({
  name: "notes",
  initialState: [] as { id: string; text: string }[],
  reducers: {
    noteDeleted: (state, action: { payload: string }) => state.filter((n) => n.id !== action.payload),
  },
  extraReducers: (b) => b.addCase(noteAdded, (state, action) => void state.push(action.payload)),
});

export const { noteDeleted } = notesSlice.actions;
console.log(noteDeleted("abc")); // { type: "notes/noteDeleted", payload: "abc" }

=== r114 | E | What is Dispatch?
**`dispatch` is the store method that sends an action to Redux: `dispatch({ type: "cart/cleared" })` or `dispatch(cartCleared())`. The action passes through middleware and then the reducers, which produce the new state, and subscribers such as `useSelector` re-render if their selected data changed. In React you get it with `useDispatch()`.**

### What happens on dispatch
1. Middleware runs in order: it can log, transform, delay or stop the action, or handle functions (thunks).
2. The root reducer computes the next state.
3. The store notifies subscribers.
4. Components whose `useSelector` result changed re-render.

### Dispatching async work
With the thunk middleware (included by `configureStore`), you can dispatch a function: `dispatch(fetchUser(id))`. `createAsyncThunk` returns a promise you can `await` and `.unwrap()` to get the result or throw on failure.

### In React
- `const dispatch = useDispatch()` (or a typed `useAppDispatch`).
- `dispatch` is stable, so it is safe in dependency arrays.
- Call it in event handlers or effects, never during render.

### `useReducer`
React's `useReducer` also returns a `dispatch` with the same idea, scoped to one component.

### Pattern
Components dispatch high-level events ("checkout submitted"); thunks or listener middleware coordinate the follow-up work (API calls, navigation, analytics).
--- code
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";

export const placeOrder = createAsyncThunk("orders/place", async (cartId: string) => {
  const res = await fetch(`/api/orders`, { method: "POST", body: JSON.stringify({ cartId }) });
  if (!res.ok) throw new Error("Order failed");
  return (await res.json()) as { orderId: string };
});

export const ordersSlice = createSlice({
  name: "orders",
  initialState: { lastOrderId: null as string | null, error: null as string | null },
  reducers: {},
  extraReducers: (b) =>
    b.addCase(placeOrder.fulfilled, (s, a) => void (s.lastOrderId = a.payload.orderId))
     .addCase(placeOrder.rejected, (s, a) => void (s.error = a.error.message ?? "Error")),
});

export function CheckoutButton({ cartId }: { cartId: string }) {
  const dispatch = useDispatch<any>();

  async function onClick() {
    try {
      const { orderId } = await dispatch(placeOrder(cartId)).unwrap(); // dispatching a thunk
      alert(`Order ${orderId} placed`);
    } catch (e) {
      alert((e as Error).message);
    }
  }
  return <button onClick={onClick}>Place order</button>;
}

=== r115 | M | What is Middleware in Redux?
**Redux middleware is a function that sits between `dispatch` and the reducers. Every dispatched action passes through the middleware chain, which can log it, modify it, stop it, delay it, dispatch other actions, or run side effects such as API calls. Its signature is `store => next => action => { ... return next(action) }`.**

### Common middleware
- **Thunk** (included by default in Redux Toolkit): allows dispatching functions for async logic.
- **Listener middleware** (`createListenerMiddleware`, RTK): run effects when specific actions or state changes occur. The modern alternative to sagas for most cases.
- **RTK Query middleware:** manages cache lifetimes, polling and invalidation.
- **Redux Saga / Redux Observable:** generator- or RxJS-based side effect orchestration.
- **Custom:** logging, analytics, crash reporting, persistence, auth token handling.

### How the chain works
`configureStore({ middleware: (getDefault) => getDefault().concat(logger) })`. Each middleware calls `next(action)` to pass the action on; code before `next` runs before reducers, code after runs after state updates.

### Development checks
Redux Toolkit's default middleware includes checks for accidental state mutation and non-serializable values in development.

### Guidelines
- Keep reducers pure; put side effects in middleware, thunks or listeners.
- Avoid heavy synchronous work in middleware: it runs on every dispatch.
- Prefer RTK Query for data fetching over hand-written fetch middleware.
--- code
import { configureStore, createListenerMiddleware, createSlice, type Middleware } from "@reduxjs/toolkit";

const cart = createSlice({
  name: "cart",
  initialState: { items: [] as string[] },
  reducers: { added: (s, a: { payload: string }) => void s.items.push(a.payload) },
});

// Custom middleware: log every action and the resulting state
const logger: Middleware = (store) => (next) => (action) => {
  console.log("dispatching", action);
  const result = next(action); // pass to the next middleware / reducers
  console.log("next state", store.getState());
  return result;
};

// Listener middleware: side effect when a specific action happens
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: cart.actions.added,
  effect: async (action) => {
    await fetch("/api/analytics", { method: "POST", body: JSON.stringify({ added: action.payload }) });
  },
});

export const store = configureStore({
  reducer: { cart: cart.reducer },
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(logger),
});

store.dispatch(cart.actions.added("pen"));

=== r116 | M | What is Redux Thunk?
**Redux Thunk is middleware that lets you dispatch functions instead of plain action objects. The function receives `dispatch` and `getState`, so it can run async logic such as API calls and dispatch real actions when done. Redux Toolkit includes it by default and wraps the common pattern in `createAsyncThunk`.**

### What a thunk is
A function returned by an action creator: `const fetchUser = (id) => async (dispatch, getState) => { ... }`. When dispatched, the thunk middleware calls it instead of passing it to reducers.

### `createAsyncThunk`
- `createAsyncThunk("users/fetch", async (id, thunkAPI) => { ... })`.
- Automatically dispatches `users/fetch/pending`, `/fulfilled` (with the returned value) and `/rejected` (with the error).
- `thunkAPI` provides `dispatch`, `getState`, `signal` (an `AbortSignal` for cancellation), `rejectWithValue` and `extra` (injected dependencies like an API client).
- The dispatched promise has `.unwrap()` to get the payload or throw.
- A `condition` option can skip the request if data is already loading or cached.

### When to use thunks
- Async calls that update Redux state.
- Logic that needs `getState` before deciding what to dispatch.
- Coordinating multiple dispatches.

### When to use something else
- **RTK Query:** for most data fetching and caching, so you do not write fetch thunks and loading flags by hand.
- **Listener middleware:** for reacting to actions ("when X happens, do Y").
- **Sagas:** for complex long-running workflows (rarely needed now).
--- code
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

type User = { id: string; name: string };

export const fetchUser = createAsyncThunk<User, string, { rejectValue: string }>(
  "users/fetch",
  async (id, { signal, rejectWithValue }) => {
    const res = await fetch(`/api/users/${id}`, { signal }); // aborted if the thunk is cancelled
    if (res.status === 404) return rejectWithValue("User not found");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as User;
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: { current: null as User | null, status: "idle" as "idle" | "loading" | "failed", error: "" },
  reducers: {},
  extraReducers: (b) =>
    b.addCase(fetchUser.pending, (s) => void (s.status = "loading"))
     .addCase(fetchUser.fulfilled, (s, a) => { s.status = "idle"; s.current = a.payload; })
     .addCase(fetchUser.rejected, (s, a) => { s.status = "failed"; s.error = a.payload ?? a.error.message ?? ""; }),
});

export default usersSlice.reducer;

// Hand-written thunk (what createAsyncThunk automates):
// const fetchUserManual = (id: string) => async (dispatch, getState) => { dispatch(pending()); ... };

=== r117 | H | What is Redux Saga?
**Redux Saga is a middleware library that manages side effects with generator functions called sagas. Sagas listen for actions and `yield` declarative effects such as `call` (run an async function), `put` (dispatch), `take` (wait for an action) and `fork` (start a background task), which makes complex async flows, cancellation, debouncing and races easy to express and test.**

### Key effects
- `takeEvery(type, worker)`: run a worker for every matching action.
- `takeLatest(type, worker)`: cancel the previous run when a new action arrives (ideal for search).
- `call(fn, ...args)`: call a function (usually returning a promise) and wait.
- `put(action)`: dispatch an action.
- `select(selector)`: read state.
- `fork`, `spawn`, `cancel`: manage background tasks.
- `race`, `all`, `delay`, `debounce`, `throttle`: coordination helpers.

### Strengths
- Long-running workflows: polling, websockets, multi-step onboarding, retries with backoff.
- Built-in cancellation semantics.
- Testable: effects are plain objects, so tests can step through a generator without mocking.

### Weaknesses
- Generators and the effect vocabulary have a learning curve.
- Extra indirection for simple fetches.
- Much of its use has been replaced by RTK Query (data fetching) and the RTK listener middleware (reacting to actions).

### Status
Redux Saga is still maintained (version 1.6) and common in older enterprise codebases. For new projects, the Redux team recommends RTK Query and listeners first.
--- code
import { call, put, takeLatest, delay } from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

const search = createSlice({
  name: "search",
  initialState: { results: [] as string[], loading: false },
  reducers: {
    queryChanged: (s, _a: PayloadAction<string>) => void (s.loading = true),
    resultsLoaded: (s, a: PayloadAction<string[]>) => { s.loading = false; s.results = a.payload; },
  },
});

function* searchWorker(action: PayloadAction<string>): Generator<any, void, any> {
  yield delay(300); // debounce: takeLatest cancels this if a new query arrives
  const res = yield call(fetch, `/api/search?q=${encodeURIComponent(action.payload)}`);
  const data: string[] = yield call([res, "json"]);
  yield put(search.actions.resultsLoaded(data));
}

function* rootSaga() {
  yield takeLatest(search.actions.queryChanged.type, searchWorker);
}

const sagaMiddleware = createSagaMiddleware();
export const store = configureStore({
  reducer: { search: search.reducer },
  middleware: (getDefault) => getDefault({ thunk: false }).concat(sagaMiddleware),
});
sagaMiddleware.run(rootSaga);

=== r118 | E | What is Zustand?
**Zustand is a small, hook-based state management library from the pmndrs collective. You create a store with `create((set, get) => ({ ...state, ...actions }))` and use it as a hook with a selector, `useStore((s) => s.count)`, so components re-render only when the selected value changes. It needs no provider and very little boilerplate.**

### Why teams like it
- **Tiny API:** `create`, `set`, `get`, selectors.
- **No provider** required (though you can scope stores with context).
- **Selective re-renders:** components subscribe to slices.
- **Works outside React:** `useStore.getState()` and `useStore.setState()` in plain functions, tests or event handlers.
- **Middleware:** `persist` (localStorage and other storage), `devtools` (Redux DevTools), `immer`, `subscribeWithSelector`.
- **TypeScript-friendly.**

### Version 5 notes
- Requires React 18+ and uses React's `useSyncExternalStore`.
- Named exports only (no default export).
- Selectors that return new objects or arrays each call can cause "Maximum update depth exceeded"; wrap them with `useShallow` (from `zustand/react/shallow`) or select primitives.
- Equality-function variants live in `zustand/traditional`.

### When to choose it
Client-side global state (cart, UI preferences, editor state) in small to large apps that do not need Redux's structure. Server data still belongs in TanStack Query or similar.
--- code
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

type Prefs = {
  theme: "light" | "dark";
  fontSize: number;
  toggleTheme: () => void;
  setFontSize: (n: number) => void;
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      theme: "light",
      fontSize: 16,
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    { name: "prefs" } // saved to localStorage
  )
);

export function ThemeButton() {
  const theme = usePrefs((s) => s.theme); // re-renders only when theme changes
  const toggle = usePrefs((s) => s.toggleTheme);
  return <button onClick={toggle}>Theme: {theme}</button>;
}

export function FontInfo() {
  // Selecting several values: useShallow avoids re-renders for equal objects
  const { fontSize, setFontSize } = usePrefs(useShallow((s) => ({ fontSize: s.fontSize, setFontSize: s.setFontSize })));
  return <input type="range" min={12} max={24} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} />;
}

=== r119 | M | What is Recoil?
**Recoil was an experimental state management library from Meta built around atoms (units of shared state) and selectors (derived, possibly async state), with components subscribing to exactly the atoms they use. The project was archived on January 1, 2025 and is no longer maintained, so it should not be used for new projects; Jotai is the closest actively maintained alternative.**

### Concepts it introduced
- **Atoms:** `atom({ key: "count", default: 0 })`, readable and writable from any component with `useRecoilState`.
- **Selectors:** derived state from atoms or other selectors, including async selectors that integrate with Suspense.
- **Atom families:** parameterized atoms (one per item ID).
- **`RecoilRoot`** provider at the top of the app.
- Fine-grained subscriptions: only components using a changed atom re-render.

### Why it stalled
It stayed at 0.x for years, had limited support for React 18 concurrent features, and Meta stopped investing in it publicly. The repository is now read-only.

### What to use instead
- **Jotai:** the same atom-based model with a smaller API, no string keys, active maintenance (version 3 in 2026, React 18+). `atom()`, `useAtom()`, `useAtomValue()`, `useSetAtom()`.
- **Zustand:** a single store with selectors.
- **Redux Toolkit:** structured global state.
- **TanStack Query:** for async server data previously modeled with async selectors.

### Interview tip
Explain atoms and selectors, then mention that Recoil is archived and how you would migrate (usually to Jotai).
--- code
// Recoil (archived, shown for reference)
// const countState = atom({ key: "count", default: 0 });
// const doubled = selector({ key: "doubled", get: ({ get }) => get(countState) * 2 });
// <RecoilRoot><Counter /></RecoilRoot>

// Jotai: the maintained atom-based equivalent (no keys, no required provider)
import { atom, useAtom, useAtomValue } from "jotai";

const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2); // derived, like a selector

const userIdAtom = atom("1");
const userAtom = atom(async (get) => {
  const res = await fetch(`/api/users/${get(userIdAtom)}`); // async derived atom, suspends
  return (await res.json()) as { name: string };
});

export function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const doubled = useAtomValue(doubledAtom);
  return <button onClick={() => setCount((c) => c + 1)}>{count} (x2 = {doubled})</button>;
}

export function UserName() {
  const user = useAtomValue(userAtom); // wrap in <Suspense>
  return <span>{user.name}</span>;
}

=== r120 | M | When to use which state tool?
**Pick the tool by the kind of state: local UI state in `useState`/`useReducer`, values shared by a subtree in Context, shareable view state in the URL, server data in TanStack Query/SWR/RTK Query or framework loaders and Server Components, form state in a form library, and app-wide client state in Zustand, Jotai or Redux Toolkit. Most apps combine several.**

### Decision guide
| State | Tool |
|---|---|
| Input text, toggles, open menus | `useState` |
| Complex local transitions | `useReducer` |
| Theme, locale, current user | Context (or the auth library's hook) |
| Filters, search, pagination, selected tab | URL search params (React Router `useSearchParams`, Next.js `useSearchParams`, `nuqs`) |
| API data, caching, refetching | TanStack Query, SWR, RTK Query, route loaders, Server Components |
| Forms with validation | React Hook Form (+ Zod), TanStack Form, or React 19 form Actions |
| Cross-cutting client state (cart, editor, wizard) | Zustand, Jotai, or Redux Toolkit |
| Large team, strict conventions, heavy middleware | Redux Toolkit |
| Fine-grained derived state graphs | Jotai |
| Real-time collaborative state | Liveblocks, Yjs, or a backend-synced store |

### Principles
1. **Start local**, lift only when needed.
2. **Separate server state from client state.** Do not copy API responses into a global store you then keep in sync by hand.
3. **Prefer the URL** for anything users may bookmark or share.
4. **Avoid adding a global store "just in case."**
5. **Avoid Recoil** (archived since 2025).

### Interview answer structure
Classify the state, pick the simplest tool per category, and mention trade-offs (re-render behavior, DevTools, boilerplate, bundle size).
--- code
// One page using several kinds of state, each in the right place
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";

const useCart = create<{ ids: string[]; add: (id: string) => void }>((set) => ({
  ids: [],
  add: (id) => set((s) => ({ ids: [...s.ids, id] })), // client app state
}));

export function ProductsPage() {
  const [params, setParams] = useSearchParams();               // URL state
  const category = params.get("category") ?? "all";
  const [showFilters, setShowFilters] = useState(false);       // local UI state
  const add = useCart((s) => s.add);

  const { data = [], isPending } = useQuery({                   // server state
    queryKey: ["products", category],
    queryFn: () => fetch(`/api/products?category=${category}`).then((r) => r.json()),
  });

  return (
    <div>
      <button onClick={() => setShowFilters((s) => !s)}>Filters</button>
      {showFilters && (
        <select value={category} onChange={(e) => setParams({ category: e.target.value })}>
          <option value="all">All</option><option value="books">Books</option>
        </select>
      )}
      {isPending ? <p>Loading…</p> : data.map((p: { id: string; name: string }) => (
        <p key={p.id}>{p.name} <button onClick={() => add(p.id)}>Add</button></p>
      ))}
    </div>
  );
}

=== r121 | E | What is React Router?
**React Router is the most widely used routing library for React. It maps URLs to components, supports nested layouts, dynamic segments, data loading and mutations, and can also act as a full-stack framework. The current major version is v8 (installed as `react-router`), a non-breaking upgrade from v7 that requires React 19.2.7+ and Node 22+.**

### Three ways to use it
1. **Declarative mode:** `<BrowserRouter>`, `<Routes>`, `<Route>`. Simple client-side routing, as in older versions.
2. **Data mode:** `createBrowserRouter` with route objects that have `loader`, `action`, `middleware`, `errorBoundary` and `lazy`, rendered with `<RouterProvider>`. Data loads before rendering, avoiding waterfalls.
3. **Framework mode:** the successor of Remix. A Vite plugin with file-based or config routes, type-safe route modules, SSR, streaming, prerendering and React Server Components support. Create with `npx create-react-router@latest`.

### Key APIs
- Components: `Link`, `NavLink`, `Outlet`, `Form`, `Navigate`.
- Hooks: `useNavigate`, `useParams`, `useSearchParams`, `useLocation`, `useLoaderData`, `useActionData`, `useNavigation`, `useFetcher`.
- Utilities: `redirect`, `data`, `createContext` (typed middleware context).

### v8 changes worth knowing
- The `react-router-dom` package was removed: import everything from `react-router`, and DOM-specific APIs such as `RouterProvider` from `react-router/dom`.
- Former `future.v8_*` flags (middleware, split route modules, Vite environment API) are now default behavior.
- ESM-only.
- Middleware is stable in data and framework modes.

### Alternatives
TanStack Router (type-first), Next.js (framework routing), Wouter (tiny).
--- code
// Data mode (React Router v8)
import { createBrowserRouter, Link, Outlet, useLoaderData } from "react-router";
import { RouterProvider } from "react-router/dom";

function Layout() {
  return (
    <>
      <nav><Link to="/">Home</Link> | <Link to="/teams/1">Team 1</Link></nav>
      <Outlet /> {/* child routes render here */}
    </>
  );
}

function Team() {
  const team = useLoaderData() as { name: string };
  return <h1>{team.name}</h1>;
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: () => <h1>Home</h1> },
      {
        path: "teams/:teamId",
        loader: async ({ params }) => fetch(`/api/teams/${params.teamId}`).then((r) => r.json()),
        Component: Team,
      },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;

=== r122 | E | What is dynamic routing?
**Dynamic routing means routes contain variable segments, like `/users/:userId` or `/blog/:slug`, so one route definition matches many URLs. The router extracts the values (`userId: "42"`) and the component or loader uses them to fetch and render the right data.**

### In React Router
- **Dynamic segment:** `path: "users/:userId"`, read with `useParams()` or `params` in loaders and actions.
- **Optional segment:** `path: ":lang?/about"` matches `/about` and `/en/about`.
- **Splat (catch-all):** `path: "files/*"`, read with `params["*"]`.
- **Multiple segments:** `projects/:projectId/tasks/:taskId`.

### In Next.js
Folder names in brackets: `app/blog/[slug]/page.tsx`, `[...slug]` for catch-all, `[[...slug]]` for optional catch-all.

### "Dynamic routing" can also mean
- Routes defined at runtime from data (for example from a CMS or permissions), by building the route config array dynamically.
- React Router's philosophy that routes are part of rendering (in declarative mode).

### Good practices
- Validate params: they are strings from the URL and may be malformed.
- Return a 404 or render a not-found UI for unknown IDs.
- Use loaders to fetch data based on params before rendering, avoiding loading spinners on every navigation.
- Encode values when building links: `` `/search/${encodeURIComponent(term)}` ``.
--- code
import { createBrowserRouter, data, useLoaderData, useParams } from "react-router";

type Product = { id: string; name: string };

function ProductPage() {
  const { productId } = useParams(); // "42" for /products/42
  const product = useLoaderData() as Product;
  return <h1>#{productId}: {product.name}</h1>;
}

function FileViewer() {
  const params = useParams();
  return <p>Viewing {params["*"]}</p>; // "docs/2026/report.pdf" for /files/docs/2026/report.pdf
}

export const router = createBrowserRouter([
  {
    path: "/products/:productId",
    loader: async ({ params }) => {
      if (!/^\d+$/.test(params.productId!)) throw data("Invalid id", { status: 400 });
      const res = await fetch(`/api/products/${params.productId}`);
      if (res.status === 404) throw data("Not found", { status: 404 });
      return res.json();
    },
    Component: ProductPage,
  },
  { path: "/:lang?/about", Component: () => <h1>About</h1> }, // optional segment
  { path: "/files/*", Component: FileViewer },                // splat
]);

=== r123 | E | What is nested routing?
**Nested routing means routes are defined inside other routes, so URL segments map to nested UI: a parent route renders a shared layout and an `<Outlet />`, and the matching child route renders inside that outlet. For `/dashboard/settings`, the dashboard layout stays and only the settings content changes.**

### How it works in React Router
- Define `children` on a route object (or nest `<Route>` elements).
- The parent's component renders `<Outlet />` where children appear.
- **Index routes** (`index: true`) render at the parent's exact path, such as `/dashboard`.
- **Layout routes** without a `path` group children under a shared UI without adding a URL segment.
- Each nested route can have its own `loader`, `action`, `errorBoundary` and `middleware`; loaders for all matched routes run in parallel.

### Benefits
- Shared layouts (sidebars, tabs, headers) are written once and stay mounted, keeping their state.
- Only the changed part of the page re-renders on navigation.
- Errors are isolated: a child's error boundary renders in its outlet while the parent layout keeps working.
- Data loading in parallel avoids waterfalls.

### `Outlet` context
`<Outlet context={value} />` passes data to children, read with `useOutletContext()`.

### Next.js equivalent
Nested folders with `layout.tsx` files; `children` plays the role of `<Outlet />`.
--- code
import { createBrowserRouter, NavLink, Outlet } from "react-router";

function DashboardLayout() {
  return (
    <div className="flex">
      <aside>
        <NavLink to="/dashboard" end>Overview</NavLink>
        <NavLink to="/dashboard/settings">Settings</NavLink>
        <NavLink to="/dashboard/billing">Billing</NavLink>
      </aside>
      <main>
        <Outlet /> {/* the matching child renders here */}
      </main>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    Component: DashboardLayout,
    children: [
      { index: true, Component: () => <h1>Overview</h1> },              // /dashboard
      { path: "settings", Component: () => <h1>Settings</h1> },          // /dashboard/settings
      {
        path: "billing",
        loader: () => fetch("/api/invoices").then((r) => r.json()),     // runs in parallel with parent loaders
        Component: () => <h1>Billing</h1>,
        ErrorBoundary: () => <p>Billing failed to load</p>,              // isolated error UI
      },
    ],
  },
]);

=== r124 | M | What are protected routes?
**Protected routes are routes only available to users who meet a condition, usually being signed in or having a certain role. In React Router you protect them by checking auth before rendering: with middleware or a loader that throws `redirect("/login")` (data and framework modes), or with a guard layout component that renders `<Navigate>` or an `<Outlet />` (declarative mode). The server must still enforce authorization for the data.**

### Approaches
1. **Middleware (React Router v8, stable):** an auth middleware on a parent route checks the session and throws `redirect("/login")`. It runs before loaders of all child routes.
2. **Loaders:** check the session in the loader and throw `redirect` before rendering. No flash of protected content.
3. **Guard component:** `function RequireAuth() { return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} /> }`. Simple, but data may already be requested by children and there can be a flash while auth loads.
4. **Frameworks:** Next.js uses `proxy.ts` for optimistic redirects plus checks in Server Components and Server Functions.

### Good UX
- Remember where the user wanted to go (`?next=/billing` or `location.state.from`) and return there after login.
- Use `replace` so Back does not loop to the protected page.
- Show a loading state while the session is being checked.
- Role-based checks render a "403 / no access" page instead of redirecting to login.

### Security reminder
Client-side checks only control the UI. APIs must validate the session or token and permissions on every request; anyone can call your API directly.
--- code
import { createBrowserRouter, createContext, redirect, Outlet, useLoaderData } from "react-router";

type User = { id: string; role: "user" | "admin" };
export const userContext = createContext<User | null>(null);

async function getSessionUser(): Promise<User | null> {
  const res = await fetch("/api/me", { credentials: "include" });
  return res.ok ? res.json() : null;
}

// Data mode middleware (v8): runs before child loaders
const authMiddleware = async ({ request, context }: any, next: () => Promise<unknown>) => {
  const user = await getSessionUser();
  if (!user) {
    const from = new URL(request.url).pathname;
    throw redirect(`/login?next=${encodeURIComponent(from)}`);
  }
  context.set(userContext, user);
  return next();
};

export const router = createBrowserRouter([
  { path: "/login", Component: () => <h1>Login</h1> },
  {
    path: "/app",
    middleware: [authMiddleware],
    loader: ({ context }) => context.get(userContext),
    Component: () => {
      const user = useLoaderData() as User;
      return <><p>Signed in as {user.id}</p><Outlet /></>;
    },
    children: [{ path: "reports", Component: () => <h1>Reports</h1> }],
  },
]);

=== r125 | M | What are lazy routes?
**Lazy routes load a route's code only when the route is first visited, so the initial bundle contains just the code for the current page. In React Router data mode you give a route a `lazy` property that dynamically imports its component, loader and other exports; in declarative mode you wrap route components in `React.lazy` and `<Suspense>`. Frameworks (React Router framework mode, Next.js) split routes automatically.**

### React Router data mode: `lazy`
- `{ path: "reports", lazy: () => import("./routes/reports") }`: the module exports `Component`, `loader`, `action`, `ErrorBoundary` and so on.
- The router loads the module when navigation to that route starts, then runs its loader, so code and data load without a render waterfall.
- Newer versions also accept an object form where each property (`Component`, `loader`) can be loaded separately, allowing the loader to start before the component code arrives.

### Declarative mode
`const Reports = lazy(() => import("./pages/reports"))` and `<Route path="reports" element={<Suspense fallback={<Spinner />}><Reports /></Suspense>} />`.

### Benefits
- Smaller initial JavaScript, faster first load.
- Rarely used areas (admin, settings) cost nothing until visited.

### Tips
- Prefetch likely routes: `<Link prefetch="intent">` in framework mode, or call the import on hover.
- Handle chunk load errors after deployments with an error boundary that offers a reload.
- Do not lazy-load the landing page or tiny routes; it only adds a request.
--- code
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { BrowserRouter, Routes, Route } from "react-router";

// Data mode: the whole route module is loaded on first navigation
export const router = createBrowserRouter([
  { path: "/", Component: () => <h1>Home</h1> },
  { path: "/reports", lazy: () => import("./routes/reports") },
  // ./routes/reports.tsx exports: Component, loader, ErrorBoundary
]);

// Declarative mode: React.lazy + Suspense per route
const Settings = lazy(() => import("./pages/settings"));

export function DeclarativeApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<p>Loading settings…</p>}>
              <Settings />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

=== r126 | E | What is navigation?
**Navigation is moving between views of a single-page app by changing the URL without a full page reload. Routers intercept link clicks and programmatic calls, update the browser history, and render the matching route. In React Router you navigate with `<Link>`, `<NavLink>`, `<Form>`, `useNavigate()`, `<Navigate>` and `redirect()`.**

### Ways to navigate
- **Declarative links:** `<Link to="/about">` renders an `<a>` but handles clicks client-side. `<NavLink>` adds active and pending styling.
- **Programmatic:** `const navigate = useNavigate(); navigate("/checkout")`, `navigate(-1)` to go back, `{ replace: true }` to replace the history entry.
- **Redirects during data loading:** `throw redirect("/login")` in loaders, actions or middleware.
- **Forms:** `<Form method="post">` submits to a route action and then revalidates data.
- **Render-time redirect:** `<Navigate to="/home" replace />`.

### Pending UI
`useNavigation()` exposes `state` (`"idle" | "loading" | "submitting"`) to show global progress bars, and `NavLink` receives `isPending`. Navigations are wrapped in React transitions, so the current page stays visible while the next one loads.

### Scroll and focus
`<ScrollRestoration />` restores scroll positions; for accessibility, move focus to the new page's heading after navigation.

### Native APIs
Under the hood routers use the History API (`pushState`, `popstate`). Modern browsers also have the Navigation API, which some routers are starting to use.

### Prefer links
Use `<Link>` for anything that is a link, so users can open it in a new tab and screen readers announce it correctly; reserve `navigate()` for navigation that follows logic (after a successful save).
--- code
import { Form, Link, NavLink, useNavigate, useNavigation } from "react-router";

export function Header() {
  const navigation = useNavigation();
  return (
    <header>
      {navigation.state !== "idle" && <div className="progress-bar" aria-hidden />}
      <NavLink to="/" end className={({ isActive }) => (isActive ? "font-bold" : "")}>Home</NavLink>
      <NavLink to="/orders" className={({ isPending }) => (isPending ? "opacity-50" : "")}>Orders</NavLink>
      <Link to="/help" target="_blank">Help</Link>
    </header>
  );
}

export function SaveDraft() {
  const navigate = useNavigate();
  async function save() {
    await fetch("/api/drafts", { method: "POST" });
    navigate("/drafts", { replace: true }); // programmatic, after logic
  }
  return (
    <>
      <button onClick={save}>Save</button>
      <button onClick={() => navigate(-1)}>Back</button>
      <Form method="post" action="/logout"><button>Log out</button></Form>
    </>
  );
}

=== r127 | E | What are params?
**Params (route parameters) are the dynamic parts of a URL path defined by a route pattern, such as `:userId` in `/users/:userId`. The router extracts them into an object, `{ userId: "42" }` for `/users/42`, which components read with `useParams()` and loaders or actions receive as `params`.**

### Details
- Values are always **strings** (or `undefined` for optional segments). Convert and validate: `Number(params.id)`.
- Names come from the route pattern: `:projectId` becomes `params.projectId`.
- Splat routes (`files/*`) put the rest of the path in `params["*"]`.
- Nested routes see params from all matched parent routes.
- In React Router framework mode, generated types make `params` typed per route.

### Params vs query strings
- **Params:** identify a resource, required for the route: `/products/42`.
- **Query strings:** optional modifiers: `/products?sort=price&page=2`, read with `useSearchParams()`.

### Building URLs with params
Use `generatePath("/users/:id", { id })` or template strings with `encodeURIComponent` for user-provided values.

### Next.js
Dynamic segments like `[slug]` arrive as the `params` prop of pages and layouts. It is a Promise since Next.js 15, so you `await params`.

### Common bug
Using params as React keys or effect dependencies is fine; mutating them or assuming they are numbers is not.
--- code
import { generatePath, Link, useParams } from "react-router";

export function TaskPage() {
  const { projectId, taskId } = useParams(); // from /projects/:projectId/tasks/:taskId
  const id = Number(taskId);

  if (!projectId || Number.isNaN(id)) return <p>Invalid task URL</p>;

  const next = generatePath("/projects/:projectId/tasks/:taskId", { projectId, taskId: String(id + 1) });

  return (
    <article>
      <h1>Project {projectId}, task #{id}</h1>
      <Link to={next}>Next task</Link>
    </article>
  );
}

// Route definition:
// { path: "/projects/:projectId/tasks/:taskId", Component: TaskPage,
//   loader: ({ params }) => fetch(`/api/projects/${params.projectId}/tasks/${params.taskId}`) }

=== r128 | E | What is a query string?
**A query string is the part of a URL after `?`, made of key-value pairs separated by `&`, such as `?q=shoes&sort=price&page=2`. It carries optional, shareable state: search terms, filters, sorting and pagination. In React you read and update it with the router's `useSearchParams()` hook, which wraps the standard `URLSearchParams` API.**

### Reading and writing
- `const [searchParams, setSearchParams] = useSearchParams()` (React Router).
- `searchParams.get("q")`, `searchParams.getAll("tag")` for repeated keys, `searchParams.has("page")`.
- `setSearchParams({ q: "shoes", page: "1" })` or a function `(prev) => { prev.set("page", "2"); return prev; }`.
- `setSearchParams(next, { replace: true })` for live filters, so history is not flooded.
- In loaders: `new URL(request.url).searchParams`.

### Why use the URL for this state
- Users can bookmark, share and reload without losing filters.
- Back and Forward work naturally.
- Server rendering can read the same values.

### Tips
- Values are strings; parse and validate (Zod's `z.coerce.number()`).
- Encode values automatically by using `URLSearchParams` instead of string concatenation.
- Remove keys with default values to keep URLs clean.
- Debounce updates from text inputs.
- Libraries like `nuqs` give type-safe, hook-based search param state.

### Next.js
`useSearchParams()` from `next/navigation` in Client Components, or the `searchParams` prop (a Promise) in pages.
--- code
import { useSearchParams } from "react-router";

export function ProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";
  const page = Number(searchParams.get("page") ?? 1);

  function update(key: string, value: string) {
    setSearchParams(
      (prev) => {
        if (value) prev.set(key, value);
        else prev.delete(key);
        if (key !== "page") prev.delete("page"); // reset paging when filters change
        return prev;
      },
      { replace: key === "q" } // typing should not create history entries
    );
  }

  return (
    <div>
      <input value={q} onChange={(e) => update("q", e.target.value)} placeholder="Search" />
      <select value={sort} onChange={(e) => update("sort", e.target.value)}>
        <option value="relevance">Relevance</option>
        <option value="price">Price</option>
      </select>
      <button onClick={() => update("page", String(page + 1))}>Page {page + 1}</button>
    </div>
  );
}

=== r129 | E | What is useNavigate?
**`useNavigate()` is a React Router hook that returns a `navigate` function for changing routes from code: `navigate("/dashboard")`, `navigate(-1)` to go back, or `navigate("/login", { replace: true, state: { from } })`. Use it after logic completes, such as a successful save; use `<Link>` for ordinary links and `redirect()` inside loaders and actions.**

### Signature
`navigate(to, options?)`
- **`to`:** a path string (absolute or relative to the current route), an object `{ pathname, search, hash }`, or a number for history delta (`-1`, `1`).
- **Options:** `replace` (replace the current history entry), `state` (data available as `useLocation().state`), `relative: "path"` (resolve relative to the URL rather than the route hierarchy), `preventScrollReset`, `viewTransition` (wrap in a View Transition).

### Rules
- Call it in event handlers or effects, never during render. To redirect while rendering, return `<Navigate to=... />`.
- Navigation is wrapped in a React transition; `useNavigation()` exposes pending state.

### When to prefer other tools
- **Links:** `<Link>`/`<NavLink>` for anything clickable that goes somewhere (supports middle-click, new tab, accessibility).
- **Data mode/framework mode:** `throw redirect("/login")` in loaders, actions or middleware avoids rendering the wrong page first.
- **Forms:** `<Form>` plus an action that returns `redirect()`.

### Next.js equivalent
`useRouter()` from `next/navigation` (`router.push`, `router.replace`, `router.back`), or `redirect()` on the server.
--- code
import { useLocation, useNavigate } from "react-router";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/login", { method: "POST", body: new FormData(e.currentTarget) });
    if (res.ok) {
      // replace: Back should not return to the login form
      navigate(from, { replace: true });
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button>Sign in</button>
      <button type="button" onClick={() => navigate(-1)}>Cancel</button>
    </form>
  );
}

=== r130 | E | What is useParams?
**`useParams()` is a React Router hook that returns an object with the dynamic segment values of the current URL, matched against the route pattern. For a route `/users/:userId` and the URL `/users/42`, it returns `{ userId: "42" }`. It includes params from parent routes, and splat values under `"*"`.**

### Details
- Values are strings or `undefined`; validate and convert them.
- Re-renders the component when params change. The same component instance stays mounted when navigating from `/users/1` to `/users/2`, so state persists; add `key={userId}` on a child (or reset state) if each user should start fresh.
- In loaders, actions and middleware, use the `params` argument instead of the hook.
- Typed params: in framework mode, generated route types give `params.userId` the right type; in data mode, cast or validate.

### Typical use
- Fetching data for the resource in an effect or with TanStack Query: `useQuery({ queryKey: ["user", userId], ... })`.
- Building related links.
- Highlighting the selected item in a list.

### Pitfall
Fetching in an effect keyed on params without cleanup can show the wrong user if responses arrive out of order. Use a loader, a data library, or an `ignore` flag.

### Next.js
`useParams()` from `next/navigation` in Client Components; Server Components read the awaited `params` prop.
--- code
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

type User = { id: string; name: string; email: string };

export function UserProfile() {
  const { userId } = useParams(); // "42" for /users/42

  const { data: user, isPending, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: async (): Promise<User> => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !!userId, // param may be undefined on optional routes
  });

  if (isPending) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message}</p>;

  return (
    <section>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <Link to={`/users/${Number(userId) + 1}`}>Next user</Link>
    </section>
  );
}

=== r131 | E | Controlled vs Uncontrolled Forms?
**In a controlled form, React state is the source of truth: each input's `value` comes from state and `onChange` updates it. In an uncontrolled form, the DOM keeps the values: inputs use `defaultValue`, and you read values on submit through `FormData` or refs. React 19 form Actions make uncontrolled forms the simplest default for many cases.**

### Comparison
| | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state | the DOM |
| Value prop | `value` / `checked` | `defaultValue` / `defaultChecked` |
| Read values | from state, any time | on submit (`FormData`) or via refs |
| Re-render per keystroke | yes | no |
| Live validation, formatting, dependent fields | easy | needs extra handlers |
| Code | more | less |
| Works with server actions / progressive enhancement | yes | naturally |

### Choosing
- **Controlled:** real-time validation messages, masked inputs, fields that depend on each other, "Save" buttons enabled only when something changed.
- **Uncontrolled:** simple submit-only forms, large forms where performance matters, file inputs, React 19 `<form action>`.
- **Hybrid via libraries:** React Hook Form registers uncontrolled inputs but still provides validation and watched values.

### React 19 notes
- `<form action={fn}>` passes `FormData` to `fn` and resets uncontrolled fields after success; `requestFormReset` can reset manually.
- `useActionState` returns server or validation results to show errors.

### Pitfall
Switching an input from uncontrolled to controlled (value going from `undefined` to a string) triggers a warning; initialize state with `""`.
--- code
import { useState } from "react";

// Controlled: live feedback on every keystroke
export function ControlledUsername() {
  const [username, setUsername] = useState("");
  const valid = /^[a-z0-9_]{3,16}$/.test(username);
  return (
    <form onSubmit={(e) => { e.preventDefault(); console.log(username); }}>
      <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
      <small>{username && !valid ? "3-16 chars: a-z, 0-9, _" : " "}</small>
      <button disabled={!valid}>Save</button>
    </form>
  );
}

// Uncontrolled: read everything once, on submit (React 19 form action)
export function UncontrolledFeedback() {
  async function send(formData: FormData) {
    const payload = Object.fromEntries(formData); // { rating: "5", comment: "..." }
    await fetch("/api/feedback", { method: "POST", body: JSON.stringify(payload) });
  }
  return (
    <form action={send}>
      <select name="rating" defaultValue="5">
        <option>5</option><option>4</option><option>3</option>
      </select>
      <textarea name="comment" defaultValue="" />
      <button>Send</button>
    </form>
  );
}

=== r132 | M | Form validation?
**Validate forms in layers: native HTML constraints for instant, free checks; a schema (Zod or Valibot) shared between client and server for real rules; inline, accessible error messages shown at the right time (on blur or submit, not on every keystroke); and always validate again on the server, because client validation can be bypassed.**

### Layers
1. **HTML attributes:** `required`, `type="email"`, `minLength`, `pattern`, `min`/`max`. The browser blocks submission and provides `:invalid` styling. Use `noValidate` on the form if you render custom messages.
2. **Schema validation:** describe rules once, `z.object({ email: z.string().email() })`, infer TypeScript types, and reuse on the server.
3. **Form library integration:** React Hook Form with `zodResolver`, TanStack Form validators.
4. **Server validation:** in the API or Server Function; return field errors in a consistent shape and display them (React 19 `useActionState`).

### When to show errors
- After the field is blurred ("touched") or on submit, then live while the user fixes it.
- Not on first keystroke, which feels aggressive.

### Accessibility
- Associate messages with inputs: `aria-describedby` and `aria-invalid="true"`.
- Use `role="alert"` or a live region for submit-time errors.
- Move focus to the first invalid field on submit.
- Do not rely on color alone.

### UX details
Keep user input on error, disable the submit button only while submitting (not because the form is invalid, which hides the reason), and show a summary for long forms.
--- code
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// One schema: used here and on the server
export const SignupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(12, "At least 12 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

type Signup = z.infer<typeof SignupSchema>;

export function SignupForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Signup>({
    resolver: zodResolver(SignupSchema),
    mode: "onTouched", // validate after blur, then on change
  });

  const onSubmit = async (data: Signup) => {
    await fetch("/api/signup", { method: "POST", body: JSON.stringify(data) }); // server validates again
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby="email-err" />
      <p id="email-err" role="alert">{errors.email?.message}</p>
      <input type="password" {...register("password")} aria-invalid={!!errors.password} />
      <p role="alert">{errors.password?.message}</p>
      <input type="password" {...register("confirm")} aria-invalid={!!errors.confirm} />
      <p role="alert">{errors.confirm?.message}</p>
      <button disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create account"}</button>
    </form>
  );
}

=== r133 | E | What is Formik?
**Formik is a popular React form library that manages form values, validation, touched state, errors and submission through a `useFormik` hook or `<Formik>`, `<Form>` and `<Field>` components, often paired with Yup for schema validation. It is still used in many codebases, but its development has slowed considerably and most new projects choose React Hook Form, TanStack Form or React 19 form Actions instead.**

### How it works
- `initialValues`, `validate` or `validationSchema` (Yup), and `onSubmit`.
- It keeps values in React state (controlled inputs), tracks `touched` and `errors`, and provides `handleChange`, `handleBlur`, `isSubmitting`, `resetForm`, `setFieldValue`.
- `<Field>`, `<ErrorMessage>` and `<FieldArray>` reduce boilerplate.

### Strengths
- Simple mental model and good docs.
- Field arrays and nested values.
- Large ecosystem of examples.

### Weaknesses
- Controlled inputs: every keystroke re-renders the form, which can be slow for large forms.
- Larger bundle than React Hook Form.
- Few releases in recent years (latest 2.4.x).

### Choosing today
- **React Hook Form:** uncontrolled, fast, small, strong TypeScript and Zod integration.
- **TanStack Form:** type-safe, headless, framework-agnostic.
- **React 19 `<form action>` + `useActionState`:** enough for many simple forms, especially with server functions.

### Interview tip
Know Formik's API if the job uses it, and be ready to compare it with React Hook Form.
--- code
import { useFormik } from "formik";
import * as Yup from "yup";

export function NewsletterFormik() {
  const formik = useFormik({
    initialValues: { email: "", topics: [] as string[] },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email").required("Required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      await fetch("/api/newsletter", { method: "POST", body: JSON.stringify(values) });
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <input
        name="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
      {formik.touched.email && formik.errors.email && <p role="alert">{formik.errors.email}</p>}
      <button type="submit" disabled={formik.isSubmitting}>Subscribe</button>
    </form>
  );
}

=== r134 | E | What is React Hook Form?
**React Hook Form (RHF) is a lightweight form library built on hooks and uncontrolled inputs. You `register` inputs, and RHF reads values from the DOM, validates them (natively or via resolvers such as Zod), and tracks errors and submission state while re-rendering only what is needed. It is the most widely used React form library today (version 7).**

### Core API
- `const { register, handleSubmit, formState, reset, watch, setValue, control } = useForm<FormType>(options)`.
- `register("email", { required: "Email is required" })` returns `name`, `ref`, `onChange` and `onBlur` to spread on an input.
- `handleSubmit(onValid, onInvalid)` validates, then calls your handler with typed data.
- `formState`: `errors`, `isSubmitting`, `isDirty`, `isValid`, `touchedFields`. It is a proxy, so components only re-render for the fields they read.
- `resolver: zodResolver(schema)` for schema validation.
- `useController` / `<Controller>` for controlled third-party components (date pickers, selects).
- `useFieldArray` for dynamic lists of fields.
- `useWatch` to subscribe to specific values without re-rendering the whole form.
- `mode`: `onSubmit` (default), `onBlur`, `onChange`, `onTouched`, `all`.

### Why it is fast
Inputs are uncontrolled, so typing does not re-render the form component. Validation and error display update only affected parts.

### With React 19 and Server Functions
RHF handles client-side UX; you can still send the data to a Server Function and map returned server errors back with `setError`.
--- code
import { useFieldArray, useForm } from "react-hook-form";

type Invoice = { customer: string; items: { description: string; amount: number }[] };

export function InvoiceForm() {
  const { register, control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Invoice>({
    defaultValues: { customer: "", items: [{ description: "", amount: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(data: Invoice) {
    const res = await fetch("/api/invoices", { method: "POST", body: JSON.stringify(data) });
    if (res.status === 409) setError("customer", { message: "Customer is archived" }); // server error -> field
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("customer", { required: "Customer is required" })} placeholder="Customer" />
      {errors.customer && <p role="alert">{errors.customer.message}</p>}

      {fields.map((field, i) => (
        <div key={field.id}>
          <input {...register(`items.${i}.description`, { required: true })} />
          <input type="number" step="0.01" {...register(`items.${i}.amount`, { valueAsNumber: true, min: 0 })} />
          <button type="button" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ description: "", amount: 0 })}>Add line</button>
      <button disabled={isSubmitting}>Save</button>
    </form>
  );
}

=== r135 | M | Performance in forms?
**Form performance problems usually come from re-rendering the whole form on every keystroke. Fix them by using uncontrolled inputs (React 19 form Actions or React Hook Form), keeping per-field state inside field components, subscribing only to the values you need, debouncing expensive validation or async checks, and virtualizing very long dynamic forms.**

### Techniques
1. **Uncontrolled inputs:** values live in the DOM; no re-render per keystroke. React Hook Form is built on this.
2. **Field-level state:** if you must control inputs, put each field's state in its own component so typing re-renders one field, not the form.
3. **Selective subscriptions:** `useWatch({ name: "country" })` in RHF instead of `watch()` at the top, which re-renders on every change.
4. **Memoize heavy children:** expensive previews or summaries next to the form (or rely on the React Compiler).
5. **Debounce:** async validation such as "is this username taken?" and autosave.
6. **`useDeferredValue`:** for live previews that are slow to render (markdown preview).
7. **Validation timing:** `mode: "onBlur"` or `"onTouched"` instead of `"onChange"` for heavy schemas.
8. **Large dynamic lists:** `useFieldArray` with stable `field.id` keys; virtualize hundreds of rows.
9. **Avoid recreating schemas and option arrays** inside the component each render.
10. **Lazy-load** rich inputs (date pickers, editors) only when the field is shown.

### Measure
Use the React DevTools Profiler while typing to see which components re-render and how long they take.
--- code
import { memo, useDeferredValue, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";

type Post = { title: string; body: string };

const Preview = memo(function Preview({ body }: { body: string }) {
  // imagine an expensive markdown render here
  return <article>{body.split("\n").map((l, i) => <p key={i}>{l}</p>)}</article>;
});

function LivePreview({ control }: { control: Control<Post> }) {
  const body = useWatch({ control, name: "body" }); // only this component re-renders on typing
  const deferred = useDeferredValue(body);           // preview never blocks the textarea
  return <Preview body={deferred} />;
}

export function PostEditor() {
  const { register, control, handleSubmit } = useForm<Post>({ defaultValues: { title: "", body: "" } });
  const [saved, setSaved] = useState(false);

  return (
    <form onSubmit={handleSubmit(async (data) => { await fetch("/api/posts", { method: "POST", body: JSON.stringify(data) }); setSaved(true); })}>
      <input {...register("title")} placeholder="Title" />
      <textarea {...register("body")} rows={10} /> {/* uncontrolled: no form re-render per key */}
      <LivePreview control={control} />
      <button>Publish</button> {saved && <span>Saved</span>}
    </form>
  );
}

=== r136 | M | How to fetch data?
**Pick the approach by architecture: in frameworks, fetch on the server (Server Components, route loaders); in client-rendered apps, use a data library such as TanStack Query or SWR (or RTK Query with Redux); React 19's `use(promise)` with Suspense reads promises created outside render; and plain `fetch` in `useEffect` is the low-level fallback that needs careful handling.**

### Options
1. **Server-side (best first load):** Next.js Server Components, React Router loaders. Data arrives with the HTML, no client waterfalls, secrets stay on the server.
2. **TanStack Query / SWR:** caching, deduplication, background refetching, retries, pagination, optimistic updates and devtools. `useQuery({ queryKey, queryFn })`.
3. **`use(promise)` + `<Suspense>`:** the promise must come from a cache, a parent, a loader or a library. Creating it inside the component would refetch every render.
4. **`useEffect` + `fetch`:** fine for learning or tiny apps. You must handle loading, errors, race conditions (`AbortController` or an `ignore` flag), and Strict Mode double effects.

### Good practices
- Fetch in parallel (`Promise.all`, parallel loaders), not in nested waterfalls.
- Cancel or ignore stale requests when inputs change.
- Validate responses (Zod) at the boundary.
- Show skeletons and error states with retry.
- Cache and revalidate rather than refetching on every mount.
- Prefetch on hover or in route loaders.
- Keep server data out of global client stores; let the data library be the cache.

### HTTP clients
Native `fetch` is enough for most apps; Axios, `ky` or `ofetch` add conveniences like interceptors and JSON defaults.
--- code
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Repo = { id: number; name: string; stargazers_count: number };

// Recommended in client apps: TanStack Query
export function TopRepos({ org }: { org: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["repos", org],
    queryFn: async ({ signal }): Promise<Repo[]> => {
      const res = await fetch(`https://api.github.com/orgs/${org}/repos?sort=stars`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isPending) return <p>Loading…</p>;
  if (error) return <p>Failed: {error.message} <button onClick={() => refetch()}>Retry</button></p>;
  return <ul>{data.slice(0, 5).map((r) => <li key={r.id}>{r.name} ★{r.stargazers_count}</li>)}</ul>;
}

// Low-level fallback: useEffect with abort and error handling
export function useJson<T>(url: string) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true });
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: T) => setState({ data, loading: false }))
      .catch((e) => e.name !== "AbortError" && setState({ error: e.message, loading: false }));
    return () => ctrl.abort();
  }, [url]);
  return state;
}

=== r137 | E | Axios vs Fetch?
**`fetch` is the built-in Web API available in browsers, Node.js 18+, Deno, Bun and edge runtimes; it returns a `Response` you parse yourself and does not reject on HTTP errors. Axios is a library (version 1.x) with conveniences: automatic JSON handling, rejecting on non-2xx statuses, interceptors, timeouts, upload progress and instances with base URLs. Many teams now use `fetch` with a small wrapper.**

### Differences
| | `fetch` | Axios |
|---|---|---|
| Installation | built in | dependency (adds bundle size) |
| JSON | `await res.json()` | automatic `response.data` |
| HTTP errors (404, 500) | resolves; check `res.ok` | rejects with an `AxiosError` |
| Request body | `JSON.stringify` + header | objects serialized automatically |
| Interceptors | write a wrapper | `axios.interceptors.request/response` |
| Timeout | `AbortSignal.timeout(5000)` | `timeout` option |
| Cancellation | `AbortController` | `AbortController` (`signal`) |
| Upload progress | not directly (streams) | `onUploadProgress` |
| Streaming responses | yes (`res.body`) | limited in browsers |
| Framework caching (Next.js) | integrates with `fetch` caching | not covered |

### Choosing
- **`fetch`:** default for most apps, works everywhere and is what frameworks optimize for. Add a 20-line wrapper for base URL, JSON, error throwing and auth headers.
- **Axios:** existing codebases, heavy use of interceptors (token refresh), upload progress, or old browser support.
- **Alternatives:** `ky` and `ofetch` are small `fetch` wrappers with Axios-like ergonomics.

### Security note
Keep HTTP client libraries updated; Axios has had security fixes (for example SSRF-related issues) that require recent versions.
--- code
// fetch with a small wrapper
export async function http<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`); // fetch does not throw on 4xx/5xx
  return res.status === 204 ? (undefined as T) : res.json();
}

// const user = await http<{ id: string }>("/users", { method: "POST", json: { name: "Ada" } });

// Axios equivalent
import axios from "axios";

export const api = axios.create({ baseURL: "/api", timeout: 10_000 });
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  return config;
});
// const { data } = await api.post("/users", { name: "Ada" }); // throws AxiosError on 4xx/5xx

=== r138 | M | Error handling in API?
**Handle API errors at three levels: in the request layer (check `res.ok`, parse error bodies, classify network, timeout, 4xx and 5xx errors), in the data layer (retries with backoff for transient failures, but not for 4xx), and in the UI (inline error messages with retry actions, error boundaries for unexpected failures, and toasts for mutations). Log unexpected errors to monitoring.**

### Request layer
- `fetch` only rejects on network failure; throw your own error for `!res.ok`.
- Parse the error body to show useful messages (validation errors per field).
- Use `AbortSignal.timeout()` for timeouts.
- Create typed error classes (`HttpError` with `status`, `code`).

### Data layer
- **TanStack Query / SWR:** `error` state, automatic retries (configure `retry` to skip 4xx), `onError` callbacks, global `QueryCache({ onError })` for toasts.
- **Mutations:** roll back optimistic updates on failure.
- **Auth errors:** on 401, try a token refresh once, then redirect to login.

### UI layer
- **Inline:** "Couldn't load orders. Retry" next to the failed section.
- **Error boundaries:** catch rendering errors and errors thrown by Suspense data (`useSuspenseQuery`, `use()`); React 19 Actions also send errors to the nearest boundary. Use `react-error-boundary` with `resetKeys` or `QueryErrorResetBoundary`.
- **Router:** route `ErrorBoundary` in React Router, `error.tsx` in Next.js.
- **Forms:** map server validation errors to fields.

### Root-level reporting (React 19)
`createRoot(el, { onCaughtError, onUncaughtError, onRecoverableError })` lets you send errors to Sentry or similar.

### Do not
Swallow errors silently, show raw stack traces, or retry non-idempotent requests blindly.
--- code
import { QueryCache, QueryClient, useQuery } from "@tanstack/react-query";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: signal ?? AbortSignal.timeout(8000) });
  } catch (e) {
    throw new HttpError(0, (e as Error).name === "TimeoutError" ? "Request timed out" : "Network error");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new HttpError(res.status, body.message ?? `Request failed (${res.status})`, body);
  }
  return res.json();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (e) => console.error("[query]", e) }), // send to monitoring
  defaultOptions: {
    queries: { retry: (count, e) => !(e instanceof HttpError && e.status >= 400 && e.status < 500) && count < 2 },
  },
});

export function Orders() {
  const { data, error, refetch, isPending } = useQuery({ queryKey: ["orders"], queryFn: ({ signal }) => getJson<{ id: string }[]>("/api/orders", signal) });
  if (isPending) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message} <button onClick={() => refetch()}>Retry</button></p>;
  return <p>{data.length} orders</p>;
}

=== r139 | E | Loading states?
**Loading states tell users that something is happening. Show them close to the content that is loading, prefer skeletons that match the final layout over full-page spinners, avoid flashes for very fast loads, keep old content visible while refreshing, and drive them from the data layer (`isPending` from TanStack Query, `<Suspense>` fallbacks, `useTransition`'s `isPending`, `useFormStatus`).**

### Patterns
- **Initial load:** skeletons or placeholders with the same size as the content, to prevent layout shift.
- **Refetching or pagination:** keep showing the previous data with a subtle indicator (TanStack Query's `placeholderData: keepPreviousData`, `isFetching`).
- **Navigation:** keep the current page and show a progress bar (`useNavigation().state` in React Router, transitions).
- **Mutations:** disable the submit button and show "Saving…" (`useFormStatus`, `useActionState`'s `isPending`), or update optimistically with `useOptimistic`.
- **Suspense:** declarative fallbacks per region, revealed progressively.

### Avoid
- A spinner replacing the whole page for a small refresh.
- Flashing a spinner for 50ms: delay showing it (around 200ms) or rely on transitions, which keep old UI until new content is ready.
- Several independent boolean flags; use one `status` value (`idle | loading | success | error`).

### Accessibility
- `aria-busy="true"` on the loading region.
- Announce completion or errors in a live region when appropriate.
- Respect `prefers-reduced-motion` for skeleton shimmer animations.
--- code
import { Suspense } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <li key={i} className="h-5 w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />)}
    </ul>
  );
}

export function Orders({ page }: { page: number }) {
  const { data, isPending, isFetching } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => fetch(`/api/orders?page=${page}`).then((r) => r.json() as Promise<{ id: string; total: number }[]>),
    placeholderData: keepPreviousData, // keep old page visible while the next one loads
  });

  if (isPending) return <Skeleton />; // first load only
  return (
    <section style={{ opacity: isFetching ? 0.6 : 1 }}>
      {data.map((o) => <p key={o.id}>#{o.id}: ${o.total}</p>)}
    </section>
  );
}

// Suspense-style: declarative fallback per region
// <Suspense fallback={<Skeleton rows={5} />}><Comments /></Suspense>
export { Suspense };

=== r140 | M | Caching strategies?
**Cache server data on the client with a library (TanStack Query, SWR, RTK Query) keyed by request parameters, tune freshness with `staleTime` and garbage collection with `gcTime`, revalidate on focus, reconnect or after mutations, and update caches optimistically. Combine this with HTTP caching (`Cache-Control`, ETags, CDNs) and, in frameworks, server-side caching such as Next.js `"use cache"`.**

### Client cache concepts (TanStack Query terms)
- **Query keys:** `["products", { category, page }]`: each distinct key is a cache entry.
- **`staleTime`:** how long data is considered fresh (no refetch). Default 0, so data is refetched on mount or focus; set 30 to 300 seconds for data that changes slowly.
- **`gcTime`:** how long unused data stays in memory (default 5 minutes).
- **Stale-while-revalidate:** show cached data immediately, refetch in the background.
- **Invalidation:** `queryClient.invalidateQueries({ queryKey: ["products"] })` after a mutation.
- **Direct updates:** `setQueryData` for optimistic updates and rollbacks.
- **Prefetching:** `prefetchQuery` on hover or in route loaders.
- **Persistence:** persist the cache to IndexedDB or localStorage for offline-first apps.

### HTTP and CDN
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` for shared public data.
- `private, no-store` for user-specific responses.
- ETags or `Last-Modified` for cheap revalidation (304 responses).
- Immutable hashed assets cached for a year.

### Server and framework caches
Next.js Cache Components (`"use cache"`, `cacheLife`, `cacheTag`), React Router `Cache-Control` headers from loaders, Redis in your API.

### Pitfalls
- Caching per-user data under shared keys.
- Forgetting to invalidate after mutations.
- Copying server data into a global store, creating two caches that drift apart.
--- code
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: true } },
});

type Todo = { id: string; title: string; done: boolean };
const todosKey = (listId: string) => ["todos", listId] as const;

export function useTodos(listId: string) {
  return useQuery({ queryKey: todosKey(listId), queryFn: () => fetch(`/api/lists/${listId}/todos`).then((r) => r.json() as Promise<Todo[]>) });
}

export function useToggleTodo(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (todo: Todo) => fetch(`/api/todos/${todo.id}`, { method: "PATCH", body: JSON.stringify({ done: !todo.done }) }),
    onMutate: async (todo) => {
      await qc.cancelQueries({ queryKey: todosKey(listId) });
      const previous = qc.getQueryData<Todo[]>(todosKey(listId));
      qc.setQueryData<Todo[]>(todosKey(listId), (old = []) => old.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
      return { previous }; // for rollback
    },
    onError: (_e, _todo, ctx) => qc.setQueryData(todosKey(listId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: todosKey(listId) }), // sync with the server
  });
}
