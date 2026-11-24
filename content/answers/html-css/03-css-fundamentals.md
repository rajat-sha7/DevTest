=== hc51 | E | What is CSS?
**CSS (Cascading Style Sheets) is the language that controls how HTML looks and is laid out: colors, typography, spacing, layout, responsiveness and animation. It works through rules, a selector plus declarations, and the "cascade" decides which rule wins when several target the same element.**

### Anatomy of a rule
```
.card { color: #0b1020; padding: 16px; }
```
- **Selector:** `.card`, which elements to style.
- **Declaration:** a `property: value` pair.

### The "cascading" part
When rules conflict, the browser decides in this order:
1. **Origin and importance** (user agent, user, author; `!important` flips the order).
2. **Cascade layers** (`@layer`).
3. **Specificity** (IDs > classes > elements).
4. **Source order** (later wins).

Some properties (color, font) also **inherit** from parent to child.

### What modern CSS can do
- Layout: **Flexbox**, **Grid**, **subgrid**.
- Responsiveness: media queries, **container queries**, `clamp()`, viewport units.
- Logic: **custom properties** (variables), `calc()`, **`:has()`** (the parent selector), native **nesting**.
- Motion: transitions, keyframe animations, **view transitions**, scroll-driven animations.

### Why separate CSS from HTML
HTML describes meaning; CSS describes presentation. Keeping them apart lets one stylesheet restyle a whole site, keeps markup clean and improves caching.

