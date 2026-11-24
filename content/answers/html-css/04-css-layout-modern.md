=== hc76 | E | What is Flexbox?
**Flexbox (the Flexible Box Layout) is a one-dimensional layout model: a flex container (`display: flex`) arranges its direct children in a row or a column and controls how they are aligned, spaced, wrapped and how they grow or shrink to fill the space. It is the go-to tool for navbars, toolbars, centering and rows of cards.**

### Container properties
- `flex-direction`: `row` (default), `column`, and their `-reverse` versions.
- `justify-content`: distribution along the main axis (`flex-start`, `center`, `space-between`…).
- `align-items`: alignment on the cross axis (`stretch` default, `center`, `baseline`…).
- `flex-wrap: wrap`: allow items onto new lines; `align-content` spaces those lines.
- `gap`: spacing between items.

### Item properties
- `flex: 1` (shorthand for grow/shrink/basis): share free space.
- `align-self`: override cross-axis alignment for one item.
- `order`: change visual order (does not change tab or reading order, so use it carefully).
- `margin-left: auto`: pushes the item and everything after it to the end.

### Classic one-liners
- Perfect centering: `display: flex; justify-content: center; align-items: center;`
- Sticky footer: a column flex body with `main { flex: 1 }`.
- Equal-height cards: the default `align-items: stretch`.

### Gotcha
Flex items have `min-width: auto`, so long words or wide children can overflow; add `min-width: 0` to the item.

