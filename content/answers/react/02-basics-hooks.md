=== r26 | E | What is an uncontrolled component?
**An uncontrolled component is a form element that keeps its own value in the DOM instead of in React state. You set a starting value with `defaultValue` (or `defaultChecked`) and read the current value when needed, from a ref or, more commonly in React 19, from the `FormData` passed to a form action.**

### How to read values
- **Form actions (React 19):** `<form action={(formData) => ...}>` gives you `formData.get("email")` on submit. No state, no refs.
- **`onSubmit` + `new FormData(e.currentTarget)`.**
- **Refs:** `inputRef.current.value` for one-off reads.
- **File inputs** are always uncontrolled: their value can only be read from the DOM (`input.files`).

### Pros
- Less code and no re-render per keystroke, so large forms stay fast.
- Works naturally with progressive enhancement and server actions.
- Easy integration with non-React libraries that manage the DOM.

### Cons
- No instant validation or formatting without extra listeners.
- Harder to keep multiple fields in sync or to reset to dynamic values (change the form's `key`, or call `form.reset()`; React 19 resets forms automatically after a successful action).

### Choosing
Use uncontrolled inputs for simple forms submitted as a whole, and controlled inputs when the UI must react to every change. React Hook Form is uncontrolled by design for performance, with validation layered on top.

### Rule
Do not mix `value` and `defaultValue` on the same input.
--- code
import { useRef } from "react";

// React 19: uncontrolled inputs + a form action
export function NewsletterForm() {
  async function subscribe(formData: FormData) {
    const email = String(formData.get("email"));
    await fetch("/api/subscribe", { method: "POST", body: JSON.stringify({ email }) });
    // React resets the form after the action completes
  }

  return (
    <form action={subscribe}>
      <input name="email" type="email" defaultValue="" required />
      <button>Subscribe</button>
    </form>
  );
}

// Refs: read the DOM value on demand (file inputs are always uncontrolled)
export function AvatarUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = () => {
    const file = fileRef.current?.files?.[0];
    if (file) console.log("uploading", file.name, file.size);
  };
  return (
    <>
      <input type="file" ref={fileRef} accept="image/*" />
      <button onClick={upload}>Upload</button>
    </>
  );
}

=== r27 | M | How to handle forms in React?
**Choose a strategy by complexity: React 19 form Actions with `FormData` for simple submits, controlled inputs with `useState` when the UI must react to every keystroke, and a form library such as React Hook Form with a schema validator (Zod) for large forms. Show pending and error states with `useActionState` and `useFormStatus`.**

### 1. React 19 Actions
- `<form action={fn}>`: React calls `fn(formData)` on submit, handles `preventDefault`, and resets the form after success.
- `useActionState(action, initialState)` returns `[state, formAction, isPending]` for results like validation errors.
- `useFormStatus()` (from `react-dom`) gives `pending` to a submit button inside the form.
- `useOptimistic` shows the expected result immediately.
- Works with Server Functions in frameworks like Next.js.

### 2. Controlled inputs
`value` + `onChange` per field. Best for live validation, dependent fields and formatting.

### 3. Libraries
- **React Hook Form:** uncontrolled, minimal re-renders, `register`, `handleSubmit`, and `zodResolver` for schema validation.
- **TanStack Form:** type-safe and framework-agnostic.
- **Formik:** older and still used, but much less active.

### Validation
- HTML attributes (`required`, `type="email"`, `pattern`, `min`) for free browser validation.
- A schema (Zod, Valibot) shared between client and server.
- Always validate again on the server.

### Accessibility
Label every input (`<label htmlFor>`), connect errors with `aria-describedby`, mark invalid fields with `aria-invalid`, and move focus to the first error on submit.
--- code
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type State = { error?: string; ok?: boolean };

async function saveProfile(_prev: State, formData: FormData): Promise<State> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Name must be at least 2 characters" };
  await new Promise((r) => setTimeout(r, 500)); // pretend to call an API
  return { ok: true };
}

function SaveButton() {
  const { pending } = useFormStatus(); // status of the enclosing <form>
  return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}

export function ProfileForm() {
  const [state, formAction] = useActionState(saveProfile, {});

  return (
    <form action={formAction}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" aria-invalid={!!state.error} aria-describedby="name-error" />
      {state.error && <p id="name-error" role="alert">{state.error}</p>}
      {state.ok && <p role="status">Saved!</p>}
      <SaveButton />
    </form>
  );
}

=== r28 | E | How to handle events in React?
**Pass a function to a camelCase event prop such as `onClick`, `onChange` or `onSubmit`. React calls it with a synthetic event object that wraps the native event. Pass the function itself (`onClick={save}`), not its result (`onClick={save()}`), and use an arrow function when you need arguments.**

### Basics
- **Naming:** `onClick`, `onKeyDown`, `onMouseEnter`, `onFocus`, `onPointerDown`.
- **Arguments:** `onClick={() => remove(item.id)}`.
- **Prevent default:** `e.preventDefault()` (for example on links or `onSubmit`).
- **Stop propagation:** `e.stopPropagation()`.
- **Capture phase:** add `Capture`, as in `onClickCapture`.
- **Typing:** `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`.

### Custom event props
Your components can accept callbacks like `onSelect` or `onClose`; by convention name props `onX` and handlers `handleX`.

### Under the hood
React attaches one listener per event type at the **root container** (since React 17) and dispatches to your handlers, which keeps memory use low and works with multiple React roots. Event pooling was removed in React 17, so you can use the event object asynchronously.

### Things to watch
- Handlers run after the event; state updates inside them are batched.
- Event handlers are the right place for side effects caused by user actions, rather than effects.
- `onChange` in React fires on every keystroke (like the native `input` event), not only on blur.
- Non-React listeners on `window` or `document` go in `useEffect` with cleanup.
- React 19.3 adds `onFullscreenChange` and `onFullscreenError` events.
--- code
import { useState } from "react";