### Interview tip
Walk through how the cascade resolves conflicts; that is the concept most CSS bugs come from.
--- code
<style>
  :root { --brand: #2b4bff; }
  body { font-family: system-ui; color: #0b1020; background: #fff8ec; }
  .card {
    max-width: 320px;
    padding: 16px;
    border: 2px solid currentColor;
    border-radius: 12px;
    box-shadow: 4px 4px 0 currentColor;
  }
  .card h2 { margin: 0 0 8px; color: var(--brand); }
  .card:hover { transform: translate(-2px, -2px); transition: transform .15s; }
  /* Responsive: stack padding tighter on narrow screens */
  @media (max-width: 400px) { .card { padding: 10px; } }
</style>
<article class="card">
  <h2>Hello CSS</h2>
  <p>The same HTML, completely restyled by one stylesheet.</p>
</article>

=== hc52 | E | Types of CSS (inline, internal, external)?
**There are three ways to add CSS to HTML: inline styles in a `style` attribute on one element, internal styles in a `<style>` block in the document, and external stylesheets linked with `<link rel="stylesheet">`. External stylesheets are the default choice for real sites because they are reusable and cached.**

### Inline: `<p style="color: red">`
- Applies to one element only, with very high priority (beats any selector except `!important`).
- Hard to maintain, cannot use media queries, pseudo-classes or pseudo-elements.
- Reasonable for dynamic values set from JavaScript (`el.style.setProperty("--x", ...)`) or in emails.

### Internal: `<style>` in `<head>`
- Styles one page; no extra request.
- Good for **critical CSS**: inlining the styles needed for above-the-fold content so the first paint is fast.

### External: `<link rel="stylesheet" href="styles.css">`
- One file shared across pages and **cached** by the browser.
- Clean separation of concerns and easier collaboration.
- It is render-blocking, so keep it lean and serve it with good caching headers.

### Other ways CSS arrives
- `@import` inside CSS: avoid on the critical path because it chains requests.
- CSS-in-JS, CSS Modules and Tailwind all compile down to one of these.

### Priority
Inline styles beat internal and external ones (unless `!important` is used); between internal and external, normal cascade rules (specificity, then source order) apply.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Three ways to add CSS</title>
  <!-- External: shared and cached (a data URL keeps this demo self-contained) -->
  <link rel="stylesheet" href="data:text/css,p%7Bfont-family:system-ui;padding:6px%7D.box%7Bborder:2px%20solid%20%230b1020%7D">
  <!-- Internal: this page only -->
  <style>
    p { color: #2b4bff; }
  </style>
</head>
<body>
  <p class="box">Styled by external + internal CSS (blue).</p>
  <!-- Inline: one element, highest normal priority -->
  <p class="box" style="color: #e11d48">Inline style wins (red).</p>
  <p id="dyn" class="box">Inline styles set from JavaScript</p>
  <script>
    document.getElementById("dyn").style.background = "#fef9c3";
  </script>
</body>
</html>

=== hc53 | E | What is a selector?
**A selector is the part of a CSS rule that chooses which elements the declarations apply to. It can match by element type (`p`), class (`.btn`), ID (`#header`), attribute (`[type="email"]`), state (`:hover`), position (`:nth-child(2)`), relationships (`nav a`) and even by what an element contains (`:has(img)`).**

### How selectors are read
Browsers match selectors **right to left**. For `.menu li a`, they find every `<a>`, then check whether it has an `<li>` ancestor inside a `.menu`. That is why the rightmost part (the "key selector") matters most for performance, although for typical sites selector speed is rarely a real bottleneck.

### Selector lists and grouping
- `h1, h2, h3 { ... }` applies the same rules to several selectors.
- `:is(header, footer) a` groups options; it takes the highest specificity of its arguments.
- `:where(...)` groups with **zero** specificity, which is great for easily overridable base styles.

### Good practices
- Style with **classes**; avoid IDs in CSS (their specificity is hard to override).
- Keep selectors short and flat (`.card-title` rather than `.page .main .card h2`).
- Do not rely on deep DOM structure, which breaks when markup changes.
- Use attribute and ARIA-state selectors to style state: `[aria-expanded="true"]`.

### Interview tip
Mention `:has()`: it finally gives CSS a way to style a parent based on its children (`.card:has(img)`).
--- code
<style>
  body { font-family: system-ui; }
  p { margin: 4px 0; }                          /* type */
  .note { color: #2b4bff; }                     /* class */
  #intro { font-weight: 700; }                  /* id */
  input[type="email"] { border: 2px solid; }    /* attribute */
  li:nth-child(odd) { background: #f3f4f6; }    /* structural */
  a:hover { color: #e11d48; }                   /* state */
  nav > a { margin-right: 8px; }                /* child combinator */
  .card:has(img) { border: 2px dashed #0b1020; }/* parent selector */
  :where(ul) { padding-left: 18px; }            /* zero specificity */
</style>
<p id="intro">Selectors pick elements</p>
<p class="note">Class selector</p>
<nav><a href="#">Home</a><a href="#">About</a></nav>
<input type="email" placeholder="email">
<ul><li>One</li><li>Two</li><li>Three</li></ul>
<div class="card"><img src="https://picsum.photos/80/40" alt="" width="80" height="40"> Has an image</div>
<div class="card">No image</div>

=== hc54 | M | Types of selectors?
**CSS selectors fall into a few families: basic selectors (universal, type, class, ID, attribute), combinators that express relationships (descendant, child, next-sibling, subsequent-sibling), pseudo-classes for state and position (`:hover`, `:nth-child()`, `:has()`), and pseudo-elements that style parts of an element (`::before`, `::placeholder`).**

### Basic
- Universal `*`, type `p`, class `.btn`, ID `#nav`.
- **Attribute:** `[href]`, `[type="text"]`, `[href^="https"]` (starts with), `[href$=".pdf"]` (ends with), `[class*="icon"]` (contains).

### Combinators
- **Descendant** `nav a`: any `<a>` inside a `<nav>`.
- **Child** `ul > li`: direct children only.
- **Next sibling** `h2 + p`: the `<p>` immediately after an `<h2>`.
- **Subsequent sibling** `h2 ~ p`: all following `<p>` siblings.

### Pseudo-classes (single colon)
- **User action:** `:hover`, `:focus`, `:focus-visible`, `:active`.
- **Forms:** `:checked`, `:disabled`, `:required`, `:invalid`, `:user-invalid`, `:placeholder-shown`.
- **Structure:** `:first-child`, `:last-child`, `:nth-child(2n+1)`, `:nth-of-type()`, `:empty`.
- **Logical:** `:not()`, `:is()`, `:where()`, `:has()`.
- **Other:** `:root`, `:target`.

### Pseudo-elements (double colon)
`::before`, `::after` (need `content`), `::first-line`, `::first-letter`, `::marker`, `::placeholder`, `::selection`, `::backdrop`.

### Interview tip
Explain the difference clearly: pseudo-classes select elements in a *state*; pseudo-elements create or target a *part* of an element.
--- code
<style>
  body { font-family: system-ui; }
  a[href^="https"]::after { content: " ↗"; }          /* attribute + pseudo-element */
  a[href$=".pdf"] { color: #b91c1c; }
  ul > li + li { border-top: 1px solid #ddd; }         /* child + next sibling */
  h3 ~ p { margin-left: 12px; color: #475569; }        /* subsequent siblings */
  li:not(:last-child) { padding-bottom: 4px; }
  input:user-invalid { outline: 2px solid #e11d48; }   /* after user interaction */
  label:has(input:checked) { background: #fef9c3; }    /* parent selector */
  p::first-letter { font-size: 1.6em; font-weight: 800; }
  ::selection { background: #2b4bff; color: white; }
</style>
<a href="https://developer.mozilla.org">External link</a> · <a href="/guide.pdf">PDF guide</a>
<ul><li>First</li><li>Second</li><li>Third</li></ul>
<h3>Heading</h3>
<p>Sibling paragraph one</p>
<p>Sibling paragraph two</p>
<input type="email" required placeholder="Type an invalid email, then blur">
<label><input type="checkbox"> Highlight me when checked</label>

=== hc55 | M | What is specificity?
**Specificity is the weight the browser gives a selector to decide which rule wins when several rules set the same property on the same element. It is compared as three numbers (IDs, classes/attributes/pseudo-classes, elements/pseudo-elements); the higher value in the first column that differs wins, and only when specificity is equal does the later rule win.**

### Calculating it (A, B, C)
- **A:** ID selectors (`#nav`).
- **B:** classes, attributes and pseudo-classes (`.btn`, `[type]`, `:hover`).
- **C:** elements and pseudo-elements (`a`, `::before`).
- The universal selector `*` and combinators add nothing.

Examples:
- `a` = (0,0,1)
- `.nav a` = (0,1,1)
- `.nav a:hover` = (0,2,1)
- `#header .nav a` = (1,1,1)

Columns never "carry over": one ID (1,0,0) beats any number of classes (0,15,0).

### Special cases
- **Inline styles** beat all selectors; **`!important`** beats inline styles.
- `:is()` and `:not()` and `:has()` take the specificity of their most specific argument.
- **`:where()` is always zero**, which makes it ideal for resets and library defaults.
- **Cascade layers** (`@layer`) are checked *before* specificity: a simple selector in a later layer beats a complex one in an earlier layer.

### Avoiding specificity wars
Use mostly single-class selectors, avoid IDs in CSS, keep nesting shallow, and use `@layer` to order resets, components and utilities instead of escalating to `!important`.
--- code
<style>
  body { font-family: system-ui; }
  /* (0,0,1) */ p { color: gray; }
  /* (0,1,1) */ .intro p { color: green; }
  /* (1,0,1) */ #hero p { color: blue; }        /* wins: has an ID */
  /* (0,2,1) */ .intro .lead p { color: red; }  /* more classes, but loses to the ID */

  /* :where() adds zero specificity, so this is easy to override */
  :where(.btn) { background: #e5e7eb; padding: 6px 12px; border: 0; }
  button { background: #ffd84d; }              /* (0,0,1) still wins over :where */

  /* Layers: order beats specificity */
  @layer base, components;
  @layer components { .tag { color: white; background: #2b4bff; } }
  @layer base { #special.tag { background: gray; } } /* loses: earlier layer */
</style>
<section id="hero" class="intro"><div class="lead"><p>What color am I? (blue)</p></div></section>
<button class="btn">:where() lost to a type selector</button>
<span id="special" class="tag">Layer order wins</span>

=== hc56 | M | What is !important?
**`!important` is a flag added to a declaration (`color: red !important;`) that makes it beat all normal declarations, including inline styles and more specific selectors. It is a blunt override that breaks the normal cascade, so it should be used rarely and deliberately.**

### How it works in the cascade
- Important declarations form their own, higher-priority group.
- Between two `!important` declarations, normal rules apply again: specificity, then source order.
- **Origins and layers are reversed for important rules:** user `!important` beats author `!important` (so accessibility user styles can win), and `!important` in an *earlier* `@layer` beats `!important` in a later one.
- An inline `style="... !important"` beats stylesheet `!important` rules.

### Legitimate uses
- **Utility classes** that must always apply: `.hidden { display: none !important; }`, `.sr-only`.
- Overriding third-party CSS or inline styles you cannot edit.
- User stylesheets and accessibility overrides.
- `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`.

### Why it is usually a smell
Each `!important` invites another one to override it, an escalating "specificity war" that makes CSS hard to maintain and debug.

### Better alternatives
- Fix the selector's specificity or the source order.
- Use `:where()` for low-specificity defaults.
- Use **`@layer`** to order resets, libraries, components and utilities predictably.

### Interview tip
Knowing that `!important` reverses layer order is an advanced detail that impresses interviewers.
--- code
<style>
  body { font-family: system-ui; }
  #promo .title { color: blue; }            /* very specific */
  .title { color: green !important; }        /* still wins: important beats specificity */

  /* Utility that must always win */
  .hidden { display: none !important; }

  /* Respect users who prefer less motion */
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
<section id="promo"><h2 class="title">I am green</h2></section>
<!-- Even an inline style loses to !important in a stylesheet -->
<p class="title" style="color: red">Also green, despite the inline style</p>
<p class="hidden" style="display: block">You will never see me</p>
<span class="spin">⟳</span> (stops spinning with reduced motion)

=== hc57 | E | What is the box model?
**The CSS box model describes every element as a rectangular box made of four layers: the content, padding around it, a border, and margin outside the border. The `box-sizing` property decides whether `width` and `height` measure only the content (`content-box`, the default) or include padding and border (`border-box`).**

### The layers (inside out)
1. **Content:** text, images and child elements; sized by `width`/`height`.
2. **Padding:** space inside the border; takes the element's background.
3. **Border:** the visible edge.
4. **Margin:** transparent space outside, separating the box from neighbors.

### `box-sizing` makes the math easier
- **`content-box` (default):** `width: 200px; padding: 20px; border: 2px` renders **244px** wide.
- **`border-box`:** the same element is exactly **200px**; padding and border are taken from inside.

Most projects apply this globally:
```
*, *::before, *::after { box-sizing: border-box; }
```

### Margin behaviors to know
- **Margin collapsing:** adjacent vertical margins of block elements merge into the larger value (20px + 30px = 30px, not 50px). It does not happen in flex or grid containers.
- `margin: auto` centers a block horizontally when it has a width.
- Margins can be negative.

### Inspecting it
DevTools shows the box model diagram for any element, which is the fastest way to debug unexpected spacing.

### Interview tip
Calculate a `content-box` width out loud; it shows you truly understand the model.
--- code
<style>
  body { font-family: system-ui; }
  .box {
    width: 200px;
    padding: 20px;
    border: 4px solid #0b1020;
    margin: 16px 0;
    background: #dbeafe;
  }
  .content { box-sizing: content-box; }
  .border { box-sizing: border-box; background: #fef9c3; }
  /* Margin collapsing: the gap between these two is 30px, not 50px */
  .a { margin-bottom: 20px; }
  .b { margin-top: 30px; }
</style>
<div class="box content" id="c">content-box</div>
<div class="box border" id="b">border-box</div>
<p class="a">Paragraph A (margin-bottom 20px)</p>
<p class="b">Paragraph B (margin-top 30px)</p>
<pre id="out"></pre>
<script>
  const w = (id) => document.getElementById(id).getBoundingClientRect().width;
  document.getElementById("out").textContent =
    `content-box rendered width: ${w("c")}px\nborder-box rendered width: ${w("b")}px`;
</script>

=== hc58 | E | Difference: margin vs padding?
**Padding is the space inside an element, between its content and its border, and it shows the element's background. Margin is the space outside the border, separating the element from its neighbors, and it is always transparent. Padding also enlarges the clickable area; margin does not.**

### Side by side
| | Padding | Margin |
|---|---|---|
| Location | Inside the border | Outside the border |
| Background | Shows the element's background | Transparent |
| Clickable | Part of the element | Not part of it |
| Negative values | Not allowed | Allowed |
| `auto` | Not allowed | Allowed (`margin: auto` centers) |
| Collapsing | Never collapses | Vertical margins can collapse |

### When to use which
- **Padding:** breathing room inside a button, card or input; increasing touch target size.
- **Margin:** spacing between separate components, centering a block (`margin-inline: auto`).
- **In flex and grid layouts:** prefer `gap` for spacing between children; it avoids margin hacks and never collapses.

### Shorthand order
Both follow clockwise order: `top right bottom left`.
- `padding: 8px 16px` (vertical, horizontal)
- `margin: 0 auto`
- Logical properties adapt to writing direction: `padding-inline`, `margin-block`.

### Interview tip
Mention margin collapsing and the `gap` property; together they explain most surprising spacing bugs.
--- code
<style>
  body { font-family: system-ui; }
  .btn { background: #2b4bff; color: white; border: 2px solid #0b1020; font: 600 15px system-ui; }
  .padded { padding: 14px 24px; }         /* bigger box, bigger click target */
  .margined { margin: 14px 24px; padding: 2px 6px; }
  .outline { outline: 2px dashed #e11d48; display: inline-block; }
  .row { display: flex; gap: 12px; }       /* spacing between children: use gap */
  .row div { background: #fef9c3; padding: 8px; border: 2px solid #0b1020; }
</style>
<p>Padding grows the button itself (blue area):</p>
<span class="outline"><button class="btn padded">Padding</button></span>
<p>Margin adds empty space outside it (between blue and red outline):</p>
<span class="outline"><button class="btn margined">Margin</button></span>
<p>gap between flex items:</p>
<div class="row"><div>One</div><div>Two</div><div>Three</div></div>

=== hc59 | E | What is a border?
**A border is the line drawn around an element's padding box, defined by three parts: width, style and color (`border: 2px solid #0b1020`). Borders take up space in the box model, can be set per side, and `border-radius` rounds the corners.**

### Properties
- Shorthand: `border: <width> <style> <color>`. A style is required; without it nothing is drawn.
- **Styles:** `solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`, `none`, `hidden`.
- **Per side:** `border-top`, `border-right`, `border-bottom`, `border-left`, or logical `border-inline-start`, `border-block-end`.
- **`border-radius`:** `8px`, `50%` (circle on a square), or elliptical `40px / 20px`.
- **`border-image`:** paints the border with an image or gradient.

### Border vs outline vs box-shadow
- **Border:** part of the box model; changing its width shifts layout.
- **Outline:** drawn outside the border, takes no space, follows `border-radius` in modern browsers. It is used for focus rings, so never remove it without a replacement.
- **Box-shadow:** `box-shadow: 0 0 0 2px red` fakes a border without affecting layout and can be layered.

### Practical tips
- Use `currentColor` so the border matches the text color.
- To avoid a layout jump on hover, reserve the space with `border: 2px solid transparent`.
- For hairlines between list items, use `border-top` on `li + li`.
- Tables: `border-collapse: collapse` merges adjacent borders.
--- code
<style>
  body { font-family: system-ui; display: flex; flex-wrap: wrap; gap: 12px; }
  .b { padding: 12px 16px; }
  .solid { border: 3px solid #0b1020; }
  .dashed { border: 3px dashed #2b4bff; border-radius: 12px; }
  .sides { border-left: 6px solid #e11d48; background: #fef2f2; }
  .pill { border: 2px solid currentColor; border-radius: 999px; color: #059669; }
  .circle { width: 60px; height: 60px; border: 4px double #0b1020; border-radius: 50%; padding: 0; }
  .gradient { border: 4px solid; border-image: linear-gradient(90deg, #2b4bff, #e11d48) 1; }
  /* Reserve space so hover does not shift layout */
  .hover { border: 2px solid transparent; }
  .hover:hover { border-color: #0b1020; }
  button:focus-visible { outline: 3px solid #ffd84d; outline-offset: 2px; }
</style>
<div class="b solid">solid</div>
<div class="b dashed">dashed + radius</div>
<div class="b sides">left accent</div>
<div class="b pill">pill</div>
<div class="b circle"></div>
<div class="b gradient">border-image</div>
<div class="b hover">hover me</div>
<button class="b">Tab to me</button>

=== hc60 | E | What is the display property?
**`display` controls how an element generates boxes: its outer role in the surrounding flow (block or inline) and the layout model it uses for its own children (normal flow, flex, grid). It is the single most important layout property, and `display: none` removes an element from rendering entirely.**

### Common values
- **`block`:** starts on a new line and fills the available width (`<div>`, `<p>`, `<h1>`).
- **`inline`:** flows within text; width, height and vertical margins are ignored (`<span>`, `<a>`).
- **`inline-block`:** flows inline but respects width, height and padding.
- **`flex` / `inline-flex`:** one-dimensional layout for children.
- **`grid` / `inline-grid`:** two-dimensional layout for children.
- **`none`:** removed from layout and from the accessibility tree.
- **`contents`:** the element's own box disappears and its children act as children of its parent (useful for grid layouts; can affect semantics of some elements).
- **`flow-root`:** a block that contains its floats and stops margin collapsing.
- Table values: `table`, `table-cell`, `list-item`.

### Two-value syntax
Modern CSS splits it into outer and inner display: `display: block flex` is the same as `flex`; `inline flex` is `inline-flex`.

### Things to remember
- Each element has a default from the browser stylesheet.
- `display: none` cannot be transitioned in older browsers, but modern browsers support `transition-behavior: allow-discrete` with `@starting-style`.
- Changing `display` on a `<ul>` or `<table>` may affect how screen readers announce it in some browsers.
--- code
<style>
  body { font-family: system-ui; }
  .demo > * { background: #dbeafe; border: 2px solid #0b1020; padding: 4px 8px; margin: 4px; }
  .inline { display: inline; width: 200px; }        /* width ignored */
  .inline-block { display: inline-block; width: 120px; }
  .flex { display: flex; gap: 8px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .gone { display: none; }
</style>
<div class="demo">
  <div>block (full width)</div>
  <span class="inline">inline</span><span class="inline">inline</span>
  <span class="inline-block">inline-block</span><span class="inline-block">inline-block</span>
  <div class="flex"><b>flex</b><b>items</b><b>in a row</b></div>
  <div class="grid"><b>grid</b><b>three</b><b>columns</b><b>wraps</b></div>
  <div class="gone">display: none (not rendered)</div>
</div>

=== hc61 | E | Block vs inline vs inline-block?
**Block elements start on a new line and stretch to fill their container's width, honoring width, height, margin and padding. Inline elements flow inside text, take only the width of their content, and ignore width, height and vertical margins. Inline-block elements flow inline like text but behave like blocks inside, respecting width, height and all spacing.**

### Comparison
| | block | inline | inline-block |
|---|---|---|---|
| New line | Yes | No | No |
| Default width | Fills container | Fits content | Fits content |
| `width` / `height` | Applied | Ignored | Applied |
| Vertical margin | Applied | Ignored | Applied |
| Vertical padding | Applied | Painted, but does not push lines apart | Applied |
| Examples | `div`, `p`, `h1`, `section` | `span`, `a`, `strong`, `em` | `button`, `input`, `img` (replaced elements behave similarly) |

### Practical uses
- **inline-block:** badges, buttons and nav links that need padding and a fixed height while sitting in a line of text.
- Inline-block elements are aligned with `vertical-align` and are separated by whitespace in the HTML source, which creates small, sometimes unwanted gaps.

### Modern perspective
For laying out a row of items, **Flexbox with `gap`** replaced most inline-block layouts: no whitespace gaps, easy alignment and wrapping. Inline-block is still handy for small inline components.

### Interview tip
A classic gotcha: setting `width` on a `<span>` or `<a>` does nothing until you change its display.
--- code
<style>
  body { font-family: system-ui; }
  .x { background: #dbeafe; border: 2px solid #0b1020; padding: 8px; margin: 12px; width: 140px; height: 40px; }
  .block { display: block; }
  .inline { display: inline; }        /* width/height/vertical margin ignored */
  .inline-block { display: inline-block; }
</style>
<p>Text before
  <span class="x block">block</span>
  text after.</p>
<p>Text before
  <span class="x inline">inline</span>
  text after, padding overlaps lines above and below.</p>
<p>Text before
  <span class="x inline-block">inline-block</span>
  text after, sits in the line and keeps its size.</p>

=== hc62 | E | What is visibility vs display?
**`display: none` removes an element completely: it takes no space, is not rendered, cannot be focused and is hidden from screen readers. `visibility: hidden` makes an element invisible but keeps its space in the layout; it is also unfocusable and hidden from assistive technologies. `opacity: 0` keeps the element in place and still interactive.**

### Comparison
| | `display: none` | `visibility: hidden` | `opacity: 0` |
|---|---|---|---|
| Takes space | No | Yes | Yes |
| Clickable / focusable | No | No | **Yes** |
| Screen readers | Hidden | Hidden | Still read |
| Children can override | No | Yes (`visibility: visible`) | No |
| Animatable | Discrete only | Yes (discrete step, handy with transitions) | Yes, smoothly |
| Triggers layout change | Yes | No | No |

### When to use which
- **`display: none`** (or the `hidden` attribute): content that should not exist right now, like inactive tabs or closed menus.
- **`visibility: hidden`:** hide without shifting surrounding layout; combine with an opacity transition for fades (`visibility` switches at the end of the transition).
- **`opacity: 0`:** fade animations; remember to also make it non-interactive (`pointer-events: none`, `inert`).
- **Visually hidden but readable by screen readers:** use an `.sr-only` utility class (clip-path, 1px size) for things like skip links and labels.

### Interview tip
Mention the accessibility differences; they are what interviewers usually look for.
--- code
<style>
  body { font-family: system-ui; }
  .row { display: flex; gap: 8px; margin: 8px 0; }
  .row div { padding: 10px; border: 2px solid #0b1020; background: #dbeafe; }
  .none { display: none; }
  .hidden { visibility: hidden; }
  .transparent { opacity: 0; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .fade { transition: opacity .3s, visibility .3s; }
  .fade.off { opacity: 0; visibility: hidden; }
</style>
<div class="row"><div>A</div><div class="none">B</div><div>C</div></div>   <!-- no gap left -->
<div class="row"><div>A</div><div class="hidden">B</div><div>C</div></div> <!-- gap kept -->
<div class="row"><div>A</div><div class="transparent" onclick="alert('Still clickable!')">B</div><div>C</div></div>
<button><span aria-hidden="true">✕</span><span class="sr-only">Close</span></button>
<button onclick="document.getElementById('f').classList.toggle('off')">Toggle fade</button>
<p id="f" class="fade">Fades out, then becomes unfocusable and hidden from screen readers.</p>

=== hc63 | E | What is overflow?
**`overflow` controls what happens when an element's content is larger than its box: `visible` (default, spills out), `hidden` (clipped), `scroll` (always shows scrollbars), `auto` (scrollbars only when needed) and `clip` (clipped without creating a scroll container). It can be set per axis with `overflow-x` and `overflow-y`.**

### Values
- **`visible`:** content draws outside the box.
- **`hidden`:** clipped; still scrollable from JavaScript; creates a scroll container (and a new block formatting context, so it contains floats).
- **`clip`:** clipped with no scroll container at all, so it does **not** break `position: sticky` in descendants.
- **`scroll`:** scrollbars always present.
- **`auto`:** scrollbars appear when needed; the usual choice for scrollable panels.

### Related properties
- `text-overflow: ellipsis` (with `white-space: nowrap; overflow: hidden`) truncates single lines with "…".
- `-webkit-line-clamp` / `line-clamp` truncates after N lines.
- `overscroll-behavior: contain` stops scroll chaining to the page (useful for modals and chat panels).
- `scrollbar-gutter: stable` reserves scrollbar space to avoid layout shift.
- `scroll-snap-type` creates carousel-style snapping.

### Common gotchas
- `overflow: hidden` on an ancestor breaks `position: sticky` and clips dropdowns and tooltips.
- Setting one axis to `hidden` and the other to `visible` makes `visible` compute to `auto`.
- Horizontal page overflow on mobile usually comes from a fixed-width element; find it with DevTools.
--- code
<style>
  body { font-family: system-ui; }
  .box { width: 220px; height: 70px; border: 2px solid #0b1020; margin: 8px 0; padding: 6px; }
  .visible { overflow: visible; }
  .hidden { overflow: hidden; }
  .auto { overflow: auto; overscroll-behavior: contain; }
  .ellipsis { width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 2px solid #0b1020; padding: 6px; }
  .clamp { width: 220px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
</style>
<div class="box visible">visible: This text is too long for the box so it spills out below the border and overlaps.</div>
<br>
<div class="box hidden">hidden: This text is too long for the box so the extra lines are clipped and never shown.</div>
<div class="box auto">auto: This text is too long for the box so a scrollbar appears and you can scroll to read everything here.</div>
<div class="ellipsis">ellipsis: A single line that is far too long to fit</div>
<p class="clamp">line-clamp: This paragraph is limited to two lines, and anything after the second line is replaced by an ellipsis automatically.</p>

=== hc64 | E | What is position?
**The `position` property controls how an element is placed: either in the normal document flow (`static`, `relative`, `sticky`) or taken out of it (`absolute`, `fixed`). Combined with the offset properties `top`, `right`, `bottom`, `left` (or `inset`), it lets you nudge, overlay, pin or stick elements.**

### The five values in one sentence each
- **`static`** (default): normal flow; offsets and `z-index` have no effect.
- **`relative`:** stays in flow, can be nudged with offsets, and becomes the reference point for absolutely positioned children.
- **`absolute`:** removed from flow; positioned relative to the nearest positioned ancestor.
- **`fixed`:** removed from flow; positioned relative to the viewport, stays put while scrolling.
- **`sticky`:** behaves like relative until a scroll threshold (`top: 0`), then sticks within its parent.

### Key concept: the containing block
An absolutely positioned element looks for the nearest ancestor whose `position` is anything other than `static`. That is why the classic pattern is a `relative` parent with an `absolute` child (badges, close buttons, overlays).

### Useful shorthands
- `inset: 0` is the same as `top: 0; right: 0; bottom: 0; left: 0` (fills the containing block).
- Centering: `position: absolute; inset: 0; margin: auto;` with a width and height, or `top: 50%; left: 50%; translate: -50% -50%`.

### Interview tip
Positioned elements also create stacking contexts with `z-index`; mention it, because overlay bugs often come from that.
--- code
<style>
  body { font-family: system-ui; height: 900px; }
  .card { position: relative; width: 240px; padding: 16px; border: 2px solid #0b1020; margin-top: 40px; }
  .badge { position: absolute; top: -10px; right: -10px; background: #e11d48; color: white; border-radius: 999px; padding: 2px 8px; }
  .nudge { position: relative; left: 20px; color: #2b4bff; }
  .fab { position: fixed; right: 16px; bottom: 16px; background: #ffd84d; border: 2px solid #0b1020; padding: 10px 14px; border-radius: 999px; }
  .sticky { position: sticky; top: 0; background: #0b1020; color: white; padding: 8px; }
</style>
<div class="sticky">I stick to the top while you scroll</div>
<div class="card">
  Card with a badge
  <span class="badge">3</span>
  <p class="nudge">relative: nudged 20px but my space stays</p>
</div>
<button class="fab">fixed</button>

=== hc65 | M | Position types?
**CSS has five position types: `static`, `relative`, `absolute`, `fixed` and `sticky`. They differ in whether the element stays in the normal flow and what it is positioned relative to: its normal spot, the nearest positioned ancestor, the viewport, or a scroll container.**

### Detailed comparison
| Value | In flow? | Positioned relative to | Typical use |
|---|---|---|---|
| `static` | Yes | n/a (offsets ignored) | Default |
| `relative` | Yes (space kept) | Its own normal position | Small nudges; anchor for absolute children |
| `absolute` | No | Nearest non-static ancestor (else the initial containing block) | Badges, tooltips, dropdowns, overlays |
| `fixed` | No | The viewport* | Sticky headers, floating buttons, toasts |
| `sticky` | Yes | Its scroll container, within the parent's bounds | Table headers, section titles, sidebars |

*Unless an ancestor has `transform`, `filter`, `perspective`, `contain` or `will-change: transform`; then `fixed` behaves like `absolute` relative to that ancestor. This is a common bug in modals inside animated containers.

### Sticky gotchas
- It needs an offset (`top: 0`), otherwise it never sticks.
- It only sticks within its parent's box; a short parent means a short sticky range.
- An ancestor with `overflow: hidden`, `auto` or `scroll` becomes the scroll container and can stop it from sticking to the page.

### Modern additions
- **Anchor positioning** (`anchor-name`, `position-anchor`, `position-area`) positions tooltips relative to another element without JavaScript, in supporting browsers.
- The **Popover API** and `<dialog>` render in the top layer, avoiding `z-index` and `overflow` clipping issues entirely.
--- code
<style>
  body { font-family: system-ui; }
  .scroller { height: 180px; overflow: auto; border: 2px solid #0b1020; }
  .scroller h3 { position: sticky; top: 0; margin: 0; background: #ffd84d; padding: 6px; }
  .scroller p { margin: 6px; }
  .wrap { position: relative; height: 80px; border: 2px dashed #2b4bff; margin-top: 12px; }
  .abs { position: absolute; bottom: 8px; right: 8px; background: #2b4bff; color: white; padding: 4px 8px; }
  .transformed { transform: translateZ(0); position: relative; height: 80px; border: 2px dashed #e11d48; margin-top: 12px; }
  .fixed { position: fixed; top: 4px; left: 4px; background: #e11d48; color: white; padding: 4px 8px; }
</style>
<div class="scroller">
  <h3>Section A (sticky)</h3><p>One</p><p>Two</p><p>Three</p><p>Four</p>
  <h3>Section B (sticky)</h3><p>Five</p><p>Six</p><p>Seven</p><p>Eight</p>
</div>
<div class="wrap">relative parent<span class="abs">absolute child</span></div>
<div class="transformed">
  transformed parent
  <span class="fixed">fixed, but trapped by the transform</span>
</div>

=== hc66 | M | What is z-index?
**`z-index` controls the stacking order of overlapping elements: higher values appear in front. It only applies to positioned elements (relative, absolute, fixed, sticky) and to flex or grid items, and it only competes within the same stacking context, which is why a `z-index: 9999` sometimes still ends up behind something else.**

### Stacking contexts
A stacking context is an isolated layer; its children are stacked inside it and cannot escape above elements outside it. New stacking contexts are created by:
- a positioned element with a `z-index` other than `auto`,
- `opacity` below 1, `transform`, `filter`, `perspective`, `clip-path`, `mask`,
- `isolation: isolate`, `will-change` on those properties, `contain: paint`,
- `position: fixed` and `sticky`,
- flex/grid children with a `z-index`.

### Classic bug
A modal with `z-index: 1000` inside a header that has `transform` (or `z-index: 1`) can never appear above the page content that has `z-index: 2`, because the whole header context sits at layer 1.

### Best practices
- Use a small, documented scale (e.g. `--z-dropdown: 10; --z-sticky: 20; --z-modal: 100; --z-toast: 200`) instead of random large numbers.
- Use `isolation: isolate` on components to contain their internal z-indexes.
- Render modals and popovers in the **top layer** (`<dialog>.showModal()` or the `popover` attribute), which sits above everything regardless of z-index, or portal them to `<body>`.

### Interview tip
Explaining stacking contexts is the real answer here; "use a bigger number" is the wrong one.
--- code
<style>
  body { font-family: system-ui; }
  .box { position: absolute; width: 140px; height: 70px; padding: 6px; border: 2px solid #0b1020; color: white; }
  .stage { position: relative; height: 170px; }
  .a { background: #2b4bff; top: 0; left: 0; z-index: 1; }
  .b { background: #e11d48; top: 30px; left: 60px; z-index: 2; }
  /* Parent creates a stacking context at level 1 ... */
  .parent { position: absolute; top: 80px; left: 0; z-index: 1; }
  /* ... so z-index 999 inside it still loses to .c (z-index 2) */
  .child { background: #059669; top: 0; left: 120px; z-index: 999; }
  .c { background: #0b1020; top: 95px; left: 180px; z-index: 2; }
</style>
<div class="stage">
  <div class="box a">z 1</div>
  <div class="box b">z 2 (in front)</div>
  <div class="parent"><div class="box child">z 999 trapped in parent z 1</div></div>
  <div class="box c">z 2 wins</div>
</div>
<button onclick="document.querySelector('dialog').showModal()">Open top-layer dialog</button>
<dialog><p>Top layer beats every z-index.</p><form method="dialog"><button>Close</button></form></dialog>

=== hc67 | E | What is float?
**`float` pushes an element to the left or right of its container and lets inline content, such as text, wrap around it, like an image in a magazine article. It was originally designed for that wrapping effect, was misused for page layouts for years, and today is used almost only for wrapping text around media.**

### Values
`float: left`, `float: right`, `float: none`, and logical `inline-start` / `inline-end`.

### What a float does
- The element is taken out of normal flow (partially): following block boxes ignore it, but their **text and inline content wrap around it**.
- A floated element becomes block-level (`display` computes to block), so width and height apply.
- Its parent does not grow to contain it, which causes the famous **"collapsed parent"** problem.

### Containing floats
- `display: flow-root` on the parent (the modern, clean fix).
- `overflow: auto` or `hidden` on the parent (side effects: clipping, scrollbars).
- The old **clearfix** hack: `.clearfix::after { content: ""; display: table; clear: both; }`.

### Modern alternatives
For layouts (columns, card rows, navbars), use **Flexbox** or **Grid**. Floats remain useful for:
- wrapping text around images and pull quotes,
- `shape-outside` (e.g. `circle(50%)`) to wrap text along a curved shape,
- drop caps.

### Interview tip
Say clearly that floats are no longer a layout tool and mention `display: flow-root`; that signals current knowledge.
--- code
<style>
  body { font-family: system-ui; max-width: 520px; }
  .article { border: 2px solid #0b1020; padding: 12px; }
  .contain { display: flow-root; }   /* parent now wraps the float */
  .avatar {
    float: left;
    width: 90px; height: 90px;
    margin: 0 14px 6px 0;
    border-radius: 50%;
    shape-outside: circle(50%);      /* text follows the curve */
  }
  .quote { float: right; width: 40%; margin: 0 0 8px 12px; font-size: 1.1em; font-weight: 700; color: #2b4bff; }
</style>
<div class="article contain">
  <img class="avatar" src="https://picsum.photos/id/64/180/180" alt="Portrait of the author" width="90" height="90">
  <p class="quote">"Floats are for wrapping, not layout."</p>
  <p>Text flows around floated elements just like in a printed magazine. This paragraph keeps
  going so you can see how the lines wrap around the circular image on the left and the pull quote
  on the right. Thanks to display: flow-root, the bordered container grows to contain both floats.</p>
</div>

=== hc68 | E | What is clear?
**`clear` stops an element from sitting next to earlier floated elements: the element is moved down below any floats on the specified side. Values are `left`, `right`, `both`, `none`, plus logical `inline-start` and `inline-end`.**

### How it works
- `clear: left` moves the element below all **left** floats that come before it.
- `clear: right` does the same for right floats.
- `clear: both` moves it below every preceding float.
- It only affects floats earlier in the same block formatting context.

### Typical uses
- A footer or the next section that must start below a floated sidebar or image.
- The classic **clearfix** to make a parent contain its floats:
```
.clearfix::after { content: ""; display: block; clear: both; }
```
The pseudo-element sits at the end of the parent and clears the floats, forcing the parent's height to include them.

### Modern alternatives
- `display: flow-root` on the parent contains floats without any extra element or pseudo-element.
- Flexbox and Grid do not use floats at all; `float` and `clear` have no effect on flex and grid items.

### Interview tip
Explain the difference between *clearing* (moving one element below floats) and *containing* floats (making a parent wrap them), and name `flow-root` as the modern way to contain them.
--- code
<style>
  body { font-family: system-ui; max-width: 520px; }
  .box { border: 2px solid #0b1020; padding: 8px; margin-bottom: 12px; }
  .left { float: left; width: 110px; height: 60px; background: #dbeafe; margin-right: 8px; }
  .right { float: right; width: 110px; height: 90px; background: #fef9c3; margin-left: 8px; }
  .clear-left { clear: left; background: #dcfce7; }
  .clear-both { clear: both; background: #fee2e2; }
  .clearfix::after { content: ""; display: block; clear: both; }
</style>
<div class="box clearfix">
  <div class="left">float left</div>
  <div class="right">float right (taller)</div>
  <p>Regular text wraps between the floats.</p>
  <p class="clear-left">clear: left (moves below the left float only)</p>
  <p class="clear-both">clear: both (moves below every float)</p>
</div>
<p>The bordered box contains its floats thanks to the clearfix.</p>

=== hc69 | E | What is opacity?
**`opacity` sets how transparent an entire element is, from `1` (fully opaque) to `0` (fully transparent), and it applies to the element and all its children together. To make only a background or color translucent while keeping text solid, use an alpha color such as `rgb(0 0 0 / 50%)` instead.**

### Key behaviors
- **Affects everything inside:** text, images, borders and descendants. Children cannot be more opaque than their parent.
- **Creates a stacking context** when below 1, which can change how `z-index` behaves.
- **Elements at `opacity: 0` are still there:** they take up space, receive clicks and are read by screen readers. Add `pointer-events: none` or `inert` (and `aria-hidden` where appropriate), or use `visibility: hidden`.
- **Animates cheaply:** opacity changes can run on the compositor (GPU), making fades smooth without layout or paint. Together with `transform`, it is one of the two properties that are safe to animate.

### opacity vs alpha colors
```
.overlay { background: rgb(11 16 32 / 60%); }  /* only background is translucent */
.faded   { opacity: .6; }                       /* the whole element fades */
```

### Other transparency tools
- `filter: opacity(50%)`, similar but via filters.
- `color-mix(in srgb, red 50%, transparent)` for translucent colors from variables.
- `mix-blend-mode` and `backdrop-filter: blur()` for glass effects.

### Accessibility
Low opacity can drop text contrast below WCAG's 4.5:1; check contrast for disabled or muted states.
--- code
<style>
  body { font-family: system-ui; }
  .hero { position: relative; width: 320px; height: 140px; background: url(https://picsum.photos/id/1036/640/280) center / cover; }
  .alpha { position: absolute; inset: auto 0 0 0; padding: 10px; color: white; background: rgb(11 16 32 / 65%); }
  .faded { opacity: .5; }
  .card { padding: 10px; border: 2px solid #0b1020; margin: 10px 0; width: 300px; transition: opacity .3s; }
  .card:hover { opacity: .6; }
</style>
<div class="hero">
  <p class="alpha">Alpha background: the text stays fully opaque</p>
</div>
<div class="card faded">opacity: .5 fades the whole card, text included</div>
<div class="card">Hover me: opacity transitions are GPU friendly</div>

=== hc70 | E | What are background properties?
**Background properties paint the area behind an element's content and padding: a color, one or more images or gradients, and how those are sized, positioned, repeated, attached and clipped. They can be combined in the `background` shorthand, and several layers can be stacked with commas.**

### The properties
- `background-color`: a solid color, painted under all images.
- `background-image`: `url()`, `linear-gradient()`, `radial-gradient()`, `conic-gradient()`.
- `background-size`: `cover` (fill, may crop), `contain` (fit, may letterbox), or explicit sizes.
- `background-position`: `center`, `top right`, `50% 20%`.
- `background-repeat`: `repeat`, `no-repeat`, `repeat-x`, `space`, `round`.
- `background-attachment`: `scroll`, `fixed` (parallax-like; expensive and ignored on iOS), `local`.
- `background-origin` / `background-clip`: whether it starts or is painted under the border, padding or content. `background-clip: text` creates gradient text.

### Shorthand and layers
```
background: linear-gradient(rgb(0 0 0 / .5), transparent),
            url(hero.jpg) center / cover no-repeat, #0b1020;
```
The first layer listed is on top; the color goes on the last layer.

### Best practices
- Use background images only for decoration; content images belong in `<img>` with `alt` text.
- Always set a fallback `background-color` so text stays readable while the image loads.
- Make sure text over images has enough contrast (add a gradient overlay).
- LCP background images are discovered late; preload them or use `<img>` instead.
--- code
<style>
  body { font-family: system-ui; display: grid; gap: 12px; max-width: 420px; }
  .hero {
    height: 140px; color: white; padding: 12px;
    background:
      linear-gradient(to top, rgb(11 16 32 / .8), transparent 70%),
      url(https://picsum.photos/id/1039/840/280) center / cover no-repeat,
      #0b1020;
    display: flex; align-items: end; font-size: 1.4rem; font-weight: 800;
  }
  .dots { height: 60px; background: radial-gradient(#2b4bff 2px, transparent 2.5px) 0 0 / 16px 16px, #fff8ec; border: 2px solid #0b1020; }
  .conic { width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(#2b4bff 0 65%, #e5e7eb 0); }
  .text { font-size: 2rem; font-weight: 900; background: linear-gradient(90deg, #2b4bff, #e11d48); background-clip: text; color: transparent; }
</style>
<div class="hero">Gradient overlay + cover image</div>
<div class="dots"></div>
<div class="conic" role="img" aria-label="65 percent complete"></div>
<div class="text">Gradient text</div>

=== hc71 | E | What are color formats?
**CSS accepts colors as keywords (`tomato`), hex (`#2b4bff`, with optional alpha `#2b4bff80`), `rgb()`, `hsl()`, and modern perceptual spaces such as `oklch()`, `oklab()`, `lab()` and `lch()`, plus `color()` for wide-gamut spaces like Display P3. All modern functions accept an alpha channel with a slash: `rgb(0 0 0 / 50%)`.**

### The formats
- **Named:** `red`, `rebeccapurple`, `transparent`, `currentColor` (the element's text color).
- **Hex:** `#rgb`, `#rrggbb`, `#rrggbbaa`.
- **RGB:** `rgb(43 75 255)`, `rgb(43 75 255 / .5)` (the comma syntax and `rgba()` still work).
- **HSL:** `hsl(230 100% 58%)`: hue, saturation, lightness. Easy to reason about but not perceptually uniform.
- **OKLCH:** `oklch(55% 0.24 265)`: lightness, chroma, hue. Equal lightness values *look* equally light, so palettes and tints are predictable, and it can reach wide-gamut P3 colors.
- **`color(display-p3 1 0 0)`:** explicitly wide-gamut.

### Color functions
- `color-mix(in oklch, var(--brand), white 30%)`: tints and shades from one variable.
- **Relative color syntax:** `oklch(from var(--brand) calc(l + .1) c h)` derives a lighter version.
- `light-dark(#111, #eee)` picks a value based on the color scheme (with `color-scheme: light dark`).

### Practical advice
- Store brand colors as custom properties.
- Prefer OKLCH for design systems because generated scales stay consistent.
- Check contrast: 4.5:1 for body text, 3:1 for large text and UI components.
--- code
<style>
  :root { --brand: oklch(55% 0.24 265); color-scheme: light dark; }
  body { font-family: system-ui; display: flex; flex-wrap: wrap; gap: 8px; background: light-dark(#fff8ec, #0b1020); }
  .s { width: 120px; height: 60px; padding: 6px; font-size: 12px; color: white; border-radius: 8px; }
</style>
<div class="s" style="background: tomato">tomato</div>
<div class="s" style="background: #2b4bff">#2b4bff</div>
<div class="s" style="background: #2b4bff80">#2b4bff80 (alpha)</div>
<div class="s" style="background: rgb(43 75 255 / 70%)">rgb / 70%</div>
<div class="s" style="background: hsl(230 100% 58%)">hsl()</div>
<div class="s" style="background: var(--brand)">oklch()</div>
<div class="s" style="background: color-mix(in oklch, var(--brand), white 40%)">color-mix tint</div>
<div class="s" style="background: oklch(from var(--brand) calc(l - .15) c h)">relative: darker</div>
<div class="s" style="background: color(display-p3 1 0.2 0.3)">display-p3</div>

=== hc72 | E | What are font properties?
**Font properties control typography: `font-family` (which typeface, with fallbacks), `font-size`, `font-weight`, `font-style`, `line-height`, and related properties like `font-variant` and `font-feature-settings`. The `font` shorthand sets several at once, and `@font-face` loads custom web fonts.**

### The core properties
- `font-family: "Inter", system-ui, sans-serif;`: a list; the browser uses the first available. Always end with a generic family.
- `font-size`: use `rem` for accessibility (respects user settings); `clamp(1rem, 2.5vw, 1.5rem)` for fluid type.
- `font-weight`: `400` normal, `700` bold, any value from 1 to 1000 with variable fonts.
- `font-style`: `normal`, `italic`, `oblique 10deg`.
- `line-height`: unitless, like `1.5`.
- `font-variant-numeric: tabular-nums` aligns numbers in tables and timers.
- Shorthand: `font: italic 700 1.25rem/1.4 "Inter", sans-serif;` (size and family are required).

### Loading web fonts
```
@font-face {
  font-family: "Inter";
  src: url(/fonts/inter-var.woff2) format("woff2");
  font-weight: 100 900;
  font-display: swap;
}
```
- Use **WOFF2** and **variable fonts** (one file, every weight).
- `font-display: swap` shows fallback text immediately (no invisible text).
- Preload the critical font file; subset it to the characters you need.
- Tune the fallback with `size-adjust` to reduce layout shift (Next.js `next/font` does this automatically).

### System font stack
`font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;` costs zero bytes and looks native.
--- code
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 460px; }
  h1 { font: 800 clamp(1.5rem, 5vw, 2.5rem)/1.1 Georgia, "Times New Roman", serif; margin: 0 0 8px; }
  .lead { font-size: 1.125rem; font-style: italic; font-weight: 300; }
  .caps { font-variant: small-caps; letter-spacing: .05em; }
  .mono { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: .9rem; }
  table { font-variant-numeric: tabular-nums; }
  td { padding: 2px 10px; text-align: right; }
</style>
<h1>Typography matters</h1>
<p class="lead">Fluid headings, light italics and a system font stack.</p>
<p class="caps">Small caps for labels</p>
<p class="mono">const fast = "zero font bytes";</p>
<table>
  <tr><td>Lap 1</td><td>1:11.42</td></tr>
  <tr><td>Lap 2</td><td>1:09.87</td></tr>
</table>

=== hc73 | E | What is text-align?
**`text-align` sets the horizontal alignment of inline content (text, inline and inline-block elements) inside a block container. Values include `left`, `right`, `center`, `justify`, and the direction-aware `start` and `end`, which flip automatically for right-to-left languages.**

### Values
- **`start`** (default) / **`end`:** follow the writing direction; prefer them over `left`/`right` for internationalized sites.
- **`left`, `right`, `center`.**
- **`justify`:** stretches lines so both edges are flush. It can create uneven "rivers" of space in narrow columns; pair it with `hyphens: auto` and a `lang` attribute.
- **`match-parent`:** like `inherit`, but resolves `start`/`end` against the parent's direction.
- `text-align-last` controls the final line of justified text.

### What it does not do
- It does **not** center a block element itself; it aligns the content inside it. To center a block, use `margin-inline: auto` (with a width) or a flex/grid parent.
- It has no effect on vertical alignment; use `align-items` in flex/grid or `vertical-align` for inline/table cells.

### Common patterns
- Centering a button or image inside a block: `text-align: center` on the parent works because they are inline-level.
- Numeric table columns: `text-align: end` (plus `font-variant-numeric: tabular-nums`).
- Long body text is easiest to read left-aligned (start-aligned); centered text works only for short headings.

### Interview tip
Mention logical values (`start`/`end`) and the difference between aligning content and centering the box itself.
--- code
<style>
  body { font-family: system-ui; max-width: 420px; }
  p { border: 2px solid #0b1020; padding: 8px; }
  .start { text-align: start; }
  .center { text-align: center; }
  .end { text-align: end; }
  .justify { text-align: justify; hyphens: auto; }
  .box { width: 200px; background: #dbeafe; text-align: center; }
  .centered-block { margin-inline: auto; }    /* centers the box itself */
</style>
<p class="start">start (left in English)</p>
<p class="end" dir="rtl">end in a right-to-left paragraph: النهاية</p>
<p class="center">center <button>inline button centered too</button></p>
<p class="justify" lang="en">Justified text stretches every line except the last so that both the left and right edges line up neatly, like a newspaper column.</p>
<p class="box">text centered, box not centered</p>
<p class="box centered-block">text and box both centered</p>

=== hc74 | E | What is line-height?
**`line-height` sets the height of each line box, which controls the vertical spacing between lines of text. The best practice is a unitless value such as `1.5`, a multiplier of the element's own font size that children inherit as a ratio and recalculate for their own font size.**

### Value types
- **Unitless** (`1.5`): recommended. Each descendant computes it from *its* font size.
- **Length** (`24px`, `1.5rem`): fixed; inherited as that exact length, which can make large headings overlap.
- **Percentage / `em`** (`150%`, `1.5em`): computed once on the parent and inherited as a fixed length, with the same overlap problem.
- `normal`: about 1.2, depending on the font.

### Why unitless wins
```
body { font-size: 16px; line-height: 1.5em; }  /* computes 24px, inherited as 24px */
h1   { font-size: 48px; }                       /* 48px text on 24px lines: overlaps */
```
With `line-height: 1.5`, the `h1` gets 72px lines automatically.

### Good defaults
- Body text: **1.5 to 1.7** (WCAG 1.4.12 requires layouts to survive at least 1.5).
- Headings: **1.1 to 1.3**, because large text needs tighter leading.
- Buttons: `1` or `1.2`, with vertical padding for height.

### Related
- Half the extra space (leading) is added above and below the text, which is why text does not look perfectly centered in a box. The `text-box: trim-both cap alphabetic` property (newer browsers) trims that extra space.
- `lh` and `rlh` units equal one line height, useful for spacing.

### Interview tip
Explain the unitless inheritance difference with the heading example; it is the classic follow-up.
--- code
<style>
  body { font-family: system-ui; max-width: 380px; font-size: 16px; }
  .box { border: 2px solid #0b1020; padding: 8px; margin: 10px 0; }
  .tight { line-height: 1; }
  .comfy { line-height: 1.6; }
  .em-bug { line-height: 1.5em; }       /* inherited as 24px */
  .unitless { line-height: 1.5; }       /* inherited as a ratio */
  .em-bug h2, .unitless h2 { font-size: 36px; margin: 0; }
</style>
<p class="box tight">line-height: 1. Lines are cramped and harder to read when the paragraph wraps onto several lines.</p>
<p class="box comfy">line-height: 1.6. Comfortable spacing that is easy to read when the paragraph wraps onto several lines.</p>
<div class="box em-bug"><h2>1.5em: this big heading overlaps itself</h2></div>
<div class="box unitless"><h2>1.5 unitless: this heading scales correctly</h2></div>

=== hc75 | E | What is letter-spacing?
**`letter-spacing` adds or removes space between characters (tracking). Positive values spread letters apart and negative values pull them closer; using `em` units keeps the spacing proportional to the font size.**

### Values
- `normal` (default): the font's built-in spacing.
- A length: `0.05em`, `-0.02em`, `1px`. Prefer `em` so it scales with the text.

### Typography guidelines
- **ALL CAPS and small labels:** add a little space (`0.05em` to `0.1em`). Capitals are designed to sit next to lowercase letters and look cramped together.
- **Large display headings:** a slight negative value (`-0.01em` to `-0.03em`) often looks tighter and more polished; many design systems tighten headings this way.
- **Body text:** leave it at `normal`; the type designer already tuned it.
- **Monospace and code:** do not adjust.

### Accessibility
WCAG 1.4.12 (Text Spacing) requires that content still works when users increase letter spacing to 0.12em, so avoid fixed-height containers that clip text. Very tight spacing reduces legibility, especially for people with dyslexia.

### Related properties
- `word-spacing`: space between words.
- `font-kerning`: the font's pair-specific spacing (on by default).
- `text-transform: uppercase` plus letter-spacing is the standard "eyebrow label" style.

### Gotcha
Letter spacing is also added after the last character, which can make centered text look slightly off-center.
--- code
<style>
  body { font-family: system-ui; max-width: 440px; }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; font-weight: 700; color: #2b4bff; }
  .cramped { text-transform: uppercase; font-weight: 700; }
  h1 { font-size: 2.75rem; line-height: 1.05; margin: 4px 0; }
  .tight { letter-spacing: -0.03em; }
  .wide { letter-spacing: .3em; }
  .words { word-spacing: .6em; }
</style>
<p class="eyebrow">Interview prep</p>
<p class="cramped">Caps without letter-spacing look cramped</p>
<h1>Default heading</h1>
<h1 class="tight">Tightened heading</h1>
<p class="wide">Wide tracking</p>
<p class="words">Extra word spacing between words</p>