### Interview tip
Flexbox is content-out (items size the layout); Grid is layout-in (the grid sizes the items). Use them together.
--- code
<style>
  body { font-family: system-ui; margin: 0; }
  nav { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #0b1020; color: white; }
  nav .push { margin-left: auto; }          /* pushes the button to the right */
  .cards { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px; }
  .card { flex: 1 1 160px; border: 2px solid #0b1020; padding: 12px; border-radius: 8px; }
  .center { display: flex; justify-content: center; align-items: center; height: 100px; background: #fef9c3; }
</style>
<nav>
  <strong>DevQnA</strong>
  <a href="#" style="color:white">Docs</a>
  <a href="#" style="color:white">Blog</a>
  <button class="push">Sign in</button>
</nav>
<div class="cards">
  <div class="card">Equal height cards that wrap</div>
  <div class="card">Second card with more text to show that all cards in a row stretch to the same height</div>
  <div class="card">Third</div>
</div>
<div class="center">Perfectly centered</div>

=== hc77 | M | Main axis vs cross axis?
**In Flexbox, the main axis is the direction items are laid out in, set by `flex-direction`, and the cross axis runs perpendicular to it. `justify-content` aligns items along the main axis and `align-items` aligns them along the cross axis, so when you switch from `row` to `column`, those two properties swap their visual effect.**

### How the axes follow `flex-direction`
| `flex-direction` | Main axis | Cross axis |
|---|---|---|
| `row` (default) | Horizontal (inline direction) | Vertical |
| `column` | Vertical | Horizontal |
| `row-reverse` / `column-reverse` | Same axis, reversed start and end | Unchanged |

### Which property works on which axis
- **Main axis:** `justify-content`, `flex-grow`, `flex-shrink`, `flex-basis`, `gap` between items, `order`.
- **Cross axis:** `align-items`, `align-self`, `align-content` (for wrapped lines).

### Practical consequences
- In a `column` container, `justify-content: center` centers **vertically**, and `align-items: center` centers **horizontally**.
- `flex-basis` sets width in a row and height in a column.
- The axes are logical: in a right-to-left document, `row` runs right to left; in vertical writing modes the main axis of `row` is vertical.

### Grid comparison
Grid uses two fixed axes instead: inline (columns, `justify-*`) and block (rows, `align-*`), regardless of any direction setting.

### Interview tip
A quick way to remember: **justify** follows the flow (main axis), **align** goes across it.
--- code
<style>
  body { font-family: system-ui; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .box { display: flex; height: 160px; border: 2px solid #0b1020; gap: 6px; padding: 6px;
         justify-content: center;     /* main axis */
         align-items: flex-end; }     /* cross axis */
  .row { flex-direction: row; background: #dbeafe; }
  .column { flex-direction: column; background: #fef9c3; }
  .box span { background: #2b4bff; color: white; padding: 4px 8px; border-radius: 4px; }
  h4 { margin: 0 0 4px; }
</style>
<div>
  <h4>row: main = horizontal</h4>
  <div class="box row"><span>1</span><span>2</span><span>3</span></div>
</div>
<div>
  <h4>column: main = vertical</h4>
  <div class="box column"><span>1</span><span>2</span><span>3</span></div>
</div>

=== hc78 | E | What is justify-content?
**`justify-content` distributes space between and around items along the main axis of a flex container (or aligns the whole grid inside a grid container along the inline axis). It only has a visible effect when there is free space left over, so it does nothing if items already fill the container, for example when an item has `flex: 1`.**

### Values
- **`flex-start` / `start`** (default): pack items at the beginning.
- **`flex-end` / `end`:** pack at the end.
- **`center`:** pack in the middle.
- **`space-between`:** first and last items touch the edges; equal space between the others.
- **`space-around`:** equal space around each item (so half-size gaps at the edges).
- **`space-evenly`:** exactly equal gaps everywhere, including the edges.
- **`stretch`:** in grid, stretches auto-sized tracks.

### Common uses
- Navbar with logo left and links right: `justify-content: space-between`.
- Centering a group of buttons: `justify-content: center`.
- Right-aligning dialog actions: `justify-content: flex-end`.

### Tips
- For a single item pushed to one side, `margin-left: auto` on that item is often simpler.
- `gap` handles fixed spacing between items; `justify-content` handles leftover space.
- With wrapping, `space-between` can leave the last row looking odd (items spread far apart); Grid with `auto-fill` handles uniform grids better.
- `safe center` prevents content from overflowing off the start edge when it is larger than the container.

### Interview tip
Remember that it follows the **main axis**: in `flex-direction: column` it works vertically.
--- code
<style>
  body { font-family: system-ui; }
  .row { display: flex; border: 2px solid #0b1020; margin: 6px 0; padding: 4px; background: #f8fafc; }
  .row span { background: #2b4bff; color: white; padding: 4px 10px; border-radius: 4px; }
  code { display: block; margin-top: 10px; }
</style>
<code>flex-start</code><div class="row" style="justify-content:flex-start"><span>A</span><span>B</span><span>C</span></div>
<code>center</code><div class="row" style="justify-content:center"><span>A</span><span>B</span><span>C</span></div>
<code>flex-end</code><div class="row" style="justify-content:flex-end"><span>A</span><span>B</span><span>C</span></div>
<code>space-between</code><div class="row" style="justify-content:space-between"><span>A</span><span>B</span><span>C</span></div>
<code>space-around</code><div class="row" style="justify-content:space-around"><span>A</span><span>B</span><span>C</span></div>
<code>space-evenly</code><div class="row" style="justify-content:space-evenly"><span>A</span><span>B</span><span>C</span></div>

=== hc79 | E | What is align-items?
**`align-items` aligns items along the cross axis of a flex container (vertically in a row) or along the block axis inside each grid area. The default is `stretch`, which is why flex items in a row become equal height; `center` is the most common override.**

### Values
- **`stretch`** (default): items fill the cross axis (unless they have an explicit height or width on that axis).
- **`flex-start` / `start`:** align to the cross-start edge.
- **`flex-end` / `end`:** align to the cross-end edge.
- **`center`:** center on the cross axis.
- **`baseline`:** align the first text baselines; great for items with different font sizes, like a big price next to a small label. `last baseline` also exists.

### Related properties
- **`align-self`** on one item overrides `align-items` for that item.
- **`align-content`** aligns *lines* of wrapped flex items (or the whole grid), only when there is extra cross-axis space.
- **`place-items: center`** in Grid sets both `align-items` and `justify-items`, the shortest way to center.

### Common gotchas
- Using `center` removes the stretch, so cards in a row no longer have equal heights.
- In a `column` direction container, `align-items` controls **horizontal** alignment, and `stretch` makes children full-width; `center` shrinks them to their content width.
- Vertical centering needs the container to have a height larger than its content.

### Interview tip
Explain why flex rows give equal-height columns by default: that is `align-items: stretch` at work.
--- code
<style>
  body { font-family: system-ui; }
  .row { display: flex; gap: 6px; height: 90px; border: 2px solid #0b1020; margin: 4px 0 12px; padding: 4px; background: #f8fafc; }
  .row span { background: #2b4bff; color: white; padding: 4px 10px; border-radius: 4px; }
  .big { font-size: 28px; }
  .self { align-self: flex-end; background: #e11d48 !important; }
</style>
<code>stretch (default)</code>
<div class="row"><span>A</span><span>B<br>two lines</span><span>C</span></div>
<code>center</code>
<div class="row" style="align-items:center"><span>A</span><span>B<br>two lines</span><span>C</span></div>
<code>baseline</code>
<div class="row" style="align-items:baseline"><span class="big">$49</span><span>/month</span><span>billed yearly</span></div>
<code>flex-start + align-self: flex-end on one item</code>
<div class="row" style="align-items:flex-start"><span>A</span><span class="self">self</span><span>C</span></div>

=== hc80 | M | flex-grow, flex-shrink, flex-basis?
**These three properties decide how a flex item is sized along the main axis. `flex-basis` is the item's starting size before free space is distributed; `flex-grow` is its share of any extra space; `flex-shrink` is how much it gives up when there is not enough space. They are usually set together with the `flex` shorthand.**

### The properties
- **`flex-basis`:** `auto` (default; use the item's width/height or content size), a length (`200px`, `30%`) or `0`.
- **`flex-grow`:** a unitless ratio, default `0` (do not grow). Items with `grow: 2` get twice as much of the *extra* space as items with `grow: 1`.
- **`flex-shrink`:** a ratio, default `1`. `0` prevents shrinking (useful for icons and avatars). Shrinking is weighted by basis, so larger items shrink more.

### The `flex` shorthand
| Shorthand | Means | Use |
|---|---|---|
| `flex: initial` | `0 1 auto` | Default |
| `flex: 1` | `1 1 0%` | Equal-width columns, ignoring content size |
| `flex: auto` | `1 1 auto` | Grow, but start from content size |
| `flex: none` | `0 0 auto` | Rigid item |
| `flex: 1 1 200px` | Explicit | Responsive cards that wrap |

### Worked example
Container 600px; three items with basis 100px = 300px; 300px free. With grow 1, 1, 1 → each 200px. With grow 2, 1, 0 → 300, 200, 100.

### Gotchas
- `flex: 1` uses a basis of 0, so items are equal regardless of content; `flex: auto` makes longer content get wider items.
- Items will not shrink below their minimum content width (`min-width: auto`); set `min-width: 0` for text truncation.
--- code
<style>
  body { font-family: system-ui; }
  .row { display: flex; width: 100%; max-width: 600px; gap: 4px; margin: 6px 0 14px; }
  .row > div { background: #dbeafe; border: 2px solid #0b1020; padding: 6px; white-space: nowrap; }
  .ratio div:nth-child(1) { flex: 2 1 100px; }
  .ratio div:nth-child(2) { flex: 1 1 100px; }
  .ratio div:nth-child(3) { flex: 0 1 100px; }
  .layout aside { flex: 0 0 140px; background: #fef9c3; }   /* rigid sidebar */
  .layout main { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
</style>
<code>flex: 2 / 1 / 0 (basis 100px)</code>
<div class="row ratio"><div>grow 2</div><div>grow 1</div><div>grow 0</div></div>
<code>flex: 1 (equal) vs flex: auto (content-based)</code>
<div class="row"><div style="flex:1">short</div><div style="flex:1">much longer content</div></div>
<div class="row"><div style="flex:auto">short</div><div style="flex:auto">much longer content</div></div>
<code>flex: none sidebar + flex: 1 main with min-width: 0</code>
<div class="row layout"><aside>Sidebar 140px</aside><main>A very long title that truncates instead of overflowing the layout container</main></div>

=== hc81 | M | What is CSS Grid?
**CSS Grid is a two-dimensional layout system: a grid container (`display: grid`) defines rows and columns, and children are placed into the resulting cells, automatically or explicitly by line numbers or named areas. It is ideal for page layouts, dashboards, galleries and any design where rows and columns must line up.**

### Defining the grid
- `grid-template-columns: 200px 1fr 1fr;`: tracks can use `px`, `%`, `fr` (a fraction of free space), `auto`, `min-content`, `max-content`.
- `repeat(3, 1fr)` and `minmax(200px, 1fr)` for flexible tracks.
- `gap: 16px` for gutters.
- `grid-template-areas` gives a readable ASCII-art layout.

### Placing items
- Automatic placement fills cells in order (`grid-auto-flow: dense` backfills gaps).
- `grid-column: 1 / -1` spans all columns; `grid-column: span 2` spans two.
- `grid-area: sidebar` places an item into a named area.

### The famous responsive one-liner
```
grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
```
It creates as many columns as fit, with no media queries. `auto-fit` collapses empty tracks so items stretch.

### Modern features
- **Subgrid** (`grid-template-columns: subgrid`) lets nested elements align to the parent grid, e.g. card titles and footers lining up across cards.
- **Alignment:** `place-items: center`, `justify-items`, `align-self`.
- Masonry layout is being standardized.

### Accessibility
Visual placement does not change DOM order; keep source order logical for keyboard and screen reader users.
--- code
<style>
  body { font-family: system-ui; margin: 0; }
  .page {
    display: grid; gap: 8px; min-height: 260px; padding: 8px;
    grid-template-columns: 160px 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "header header"
      "sidebar main"
      "footer footer";
  }
  .page > * { border: 2px solid #0b1020; padding: 8px; border-radius: 6px; }
  header { grid-area: header; background: #0b1020; color: white; }
  aside { grid-area: sidebar; background: #fef9c3; }
  main { grid-area: main; }
  footer { grid-area: footer; background: #e5e7eb; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; }
  .gallery div { aspect-ratio: 1; background: #2b4bff; border-radius: 6px; }
  .gallery .wide { grid-column: span 2; background: #e11d48; aspect-ratio: auto; }
  @media (max-width: 500px) {
    .page { grid-template-columns: 1fr; grid-template-areas: "header" "main" "sidebar" "footer"; }
  }
</style>
<div class="page">
  <header>Header</header>
  <aside>Sidebar</aside>
  <main>
    <p>Responsive gallery, no media query:</p>
    <div class="gallery"><div></div><div class="wide"></div><div></div><div></div><div></div><div></div></div>
  </main>
  <footer>Footer</footer>
</div>

=== hc82 | M | Grid vs Flexbox?
**Flexbox is one-dimensional: it lays items out along a single row or column and lets the content decide sizes. Grid is two-dimensional: it defines rows and columns together and places items into that structure. Use Flexbox for components that flow in one direction, Grid for layouts where things must line up both ways, and combine them freely.**

### Comparison
| | Flexbox | Grid |
|---|---|---|
| Dimensions | One (row *or* column) | Two (rows *and* columns) |
| Approach | Content-out: items size the layout | Layout-in: tracks size the items |
| Wrapping | Each wrapped line is independent, so columns do not align | Items always align to shared tracks |
| Placement | Source order (plus `order`) | Auto-placement, line numbers, named areas, overlapping |
| Best for | Navbars, toolbars, button groups, centering, tag lists | Page layouts, dashboards, galleries, forms, card grids |

### Rules of thumb
- If you want items to line up in **both** directions, use Grid.
- If items should be as wide as their content and simply flow, use Flexbox.
- A wrapping card list where the last row should keep the same widths: Grid (`repeat(auto-fill, minmax(...))`).
- A navbar with logo left and links right: Flexbox.
- Overlapping elements (text over an image) without absolute positioning: Grid (`grid-area: 1 / 1` on both).

### They work together
Typical page: Grid for the overall layout, Flexbox inside each card or header. Both share `gap` and the Box Alignment properties (`justify-content`, `align-items`).

### Interview tip
Avoid "Grid is better" answers; explain the one vs two dimensional distinction and give an example of each.
--- code
<style>
  body { font-family: system-ui; }
  .flex { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
  .flex div, .grid div { border: 2px solid #0b1020; padding: 8px; border-radius: 6px; background: #dbeafe; }
  .flex div { flex: 1 1 110px; }
  .stack { display: grid; width: 240px; margin-top: 18px; }
  .stack > * { grid-area: 1 / 1; }        /* overlap without position: absolute */
  .stack p { align-self: end; margin: 0; padding: 8px; color: white; background: rgb(11 16 32 / .7); }
</style>
<p><b>Flexbox:</b> the last row stretches differently</p>
<div class="flex"><div>One</div><div>Two</div><div>Three</div><div>Four</div><div>Five</div></div>
<p><b>Grid:</b> every item lines up with the columns</p>
<div class="grid"><div>One</div><div>Two</div><div>Three</div><div>Four</div><div>Five</div></div>
<div class="stack">
  <img src="https://picsum.photos/id/1041/480/240" alt="Forest path" width="240" height="120">
  <p>Grid overlap caption</p>
</div>

=== hc83 | E | What is a media query?
**A media query applies CSS only when a condition about the device or user environment is true, such as the viewport width, orientation, the user's color scheme or motion preference, or the input type. It is written with `@media`, for example `@media (min-width: 768px) { ... }`, and is the core tool of responsive design.**

### Common features
- **Size:** `(min-width: 768px)`, `(max-width: 600px)`, or the range syntax `(width >= 768px)`, `(600px <= width < 1024px)`.
- `(orientation: landscape)`, `(aspect-ratio: 16/9)`.
- **User preferences:** `(prefers-color-scheme: dark)`, `(prefers-reduced-motion: reduce)`, `(prefers-contrast: more)`.
- **Input:** `(hover: hover)` and `(pointer: coarse)` distinguish mouse from touch.
- **Media types:** `screen`, `print` (`@media print` for print styles).
- Combine with `and`, `,` (or) and `not`.

### Using them in other places
- HTML: `<link rel="stylesheet" media="print">`, `<source media="...">` in `<picture>`.
- JavaScript: `window.matchMedia("(prefers-color-scheme: dark)")` with a `change` listener.

### Media queries vs container queries
Media queries respond to the **viewport**; **container queries** (`@container (min-width: 400px)`) respond to the size of a parent element, making components reusable in any layout slot.

### Best practices
- Write mobile-first `min-width` queries.
- Choose breakpoints where the content breaks, not for specific devices.
- Use `em`/`rem` in queries so they respect user zoom and font settings.
- Fluid techniques (`clamp()`, Grid `auto-fill`) reduce how many queries you need.
--- code
<style>
  body { font-family: system-ui; margin: 0; padding: 12px; }
  .layout { display: grid; gap: 10px; }
  .layout div { border: 2px solid #0b1020; padding: 12px; border-radius: 8px; background: #dbeafe; }
  /* Mobile first: one column, then more as space allows */
  @media (width >= 600px) { .layout { grid-template-columns: 1fr 1fr; } }
  @media (width >= 900px) { .layout { grid-template-columns: repeat(3, 1fr); } }
  @media (prefers-color-scheme: dark) {
    body { background: #0b1020; color: white; }
    .layout div { background: #1e293b; border-color: white; }
  }
  @media (hover: hover) { .layout div:hover { transform: translateY(-2px); } }
  @media print { .no-print { display: none; } }
</style>
<p class="no-print">Resize the window; this line is hidden when printing.</p>
<div class="layout"><div>One</div><div>Two</div><div>Three</div></div>
<p id="out"></p>
<script>
  const mq = matchMedia("(width >= 600px)");
  const show = () => (document.getElementById("out").textContent = mq.matches ? "Wide layout" : "Narrow layout");
  mq.addEventListener("change", show);
  show();
</script>

=== hc84 | E | What are breakpoints?
**Breakpoints are the widths at which a responsive layout changes, for example from one column to two, implemented with media queries (or container queries). Good breakpoints are chosen where the content starts to look broken or cramped, not to match particular devices.**

### Typical ranges (Tailwind's defaults as a reference)
| Name | Min width | Typical change |
|---|---|---|
| `sm` | 640px | Larger phones in landscape |
| `md` | 768px | Tablets: two columns, show sidebar |
| `lg` | 1024px | Laptops: full navigation |
| `xl` | 1280px | Desktops: wider grids |
| `2xl` | 1536px | Large screens: cap content width |

Use them as a starting point, not as rules.

### How to choose them
1. Start with the narrowest layout (mobile first).
2. Widen the browser until something looks wrong (lines too long, too much empty space).
3. Add a `min-width` breakpoint there.

### Best practices
- Keep a small, shared set as design tokens so every component agrees.
- Use `em` or `rem` units (`48em`) so breakpoints respect browser zoom and font settings.
- Prefer component-level **container queries** for reusable widgets that live in sidebars and main areas alike.
- Reduce breakpoints with intrinsic layouts: `clamp()` for type and spacing, `repeat(auto-fill, minmax())` for grids, `flex-wrap`.
- Remember people zoom to 200% or more, which effectively triggers smaller breakpoints on desktops.

### Interview tip
Saying "breakpoints come from the content, not the device list" is the answer interviewers want to hear.
--- code
<style>
  :root { --bp-md: 48em; }  /* custom properties cannot be used inside @media, so document them here */
  body { font-family: system-ui; margin: 0; }
  .wrap { max-width: 72rem; margin-inline: auto; padding: 12px; }
  .grid { display: grid; gap: 10px; grid-template-columns: 1fr; }
  .grid div { border: 2px solid #0b1020; padding: 12px; background: #fef9c3; border-radius: 8px; }
  h1 { font-size: clamp(1.4rem, 4vw, 2.4rem); }   /* fluid: no breakpoint needed */
  @media (min-width: 40em) { .grid { grid-template-columns: repeat(2, 1fr); } }   /* sm: 640px */
  @media (min-width: 64em) { .grid { grid-template-columns: repeat(4, 1fr); } }   /* lg: 1024px */
</style>
<div class="wrap">
  <h1>Breakpoints from content</h1>
  <div class="grid"><div>Card</div><div>Card</div><div>Card</div><div>Card</div></div>
  <p id="w"></p>
</div>
<script>
  const show = () => (document.getElementById("w").textContent = `Viewport: ${innerWidth}px`);
  addEventListener("resize", show);
  show();
</script>

=== hc85 | E | What is mobile-first design?
**Mobile-first design means designing and writing CSS for the smallest screens first, then progressively adding layout and features for larger screens with `min-width` media queries. The base styles are simple and fast for phones, and larger screens get enhancements on top.**

### In CSS
```
.cards { display: grid; gap: 1rem; }                       /* phone: one column */
@media (min-width: 48em) { .cards { grid-template-columns: 1fr 1fr; } }
@media (min-width: 64em) { .cards { grid-template-columns: repeat(3, 1fr); } }
```
Compare desktop-first, which starts with complex layouts and then undoes them with `max-width` queries, overriding many declarations along the way.

### Why it works well
- **Performance:** phones, often on slower networks, load the least CSS complexity, and you think early about image sizes and payload.
- **Focus:** a small screen forces you to prioritize the most important content and actions.
- **Simpler CSS:** adding columns is easier than removing them; fewer overrides.
- **Mobile traffic:** most web traffic is mobile, and Google uses mobile-first indexing, crawling the mobile version of your pages.

### Mobile-first checklist
- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Touch targets at least 24×24px (44×44px recommended).
- Readable base font size (16px) and fluid type with `clamp()`.
- No hover-only interactions; check `(hover: hover)`.
- Responsive images with `srcset` and `sizes`.

### Interview tip
Mention that mobile-first is about content priority and progressive enhancement, not just the direction of your media queries.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Base = mobile */
    body { font: 1rem/1.5 system-ui; margin: 0; }
    header { padding: 12px; background: #0b1020; color: white; }
    nav { display: none; }                          /* hidden behind a menu on phones */
    .menu-btn { min-height: 44px; min-width: 44px; } /* touch friendly */
    main { padding: 12px; display: grid; gap: 12px; }
    article { border: 2px solid #0b1020; border-radius: 8px; padding: 12px; }

    /* Enhance for larger screens */
    @media (min-width: 48em) {
      header { display: flex; justify-content: space-between; align-items: center; }
      nav { display: flex; gap: 16px; }
      .menu-btn { display: none; }
      main { grid-template-columns: 2fr 1fr; padding: 24px; }
    }
  </style>
</head>
<body>
  <header><strong>Shop</strong><button class="menu-btn" aria-label="Menu">☰</button>
    <nav><a href="#" style="color:white">Men</a><a href="#" style="color:white">Women</a></nav></header>
  <main><article>Main content first</article><article>Sidebar later</article></main>
</body>
</html>

=== hc86 | E | What is responsive design?
**Responsive design is building one website whose layout, images and typography adapt to any screen size, orientation and input method, from phones to large desktop monitors, instead of making separate mobile and desktop sites. It rests on fluid layouts, flexible media and media (or container) queries.**

### The core ingredients (Ethan Marcotte's original three, plus modern tools)
1. **Fluid layouts:** relative units (`%`, `fr`, `rem`), Flexbox and Grid instead of fixed pixel widths.
2. **Flexible media:** `img { max-width: 100%; height: auto; }`, `srcset`/`sizes`, `<picture>`, `aspect-ratio`.
3. **Media queries:** adjust the layout at breakpoints.
4. **Modern additions:** container queries for components, `clamp()` for fluid type and spacing, intrinsic grids (`auto-fill` + `minmax`), viewport units like `dvh`.

### Essential setup
`<meta name="viewport" content="width=device-width, initial-scale=1">`; without it, mobile browsers render the page at about 980px wide and zoom out.

### Beyond screen size
- Input: touch targets, `(hover: hover)` and `(pointer: coarse)`.
- User preferences: dark mode, reduced motion, zoom up to 400% (WCAG 1.4.10 Reflow: no horizontal scrolling at 320 CSS px).
- Performance on slower devices and networks.

### Testing
DevTools device mode, real devices, and simply resizing the browser through every width, not only common device sizes.

### Interview tip
Mention container queries and `clamp()`; they show you know responsive design has moved beyond only media queries.
--- code
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui; margin: 0; }
  .wrap { width: min(100% - 2rem, 70rem); margin-inline: auto; }   /* fluid, capped */
  h1 { font-size: clamp(1.5rem, 1rem + 3vw, 3rem); }                /* fluid type */
  .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); }
  .card { container-type: inline-size; border: 2px solid #0b1020; border-radius: 10px; overflow: hidden; }
  .card img { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
  .card p { padding: .75rem; margin: 0; }
  /* Container query: the card adapts to its own width, not the viewport */
  @container (min-width: 20rem) { .card p { font-size: 1.1rem; } }
</style>
<div class="wrap">
  <h1>One site, every screen</h1>
  <div class="grid">
    <article class="card"><img src="https://picsum.photos/id/1035/640/360" alt="Waterfall" width="640" height="360"><p>Fluid grid</p></article>
    <article class="card"><img src="https://picsum.photos/id/1036/640/360" alt="Snowy mountains" width="640" height="360"><p>Flexible images</p></article>
    <article class="card"><img src="https://picsum.photos/id/1037/640/360" alt="Forest" width="640" height="360"><p>Container queries</p></article>
  </div>
</div>

=== hc87 | E | What are viewport units (vh, vw)?
**Viewport units size things relative to the browser's viewport: `1vw` is 1% of the viewport width and `1vh` is 1% of its height (plus `vmin` and `vmax` for the smaller and larger dimension). Because `100vh` is wrong on mobile when the browser toolbars show and hide, modern CSS adds `svh`, `lvh` and `dvh` variants.**

### The units
- `vw`, `vh`: percent of the viewport width or height.
- `vmin`, `vmax`: percent of the smaller or larger side.
- `vi`, `vb`: the logical (inline and block) versions.

### The mobile `100vh` problem and the fix
On mobile, `100vh` equals the height with the address bar *hidden*, so a `100vh` hero is taller than the visible screen and pushes buttons out of view.
- **`svh`** (small): the viewport with toolbars visible; content always fits.
- **`lvh`** (large): with toolbars hidden (what `vh` used to mean).
- **`dvh`** (dynamic): updates as the toolbars move. It is accurate but can cause relayout while scrolling.

Use `min-height: 100svh` (or `100dvh`) for full-screen sections.

### Common uses
- Full-height heroes: `min-height: 100svh`.
- Fluid typography: `font-size: clamp(1rem, 0.8rem + 1vw, 1.5rem)`.
- Spacing that scales with the screen.

### Gotchas
- **`100vw` includes the vertical scrollbar width** on desktop, causing horizontal overflow; use `100%` instead.
- Pure `vw` font sizes do not respond to browser zoom (an accessibility failure); always combine with `rem` inside `clamp()`.
- Prefer `min-height` over `height` so content can grow.
--- code
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui; }
  .hero {
    min-height: 100vh;       /* fallback */
    min-height: 100svh;      /* fits even with mobile toolbars visible */
    display: grid; place-items: center; text-align: center;
    background: #2b4bff; color: white; padding: 1rem;
  }
  h1 { font-size: clamp(1.75rem, 1rem + 4vw, 4rem); margin: 0; }   /* zoom-safe fluid type */
  .square { width: 30vmin; height: 30vmin; background: #ffd84d; border: 3px solid #0b1020; margin: 1rem auto; }
</style>
<section class="hero">
  <div>
    <h1>Full height on every phone</h1>
    <div class="square"></div>
    <p id="out"></p>
  </div>
</section>
<script>
  const show = () => (document.getElementById("out").textContent = `1vw = ${(innerWidth / 100).toFixed(1)}px, 1vh = ${(innerHeight / 100).toFixed(1)}px`);
  addEventListener("resize", show);
  show();
</script>

=== hc88 | M | What is rem vs em?
**Both are relative font-size units. `rem` (root em) is relative to the root `<html>` element's font size, usually 16px, so `1.5rem` is the same everywhere on the page. `em` is relative to the current element's own font size (or the parent's font size when used for `font-size`), so it compounds when nested.**

### Calculations
- `html { font-size: 16px }` → `2rem` = 32px anywhere.
- Parent `font-size: 20px`, child `font-size: 1.5em` → 30px.
- Nested lists with `font-size: 1.2em` grow at every level: 1.2 × 1.2 × 1.2…, the classic compounding bug.
- For `padding`, `margin` and `width`, `em` refers to the element's **own** computed font size.

### When to use which
- **`rem`:** font sizes, spacing scale, layout widths and media queries. Predictable and respects the user's browser font setting.
- **`em`:** things that should scale with the component's own text size: button padding, icon size, letter-spacing, underline offsets. Change a button's font size and everything scales together.
- **`px`:** borders, hairlines and shadows that should stay crisp.

### Accessibility
Users who raise their browser's default font size get bigger text only if you use relative units. Never set `html { font-size: 62.5% }` *and then* write everything in px. Avoid setting the root size in px at all.

### Other relative units
`ch` (width of "0", great for `max-width: 65ch` readable lines), `ex`, `lh`/`rlh` (line height), and container units `cqi`.
--- code
<style>
  body { font-family: system-ui; }
  .parent { font-size: 20px; border: 2px dashed #94a3b8; padding: 8px; }
  .rem { font-size: 1.5rem; }    /* 24px: ignores the parent */
  .em  { font-size: 1.5em; }     /* 30px: 1.5 × 20px */
  ul.em-list li { font-size: 1.15em; }      /* compounds with nesting */
  .btn { font-size: 1rem; padding: .5em 1em; border-radius: .4em; border: 2px solid #0b1020; background: #ffd84d; }
  .btn.large { font-size: 1.5rem; }          /* padding and radius scale too */
  .prose { max-width: 45ch; }
</style>
<div class="parent">
  parent 20px
  <p class="rem">1.5rem</p>
  <p class="em">1.5em</p>
</div>
<ul class="em-list"><li>Level 1<ul><li>Level 2<ul><li>Level 3 keeps growing</li></ul></li></ul></li></ul>
<button class="btn">em padding</button>
<button class="btn large">scales with font size</button>
<p class="prose">This paragraph is limited to about 45 characters per line using the ch unit, which keeps text comfortable to read.</p>
<pre id="out"></pre>
<script>
  const px = (sel) => getComputedStyle(document.querySelector(sel)).fontSize;
  document.getElementById("out").textContent = `.rem = ${px(".rem")}, .em = ${px(".em")}`;
</script>

=== hc89 | E | What is object-fit?
**`object-fit` controls how a replaced element's content, such as an `<img>` or `<video>`, fills its box when the box's aspect ratio differs from the media's. `cover` fills the box and crops the excess, `contain` fits the whole image and leaves empty space, and `fill` (the default) stretches it out of proportion.**

### Values
- **`fill`** (default): stretches to the box's exact size, distorting the image.
- **`cover`:** keeps the aspect ratio, fills the box, crops overflow. The usual choice for thumbnails, avatars, cards and heroes.
- **`contain`:** keeps the aspect ratio, shows the whole image, letterboxes. Good for logos and product shots.
- **`none`:** natural size, cropped by the box.
- **`scale-down`:** the smaller of `none` and `contain`.

### `object-position`
Chooses which part of the image stays visible when cropping: `object-position: top` keeps faces in portrait photos; `object-position: 30% 70%` targets a focal point.

### Typical pattern
```
.thumb { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
```
Every card image becomes the same shape regardless of the uploaded photo's size.

### Compared with background images
`background-size: cover` does the same for CSS backgrounds, but `<img>` with `object-fit` keeps the image as real content, with `alt` text, lazy loading, `srcset` and better LCP discovery.

### Interview tip
Mention keeping `width` and `height` attributes on the image to prevent layout shift, even when CSS changes the displayed shape.
--- code
<style>
  body { font-family: system-ui; display: flex; flex-wrap: wrap; gap: 12px; }
  figure { margin: 0; text-align: center; }
  img { width: 140px; height: 140px; border: 2px solid #0b1020; background: #f1f5f9; display: block; }
  .fill { object-fit: fill; }
  .cover { object-fit: cover; }
  .contain { object-fit: contain; }
  .top { object-fit: cover; object-position: top; }
  .avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
</style>
<figure><img class="fill" src="https://picsum.photos/id/1025/600/300" alt="Pug in a blanket" width="600" height="300"><figcaption>fill (stretched)</figcaption></figure>
<figure><img class="cover" src="https://picsum.photos/id/1025/600/300" alt="Pug in a blanket" width="600" height="300"><figcaption>cover (cropped)</figcaption></figure>
<figure><img class="contain" src="https://picsum.photos/id/1025/600/300" alt="Pug in a blanket" width="600" height="300"><figcaption>contain (letterboxed)</figcaption></figure>
<figure><img class="top" src="https://picsum.photos/id/1027/300/600" alt="Person standing outdoors" width="300" height="600"><figcaption>cover + position top</figcaption></figure>
<figure><img class="avatar" src="https://picsum.photos/id/1027/300/600" alt="Avatar" width="300" height="600"><figcaption>avatar</figcaption></figure>

=== hc90 | E | What is aspect-ratio?
**The `aspect-ratio` property gives an element a preferred width-to-height ratio, such as `16 / 9` or `1`, so when only one dimension is set the browser calculates the other. It replaced the old "padding-top: 56.25%" hack for responsive videos and cards, and it helps prevent layout shift.**

### Usage
```
.video { width: 100%; aspect-ratio: 16 / 9; }
.avatar { width: 48px; aspect-ratio: 1; border-radius: 50%; }
.card-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
```

### How it behaves
- It only applies when at least one dimension is `auto`; if both width and height are set, the ratio is ignored.
- It is a *preferred* ratio: content larger than the box can still stretch it, unless you add `min-height: 0` or `overflow: hidden`.
- `aspect-ratio: auto 16 / 9` uses the content's natural ratio when known (e.g. a loaded image) and 16/9 before that.

### Images and CLS
Browsers automatically derive `aspect-ratio` from an `<img>`'s `width` and `height` attributes (`aspect-ratio: attr(width) / attr(height)` in their default stylesheet). That is why setting those attributes reserves the right space before the image loads, even with `width: 100%; height: auto`.

### Common uses
- Responsive iframes for YouTube or maps.
- Uniform card and gallery thumbnails.
- Square grid cells (`aspect-ratio: 1`).
- Skeleton placeholders that match the final content's shape.

### Interview tip
Mention its link to Cumulative Layout Shift; it shows performance awareness.
--- code
<style>
  body { font-family: system-ui; max-width: 520px; }
  .video { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 8px; background: #0b1020; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; }
  .grid div { aspect-ratio: 1; background: #2b4bff; border-radius: 6px; }
  .card img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; display: block; }
  .skeleton { width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; background: linear-gradient(90deg, #e5e7eb, #f8fafc, #e5e7eb); }
</style>
<iframe class="video" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Embedded video" loading="lazy" allowfullscreen></iframe>
<div class="grid"><div></div><div></div><div></div><div></div></div>
<div class="card"><img src="https://picsum.photos/id/1040/800/450" alt="Castle on a hill" width="800" height="450"></div>
<p>Skeleton with the same shape reserves space before content loads:</p>
<div class="skeleton"></div>

=== hc91 | M | What are CSS preprocessors (SASS)?
**A CSS preprocessor is a language that extends CSS with programming features and compiles to plain CSS during the build. Sass (with its SCSS syntax) is the most popular; it adds variables, nesting, mixins, functions, loops, partials and modules, which made large stylesheets far easier to maintain before CSS gained many of these features natively.**

### Key Sass features
- **Variables:** `$brand: #2b4bff;`
- **Nesting:** `.card { &:hover { ... } .title { ... } }`
- **Mixins:** reusable blocks with arguments, `@mixin focus-ring($c) { ... }` used with `@include`.
- **Functions and math:** `math.div()`, `color.adjust()`.
- **Control flow:** `@each`, `@for`, `@if` to generate utility classes.
- **Modules:** split code into partials (`_buttons.scss`) and load them with `@use` / `@forward` (namespaced; `@import` is deprecated).
- `@extend` for sharing selectors (use sparingly; it can bloat output).

### Other options
Less and Stylus (older preprocessors), and **PostCSS**, a plugin-based *post*-processor that adds autoprefixing, future CSS syntax, and powers Tailwind.

### Do you still need Sass?
Native CSS now has **custom properties** (dynamic at runtime, unlike Sass variables), **nesting**, `color-mix()`, `@layer`, `@container`, and math with `calc()`, `min()`, `max()` and `clamp()`. Many new projects use plain CSS plus PostCSS, CSS Modules or Tailwind. Sass remains common in existing codebases and design systems that rely on mixins and loops.

### Interview tip
Explain the difference: Sass variables are compile-time constants; CSS custom properties live in the browser and can change with media queries, themes or JavaScript.
--- code
// _tokens.scss
$brand: #2b4bff;
$radius: 8px;
$sizes: (sm: 0.875rem, md: 1rem, lg: 1.25rem);

// _mixins.scss
@mixin focus-ring($color: $brand) {
  outline: 3px solid $color;
  outline-offset: 2px;
}

// button.scss
@use "sass:color";

.btn {
  background: $brand;
  color: white;
  border-radius: $radius;
  padding: 0.5em 1em;

  &:hover { background: color.adjust($brand, $lightness: -8%); }
  &:focus-visible { @include focus-ring; }

  // Generates .btn--sm, .btn--md, .btn--lg
  @each $name, $size in $sizes {
    &--#{$name} { font-size: $size; }
  }
}
/* Compiled CSS output (excerpt):
.btn { background: #2b4bff; color: white; border-radius: 8px; padding: .5em 1em; }
.btn--sm { font-size: .875rem; }
.btn--md { font-size: 1rem; } */

=== hc92 | M | What is nesting in CSS?
**Nesting lets you write rules inside other rules so related styles live together, as in `.card { & .title { } &:hover { } }`. It started as a Sass feature and is now native CSS, supported in all modern browsers, where `&` refers to the parent selector.**

### Native syntax
```
.card {
  padding: 1rem;
  & h2 { margin: 0; }            /* .card h2 */
  .meta { color: gray; }         /* .card .meta (the & is optional here) */
  &:hover { outline: 2px solid; }/* .card:hover */
  &.featured { border-width: 3px; } /* .card.featured */
  .dark & { background: #111; } /* .dark .card */
  @media (width >= 40em) { padding: 2rem; }
}
```

### Differences from Sass
- Native nesting behaves like `:is()`: the parent selector is wrapped in `:is(...)`, so specificity follows `:is()` rules (it takes the most specific selector in a list).
- **No string concatenation:** Sass's `&__title` (BEM-style) does **not** work natively.
- Nested at-rules (`@media`, `@container`, `@supports`, `@layer`) are supported.

### Best practices
- **Keep it shallow (two or three levels).** Deep nesting creates long, highly specific selectors that are hard to override, the main problem with Sass nesting too.
- Nest states, pseudo-elements and media queries for a component; avoid mirroring the whole DOM tree.
- Older browsers need a build step (PostCSS or Lightning CSS can flatten nesting).

### Interview tip
Mention that it is now native and point out the BEM `&__` difference; it shows up-to-date knowledge.
--- code
<style>
  body { font-family: system-ui; }
  .card {
    max-width: 300px;
    padding: 12px;
    border: 2px solid #0b1020;
    border-radius: 10px;
    margin-bottom: 12px;

    & h3 { margin: 0 0 6px; color: #2b4bff; }
    .meta { color: #64748b; font-size: .875rem; }
    &:hover { box-shadow: 4px 4px 0 #0b1020; }
    &.featured { background: #fef9c3; }
    &:has(img) { padding: 0; overflow: hidden; }
    & img { width: 100%; display: block; }

    @media (width >= 600px) { max-width: 420px; }
  }
</style>
<article class="card"><h3>Nested styles</h3><p class="meta">All rules live inside .card</p></article>
<article class="card featured"><h3>Featured</h3><p class="meta">&amp;.featured</p></article>
<article class="card"><img src="https://picsum.photos/id/1047/600/200" alt="City street" width="600" height="200"></article>

=== hc93 | E | What are variables in CSS?
**Variables in CSS are custom properties: named values you define once, such as `--brand: #2b4bff;`, and reuse anywhere with `var(--brand)`. Unlike preprocessor variables, they live in the browser, follow the cascade and inheritance, and can change at runtime with media queries, themes, component states or JavaScript.**

### Defining and using
```
:root { --brand: #2b4bff; --space: 1rem; --radius: 8px; }
.btn { background: var(--brand); padding: var(--space); border-radius: var(--radius); }
```
- Names start with `--` and are case-sensitive.
- `:root` makes them global; defining them on a selector scopes them to that subtree.
- Fallbacks: `var(--accent, hotpink)`.

### What makes them powerful
- **Theming:** redefine a few variables under `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`, and the whole UI updates.
- **Component variants:** `.btn.danger { --brand: #e11d48; }` changes only that button.
- **Responsive values:** change `--space` inside a media query.
- **JavaScript bridge:** `el.style.setProperty("--x", e.clientX + "px")` for cursor effects and animations without recalculating styles in JS.
- **Calculations:** `calc(var(--space) * 2)`.

### Good practice
Use them as **design tokens** (colors, spacing, radii, z-index scale), name them by purpose (`--color-text-muted`) rather than value (`--gray-500`) at the component level.

### Interview tip
Contrast them with Sass `$variables`: compile-time and static versus runtime and cascading.
--- code
<style>
  :root { --brand: #2b4bff; --bg: #fff8ec; --text: #0b1020; --space: 12px; --radius: 10px; }
  [data-theme="dark"] { --bg: #0b1020; --text: #f8fafc; --brand: #ffd84d; }
  body { font-family: system-ui; background: var(--bg); color: var(--text); padding: var(--space); }
  .btn {
    background: var(--brand); color: var(--bg); border: 0;
    padding: var(--space) calc(var(--space) * 2); border-radius: var(--radius); font-weight: 700;
  }
  .btn.danger { --brand: #e11d48; }   /* scoped override */
  .spot { width: 100%; height: 80px; margin-top: 12px; border-radius: var(--radius);
          background: radial-gradient(circle at var(--x, 50%) 50%, var(--brand), transparent 40%); }
</style>
<button class="btn" id="theme">Toggle theme</button>
<button class="btn danger">Danger</button>
<div class="spot" id="spot">Move your mouse here</div>
<script>
  document.getElementById("theme").onclick = () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  };
  const spot = document.getElementById("spot");
  spot.addEventListener("pointermove", (e) => spot.style.setProperty("--x", e.offsetX + "px"));
</script>

=== hc94 | M | What are CSS custom properties?
**CSS custom properties (often called CSS variables) are author-defined properties whose names start with `--`, read with `var()`. They cascade and inherit like normal properties, are evaluated at computed-value time in the browser, and can be registered with `@property` to give them a type, default value and the ability to animate.**

### How they work under the hood
- They are **inherited by default** and resolved per element, so the same `var(--gap)` can mean different values in different parts of the tree.
- Values are stored as unparsed token streams; they are only validated where they are used. An invalid substitution makes the property "invalid at computed-value time" and it falls back to its inherited or initial value, **not** to an earlier declaration.
- Fallback chains: `var(--a, var(--b, 16px))`.

### `@property`: typed custom properties
```
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
```
Benefits:
- **They become animatable.** Gradients normally cannot transition, but a typed `--angle` used inside a `conic-gradient` can.
- Type checking and a guaranteed initial value.
- `inherits: false` improves performance for frequently changing values.

### Practical patterns
- Design tokens and theming.
- "Private" component APIs: `.btn { --_bg: var(--btn-bg, var(--brand)); background: var(--_bg); }`.
- Space toggles and state-driven styles with `:has()`.
- Passing values from JavaScript: `style="--progress: 0.6"`.

### Performance tip
Changing a custom property on `:root` invalidates styles for the whole document; set frequently changing ones on the smallest element possible.
--- code
<style>
  @property --angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  @property --progress {
    syntax: "<number>";
    inherits: true;
    initial-value: 0;
  }
  body { font-family: system-ui; }
  .ring {
    width: 120px; aspect-ratio: 1; border-radius: 50%;
    background: conic-gradient(from var(--angle), #2b4bff, #e11d48, #ffd84d, #2b4bff);
    animation: spin 3s linear infinite;     /* only possible because --angle is typed */
  }
  @keyframes spin { to { --angle: 360deg; } }
  .bar { height: 14px; width: 260px; border: 2px solid #0b1020; margin-top: 16px;
         background: linear-gradient(90deg, #059669 calc(var(--progress) * 100%), #e5e7eb 0);
         transition: --progress .6s ease; }
</style>
<div class="ring" role="img" aria-label="Animated gradient ring"></div>
<div class="bar" id="bar" style="--progress: .2"></div>
<button onclick="bar.style.setProperty('--progress', Math.random().toFixed(2))">Random progress</button>

=== hc95 | M | What is BEM methodology?
**BEM (Block, Element, Modifier) is a CSS naming convention that makes class names describe a component's structure: `.block` for a standalone component, `.block__element` for a part of it, and `.block--modifier` for a variant or state. It keeps selectors flat with low, equal specificity and makes it obvious which styles belong to which component.**

### The parts
- **Block:** a reusable component, meaningful on its own: `.card`, `.search-form`.
- **Element:** a part that only makes sense inside its block: `.card__title`, `.card__image`. Never chain elements (`.card__body__title`); flatten to `.card__title`.
- **Modifier:** a variation of a block or element: `.card--featured`, `.button--small`, `.card__title--muted`. Used *in addition* to the base class: `class="card card--featured"`.

### Why teams use it
- **Flat specificity:** almost every selector is a single class, so there are no specificity wars.
- **No leaking styles:** names are unique by convention, so components do not affect each other.
- **Readable HTML:** you can see the structure and relationships from class names alone.
- **Easy to delete:** all styles for a component share a prefix.

### Drawbacks
- Verbose class names.
- It is a convention, not enforced by tools.
- Scoping tools (CSS Modules, Vue scoped styles, CSS-in-JS) and utility-first frameworks (Tailwind) now solve the same naming and leaking problems automatically, so BEM is less common in component-based apps, though still widely used in design systems.

### Interview tip
Explain the problem BEM solves (global namespace and specificity) rather than only the syntax.
--- code
<style>
  body { font-family: system-ui; display: flex; gap: 12px; flex-wrap: wrap; }
  .card { width: 220px; border: 2px solid #0b1020; border-radius: 10px; overflow: hidden; }
  .card__image { width: 100%; height: auto; display: block; }
  .card__body { padding: 10px; }
  .card__title { margin: 0 0 4px; font-size: 1.1rem; }
  .card__text { margin: 0; color: #475569; }
  .card__button { margin-top: 8px; padding: 6px 10px; border: 2px solid #0b1020; background: white; }
  .card--featured { box-shadow: 5px 5px 0 #0b1020; background: #fef9c3; }
  .card__button--primary { background: #2b4bff; color: white; }
</style>
<article class="card">
  <img class="card__image" src="https://picsum.photos/id/1060/440/200" alt="Coffee being poured" width="440" height="200">
  <div class="card__body">
    <h3 class="card__title">Standard card</h3>
    <p class="card__text">Block + elements</p>
    <button class="card__button">Read</button>
  </div>
</article>
<article class="card card--featured">
  <img class="card__image" src="https://picsum.photos/id/1062/440/200" alt="Dog in a sweater" width="440" height="200">
  <div class="card__body">
    <h3 class="card__title">Featured card</h3>
    <p class="card__text">Block modifier + element modifier</p>
    <button class="card__button card__button--primary">Read</button>
  </div>
</article>

=== hc96 | M | What are CSS Modules?
**CSS Modules are CSS files in which every class name is scoped locally by default: at build time, `.button` in `Button.module.css` is renamed to a unique hash like `Button_button__x7f2a`, and you import the generated names as a JavaScript object (`styles.button`). This gives component-level isolation with plain CSS and zero runtime cost.**

### How it works
```
/* Button.module.css */
.button { padding: .5rem 1rem; }
.primary { background: #2b4bff; color: white; }
```
```
import styles from "./Button.module.css";
<button className={`${styles.button} ${styles.primary}`}>Save</button>
```
- The bundler (Vite, webpack, Turbopack, which Next.js uses) generates unique class names and a mapping object.
- Supported out of the box in Next.js, Vite and Create React App.

### Features
- `:global(.dark) .button { ... }` targets global classes.
- `composes: base from "./shared.module.css";` reuses another class.
- Works with Sass (`.module.scss`) and PostCSS.
- TypeScript types can be generated for autocomplete on `styles.*`.

### Pros
- No naming conventions needed (no BEM), no collisions between components.
- Plain CSS: media queries, pseudo-classes, animations, nesting.
- Static extraction, so no runtime cost, unlike runtime CSS-in-JS (styled-components, Emotion), which is problematic with React Server Components.
- Dead styles are easy to find and delete per component.

### Cons
- Theming across components needs CSS custom properties.
- Class names are less readable in DevTools (configurable in development).
- Dynamic styles need `style` props or custom properties.

### Interview tip
Compare CSS Modules, Tailwind and CSS-in-JS on scoping, runtime cost and Server Component compatibility.
--- code
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border: 2px solid #0b1020;
  border-radius: 8px;
  font-weight: 700;
  background: white;
}
.primary { background: var(--brand, #2b4bff); color: white; }
.button:focus-visible { outline: 3px solid #ffd84d; }
:global(.dark) .button { border-color: white; }

// Button.tsx
import styles from "./Button.module.css";

type Props = { variant?: "primary" | "default"; children: React.ReactNode };

export function Button({ variant = "default", children }: Props) {
  const className = [styles.button, variant === "primary" && styles.primary]
    .filter(Boolean)
    .join(" ");
  return <button className={className}>{children}</button>;
}

// Rendered HTML (class names are hashed and unique):
// <button class="Button_button__x7f2a Button_primary__q91kd">Save</button>

=== hc97 | M | What is Tailwind CSS?
**Tailwind CSS is a utility-first CSS framework: instead of writing custom class names and stylesheets, you compose small single-purpose classes directly in your markup, like `flex items-center gap-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700`. A build step scans your files and generates only the CSS you actually use.**

### Key concepts
- **Utilities** map to one or a few declarations: `p-4` (padding 1rem), `text-sm`, `grid-cols-3`.
- **Variants** as prefixes: responsive (`md:grid-cols-2`), states (`hover:`, `focus-visible:`, `disabled:`), dark mode (`dark:`), group and peer (`group-hover:`), `has-[…]:`, container queries (`@md:`).
- **Design tokens:** a consistent scale for spacing, colors and typography. In Tailwind v4, tokens are configured in CSS with `@theme` and become CSS variables.
- **Arbitrary values:** `w-[37rem]`, `bg-[#2b4bff]` for one-offs.

### Pros
- Very fast to build and iterate; no context switching or naming.
- Consistency from a shared scale.
- **Tiny CSS bundles** that stop growing: utilities are reused across the whole app.
- No dead CSS and no specificity battles; styles are local to the markup.
- Works well with component frameworks and Server Components (no runtime).

### Cons
- Long class lists can hurt readability (mitigate with components, `clsx`/`cn` helpers, and Prettier's class sorting plugin).
- Learning the vocabulary.
- Repeated patterns need extraction into components.

### Ecosystem
shadcn/ui, Headless UI and Radix pair with Tailwind for accessible components.

### Interview tip
Address the "inline styles" criticism: unlike inline styles, Tailwind supports states, media queries and design constraints.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com/3.4.16"></script>
</head>
<body class="bg-amber-50 p-6 font-sans text-slate-900">
  <div class="grid gap-4 sm:grid-cols-2">
    <article class="group rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0b1020] transition hover:-translate-y-0.5">
      <h2 class="text-lg font-extrabold group-hover:text-blue-600">Utility-first</h2>
      <p class="mt-1 text-sm text-slate-600">Styles composed from small classes.</p>
      <button class="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-300">
        Get started
      </button>
    </article>
    <article class="rounded-xl border-2 border-slate-900 bg-yellow-200 p-4">
      <h2 class="text-lg font-extrabold">Responsive</h2>
      <p class="mt-1 text-sm">One column on phones, two from the <code>sm</code> breakpoint.</p>
    </article>
  </div>
</body>
</html>

=== hc98 | M | What is animation in CSS?
**CSS animations change property values over time using `@keyframes`, which define the steps, and the `animation` property, which applies them with a duration, timing function, delay, iteration count and direction. Unlike transitions, they can run automatically, loop and have many intermediate steps without any state change.**

### Defining keyframes
```
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### The `animation` sub-properties
- `animation-name`, `animation-duration`, `animation-timing-function` (`ease`, `linear`, `cubic-bezier()`, `steps()`).
- `animation-delay`, `animation-iteration-count` (`infinite`), `animation-direction` (`alternate`).
- `animation-fill-mode`: `forwards` keeps the final state; `both` also applies the first frame during the delay.
- `animation-play-state`: pause and resume.
- Shorthand: `animation: pulse 1.5s ease-in-out infinite;`

### Performance
Animate **`transform` and `opacity`**; they can run on the compositor without layout or paint. Animating `width`, `height`, `top` or `margin` triggers layout on every frame and causes jank.

### Modern features
- **Scroll-driven animations:** `animation-timeline: view()` or `scroll()` ties progress to scrolling, with no JavaScript.
- **View Transitions API** for animating between pages and states.
- `@starting-style` for entry animations from `display: none`.
- JavaScript control with the Web Animations API (`el.animate()`) and `animationend` events.

### Accessibility
Respect `prefers-reduced-motion: reduce`, avoid flashing more than three times per second, and let users pause long-running motion.
--- code
<style>
  body { font-family: system-ui; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
  @keyframes pulse { 50% { transform: scale(1.12); } }
  @keyframes spin { to { transform: rotate(1turn); } }
  @keyframes slide-in { from { opacity: 0; transform: translateY(16px); } }
  .badge { background: #e11d48; color: white; border-radius: 999px; padding: 6px 12px; animation: pulse 1.4s ease-in-out infinite; }
  .spinner { width: 36px; height: 36px; border: 4px solid #e5e7eb; border-top-color: #2b4bff; border-radius: 50%; animation: spin .8s linear infinite; }
  .card { padding: 12px; border: 2px solid #0b1020; border-radius: 8px; animation: slide-in .5s ease-out both; }
  .card:nth-child(4) { animation-delay: .15s; }
  .typing { font-family: monospace; width: 13ch; white-space: nowrap; overflow: hidden; border-right: 2px solid; animation: type 2s steps(13) infinite alternate; }
  @keyframes type { from { width: 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
<span class="badge">3 new</span>
<div class="spinner" role="status" aria-label="Loading"></div>
<div class="card">Slides in</div>
<div class="card">Then me</div>
<div class="typing">Hello, world!</div>

=== hc99 | E | What is transition?
**A CSS transition smoothly animates a property from its old value to its new value when that value changes, for example on `:hover`, `:focus`, or when JavaScript toggles a class. You specify which properties to transition, the duration, the timing function and an optional delay: `transition: background-color 200ms ease, transform 200ms ease;`.**

### Properties
- `transition-property`: which properties (`all` is convenient but can animate things you did not intend).
- `transition-duration`: `150ms` to `300ms` feels responsive for UI.
- `transition-timing-function`: `ease`, `ease-in-out`, `linear`, `cubic-bezier(.2, .8, .2, 1)`, `steps()`.
- `transition-delay`.
- `transition-behavior: allow-discrete`: lets discrete properties like `display` and `overlay` participate, enabling exit animations.

### Transition vs animation
| Transition | Animation |
|---|---|
| Needs a state change to start | Can start automatically |
| Two states: from A to B | Any number of keyframes |
| Runs once per change | Can loop and alternate |
| Great for hover, focus, open/close | Great for loaders, attention effects, sequences |

### Entry animations
Elements appearing (e.g. from `display: none`) have no "before" state; `@starting-style { opacity: 0; }` supplies it, so new elements can fade in with only transitions.

### Best practices
- Transition `transform` and `opacity` for smooth, GPU-friendly motion.
- Put the `transition` on the base state so it animates both in and out.
- Use `transitionend` in JavaScript to run code after the effect.
- Shorten or remove transitions under `prefers-reduced-motion`.
--- code
<style>
  body { font-family: system-ui; display: flex; gap: 16px; align-items: start; flex-wrap: wrap; }
  .btn {
    padding: 10px 18px; border: 2px solid #0b1020; border-radius: 10px; background: #ffd84d; font-weight: 700;
    box-shadow: 4px 4px 0 #0b1020;
    transition: transform 150ms ease, box-shadow 150ms ease, background-color 200ms;
  }
  .btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #0b1020; background: #fde047; }
  .btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 #0b1020; }
  .panel {
    width: 220px; padding: 12px; border: 2px solid #0b1020; border-radius: 10px; background: white;
    transition: opacity 250ms, transform 250ms, display 250ms allow-discrete;
  }
  .panel.hidden { opacity: 0; transform: translateY(-8px); display: none; }
  @starting-style { .panel { opacity: 0; transform: translateY(-8px); } }
  @media (prefers-reduced-motion: reduce) { * { transition-duration: 1ms !important; } }
</style>
<button class="btn" onclick="panel.classList.toggle('hidden')">Toggle panel</button>
<div class="panel hidden" id="panel">I fade and slide in and out, including display: none.</div>

=== hc100 | M | What is transform?
**`transform` visually moves, rotates, scales or skews an element without affecting the layout around it, using functions like `translate()`, `rotate()`, `scale()` and `skew()`, in 2D or 3D. Because it does not trigger layout, it is the preferred property for smooth animations.**

### Transform functions
- **Move:** `translate(20px, 10px)`, `translateX(50%)` (percentages refer to the element's own size).
- **Rotate:** `rotate(45deg)`, `rotateY(180deg)` (3D).
- **Scale:** `scale(1.1)`, `scaleX(-1)` (mirror).
- **Skew:** `skew(10deg)`.
- `matrix()` / `matrix3d()` for any combination.
- Order matters: `translate(100px) rotate(45deg)` differs from `rotate(45deg) translate(100px)`.

### Individual transform properties
Modern CSS also has standalone `translate`, `rotate` and `scale` properties: `scale: 1.1; rotate: 5deg;`. They can be animated and overridden independently, without rewriting the whole `transform` list.

### Related properties
- `transform-origin`: the pivot point (`center` by default, `top left`, `50% 100%`).
- `perspective` and `transform-style: preserve-3d` for 3D scenes; `backface-visibility: hidden` for card flips.

### Side effects to know
- A transformed element creates a **stacking context** and becomes the containing block for `position: fixed` descendants.
- Its original space in the layout is kept; neighbors do not move.
- It can make text slightly blurry when scaled; avoid scaling text permanently.

### Classic uses
Centering (`translate: -50% -50%`), hover lift effects, icon rotation on open, card flips, and slide-in drawers.
--- code
<style>
  body { font-family: system-ui; display: flex; gap: 24px; flex-wrap: wrap; align-items: center; padding: 20px; }
  .box { width: 80px; height: 80px; display: grid; place-items: center; color: white; background: #2b4bff; border-radius: 8px; transition: transform .3s, rotate .3s, scale .3s; }
  .t:hover { transform: translateY(-10px); }
  .r:hover { rotate: 45deg; }
  .s:hover { scale: 1.2; }
  .k:hover { transform: skewX(-15deg); }
  .origin { transform-origin: top left; }
  .origin:hover { rotate: 20deg; }
  .scene { perspective: 600px; }
  .flip { width: 120px; height: 80px; position: relative; transform-style: preserve-3d; transition: transform .6s; }
  .scene:hover .flip { transform: rotateY(180deg); }
  .face { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 8px; backface-visibility: hidden; border: 2px solid #0b1020; }
  .back { transform: rotateY(180deg); background: #ffd84d; }
  .front { background: white; }
</style>
<div class="box t">translate</div>
<div class="box r">rotate</div>
<div class="box s">scale</div>
<div class="box k">skew</div>
<div class="box origin">origin</div>
<div class="scene"><div class="flip"><div class="face front">Hover me</div><div class="face back">3D flip!</div></div></div>