export function EventsDemo() {
  const [log, setLog] = useState<string[]>([]);
  const add = (msg: string) => setLog((l) => [msg, ...l].slice(0, 5));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // stop the page reload
    const data = new FormData(e.currentTarget);
    add(`submitted ${data.get("q")}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") e.currentTarget.value = "";
  }

  return (
    <div onClickCapture={() => add("capture: div")}>
      <form onSubmit={handleSubmit}>
        <input name="q" onKeyDown={handleKeyDown} onChange={(e) => add(`typed ${e.target.value}`)} />
        <button type="submit">Search</button>
      </form>
      <button onClick={(e) => { e.stopPropagation(); add("button only"); }}>Click</button>
      <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

=== r29 | M | What is a Synthetic Event?
**A synthetic event is React's cross-browser wrapper around the browser's native event. It has the same interface (`target`, `currentTarget`, `preventDefault()`, `stopPropagation()`) with consistent behavior across browsers, and exposes the original event as `e.nativeEvent`.**

### Why React has them
- Normalize browser differences (historically important for IE; less so now).
- Let React manage event delegation and priorities: React knows a click is urgent and a scroll is continuous, and schedules updates accordingly.
- Provide React-specific behavior, such as `onChange` firing on every input change and `onMouseEnter` not bubbling.

### How delegation works
Since **React 17**, React attaches listeners at the root container you pass to `createRoot`, not at `document`. This makes nesting React apps and mixing with other libraries safer.

### Event pooling is gone
Before React 17, event objects were reused (pooled), so reading `e.target` after an `await` returned `null` unless you called `e.persist()`. React 17 removed pooling; `e.persist()` is now a no-op.

### Differences from native events
- `e.stopPropagation()` stops propagation through the React tree; native listeners on parents may still fire, depending on order.
- `onScroll` does not bubble in React 17+.
- `onFocus`/`onBlur` use `focusin`/`focusout` under the hood, so they bubble.

### When to use the native event
Accessing browser-specific properties, or working with libraries that expect the real event: use `e.nativeEvent`.
--- code
export function SyntheticDemo() {
  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    console.log(e.type);                    // "click"
    console.log(e.currentTarget.textContent); // the button
    console.log(e.nativeEvent instanceof MouseEvent); // true: the real browser event

    await new Promise((r) => setTimeout(r, 100));
    // React 17+: no event pooling, the object is still usable after await
    console.log(e.clientX, e.clientY);
  }

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault(); // same API as the DOM
    e.stopPropagation();
  }

  return (
    <div onClick={() => console.log("parent React handler")}>
      <button onClick={handleClick}>Inspect event</button>
      <a href="/elsewhere" onClick={handleLinkClick}>Do not navigate</a>
    </div>
  );
}

=== r30 | E | Difference between default and named exports?
**A module can have one default export, imported with any name (`import Card from "./Card"`), and any number of named exports, imported by their exact names in braces (`import { Card, CardTitle } from "./Card"`). Both are standard JavaScript modules, not React-specific.**

### Default export
- `export default function Card() {}`.
- Import with any name: `import Whatever from "./Card"`.
- Required by some conventions: Next.js `page.tsx` and `layout.tsx`, `React.lazy(() => import("./Chart"))` expects a default export.

### Named exports
- `export function Card() {}`, `export const CardTitle = ...`.
- Import with the same name, or rename: `import { Card as BaseCard } from "./Card"`.
- Many per file, good for related pieces and utilities.

### Why many teams prefer named exports
- **Consistent names** across the codebase, making search and refactoring easier.
- **Better autocomplete** and automatic imports.
- **Typos fail at build time** instead of silently importing the default under a wrong name.
- Tree shaking works for both, but barrel files with many named re-exports need care.

### Mixing
A file can have both: `export default Card; export { CardTitle };`, imported as `import Card, { CardTitle } from "./Card"`.

### Lazy loading named exports
`lazy(() => import("./Chart").then((m) => ({ default: m.Chart })))`.
--- code
// components/card.tsx
export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

export function CardTitle({ text }: { text: string }) {
  return <h3>{text}</h3>;
}

export const CARD_PADDING = 16;

// app.tsx
// import Card, { CardTitle, CARD_PADDING } from "./components/card"; // default + named
// import Panel from "./components/card";                               // any name for the default
// import { CardTitle as Title } from "./components/card";              // rename a named export

// Lazy loading a named export
import { lazy } from "react";
export const LazyTitle = lazy(() =>
  import("./components/card").then((m) => ({ default: m.CardTitle }))
);

=== r31 | E | What is conditional rendering?
**Conditional rendering means showing different JSX depending on conditions, using normal JavaScript: `if` statements with early returns, the ternary operator (`a ? b : c`), logical AND (`cond && <X />`), or a lookup object. Returning `null` renders nothing.**

### Techniques
- **Early return:** `if (loading) return <Spinner />;` keeps the main JSX clean.
- **Ternary:** `{isAdmin ? <AdminPanel /> : <UserPanel />}` for either/or.
- **Logical AND:** `{error && <Alert>{error}</Alert>}` for "show or nothing".
- **Variables:** compute `let content` with `if/else`, then render `{content}`.
- **Object maps:** `const views = { list: <List />, grid: <Grid /> }; return views[mode];`.
- **`null`** to render nothing.

### The `&&` trap
`{count && <Badge />}` renders `0` when `count` is `0`, because React renders numbers. Use `{count > 0 && <Badge />}` or a ternary. `false`, `null`, `undefined` and `true` render nothing.

### State implications
- Switching between **different component types** at the same position remounts them and resets state.
- Rendering the **same type** in both branches keeps state; add a `key` if you want a reset.
- To hide something while preserving its state and DOM, React 19.2's `<Activity mode="hidden">` hides it and pauses its effects instead of unmounting.

### Readability
Avoid nested ternaries; extract components or use early returns.
--- code
import { Activity, useState } from "react";

type Status = "loading" | "error" | "empty" | "ready";

export function Inbox({ status, count, error }: { status: Status; count: number; error?: string }) {
  const [showDraft, setShowDraft] = useState(false);

  if (status === "loading") return <p>Loading…</p>; // early return
  if (status === "error") return <p role="alert">{error}</p>;

  return (
    <section>
      <h2>Inbox {count > 0 && <span className="badge">{count}</span>}</h2>
      {/* {count && <span/>} would render "0" */}
      {status === "empty" ? <p>No messages</p> : <p>You have {count} messages</p>}

      <button onClick={() => setShowDraft((s) => !s)}>Toggle draft</button>
      {/* Keeps the textarea's text while hidden (React 19.2) */}
      <Activity mode={showDraft ? "visible" : "hidden"}>
        <textarea placeholder="Draft a reply" />
      </Activity>
    </section>
  );
}

=== r32 | E | What is list rendering?
**List rendering means turning an array of data into an array of elements, usually with `.map()`, and giving each element a stable, unique `key`. Combine it with `.filter()`, sorting and grouping to shape the data before rendering.**

### Pattern
1. Prepare the data: filter, sort (with `toSorted()` to avoid mutating state), group.
2. Map each item to JSX.
3. Put `key={item.id}` on the outermost element of each item.
4. Handle the empty case.

### Keys recap
- Use IDs from the data, not indexes, when items can be added, removed or reordered.
- Keys must be unique among siblings.
- Use `<Fragment key>` when each item renders several siblings.

### Performance for large lists
- Rendering thousands of DOM nodes is slow. **Virtualize** with TanStack Virtual or `react-window`, rendering only visible rows.
- Paginate or use infinite scroll.
- Memoize row components when parent updates are frequent (or rely on the React Compiler).
- CSS `content-visibility: auto` can skip rendering offscreen content.

### Avoid
- Defining the row component inside the parent (remounts every render).
- Doing expensive work per item on every render; precompute or memoize.
- Mutating the source array with `.sort()` or `.reverse()`.
--- code
type Task = { id: string; title: string; done: boolean; priority: number };

function TaskRow({ task }: { task: Task }) {
  return (
    <li className={task.done ? "line-through" : ""}>
      {task.title} (P{task.priority})
    </li>
  );
}

export function TaskList({ tasks, showDone }: { tasks: Task[]; showDone: boolean }) {
  const visible = tasks
    .filter((t) => showDone || !t.done)
    .toSorted((a, b) => a.priority - b.priority); // does not mutate props

  if (visible.length === 0) return <p>Nothing to do 🎉</p>;

  return (
    <ul>
      {visible.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}

=== r33 | E | What is the children prop?
**`children` is the special prop that holds whatever you put between a component's opening and closing tags. It lets components wrap arbitrary content, such as cards, layouts, modals and providers, which is the foundation of composition in React.**

### Basics
- `<Card><h2>Title</h2><p>Body</p></Card>`: inside `Card`, `props.children` is that content.
- It can be text, elements, arrays, `null`, or even a function (the render prop pattern).
- Type it as `React.ReactNode` in TypeScript.

### Why it matters
- **Composition over configuration:** instead of many props (`title`, `body`, `footer`), let callers pass any JSX.
- **Avoid prop drilling:** a parent can render the consumer directly inside a layout, so intermediate components never touch the data.
- **Server Components in Next.js:** Client Components can wrap server-rendered content passed as `children` without turning it into client code.

### Multiple slots
For more than one region, use named props: `<Layout sidebar={<Nav />} header={<Header />}>{content}</Layout>`.

### The `Children` utilities
`React.Children.map`, `Children.count` and `cloneElement` exist but are considered legacy patterns; they are fragile with fragments and wrappers. Prefer explicit props, context, or compound components.

### Gotcha
`children` is opaque: do not rely on inspecting its structure. If you need data, pass data.
--- code
type ModalProps = {
  title: string;
  footer?: React.ReactNode; // a named slot
  children: React.ReactNode; // the main slot
  onClose: () => void;
};

export function Modal({ title, footer, children, onClose }: ModalProps) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="modal">
      <header>
        <h2 id="modal-title">{title}</h2>
        <button aria-label="Close" onClick={onClose}>×</button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

export function DeleteDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Delete project?" onClose={onClose} footer={<button className="danger">Delete</button>}>
      <p>This cannot be undone.</p>
    </Modal>
  );
}

=== r34 | E | What are default props?
**Default props are fallback values used when a parent does not pass a prop. In function components, set them with JavaScript default parameters in destructuring: `function Button({ size = "md" })`. The `Component.defaultProps` static property was removed for function components in React 19 and only remains for class components.**

### Function components (current)
- `function Avatar({ size = 40, shape = "circle", alt = "" })`.
- Defaults apply when the prop is `undefined`, not when it is `null`.
- In TypeScript, mark the prop optional (`size?: number`) and the default narrows the type inside the component.

### Class components
`static defaultProps = { size: 40 }` still works for classes.

### History
`defaultProps` on function components was deprecated in React 18.3 and **removed in React 19**: values set that way are ignored. Codemods can convert them to default parameters.

### Pitfalls
- **Default objects or arrays** (`items = []`) create a new reference every render. That is fine for rendering, but if the value is used as an effect dependency or passed to a memoized child, define the default as a module-level constant: `const EMPTY: Item[] = []`.
- Defaults are for optional configuration. Required data should be a required prop, so TypeScript catches omissions.
--- code
type AvatarProps = {
  src?: string;
  name: string;
  size?: number;
  shape?: "circle" | "square";
  tags?: string[];
};

const NO_TAGS: string[] = []; // stable default reference

export function Avatar({ src, name, size = 40, shape = "circle", tags = NO_TAGS }: AvatarProps) {
  return (
    <figure>
      {src ? (
        <img src={src} alt={name} width={size} height={size} style={{ borderRadius: shape === "circle" ? "50%" : 4 }} />
      ) : (
        <span style={{ width: size, height: size }} className="avatar-fallback">{name[0]}</span>
      )}
      {tags.length > 0 && <figcaption>{tags.join(", ")}</figcaption>}
    </figure>
  );
}

// Removed in React 19 for function components (silently ignored):
// Avatar.defaultProps = { size: 40 };

=== r35 | E | What are PropTypes?
**PropTypes are runtime prop type checks from the `prop-types` package: you declared `Component.propTypes = { name: PropTypes.string.isRequired }` and React warned in development when props did not match. React 19 removed PropTypes checking for function components (they are silently ignored), and TypeScript is now the standard way to type props.**

### How they worked
- `PropTypes.string`, `number`, `bool`, `func`, `node`, `element`, `arrayOf()`, `shape()`, `oneOf()`, `.isRequired`.
- Checks ran only in development and produced console warnings, never errors.

### Status today
- React 15.5 moved them out of the core into `prop-types`.
- React 19 no longer runs `propTypes` checks for function components; the package itself has not been updated since 2023.
- Class components may still use them, but the ecosystem has moved on.

### TypeScript instead
- Checks at **compile time**, in your editor, before code runs.
- Covers props, state, hooks, events and context.
- Discriminated unions model variants (`{ kind: "link"; href: string } | { kind: "button"; onClick: () => void }`).

### Runtime validation still matters
TypeScript types disappear at runtime. For untrusted data (API responses, form input, URL params), validate with a schema library such as Zod or Valibot, and infer TypeScript types from the schema.
--- code
// Legacy (ignored for function components in React 19)
// import PropTypes from "prop-types";
// Price.propTypes = { amount: PropTypes.number.isRequired, currency: PropTypes.oneOf(["USD", "EUR"]) };

// Today: compile-time types with TypeScript
type PriceProps = {
  amount: number;
  currency?: "USD" | "EUR" | "INR";
};

export function Price({ amount, currency = "USD" }: PriceProps) {
  return <span>{new Intl.NumberFormat("en", { style: "currency", currency }).format(amount)}</span>;
}

// Runtime validation for untrusted data with Zod
import { z } from "zod";

const Product = z.object({ id: z.string(), name: z.string(), price: z.number().nonnegative() });
type Product = z.infer<typeof Product>;

export async function loadProduct(id: string): Promise<Product> {
  const json = await fetch(`/api/products/${id}`).then((r) => r.json());
  return Product.parse(json); // throws if the API returns the wrong shape
}

=== r36 | E | What is React DevTools?
**React DevTools is the official browser extension (Chrome, Firefox, Edge) and standalone app for inspecting React apps. Its Components tab shows the component tree with props, state, hooks and context, and its Profiler tab records renders to show what rendered, why, and how long it took.**

### Components tab
- Browse the tree and search by name.
- Inspect and edit props, state and hook values live.
- See the owner chain ("rendered by").
- Jump to the source of a component.
- Force Suspense fallbacks and error boundaries to test those states.
- Server Components (in frameworks) appear with a badge.
- Components optimized by the **React Compiler** show a "Memo ✨" badge.

### Profiler tab
- Record an interaction and see each commit, flame charts and ranked render times.
- "Why did this render?" (enable in settings) shows which props, state or hooks changed.
- "Highlight updates when components render" flashes components as they re-render.

### Chrome Performance tracks (React 19.2)
React adds custom tracks to the Chrome DevTools Performance panel: a **Scheduler** track (priorities, blocking vs transition work) and a **Components** track (which components rendered and their effects).

### Tips
- Works best with development builds; production profiling needs a profiling build.
- React Native uses React Native DevTools; standalone `react-devtools` works for other environments.
--- code
// Make components easy to find in DevTools

// 1. Named function components show their name (anonymous arrows show "Anonymous")
export function PricingTable() {
  return <table />;
}

// 2. Custom hooks can label their value in DevTools
import { useDebugValue, useSyncExternalStore } from "react";

export function useOnlineStatus() {
  const online = useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true
  );
  useDebugValue(online ? "Online" : "Offline"); // shown next to the hook in DevTools
  return online;
}

=== r37 | E | What is Create React App (CRA)?
**Create React App was the official zero-config tool (`npx create-react-app`) for starting React single-page apps with webpack, Babel, Jest and a dev server preconfigured. The React team deprecated it for new apps in February 2025; it is in maintenance mode, and new projects should use a framework (Next.js, React Router, Expo) or a build tool such as Vite, Parcel or Rsbuild.**

### What CRA gave you
- One command to a working app, with `react-scripts` hiding webpack and Babel config.
- `npm start`, `npm test`, `npm run build`.
- `eject` to expose and own the config, irreversibly.

### Why it was deprecated
- No active maintainers for a long time, and slow builds compared to modern tools.
- Client-only SPA by default: no routing, data fetching, code splitting conventions or server rendering, leading to slow initial loads and request waterfalls.
- React's recommended architecture moved to frameworks with Server Components and SSR.

### Migrating an existing CRA app
1. **To Vite:** install `vite` and `@vitejs/plugin-react`, move `public/index.html` to the root with a `<script type="module" src="/src/main.tsx">`, rename `REACT_APP_` env vars to `VITE_` and read them from `import.meta.env`, and replace Jest with Vitest (or keep Jest).
2. **To a framework:** Next.js and React Router publish CRA migration guides.

### Interview tip
Say it is deprecated and why, and name what you would use today.
--- code
// Old: npx create-react-app my-app   (deprecated for new apps since Feb 2025)

// New SPA with Vite 8:
//   npm create vite@latest my-app -- --template react-ts
// Or with the React Compiler enabled:
//   npm create vite@latest my-app -- --template react-compiler-ts
// New full-stack app:
//   npx create-next-app@latest     or     npx create-react-router@latest

// Migrating env vars from CRA to Vite
// CRA:  process.env.REACT_APP_API_URL
// Vite: import.meta.env.VITE_API_URL

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 }, // keep CRA's familiar port
  build: { outDir: "build" }, // keep CRA's output folder for existing deploy scripts
});

=== r38 | E | What is Vite?
**Vite is a fast front-end build tool and dev server. In development it serves source files as native ES modules with near-instant hot module replacement; for production it bundles and optimizes the app. Vite 8 (March 2026) uses Rolldown as its single Rust-based bundler and Oxc for transforms, and it is the most common way to start a React SPA.**

### Why it is fast
- **Dev:** no upfront bundling. The browser requests modules and Vite transforms only what is requested. Dependencies are pre-bundled once.
- **HMR:** updates only the changed module, so React Fast Refresh keeps component state.
- **Rust toolchain (Vite 8):** Rolldown replaces the old esbuild-plus-Rollup split, and Oxc handles TypeScript/JSX transforms and minification.

### Getting started with React
- `npm create vite@latest my-app -- --template react-ts`
- Templates: `react`, `react-ts`, `react-compiler`, `react-compiler-ts`.
- `@vitejs/plugin-react` v6 uses Oxc for Fast Refresh with no Babel dependency; the React Compiler is added through `reactCompilerPreset` with `@rolldown/plugin-babel`.

### Features
- TypeScript, JSX, CSS Modules, PostCSS, Sass, Lightning CSS.
- Env variables via `import.meta.env` (only `VITE_`-prefixed values are exposed to the client).
- Plugin ecosystem compatible with Rollup plugins.
- SSR and library mode; frameworks such as React Router, TanStack Start, Astro and Remix-style setups build on Vite.
- Testing with Vitest, which reuses the Vite config.

### Requirements
Node.js 20.19+ or 22.12+.

### Vite vs a framework
Vite gives you a client-rendered SPA. For routing, data loading and SSR, add React Router or TanStack Router, or choose a framework.
--- code
// Create a project
//   npm create vite@latest my-app -- --template react-compiler-ts
//   cd my-app && npm install && npm run dev

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": "/src" } },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" }, // avoid CORS in development
  },
});

// src/config.ts - only VITE_ variables reach the browser
export const API_URL = import.meta.env.VITE_API_URL ?? "/api";

=== r39 | E | What is component composition?
**Component composition is building complex UIs by combining smaller components, passing components and JSX into each other through `children` and other props, instead of inheritance or giant configurable components. It is React's main mechanism for reuse and for avoiding prop drilling.**

### Techniques
- **Nesting:** `<Page><Header /><Content /></Page>`.
- **Children:** a `Card` renders whatever it wraps.
- **Slots:** named JSX props such as `header`, `sidebar`, `actions`.
- **Specialization:** `DangerButton` renders `<Button variant="danger" {...props} />`.
- **Compound components:** `<Tabs><Tabs.List /><Tabs.Panel /></Tabs>` sharing state through context.
- **Render props or function children:** a component calls a function to let the caller decide what to render.
- **Hooks for logic:** custom hooks share behavior; components share UI.

### Composition vs inheritance
React's docs have always recommended composition; component inheritance hierarchies are almost never needed.

### Composition fixes prop drilling
If `App` has `user` and only `Avatar` deep inside needs it, `App` can create `<Avatar user={user} />` and pass it as a slot to `Layout`. Intermediate components never see `user`.

### Performance bonus
Elements passed as `children` are created by the parent. When the wrapping component re-renders because of its own state, those children do not re-render, since their element objects are unchanged.
--- code
import { useState } from "react";

function Layout({ header, sidebar, children }: { header: React.ReactNode; sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr]">
      <header className="col-span-2">{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  // `children` does not re-render when `open` changes: the parent created it
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"}</button>
      {open && children}
    </section>
  );
}

export function App({ user }: { user: { name: string } }) {
  return (
    <Layout header={<h1>Hi {user.name}</h1>} sidebar={<nav>Menu</nav>}>
      <Collapsible>
        <p>Composed content</p>
      </Collapsible>
    </Layout>
  );
}

=== r40 | E | What is a reusable component?
**A reusable component is designed to work in many places with different data and behavior, by taking props instead of hard-coding content, keeping no assumptions about where it is used, and exposing a small, predictable API. Buttons, inputs, modals, cards and data tables are typical examples.**

### Traits of a good reusable component
- **Configurable through props:** content, variants (`size`, `variant`), callbacks (`onClose`).
- **Composable:** accepts `children` or slots instead of a prop for every piece of text.
- **Extends native elements:** forwards standard attributes (`...rest`) such as `aria-*`, `type`, `disabled`, and accepts `ref` (a regular prop in React 19).
- **Accessible by default:** correct roles, labels, keyboard handling and focus states.
- **Controlled and uncontrolled support** where it makes sense (`value` / `defaultValue`, `open` / `defaultOpen`).
- **No business logic or data fetching inside;** that belongs in feature components or hooks.
- **Styled consistently** through design tokens, Tailwind variants (`cva`) or CSS Modules.
- **Typed and documented,** for example in Storybook.

### When not to generalize
Do not abstract until you have two or three real uses. Premature "do everything" components with dozens of boolean props are harder to use than duplication. Prefer composition.

### Testing
Test behavior and accessibility (keyboard, roles), not implementation details.

### Libraries
shadcn/ui, Radix UI, React Aria and Base UI provide accessible primitives you can style and wrap.
--- code
type InputProps = React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

// Reusable, accessible input: forwards ref and native props (React 19: ref is a normal prop)
export function TextField({ label, error, hint, id, ref, ...rest }: InputProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(" ");

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} ref={ref} aria-invalid={!!error} aria-describedby={describedBy || undefined} {...rest} />
      {hint && <small id={`${inputId}-hint`}>{hint}</small>}
      {error && <p id={`${inputId}-error`} role="alert">{error}</p>}
    </div>
  );
}

// Usage in many places:
// <TextField label="Email" type="email" name="email" required hint="We never share it" />
// <TextField label="Coupon" error="Invalid code" maxLength={10} />

=== r41 | E | What are React Hooks?
**Hooks are functions that start with `use` and let function components use React features: state (`useState`, `useReducer`), side effects (`useEffect`), context (`useContext`, `use`), refs (`useRef`), performance (`useMemo`, `useCallback`), concurrency (`useTransition`, `useDeferredValue`) and forms (`useActionState`, `useOptimistic`). You can also write your own custom hooks.**

### Built-in hooks by category
- **State:** `useState`, `useReducer`.
- **Context:** `useContext`, and `use(Context)` (React 19, can be called conditionally).
- **Refs:** `useRef`, `useImperativeHandle`.
- **Effects:** `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useEffectEvent` (React 19.2, for non-reactive logic inside effects).
- **Performance:** `useMemo`, `useCallback`, `useTransition`, `useDeferredValue`.
- **Actions and forms (React 19):** `useActionState`, `useOptimistic`, `useFormStatus` (from `react-dom`).
- **Other:** `useId`, `useSyncExternalStore`, `useDebugValue`.
- **`use(promise)`:** read a promise or context during render, suspending until resolved.

### Rules of Hooks
1. Call hooks at the top level of a component or custom hook, not inside conditions, loops or nested functions (the `use` API is the exception).
2. Call them only from React function components or custom hooks.
`eslint-plugin-react-hooks` (v7) enforces these and adds React Compiler-powered rules.

### Why they matter
Hooks let you reuse stateful logic across components without wrappers, keep related logic together, and are required by modern React features. Class components cannot use hooks.
--- code
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

export function UserSearch({ users }: { users: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");                 // state
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();   // concurrency
  const inputRef = useRef<HTMLInputElement>(null);        // ref

  useEffect(() => {                                        // effect
    inputRef.current?.focus();
  }, []);

  const results = useMemo(                                 // memoized value
    () => users.filter((u) => u.name.toLowerCase().includes(filter.toLowerCase())),
    [users, filter]
  );

  return (
    <div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);                        // urgent: keep typing responsive
          startTransition(() => setFilter(e.target.value)); // non-urgent: filtering
        }}
      />
      {isPending && <span>Filtering…</span>}
      <ul>{results.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
    </div>
  );
}

=== r42 | E | Why were Hooks introduced?
**Hooks were introduced in React 16.8 (February 2019) to let function components have state and side effects, and to solve three problems with classes: stateful logic was hard to reuse without wrapper hell, related logic was split across lifecycle methods, and classes were confusing (`this`, binding) and harder to optimize.**

### The problems they solved
1. **Reusing stateful logic:** before hooks, sharing logic meant higher-order components or render props, which nested components deeply ("wrapper hell") and obscured where props came from. Custom hooks share logic as plain functions.
2. **Complex components:** subscribing in `componentDidMount` and unsubscribing in `componentWillUnmount`, with related updates in `componentDidUpdate`, scattered one concern across methods while mixing unrelated concerns in each. An effect keeps setup and cleanup together.
3. **Classes are hard for people and machines:** `this` binding bugs, verbose syntax, and patterns that are hard to minify, hot-reload and compile ahead of time.

### What came after
Hooks became the foundation for every later React feature:
- Concurrent features (`useTransition`, `useDeferredValue`).
- React 19's Actions (`useActionState`, `useOptimistic`, `use`).
- React 19.2's `useEffectEvent` and `<Activity>`.
- The **React Compiler** (1.0 in 2025), which analyzes function components and hooks to memoize automatically. It cannot optimize class components.

### Compatibility
Hooks were added without breaking classes; both coexist. Most new code and libraries are hooks-only.
--- code
// Before hooks: logic reuse via a higher-order component
// const withWindowWidth = (Comp) => class extends React.Component {
//   state = { width: window.innerWidth };
//   onResize = () => this.setState({ width: window.innerWidth });
//   componentDidMount() { window.addEventListener("resize", this.onResize); }
//   componentWillUnmount() { window.removeEventListener("resize", this.onResize); }
//   render() { return <Comp {...this.props} width={this.state.width} />; }
// };

// With hooks: the same logic as a reusable function
import { useEffect, useState } from "react";

export function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize); // setup + cleanup together
  }, []);
  return width;
}

export function Banner() {
  const width = useWindowWidth();
  return <p>{width < 640 ? "Mobile layout" : "Desktop layout"}</p>;
}

=== r43 | E | What is useState?
**`useState` adds a state variable to a function component. `const [value, setValue] = useState(initial)` returns the current value and a setter; calling the setter with a new value schedules a re-render in which `value` is the new value.**

### Signature
- `useState(initialValue)` or `useState(() => computeInitial())` for lazy initialization (runs only on the first render).
- Returns `[state, setState]`. The setter's identity is stable across renders, so it is safe to omit from dependency arrays.

### Updating
- `setValue(next)` replaces the value.
- `setValue((prev) => next)` when it depends on the previous value.
- Objects and arrays must be replaced with new copies; mutations are not detected.
- Setting a value equal to the current one (by `Object.is`) skips the re-render.

### Snapshot behavior
Each render sees its own constant `value`. After calling the setter, the variable in the current scope does not change; the next render receives the new value.

### Choosing what to store
- Store the minimal data; derive the rest during render.
- Several `useState` calls for unrelated values, or one object for values that change together.
- Switch to `useReducer` when updates follow complex rules or many fields change together.

### TypeScript
Infers from the initial value; specify when it starts empty: `useState<User | null>(null)`.
--- code
import { useState } from "react";

type User = { id: string; name: string };

export function Profile() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState(() => localStorage.getItem("draft") ?? ""); // lazy init

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>

      <button onClick={() => setUser({ id: "1", name: "Ada" })}>Load user</button>
      {user && <p>Hello {user.name}</p>}

      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          localStorage.setItem("draft", e.target.value);
        }}
      />
    </div>
  );
}

=== r44 | E | Can we use multiple state variables?
**Yes. Call `useState` as many times as you need; each call creates an independent state variable. React keeps them apart by call order, so every render must call the hooks in the same order.**

### Separate variables vs one object
- **Separate `useState` calls:** best for unrelated values (`isOpen`, `query`, `page`). Updates are simple and independent.
- **One object:** best for values that always change together (`{ x, y }` position, form fields submitted as a whole). Remember the setter **replaces**; spread to keep other fields.
- **`useReducer`:** best when updates involve several fields and rules (state machines, multi-step forms).

### Guidelines from the React docs
- **Group related state** that changes together.
- **Avoid contradictions:** instead of `isSending` and `isSent` booleans that can both be true, use one `status: "idle" | "sending" | "sent"`.
- **Avoid redundant state:** do not store `fullName` if you have `firstName` and `lastName`.
- **Avoid duplication:** store the selected item's ID, not a copy of the item.
- **Avoid deep nesting:** flatten (normalize) state where possible.

### Batching
Multiple setters called in the same event are batched into one render, so splitting state does not cause extra renders.
--- code
import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  // Unrelated values: separate state variables
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle"); // one status, not two booleans

  // Values that change together: one object
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function send() {
    setStatus("sending");
    try {
      await fetch("/api/contact", { method: "POST", body: JSON.stringify(form) });
      setStatus("sent");
      setIsOpen(false); // both updates batched into one render
    } catch {
      setStatus("error");
    }
  }

  if (!isOpen) return <button onClick={() => setIsOpen(true)}>Contact us</button>;
  return (
    <div>
      <input value={form.name} onChange={update("name")} placeholder="Name" />
      <input value={form.email} onChange={update("email")} placeholder="Email" />
      <textarea value={form.message} onChange={update("message")} />
      <button disabled={status === "sending"} onClick={send}>Send</button>
      {status === "error" && <p role="alert">Failed, try again</p>}
    </div>
  );
}

=== r45 | E | What is useEffect?
**`useEffect(setup, dependencies?)` lets a component synchronize with something outside React, such as a network connection, a browser API, a timer or a third-party widget. The setup runs after React commits and the browser paints; its returned cleanup runs before the effect re-runs and when the component unmounts.**

### When effects run
- **No dependency array:** after every render.
- **`[]`:** once after mount (cleanup on unmount).
- **`[a, b]`:** after mount and whenever `a` or `b` changes (compared with `Object.is`).

### Good uses
- Subscriptions: WebSockets, `window` or `document` listeners, `IntersectionObserver`.
- Integrating non-React widgets (maps, charts, video players).
- Fetching data in apps without a framework or data library (with cleanup to ignore stale responses).
- Syncing to external systems: `document.title`, analytics on mount.

### You might not need an effect
- **Derived data:** compute during render instead of setting state in an effect.
- **Responding to user events:** do the work in the event handler.
- **Resetting state on prop change:** use a `key`.
- **Data fetching in frameworks:** use loaders, Server Components, or TanStack Query/SWR.
The React Compiler lint rule `set-state-in-effect` flags common misuse.

### Non-reactive logic
React 19.2's `useEffectEvent` extracts logic that reads the latest props or state without making them dependencies, for example logging with the current theme when a connection opens.

### Strict Mode
In development, effects mount, unmount and mount again to verify cleanups.
--- code
import { useEffect, useEffectEvent, useState } from "react";

export function ChatRoom({ roomId, theme }: { roomId: string; theme: "light" | "dark" }) {
  const [messages, setMessages] = useState<string[]>([]);

  // React 19.2: reads the latest theme without making it a dependency
  const onConnected = useEffectEvent(() => {
    console.log(`connected to ${roomId} with ${theme} theme`);
  });

  useEffect(() => {
    const socket = new WebSocket(`wss://chat.example.com/rooms/${roomId}`);
    socket.addEventListener("open", onConnected);
    socket.addEventListener("message", (e) => setMessages((m) => [...m, String(e.data)]));

    return () => socket.close(); // runs before reconnecting to a new room and on unmount
  }, [roomId]); // re-sync only when the room changes, not when the theme changes

  useEffect(() => {
    document.title = `${messages.length} messages`;
  }, [messages.length]);

  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}

=== r46 | E | Equivalent of lifecycle methods in useEffect?
**`useEffect(fn, [])` behaves like `componentDidMount` (with its cleanup as `componentWillUnmount`), `useEffect(fn, [deps])` like `componentDidUpdate` for those values, and the returned cleanup function runs before each re-run and on unmount. But effects are better understood as synchronization with external systems than as lifecycle events.**

### Mapping
| Class method | Hook equivalent |
|---|---|
| `componentDidMount` | `useEffect(() => { ... }, [])` |
| `componentDidUpdate` (for specific values) | `useEffect(() => { ... }, [value])` |
| `componentWillUnmount` | the cleanup returned from an effect |
| `shouldComponentUpdate` | `React.memo` (or the React Compiler) |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` reading the DOM |
| `componentDidCatch` | no hook; use a class error boundary or a library |
| `getDerivedStateFromProps` | compute during render, or adjust state during render with a guard |

### Differences to remember
- Effects run **after paint**; `componentDidMount` ran before paint. For measurements that must happen before paint, use `useLayoutEffect`.
- `componentDidUpdate` does not run on mount; `useEffect([value])` does. Use a ref to skip the first run if necessary (rarely needed).
- Each effect handles **one concern** with its own setup and cleanup, instead of mixing concerns in one lifecycle method.
- Effects capture props and state from their render (closures), so dependencies must be listed.

### Strict Mode
React runs mount, unmount, mount in development; a correct cleanup makes this invisible.
--- code
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function Lifecycle({ userId }: { userId: string }) {
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // componentDidMount + componentWillUnmount
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && console.log("escape");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // componentDidUpdate for userId (also runs on mount)
  useEffect(() => {
    console.log("load data for", userId);
  }, [userId]);

  // getSnapshotBeforeUpdate-style: measure before the browser paints
  useLayoutEffect(() => {
    setWidth(boxRef.current?.getBoundingClientRect().width ?? 0);
  }, [userId]);

  return <div ref={boxRef}>User {userId}, box width {width}px</div>;
}

=== r47 | E | What is the dependency array in useEffect?
**The dependency array is the second argument to `useEffect` (and to `useLayoutEffect`, `useMemo`, `useCallback`). It lists every reactive value the effect reads: props, state, and values derived from them. React re-runs the effect only when one of those values changes, compared with `Object.is`.**

### Three forms
- **Omitted:** run after every render.
- **`[]`:** run once after mount. Only correct if the effect reads no reactive values.
- **`[a, b]`:** run on mount and whenever `a` or `b` changes.

### The rule
Dependencies are not something you choose; they are determined by the code. If the effect reads it and it can change, it must be listed. `eslint-plugin-react-hooks` (`exhaustive-deps` rule) checks this. Lying about dependencies causes stale values and bugs.

### Objects and functions as dependencies
Objects, arrays and functions created during render are new each render, so the effect re-runs every time. Fixes:
- Move the object or function **inside** the effect.
- Move it **outside** the component if it uses no props or state.
- Depend on **primitive** fields (`options.roomId`) instead of the whole object.
- Memoize with `useMemo`/`useCallback` (or let the React Compiler do it).
- Use `useEffectEvent` (React 19.2) for logic that should read the latest values without re-triggering the effect.

### Not needed in the array
Setter functions from `useState`, `dispatch` from `useReducer`, refs (`useRef` objects), and Effect Events (`useEffectEvent`) are stable.
--- code
import { useEffect, useState } from "react";

export function SearchResults({ query, pageSize }: { query: string; pageSize: number }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    // Options object created INSIDE the effect: no new reference each render
    const params = new URLSearchParams({ q: query, limit: String(pageSize) });
    let ignore = false;

    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data: string[]) => {
        if (!ignore) setResults(data); // setResults is stable: not a dependency
      });

    return () => {
      ignore = true; // ignore responses for an old query
    };
  }, [query, pageSize]); // every reactive value the effect reads

  return <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>;
}

=== r48 | E | What is the cleanup function in useEffect?
**The cleanup function is the function you return from an effect's setup. React calls it before running the effect again (with the previous render's values) and when the component unmounts. Use it to undo what the setup did: unsubscribe, remove listeners, clear timers, close connections and abort requests.**

### When it runs
1. Component mounts: setup runs.
2. A dependency changes: **cleanup (old values)**, then setup (new values).
3. Component unmounts: **cleanup**.
4. In development Strict Mode, an extra setup, cleanup, setup cycle runs on mount to check that cleanup is symmetrical.
5. With React 19.2's `<Activity mode="hidden">`, cleanups run when the content is hidden and setups run again when it becomes visible.

### What to clean up
- `addEventListener` with `removeEventListener`.
- `setInterval`/`setTimeout` with `clearInterval`/`clearTimeout`.
- `new WebSocket()` / `EventSource` with `.close()`.
- `fetch` with `AbortController.abort()`, or an `ignore` flag to drop stale responses.
- Observers (`IntersectionObserver`, `ResizeObserver`) with `.disconnect()`.
- Third-party widgets with their `destroy()` method.

### Why it matters
Missing cleanup causes memory leaks, duplicate subscriptions, state updates on unmounted components, and race conditions where an old response overwrites a newer one.

### Related: ref cleanup (React 19)
Callback refs can return a cleanup function too: `ref={(node) => { observe(node); return () => unobserve(node); }}`.
--- code
import { useEffect, useState } from "react";

export function Ticker({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/quote/${symbol}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((q: { price: number }) => setPrice(q.price))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });

    const id = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      controller.abort(); // cancel the request for the previous symbol
      clearInterval(id);  // stop the timer
      setSeconds(0);
    };
  }, [symbol]);

  return <p>{symbol}: {price ?? "…"} (watching {seconds}s)</p>;
}

=== r49 | E | What is useContext?
**`useContext(SomeContext)` reads the value of a React context from the nearest provider above the component, and re-renders the component when that value changes. It is how deeply nested components access shared data such as theme, locale or the current user without prop drilling.**

### Steps
1. Create: `const ThemeContext = createContext<Theme>("light")`. The argument is the default value used when there is no provider.
2. Provide: in React 19, render `<ThemeContext value={theme}>...</ThemeContext>` directly (`<ThemeContext.Provider>` still works but will be deprecated).
3. Consume: `const theme = useContext(ThemeContext)`.

### React 19's `use`
`use(ThemeContext)` does the same, but unlike hooks it can be called inside conditions and loops.

### Re-render behavior
- Every component that reads the context re-renders when the provided value changes.
- Passing a new object each render (`value={{ user, setUser }}`) re-renders all consumers on every provider render. Memoize the value (`useMemo`) or let the React Compiler do it.
- Split frequently changing values and rarely changing ones into separate contexts.

### Best practices
- Wrap context in a custom hook (`useTheme()`) that throws a helpful error when used outside its provider.
- Use context for low-frequency global values. For high-frequency state shared widely, a store with selectors (Zustand, Redux) avoids broad re-renders.
- React 19.3: Server Components can render a context provider directly from a `"use client"` module without a wrapper component (they still cannot create context).
--- code
import { createContext, useContext, useMemo, useState } from "react";

type Theme = "light" | "dark";
type ThemeCtx = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const value = useMemo(
    () => ({ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }),
    [theme]
  );
  return <ThemeContext value={value}>{children}</ThemeContext>; // React 19 provider syntax
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function ThemeButton() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>Theme: {theme}</button>;
}

=== r50 | E | What is useRef?
**`useRef(initial)` returns a mutable object `{ current: initial }` that persists for the component's lifetime. Changing `ref.current` does not cause a re-render. It has two main uses: holding a reference to a DOM element (via the `ref` attribute) and storing values that must survive renders without affecting the UI, such as timer IDs or previous values.**

### DOM refs
- `const inputRef = useRef<HTMLInputElement>(null)` and `<input ref={inputRef} />`.
- After commit, `inputRef.current` is the DOM node: focus it, measure it, scroll it into view, integrate a library.
- In React 19, `ref` is a regular prop for function components, so custom components can accept `ref` without `forwardRef`.
- Callback refs (`ref={(node) => ...}`) can return a cleanup function in React 19.

### Instance values
- Timer and interval IDs, `AbortController`s, WebSocket instances.
- Previous values, flags like "has submitted", the latest callback.
- Large mutable objects you do not want to copy.

### Rules
- Do not read or write `ref.current` during rendering (except lazy initialization: `if (ref.current === null) ref.current = create()`). Render output must not depend on refs, because changes are invisible to React. The React Compiler lint rule `refs` flags this.
- Access DOM refs in effects or event handlers, after they are attached.
- Use state, not refs, for anything shown on screen.

### TypeScript
`useRef<HTMLDivElement>(null)` for DOM refs; `useRef<number | undefined>(undefined)` for mutable values.
--- code
import { useEffect, useRef, useState } from "react";

export function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined); // instance value
  const startRef = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null); // DOM ref

  useEffect(() => {
    buttonRef.current?.focus();
    return () => clearInterval(intervalRef.current);
  }, []);

  function start() {
    startRef.current = Date.now() - elapsed;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 50);
  }

  function stop() {
    clearInterval(intervalRef.current); // changing refs never re-renders
  }

  return (
    <div>
      <p>{(elapsed / 1000).toFixed(2)}s</p>
      <button ref={buttonRef} onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
