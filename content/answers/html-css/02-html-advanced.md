=== hc27 | E | What is the <table> structure?
**An HTML table is built from `<table>`, optional `<caption>`, row groups (`<thead>`, `<tbody>`, `<tfoot>`), rows (`<tr>`) and cells: `<th>` for headers and `<td>` for data. Use tables only for tabular data (rows and columns that relate to each other), never for page layout.**

### The pieces
- `<caption>`: the table's title; it is the table's accessible name.
- `<thead>` / `<tbody>` / `<tfoot>`: group rows. Browsers can repeat `<thead>` on every printed page.
- `<tr>`: a row.
- `<th scope="col">` / `<th scope="row">`: header cells; `scope` tells assistive tech which cells they describe.
- `<td>`: data cells. `colspan` and `rowspan` merge cells.
- `<colgroup>` / `<col>`: style whole columns (width, background).

### Accessibility
Screen readers announce the matching header as users move between cells, but only if you use `<th>` and `scope`. For complex tables with multi-level headers, link cells to headers with `headers="id1 id2"`.

### Styling tips
- `border-collapse: collapse` merges double borders.
- `table-layout: fixed` makes column widths predictable and rendering faster.
- Wrap wide tables in a container with `overflow-x: auto` so they scroll on mobile instead of breaking the layout.
- Zebra striping: `tbody tr:nth-child(even)`.

### Interview tip
Mention that layout tables are an old anti-pattern; today Flexbox and Grid handle layout, and tables are reserved for data.
--- code
<style>
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; min-width: 420px; font-family: system-ui; }
  caption { font-weight: 700; padding: 8px; text-align: left; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
  thead th { background: #0b1020; color: white; }
  tbody tr:nth-child(even) { background: #f3f4f6; }
  tfoot td { font-weight: 700; }
</style>
<div class="wrap">
  <table>
    <caption>Q3 sales by region</caption>
    <thead>
      <tr><th scope="col">Region</th><th scope="col">July</th><th scope="col">August</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">North</th><td>$12,400</td><td>$13,050</td></tr>
      <tr><th scope="row">South</th><td>$9,800</td><td>$10,200</td></tr>
      <tr><th scope="row">West</th><td colspan="2">Data pending</td></tr>
    </tbody>
    <tfoot>
      <tr><th scope="row">Total</th><td>$22,200</td><td>$23,250</td></tr>
    </tfoot>
  </table>
</div>

=== hc28 | M | What is an <iframe>?
**An `<iframe>` (inline frame) embeds another HTML document inside the current page, for example a YouTube video, a map, a payment widget or a sandboxed preview. The embedded page has its own window, DOM, CSS and JavaScript, isolated from the parent by the same-origin policy.**

### Key attributes
- `src` / `srcdoc`: the URL to load, or inline HTML.
- `title`: required for accessibility; it names the frame for screen readers.
- `loading="lazy"`: defer offscreen frames.
- `sandbox`: applies strict restrictions (no scripts, forms, popups, same-origin access) that you selectively relax: `sandbox="allow-scripts allow-forms"`.
- `allow`: permissions policy for features such as `fullscreen`, `camera`, `clipboard-write`.
- `referrerpolicy`: controls what referrer the frame receives.

### Security
- **Embedding others:** always sandbox untrusted content. Never combine `allow-scripts` with `allow-same-origin` for same-origin content, because the frame could then remove its own sandbox.
- **Being embedded (clickjacking):** protect your own pages with `Content-Security-Policy: frame-ancestors 'self'` (or the older `X-Frame-Options: DENY`).

### Communication
Cross-origin frames talk to the parent only via `window.postMessage`; always check `event.origin` on the receiving side.

### Downsides
Each iframe is a full document, so they cost memory and load time, and they can hurt performance if overused.
--- code
<!doctype html>
<html lang="en">
<body style="font-family: system-ui">
  <h1>Sandboxed preview</h1>
  <iframe
    id="preview"
    title="User code preview"
    sandbox="allow-scripts"
    loading="lazy"
    style="width:100%;height:120px;border:2px solid #0b1020;border-radius:8px"
    srcdoc="<button onclick=&quot;parent.postMessage('clicked', '*')&quot;>Click inside the frame</button>"
  ></iframe>
  <p>Messages from frame: <output id="log">none</output></p>
  <script>
    let count = 0;
    window.addEventListener("message", (event) => {
      // A sandboxed srcdoc frame has an opaque origin, reported as "null".
      // For real third-party frames, compare against the exact origin you expect.
      if (event.source !== document.getElementById("preview").contentWindow) return;
      document.getElementById("log").textContent = `${event.data} (${++count})`;
    });
  </script>
</body>
</html>

=== hc29 | M | What is <canvas>?
**`<canvas>` is a bitmap drawing surface that you paint on with JavaScript, using the 2D context (`getContext("2d")`) or GPU APIs (WebGL, WebGPU). It is ideal for games, charts with thousands of points, image editing and visualizations, but its pixels have no DOM, so content is not accessible or searchable by default.**

### How it works
1. Add `<canvas width="300" height="150">` (the attributes set the drawing-buffer size).
2. Get a context: `const ctx = canvas.getContext("2d")`.
3. Draw imperatively: `fillRect`, `arc`, `lineTo`, `fillText`, `drawImage`.
4. To animate, clear and redraw each frame inside `requestAnimationFrame`.

### Canvas vs SVG
| | Canvas | SVG |
|---|---|---|
| Model | Immediate mode pixels | Retained DOM elements |
| Scales | Blurs when scaled | Crisp at any size |
| Many objects | Fast (10k+ points) | Slows with many nodes |
| Events/a11y | Manual hit-testing | Per-element events, accessible |

### Gotchas
- **HiDPI blur:** multiply the buffer by `devicePixelRatio` and scale the context.
- CSS width/height stretch the bitmap; they do not resize the buffer.
- Drawing cross-origin images without CORS "taints" the canvas, blocking `toDataURL`.
- Provide a text alternative (fallback content inside the tag, `role="img"` and `aria-label`).

### Performance
`OffscreenCanvas` moves drawing into a Web Worker, keeping the main thread free.
--- code
<canvas id="c" role="img" aria-label="Bouncing ball animation" style="width:300px;height:150px;border:2px solid #0b1020"></canvas>
<script>
  const canvas = document.getElementById("c");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 300 * dpr;   // sharp on retina screens
  canvas.height = 150 * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  let x = 40, y = 40, vx = 2.2, vy = 1.6;
  function frame() {
    ctx.clearRect(0, 0, 300, 150);
    ctx.fillStyle = "#2b4bff";
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b1020";
    ctx.font = "14px system-ui";
    ctx.fillText(`x: ${x.toFixed(0)}  y: ${y.toFixed(0)}`, 10, 140);
    x += vx; y += vy;
    if (x < 14 || x > 286) vx *= -1;
    if (y < 14 || y > 136) vy *= -1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script>

=== hc30 | M | What is <svg>?
**SVG (Scalable Vector Graphics) is an XML-based format for vector images that you can write inline in HTML with `<svg>`. Shapes are described mathematically, so they stay crisp at any size, and because each shape is a DOM element, SVG can be styled with CSS, animated, scripted and made accessible.**

### Core building blocks
- `viewBox="0 0 24 24"`: the internal coordinate system; combined with CSS width/height it makes the graphic scale.
- Shapes: `<rect>`, `<circle>`, `<line>`, `<polyline>`, `<polygon>`, and the powerful `<path d="...">`.
- `<g>` groups elements; `<defs>` + `<use>` reuse them; `<symbol>` builds icon sprites.
- `<text>` renders real, selectable text.
- Gradients, masks, clip paths and filters.

### Ways to use SVG
- **Inline `<svg>`:** full CSS/JS control, `fill="currentColor"` inherits text color (perfect for icons).
- **`<img src="logo.svg">`:** cached, simple, but no styling from the page.
- **CSS `background-image`:** decorative only.

### Accessibility
- Meaningful graphic: `role="img"` plus `aria-labelledby` pointing at a `<title>` inside the SVG.
- Decorative icon: `aria-hidden="true"` (and give the button its own label).

### When to choose SVG
Icons, logos, illustrations, simple charts and anything that must scale. For tens of thousands of moving points, prefer `<canvas>`.

### Security
SVG files can contain scripts; sanitize user-uploaded SVGs before inlining them.
--- code
<style>
  .icon { width: 48px; height: 48px; color: #2b4bff; transition: color .2s, transform .2s; }
  button:hover .icon { color: #e11d48; transform: rotate(-10deg) scale(1.1); }
  button { display: inline-flex; align-items: center; gap: 8px; font: 600 16px system-ui; padding: 8px 14px; }
</style>

<button type="button">
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>
  </svg>
  Add to favorites
</button>

<svg viewBox="0 0 200 80" width="300" role="img" aria-labelledby="chartTitle">
  <title id="chartTitle">Weekly visits rising from 20 to 70</title>
  <polyline points="10,70 50,55 90,60 130,35 170,20" fill="none" stroke="#0b1020" stroke-width="3"/>
  <circle cx="170" cy="20" r="5" fill="#ffd84d" stroke="#0b1020" stroke-width="2"/>
</svg>

=== hc31 | E | What is accessibility (a11y)?
**Accessibility (a11y, "a" + 11 letters + "y") means building websites that everyone can perceive, understand, navigate and interact with, including people who use screen readers, keyboards only, voice control, magnification, or who have color blindness, cognitive or motor disabilities. The standard is WCAG (Web Content Accessibility Guidelines), currently 2.2, with level AA as the usual legal target.**

### The four WCAG principles (POUR)
- **Perceivable:** text alternatives (`alt`), captions, sufficient color contrast (4.5:1 for body text).
- **Operable:** everything works with a keyboard, visible focus, no keyboard traps, enough time.
- **Understandable:** clear labels, predictable behavior, helpful error messages.
- **Robust:** valid, semantic markup that assistive technologies can interpret.

### High-impact practices
- Use semantic HTML first: `<button>`, `<a href>`, `<label>`, headings in order, landmarks.
- Every form control has a visible `<label>`.
- Do not convey information by color alone.
- Keep a visible `:focus-visible` outline.
- Respect `prefers-reduced-motion`.
- Add a "Skip to content" link.

### Testing
Automated tools (axe, Lighthouse) find roughly a third of issues. Also test with a keyboard (Tab, Shift+Tab, Enter, Space, Esc) and a screen reader (VoiceOver, NVDA).

### Why it matters
It is a legal requirement in many places (ADA, the European Accessibility Act), it improves SEO and usability for everyone, and roughly 1 in 6 people live with a disability.
--- code
<style>
  body { font-family: system-ui; }
  .skip { position: absolute; left: -999px; }
  .skip:focus { left: 8px; top: 8px; background: #ffd84d; padding: 8px; }
  :focus-visible { outline: 3px solid #2b4bff; outline-offset: 2px; }
  .error { color: #b00020; }
</style>
<a class="skip" href="#main">Skip to content</a>
<nav aria-label="Primary"><a href="#">Home</a> · <a href="#">Pricing</a></nav>
<main id="main">
  <h1>Create account</h1>
  <form novalidate>
    <label for="email">Email</label>
    <input id="email" type="email" autocomplete="email" required aria-describedby="email-err">
    <p id="email-err" class="error" aria-live="polite"></p>
    <button>Sign up</button>
  </form>
  <img src="https://picsum.photos/200/80" alt="Team celebrating a product launch" width="200" height="80">
</main>
<script>
  document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("email");
    const msg = input.validity.valid ? "" : "Error: enter a valid email address.";
    document.getElementById("email-err").textContent = msg; // announced by screen readers
    input.setAttribute("aria-invalid", String(!input.validity.valid));
  });
</script>

=== hc32 | M | What is ARIA?
**ARIA (Accessible Rich Internet Applications) is a set of HTML attributes, `role`, `aria-*` states and properties, that tell assistive technologies what a custom widget is, what state it is in and how it relates to other elements. ARIA changes only the accessibility tree; it adds no behavior, focus or keyboard support.**

### Three kinds of attributes
- **Roles:** what something is: `role="dialog"`, `"tablist"`, `"tab"`, `"alert"`, `"switch"`.
- **States:** values that change: `aria-expanded`, `aria-checked`, `aria-selected`, `aria-disabled`, `aria-busy`.
- **Properties:** relationships and descriptions: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-live`.

### The first rule of ARIA
**Do not use ARIA if a native element does the job.** `<button>` already has the role, focusability and Enter/Space handling; `<div role="button">` needs all of that added manually. "No ARIA is better than bad ARIA": incorrect roles actively mislead screen reader users.

### When ARIA is the right tool
- Custom widgets with no native equivalent: tabs, comboboxes, tree views.
- Communicating dynamic state: `aria-expanded` on a disclosure button.
- Live regions: `aria-live="polite"` for toast messages and async results.
- Hiding decorative content: `aria-hidden="true"`.

### Remember
If you add a role, you must implement the matching keyboard pattern. The WAI-ARIA Authoring Practices Guide (APG) documents the expected behavior for each widget.
--- code
<style>
  [role="tab"][aria-selected="true"] { background: #0b1020; color: white; }
  [role="tab"] { font: 600 15px system-ui; padding: 6px 12px; }
  [role="tabpanel"] { border: 2px solid #0b1020; padding: 12px; margin-top: 6px; font-family: system-ui; }
</style>
<div role="tablist" aria-label="Plan details">
  <button role="tab" id="t1" aria-selected="true" aria-controls="p1">Features</button>
  <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Pricing</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1">Unlimited projects and 24/7 support.</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" hidden>$12 per user per month.</div>
<script>
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;                       // roving tabindex
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {            // arrow keys, per the APG tabs pattern
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
    });
  });
</script>

=== hc33 | E | What is aria-label?
**`aria-label` gives an element an accessible name as a string, which screen readers announce instead of (or in the absence of) visible text. Use it when an interactive element has no visible text label, such as an icon-only button, a search field without a visible label, or a second `<nav>` that needs distinguishing.**

### How accessible names are chosen (simplified priority)
1. `aria-labelledby` (references other elements' text)
2. `aria-label`
3. Native labeling: `<label for>`, `alt`, `<caption>`, `<legend>`, or the element's own text content
4. `title` (last resort)

So `aria-label` overrides the visible text of a button, which can confuse voice-control users if the two differ.

### Good uses
- `<button aria-label="Close dialog">✕</button>`
- `<nav aria-label="Breadcrumb">` and `<nav aria-label="Primary">` to tell landmarks apart.
- `<input type="search" aria-label="Search products">` when the design has no visible label (a visible `<label>` is still better).

### Pitfalls
- **Prefer visible text.** Labels help everyone, not just screen reader users.
- If visible text exists, the accessible name should contain it (WCAG 2.5.3 Label in Name): visible "Buy" should not be labeled "Purchase item".
- It does not work reliably on non-interactive elements without a role, like a plain `<div>` or `<span>`.
- It is not translated by some auto-translation tools.
- Use `aria-labelledby` when the label already exists on screen, and `aria-describedby` for extra hints.
--- code
<style>
  body { font-family: system-ui; }
  .icon-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #0b1020; font-size: 18px; }
</style>

<nav aria-label="Primary"><a href="#">Home</a> · <a href="#">Docs</a></nav>
<nav aria-label="Breadcrumb"><a href="#">Docs</a> › <span aria-current="page">ARIA</span></nav>

<!-- Icon-only buttons need an accessible name -->
<button class="icon-btn" aria-label="Close dialog">✕</button>
<button class="icon-btn" aria-label="Add to favorites">♥</button>

<!-- Prefer aria-labelledby when the label is already visible -->
<h2 id="billing">Billing address</h2>
<section aria-labelledby="billing">
  <input type="search" aria-label="Search addresses">
</section>

<script>
  // The accessibility tree uses the aria-label, not the "✕" glyph
  for (const b of document.querySelectorAll(".icon-btn")) {
    console.log(b.textContent, "->", b.getAttribute("aria-label"));
  }
</script>

=== hc34 | E | What is SEO in HTML?
**SEO (Search Engine Optimization) in HTML means writing markup that search engines can crawl, understand and present well: a unique `<title>` and meta description, semantic structure with one clear `<h1>`, descriptive links and `alt` text, canonical URLs, structured data, and fast, mobile-friendly pages.**

### On-page essentials
- `<title>` and `<meta name="description">`: unique per page; they form your search snippet.
- **Headings:** one `<h1>` describing the page, then a logical `<h2>`/`<h3>` outline.
- **Semantic elements:** `<main>`, `<article>`, `<nav>` help crawlers find the core content.
- **Links:** real `<a href>` with descriptive text ("pricing plans", not "click here"); crawlers do not follow `onclick` handlers.
- **Images:** meaningful `alt`, explicit `width`/`height`, modern formats.
- `<html lang>` and `hreflang` alternates for multilingual sites.

### Technical tags
- `<link rel="canonical">` resolves duplicate URLs.
- `<meta name="robots" content="noindex">` keeps pages out of results.
- **Open Graph / Twitter tags** control social previews (not ranking, but click-through).
- **JSON-LD structured data** (`<script type="application/ld+json">`) enables rich results: breadcrumbs, articles, products, FAQs.

### Beyond markup
Server-rendered or statically generated HTML (rather than content rendered only on the client), Core Web Vitals (LCP, INP, CLS), `sitemap.xml`, `robots.txt` and HTTPS all influence how well pages are indexed.

### Interview tip
Explain that search engines reward helpful content first; HTML makes that content discoverable.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trail Running Shoes for Women | Acme Outdoors</title>
  <meta name="description" content="Lightweight, waterproof trail running shoes for women. Free returns and 2-day shipping.">
  <link rel="canonical" href="https://acme.example/shoes/trail-women">
  <meta property="og:title" content="Women's Trail Running Shoes">
  <meta property="og:image" content="https://acme.example/og/trail-women.jpg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Acme Trail Runner",
    "offers": { "@type": "Offer", "price": "129.00", "priceCurrency": "USD" }
  }
  </script>
</head>
<body>
  <main>
    <h1>Women's trail running shoes</h1>
    <img src="https://picsum.photos/300/150" alt="Blue Acme Trail Runner shoe on a rocky path" width="300" height="150">
    <p>Compare our <a href="/shoes/trail-women/sizes">size guide</a> before ordering.</p>
  </main>
</body>
</html>

=== hc35 | E | What is a meta description?
**A meta description is a short summary of a page written in `<meta name="description" content="...">` inside `<head>`. It is not a direct ranking factor, but search engines often display it as the snippet under your title, so a clear, compelling description improves click-through rate.**

### Writing a good one
- **Length:** about 120 to 160 characters; longer text is truncated (truncation depends on pixel width, not character count).
- **Unique per page.** Duplicates across pages waste the opportunity and may be ignored.
- **Summarize the page honestly** and include the main topic naturally; matching query words are often bolded in results.
- **Add a reason to click:** a benefit, a number or a call to action ("Free shipping", "Updated for 2026").
- Avoid quotation marks that end the attribute early, and avoid keyword stuffing.

### What search engines do with it
Google rewrites the snippet in many cases, choosing text from the page that better matches the query. A well-written description still increases the chance yours is used.

### Related tags
- `og:description` / `twitter:description` control link previews in social apps and chat; they can reuse the same text.
- In frameworks: Next.js `export const metadata = { description }`, or React 19 rendering `<meta name="description">` directly in a component.

### Interview tip
Mention the distinction: the `<title>` influences ranking and is the headline; the description mainly influences whether people click.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>How to Make Cold Brew Coffee at Home | Bean Lab</title>
  <meta name="description" content="Make smooth cold brew in 3 steps with a jar and a filter. Ratios, steep times and storage tips, tested by baristas.">
  <meta property="og:description" content="Make smooth cold brew in 3 steps with a jar and a filter.">
</head>
<body>
  <h1>How to make cold brew coffee at home</h1>
  <p id="out"></p>
  <script>
    const d = document.querySelector('meta[name="description"]').content;
    document.getElementById("out").textContent =
      `Description is ${d.length} characters` + (d.length > 160 ? " (may be truncated)" : " (good length)");
  </script>
</body>
</html>

=== hc36 | E | What is a favicon?
**A favicon is the small icon that represents a site in browser tabs, bookmarks, history, search results and home screens. You declare it with `<link rel="icon">` in `<head>`; browsers also look for `/favicon.ico` at the site root automatically.**

### A modern, minimal setup
- `favicon.ico` (32×32) at the root for legacy browsers and tools that request it directly.
- **An SVG icon** (`<link rel="icon" href="/icon.svg" type="image/svg+xml">`): scales perfectly and can even adapt to dark mode with a `prefers-color-scheme` media query inside the SVG.
- `apple-touch-icon` (180×180 PNG) for iOS home screens.
- **A web app manifest** (`manifest.webmanifest`) with 192×192 and 512×512 PNG icons for Android and installable PWAs, including a maskable icon.

### Tips
- Design for tiny sizes: a bold, simple mark, not a full logo with text.
- Give the SVG favicon padding and good contrast on both light and dark tab bars.
- Browsers cache favicons aggressively; change the file name or add a query string when you update it.
- Google Search shows favicons in mobile results, so it must be crawlable and at least 48×48.

### In frameworks
In the Next.js App Router, placing `icon.svg`, `favicon.ico` or `apple-icon.png` in `app/` generates the right `<link>` tags automatically.

### Interview tip
Mention that the favicon contributes to brand recognition among many open tabs, and that the SVG plus ICO plus apple-touch-icon trio covers nearly every platform.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Favicon demo</title>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
</head>
<body style="font-family: system-ui">
  <p>Watch the tab icon change:</p>
  <button id="alert">Show unread badge</button>
  <script>
    // Swap the favicon at runtime (e.g. to show a notification dot)
    const svg = (dot) => `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
         <rect width="64" height="64" rx="14" fill="#2b4bff"/>
         ${dot ? '<circle cx="50" cy="14" r="12" fill="#e11d48"/>' : ""}
       </svg>`)}`;
    const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    link.href = svg(false);
    document.getElementById("alert").onclick = () => (link.href = svg(true));
  </script>
</body>
</html>

=== hc37 | E | What is a data-* attribute?
**`data-*` attributes let you store custom, private data on any HTML element, for example `data-user-id="42"` or `data-state="open"`. JavaScript reads them through the `element.dataset` object (with names converted to camelCase), and CSS can target them with attribute selectors.**

### Rules
- The name after `data-` must be lowercase and may contain hyphens: `data-product-sku`.
- Values are always **strings**; convert numbers and booleans yourself (`Number(el.dataset.price)`).
- `el.dataset.productSku` maps to `data-product-sku` (hyphens become camelCase).
- Setting `el.dataset.state = "open"` writes the attribute; `delete el.dataset.state` removes it.

### Common uses
- Attach IDs or config to elements for event delegation: one click listener on a list reads `event.target.closest("[data-id]")`.
- Styling hooks for state: `[data-state="open"] { ... }` (used heavily by Radix UI and shadcn/ui).
- Test selectors: `data-testid` for stable end-to-end tests.
- Passing server-rendered config to scripts.

### What not to do
- Do not store sensitive data; it is visible in the page source.
- Do not use them for data that has a proper attribute or element (`value`, `<time datetime>`, ARIA states).
- Avoid storing large JSON blobs; use a `<script type="application/json">` block instead.

### Interview tip
Mention event delegation with `dataset`; it shows you know how to scale event handling without one listener per element.
--- code
<style>
  body { font-family: system-ui; }
  li { padding: 6px; cursor: pointer; }
  li[data-in-stock="false"] { color: #9ca3af; text-decoration: line-through; }
  li[data-selected] { background: #ffd84d; }
</style>
<ul id="products">
  <li data-id="p1" data-price="19.99" data-in-stock="true">Mug</li>
  <li data-id="p2" data-price="34.50" data-in-stock="false">Hoodie</li>
  <li data-id="p3" data-price="8.00" data-in-stock="true">Sticker pack</li>
</ul>
<p id="out">Click a product</p>
<script>
  // One listener for every item (event delegation)
  document.getElementById("products").addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    document.querySelectorAll("[data-selected]").forEach((el) => delete el.dataset.selected);
    li.dataset.selected = "";                          // adds data-selected=""
    const price = Number(li.dataset.price);            // strings -> number
    const inStock = li.dataset.inStock === "true";     // data-in-stock -> inStock
    document.getElementById("out").textContent =
      `${li.dataset.id}: $${price.toFixed(2)} ${inStock ? "available" : "sold out"}`;
  });
</script>

=== hc38 | M | What is contenteditable?
**`contenteditable` is a global attribute that makes an element's content directly editable by the user, like a mini text editor in the page. It is the foundation of rich-text editors such as Notion, Google Docs-style tools, and libraries like ProseMirror, Lexical, Slate and TipTap.**

### Values
- `contenteditable="true"` (or empty): fully editable, including pasted formatting.
- `contenteditable="plaintext-only"`: editable but strips rich formatting (now supported in all major browsers).
- `contenteditable="false"`: makes a region inside an editable area read-only.

### Working with it
- Listen to `input` events and read `el.textContent` or `el.innerHTML`.
- `beforeinput` lets you inspect or cancel an edit before it happens (`e.inputType`).
- The Selection and Range APIs control the caret and selected text.
- `document.execCommand` is deprecated; editors implement formatting themselves.

### Pitfalls
- **Security:** pasted HTML can include scripts or event handlers. Sanitize (e.g. DOMPurify) before saving or rendering it elsewhere.
- **Inconsistent markup** across browsers (`<div>` vs `<br>` on Enter), which is why real editors use a document model.
- **Accessibility:** add `role="textbox"`, `aria-multiline="true"` and a label so assistive tech knows it is an input.
- **Not a form control:** it is not submitted with forms; copy its value into a hidden input yourself.

### Interview tip
Say you would reach for a battle-tested editor library for anything beyond simple inline editing.
--- code
<style>
  body { font-family: system-ui; }
  .editor { border: 2px solid #0b1020; border-radius: 8px; padding: 10px; min-height: 60px; }
  .editor:focus { outline: 3px solid #2b4bff; }
</style>
<label id="lbl">Bio (plain text only)</label>
<div class="editor" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-labelledby="lbl">
  Frontend developer who loves accessible UI.
</div>
<p>Characters: <output id="count">0</output></p>
<script>
  const editor = document.querySelector(".editor");
  const update = () => (document.getElementById("count").textContent = editor.textContent.trim().length);
  editor.addEventListener("input", update);
  // Block edits beyond 140 characters before they happen
  editor.addEventListener("beforeinput", (e) => {
    if (e.inputType.startsWith("insert") && editor.textContent.length >= 140) e.preventDefault();
  });
  update();
</script>

=== hc39 | M | What is draggable?
**`draggable` is a global attribute that marks an element as draggable with the native HTML Drag and Drop API. Links, images and selected text are draggable by default; for other elements, set `draggable="true"` and handle the drag events to move data to a drop target.**

### The event flow
- On the dragged element: `dragstart` (set data with `e.dataTransfer.setData`), `drag`, `dragend`.
- On the drop target: `dragenter`, `dragover`, `dragleave`, `drop`.
- **Crucial detail:** a target accepts drops only if you call `e.preventDefault()` in `dragover`.
- In `drop`, read the data with `e.dataTransfer.getData("text/plain")`.

### DataTransfer
- Carries typed data (`text/plain`, `text/uri-list`, custom types).
- `effectAllowed` / `dropEffect`: copy, move or link cursors.
- `setDragImage()` customizes the ghost image.
- Dropped files arrive in `e.dataTransfer.files`, which powers file-upload drop zones.

### Limitations
- **Does not work on touch screens** in most mobile browsers.
- **Not keyboard accessible.** You must provide an alternative (move up/down buttons, or a select menu).
- Styling and animation during the drag are limited.

That is why apps often use libraries like dnd-kit or Pragmatic drag and drop, which use pointer events and add keyboard and screen reader support.

### Interview tip
Mention the `dragover` + `preventDefault` requirement and the accessibility alternative; both are common follow-ups.
--- code
<style>
  body { font-family: system-ui; display: flex; gap: 16px; }
  .col { width: 150px; min-height: 120px; border: 2px dashed #0b1020; border-radius: 8px; padding: 8px; }
  .col.over { background: #fef9c3; }
  .card { background: #2b4bff; color: white; padding: 6px; border-radius: 6px; margin: 4px 0; cursor: grab; }
</style>
<div class="col" data-col="todo"><b>To do</b>
  <div class="card" draggable="true" id="c1">Write tests</div>
  <div class="card" draggable="true" id="c2">Fix CLS bug</div>
</div>
<div class="col" data-col="done"><b>Done</b></div>
<script>
  document.querySelectorAll(".card").forEach((card) =>
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      e.dataTransfer.effectAllowed = "move";
    })
  );
  document.querySelectorAll(".col").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); }); // allow drop
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("over");
      col.append(document.getElementById(e.dataTransfer.getData("text/plain")));
    });
  });
</script>

=== hc40 | E | What is lazy loading (loading='lazy')?
**Lazy loading defers loading offscreen images and iframes until the user scrolls near them. Adding `loading="lazy"` to `<img>` or `<iframe>` enables it natively in all modern browsers, cutting initial page weight, saving bandwidth and speeding up the first render, with no JavaScript needed.**

### How it works
The browser keeps a distance threshold (roughly 1250 to 2500px below the viewport, depending on connection speed) and starts fetching an element when it comes within that range, so it is usually loaded before it becomes visible.

### Rules for using it well
- **Never lazy-load the LCP image** (the hero/banner image above the fold). Doing so delays Largest Contentful Paint. Use `loading="eager"` (the default) and `fetchpriority="high"` on it instead.
- **Always set `width` and `height`** (or CSS `aspect-ratio`) so lazy images reserve space and do not cause layout shift (CLS).
- Use it for below-the-fold images, galleries, comment avatars and embedded videos or maps.
- Pair with `decoding="async"` to keep image decoding off the critical path.

### Beyond images
- Lazy-load components in JavaScript with dynamic `import()` (React `lazy`, Next.js `dynamic`).
- `IntersectionObserver` gives custom control, for example infinite scroll or lazy background images.
- `content-visibility: auto` in CSS skips rendering offscreen sections.

### Interview tip
The most common mistake is putting `loading="lazy"` on every image, including the hero; call that out.
--- code
<style>
  body { font-family: system-ui; }
  img { display: block; width: 100%; max-width: 480px; height: auto; margin-bottom: 16px; border-radius: 8px; }
  .spacer { height: 1400px; background: linear-gradient(#fff8ec, #dbeafe); }
</style>

<!-- Above the fold: load immediately with high priority (likely the LCP element) -->
<img src="https://picsum.photos/id/1018/960/400" width="960" height="400"
     alt="Mountain valley at sunrise" fetchpriority="high">

<div class="spacer">Scroll down…</div>

<!-- Below the fold: fetched only when the user scrolls near it -->
<img src="https://picsum.photos/id/1025/960/400" width="960" height="400"
     alt="Pug wrapped in a blanket" loading="lazy" decoding="async">
<iframe src="https://example.com" title="Example embed" loading="lazy" width="480" height="200"></iframe>

<script>
  const lazy = document.querySelector('img[loading="lazy"]');
  lazy.addEventListener("load", () => console.log("Lazy image loaded at scrollY =", Math.round(scrollY)));
</script>

=== hc41 | M | What is the <picture> tag?
**`<picture>` wraps one or more `<source>` elements and a fallback `<img>`, letting the browser choose the best image file for the situation: a modern format it supports (AVIF, WebP), or a different crop for a different screen size or color scheme (art direction). The `<img>` inside is required and is what actually renders.**

### Two main use cases
1. **Format switching:** offer AVIF, then WebP, then JPEG. The browser picks the first `<source>` whose `type` it supports.
2. **Art direction:** show a tightly cropped portrait image on phones and a wide landscape image on desktops, chosen by each `<source>`'s `media` query.

### How selection works
- `<source>` elements are evaluated in order; the **first match wins**.
- Each `<source>` can have `srcset`, `sizes`, `media`, `type`, and `width`/`height` (useful when crops have different aspect ratios).
- `alt`, `loading`, `decoding`, `fetchpriority` and CSS classes go on the `<img>`.
- `media="(prefers-color-scheme: dark)"` can swap in a dark-mode image.

### When you do not need it
If you only need different resolutions of the same image, `<img srcset sizes>` alone is enough. Use `<picture>` for formats or art direction.

### In frameworks
Next.js `<Image>` serves modern formats automatically through its image optimizer, so you rarely write `<picture>` by hand there.
--- code
<style>
  body { font-family: system-ui; }
  img { width: 100%; max-width: 640px; height: auto; border-radius: 8px; }
</style>
<picture>
  <!-- Art direction: square crop on narrow screens -->
  <source media="(max-width: 600px)"
          srcset="https://picsum.photos/id/1015/600/600"
          width="600" height="600">
  <!-- Modern format first, when supported -->
  <source type="image/webp"
          srcset="https://picsum.photos/id/1015/1280/640.webp">
  <!-- Fallback, and the element that actually renders -->
  <img src="https://picsum.photos/id/1015/1280/640"
       width="1280" height="640"
       alt="River winding through a forested valley"
       decoding="async">
</picture>
<p id="out"></p>
<script>
  const img = document.querySelector("picture img");
  const show = () => (document.getElementById("out").textContent = "Browser chose: " + img.currentSrc);
  img.complete ? show() : img.addEventListener("load", show);
  addEventListener("resize", () => setTimeout(show, 300));
</script>

=== hc42 | M | What are responsive images?
**Responsive images are techniques that serve each device an image file sized and formatted appropriately for its screen, so phones do not download huge desktop images and high-density displays still look sharp. In HTML this is done with `srcset`, `sizes`, `<picture>`, and modern formats, plus CSS that lets the image scale fluidly.**

### The toolkit
- **Fluid CSS:** `img { max-width: 100%; height: auto; }` so images shrink with their container.
- **Resolution switching:** `<img srcset="a-480.jpg 480w, a-960.jpg 960w" sizes="(max-width: 600px) 100vw, 50vw">`; the browser picks the smallest adequate file.
- **Density switching** for fixed-size images: `srcset="logo.png 1x, logo@2x.png 2x"`.
- **Art direction and formats:** `<picture>` with `<source media>` and `<source type="image/avif">`.
- **Prevent layout shift:** always set `width` and `height` (the browser derives the aspect ratio).
- **Loading strategy:** `loading="lazy"` below the fold, `fetchpriority="high"` for the LCP image.

### Why it matters
Images are often the largest bytes on a page. Serving a 2400px JPEG to a 375px phone wastes data and slows Largest Contentful Paint.

### Generating the variants
Image CDNs (Cloudinary, imgix) and frameworks (Next.js `<Image>`, Astro `<Image>`) create the different sizes and formats automatically from one source image.

### Interview tip
Explain that `sizes` tells the browser how wide the image will display *before* CSS loads, which is why it is needed for `w` descriptors.
--- code
<style>
  body { font-family: system-ui; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  img { width: 100%; height: auto; border-radius: 8px; display: block; }
</style>
<div class="grid">
  <img
    src="https://picsum.photos/id/1043/800/500"
    srcset="https://picsum.photos/id/1043/400/250 400w,
            https://picsum.photos/id/1043/800/500 800w,
            https://picsum.photos/id/1043/1600/1000 1600w"
    sizes="(max-width: 520px) 100vw, 50vw"
    width="800" height="500"
    alt="Sunset over a coastal town"
    loading="lazy" decoding="async">
  <img
    src="https://picsum.photos/id/1050/800/500"
    srcset="https://picsum.photos/id/1050/400/250 400w,
            https://picsum.photos/id/1050/800/500 800w,
            https://picsum.photos/id/1050/1600/1000 1600w"
    sizes="(max-width: 520px) 100vw, 50vw"
    width="800" height="500"
    alt="Waves breaking on rocks"
    loading="lazy" decoding="async">
</div>
<p id="out"></p>
<script>
  addEventListener("load", () => {
    document.getElementById("out").textContent =
      `DPR ${devicePixelRatio}: loaded ` + [...document.images].map((i) => i.currentSrc.split("/").slice(-2).join("/")).join(", ");
  });
</script>

=== hc43 | M | What is srcset?
**`srcset` is an attribute on `<img>` and `<source>` that lists several candidate files for the same image so the browser can pick the best one for the device's viewport width and pixel density. It comes in two forms: width descriptors (`480w`), used together with `sizes`, and density descriptors (`2x`).**

### Width descriptors (`w`) + `sizes`
```
srcset="card-400.jpg 400w, card-800.jpg 800w, card-1200.jpg 1200w"
sizes="(max-width: 600px) 100vw, 33vw"
```
- `w` is the file's real pixel width.
- `sizes` describes how wide the image will be *displayed* at different breakpoints. The browser multiplies that by the device pixel ratio and picks the smallest file that is large enough.
- Without `sizes`, the browser assumes `100vw`, often downloading too large a file.
- `sizes="auto"` (with `loading="lazy"`) lets supporting browsers use the real layout width.

### Density descriptors (`x`)
```
srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
```
Best for images with a fixed CSS size, such as logos and avatars.

### Behavior details
- The choice is a hint: browsers may pick a smaller file on slow connections or reuse a larger one already cached.
- `src` remains the fallback for very old browsers.
- Check the result with `img.currentSrc`.
- You cannot mix `w` and `x` descriptors in one `srcset`.

### Interview tip
Being able to explain how `sizes` and DPR combine to choose a file is what separates a solid answer from a vague one.
--- code
<style>
  body { font-family: system-ui; }
  .avatar { width: 64px; height: 64px; border-radius: 50%; }
  .hero { width: 100%; max-width: 720px; height: auto; border-radius: 8px; }
</style>

<!-- Fixed display size: density descriptors -->
<img class="avatar" alt="Avatar of Ada"
     src="https://picsum.photos/id/64/64/64"
     srcset="https://picsum.photos/id/64/64/64 1x,
             https://picsum.photos/id/64/128/128 2x,
             https://picsum.photos/id/64/192/192 3x">

<!-- Fluid size: width descriptors + sizes -->
<img class="hero" alt="City skyline at night" width="1200" height="600"
     src="https://picsum.photos/id/1067/800/400"
     srcset="https://picsum.photos/id/1067/480/240 480w,
             https://picsum.photos/id/1067/800/400 800w,
             https://picsum.photos/id/1067/1200/600 1200w"
     sizes="(max-width: 760px) 100vw, 720px">

<pre id="out"></pre>
<script>
  addEventListener("load", () => {
    document.getElementById("out").textContent = [...document.images]
      .map((i) => `${i.alt}: ${i.currentSrc} (DPR ${devicePixelRatio})`).join("\n");
  });
</script>

=== hc44 | E | What is the <video> tag?
**`<video>` embeds video playback natively in the page, with built-in controls, captions, a poster image and a JavaScript API (`play()`, `pause()`, `currentTime`), with no plugin needed. You can provide several `<source>` formats and `<track>` elements for captions and subtitles.**

### Key attributes
- `controls`: show the browser's play/pause, volume and fullscreen UI.
- `poster`: an image shown before playback.
- `autoplay`: only allowed by browsers when combined with `muted`; add `playsinline` for iOS.
- `loop`, `muted`, `preload` (`none`, `metadata`, `auto`).
- `width`/`height` to reserve space and prevent layout shift.

### Formats
List `<source>` elements in order of preference; the browser plays the first one it supports: AV1/WebM for efficiency, H.264 MP4 as the universal fallback.

### Accessibility
- `<track kind="captions" srclang="en" src="captions.vtt" default>`: captions are required for meaningful audio (WCAG).
- Never autoplay with sound, and offer pause controls for anything that moves longer than five seconds.
- Honor `prefers-reduced-motion` for decorative background videos.

### Performance
- Use `preload="none"` or `metadata` for videos below the fold.
- Replace animated GIFs with short muted looping videos; they are often 5 to 10 times smaller.
- For long or adaptive streaming, use HLS/DASH (often through a player library or a video platform).

### Interview tip
Mention the autoplay policy: muted autoplay works, autoplay with sound is blocked until the user interacts.
--- code
<style>
  body { font-family: system-ui; }
  video { width: 100%; max-width: 560px; height: auto; border-radius: 8px; background: #000; }
</style>
<video id="v" controls muted playsinline preload="metadata" width="640" height="360"
       poster="https://picsum.photos/id/1011/640/360">
  <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm">
  <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
  <track kind="captions" srclang="en" label="English" src="captions-en.vtt" default>
  Your browser does not support HTML video. <a href="flower.mp4">Download the video</a>.
</video>
<p>
  <button id="toggle">Play</button>
  <output id="time">0.0s</output>
</p>
<script>
  const v = document.getElementById("v");
  const btn = document.getElementById("toggle");
  btn.onclick = () => (v.paused ? v.play() : v.pause());
  v.onplay = () => (btn.textContent = "Pause");
  v.onpause = () => (btn.textContent = "Play");
  v.ontimeupdate = () => (document.getElementById("time").textContent = v.currentTime.toFixed(1) + "s");
</script>

=== hc45 | E | What is the <audio> tag?
**`<audio>` embeds sound in a page, such as podcasts, music or sound effects, with optional built-in controls and the same media API as `<video>` (`play()`, `pause()`, `volume`, `currentTime`, events like `ended` and `timeupdate`). Without the `controls` attribute it is invisible, which is useful for sounds you trigger from JavaScript.**

### Attributes
- `controls`: show the native player.
- `src` or multiple `<source>` children (e.g. Opus/OGG and MP3 fallback).
- `preload`: `none`, `metadata` or `auto`.
- `loop`, `muted`, `autoplay` (blocked with sound until the user interacts with the page).

### Accessibility
- Provide a **transcript** for speech content such as podcasts (WCAG requires a text alternative for prerecorded audio).
- Never autoplay audio; if any audio plays for more than three seconds, users must be able to pause or mute it.
- Custom players need real `<button>`s with labels and keyboard support.

### Common patterns
- **UI sound effects:** `new Audio("click.mp3").play()` inside a click handler (user gesture required).
- **Custom player UI** built on the media API, with a `<input type="range">` for seeking.
- **Advanced audio** (mixing, effects, visualizers, synthesis): the Web Audio API.
- **Media Session API:** shows track info and controls on the lock screen and in OS media keys.

### Interview tip
Mention that `play()` returns a promise that rejects if autoplay is blocked; handle it with `.catch()`.
--- code
<style> body { font-family: system-ui; } </style>
<figure>
  <figcaption>Episode 12: Accessible forms (24 min)</figcaption>
  <audio id="a" controls preload="metadata">
    <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3" type="audio/mpeg">
    Your browser does not support audio. <a href="episode-12.mp3">Download the episode</a>.
  </audio>
  <a href="#transcript">Read the transcript</a>
</figure>

<button id="beep">Play sound effect</button>
<p id="status"></p>
<script>
  const a = document.getElementById("a");
  a.addEventListener("ended", () => (document.getElementById("status").textContent = "Finished"));
  document.getElementById("beep").addEventListener("click", async () => {
    try {
      a.currentTime = 0;
      await a.play();            // play() returns a promise
      document.getElementById("status").textContent = "Playing…";
    } catch (err) {
      document.getElementById("status").textContent = "Playback blocked: " + err.name;
    }
  });
</script>

=== hc46 | E | What is the <progress> tag?
**`<progress>` displays how far a task has advanced, such as an upload, a download or steps in a form. It takes a `value` and a `max` (default 1). Without a `value` it becomes an indeterminate progress bar, showing that something is happening without knowing how long it will take.**

### Usage
- **Determinate:** `<progress value="40" max="100">40%</progress>`.
- **Indeterminate:** `<progress></progress>`, typically an animated bar.
- Text inside the element is the fallback for very old browsers.
- Label it with `<label>` or `aria-labelledby` so screen readers can name it; it already exposes `role="progressbar"` with value information.

### `<progress>` vs `<meter>`
- `<progress>`: completion of a task over time (0 to done).
- `<meter>`: a scalar measurement within a known range, like disk usage, password strength or a battery level, with `low`, `high` and `optimum` thresholds.

### Styling
It is styled with vendor pseudo-elements:
- Chromium/Safari: `::-webkit-progress-bar`, `::-webkit-progress-value`
- Firefox: `::-moz-progress-bar`

The simplest cross-browser theming is often just `accent-color`.

### Real-world progress
- `fetch` uploads do not report progress yet in most browsers; use `XMLHttpRequest`'s `upload.onprogress`, or stream the response body for downloads.
- For long tasks, also announce completion with a live region.
--- code
<style>
  body { font-family: system-ui; }
  progress { width: 280px; height: 18px; accent-color: #2b4bff; }
</style>
<label for="upload">Uploading report.pdf</label><br>
<progress id="upload" max="100" value="0">0%</progress>
<output id="pct">0%</output>

<p><label for="wait">Connecting…</label><br><progress id="wait"></progress></p>

<label for="disk">Disk usage</label>
<meter id="disk" min="0" max="100" low="70" high="90" optimum="20" value="82">82%</meter>

<p id="status" aria-live="polite"></p>
<script>
  const bar = document.getElementById("upload");
  const timer = setInterval(() => {
    bar.value = Math.min(100, bar.value + 7);
    document.getElementById("pct").textContent = bar.value + "%";
    if (bar.value === 100) {
      clearInterval(timer);
      document.getElementById("status").textContent = "Upload complete";
    }
  }, 250);
</script>

=== hc47 | E | What is <details> and <summary>?
**`<details>` creates a native disclosure widget, a section that users can expand and collapse, and `<summary>` is its always-visible, clickable heading. It works with the keyboard, is announced correctly by screen readers and needs no JavaScript, making it ideal for FAQs, accordions and "show more" sections.**

### Features
- The `open` attribute controls (and reflects) the expanded state.
- The `toggle` event fires whenever it opens or closes.
- **Exclusive accordions:** give several `<details>` the same `name` attribute and only one can be open at a time (supported in all modern browsers).
- **Find-in-page:** browsers can automatically expand a closed `<details>` when the user searches (Ctrl+F) for text inside it.

### Styling
- The marker is `summary::marker` (or hide it with `list-style: none` and draw your own icon).
- Style the open state with `details[open]`.
- Newer browsers support `::details-content` and `interpolate-size: allow-keywords` to animate the height smoothly.

### Accessibility notes
- `<summary>` acts as a button with an expanded/collapsed state; do not put other interactive elements inside it.
- Keep summary text concise and descriptive.

### When not to use it
For tabs, menus or anything that needs a different interaction model, use the appropriate pattern instead; `<details>` is strictly a show/hide disclosure.
--- code
<style>
  body { font-family: system-ui; max-width: 480px; }
  details { border: 2px solid #0b1020; border-radius: 8px; padding: 8px 12px; margin: 8px 0; }
  summary { font-weight: 700; cursor: pointer; list-style: none; }
  summary::before { content: "+ "; }
  details[open] summary::before { content: "− "; }
  details[open] { background: #fef9c3; }
</style>
<h2>FAQ</h2>
<!-- Same name = exclusive accordion: opening one closes the others -->
<details name="faq" open>
  <summary>Do I need an account?</summary>
  <p>No. Your progress is saved in your browser.</p>
</details>
<details name="faq">
  <summary>Is it free?</summary>
  <p>Yes, every question and the playground are free.</p>
</details>
<details name="faq">
  <summary>Can I export my progress?</summary>
  <p>Use the export button to download a JSON backup.</p>
</details>
<p id="log"></p>
<script>
  document.querySelectorAll("details").forEach((d) =>
    d.addEventListener("toggle", () => {
      if (d.open) document.getElementById("log").textContent = "Opened: " + d.querySelector("summary").textContent;
    })
  );
</script>

=== hc48 | E | What is <noscript>?
**`<noscript>` holds content that is shown (or, in `<head>`, applied) only when JavaScript is disabled or unavailable. It is a fallback: a message explaining that the app needs JavaScript, a static alternative, or a tracking pixel for users without scripts.**

### Where it can go
- **In `<body>`:** any normal flow content, such as messages, links or a plain HTML version of a widget.
- **In `<head>`:** only `<link>`, `<style>` and `<meta>`, for example a stylesheet that reveals content hidden for animations.

### Typical uses
- "Please enable JavaScript to use this app." in a client-rendered single-page app (Create React App included one by default).
- Showing images normally when a JavaScript lazy-loading library would otherwise never load them.
- Analytics or ad pixels that work without scripts.
- Undoing "hide until animated" styles so content is not invisible.

### Limitations
- It only triggers when scripting is *disabled*, not when a script fails to load or throws an error, so it is not a general error fallback.
- It does not help search engines much; Google renders JavaScript, and server-rendered HTML is the better solution.

### The better approach: progressive enhancement
Build pages that work as HTML first (server rendering, real links and forms) and enhance them with JavaScript. Then `<noscript>` is rarely needed.

### Interview tip
Mention that server-side rendering and real `<form>` submissions are the robust answer to "what if JavaScript does not run?".
--- code
<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <title>noscript demo</title>
  <style>
    body { font-family: system-ui; }
    .reveal { opacity: 0; transition: opacity .6s; }
    .reveal.shown { opacity: 1; }
  </style>
  <!-- If JS is off, never leave content invisible -->
  <noscript><style>.reveal { opacity: 1; }</style></noscript>
</head>
<body>
  <noscript>
    <p style="background:#fef9c3;padding:8px">
      JavaScript is disabled. You can still <a href="/questions.html">browse the plain question list</a>.
    </p>
  </noscript>
  <h1 class="reveal">Welcome back</h1>
  <p class="reveal">This text fades in with JavaScript.</p>
  <script>
    document.documentElement.classList.replace("no-js", "js");
    requestAnimationFrame(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("shown")));
  </script>
</body>
</html>

=== hc49 | M | What is tabindex?
**`tabindex` controls whether an element can receive keyboard focus and where it falls in the Tab order. `tabindex="0"` adds an element to the natural Tab order, `tabindex="-1"` makes it focusable only from JavaScript (`el.focus()`), and positive values force a custom order, which you should avoid.**

### The three values
- **`0`:** focusable in document order. Use it for custom interactive widgets that are not natively focusable (and give them a role and keyboard handling).
- **`-1`:** removed from the Tab sequence but programmatically focusable. Used for:
  - moving focus to a heading or `<main>` after client-side navigation,
  - focusing a dialog container or error summary,
  - "roving tabindex" in composite widgets (tabs, toolbars, menus) where only one item is tabbable and arrow keys move between items.
- **Positive (`1`, `2`…):** jumps ahead of everything else and creates a confusing order that breaks as the page changes. Treat it as an anti-pattern.

### Best practices
- Prefer native interactive elements (`<button>`, `<a href>`, inputs); they are already focusable.
- Do not add `tabindex="0"` to static text; screen reader users already have their own reading navigation.
- Keep the DOM order matching the visual order instead of fixing it with tabindex.
- Make focus visible with `:focus-visible` styles.
- Use the `inert` attribute to make whole regions (like content behind a modal) unfocusable.

### Interview tip
Explaining the roving tabindex pattern is a strong signal of practical accessibility experience.
--- code
<style>
  body { font-family: system-ui; }
  [role="toolbar"] button[tabindex="0"] { outline: 2px dashed #2b4bff; }
  :focus-visible { outline: 3px solid #e11d48 !important; outline-offset: 2px; }
</style>
<a href="#">Before</a>
<div role="toolbar" aria-label="Text formatting">
  <button tabindex="0">Bold</button>
  <button tabindex="-1">Italic</button>
  <button tabindex="-1">Underline</button>
</div>
<a href="#">After</a>
<h2 id="results" tabindex="-1">Results</h2>
<button id="search">Search (moves focus to Results)</button>
<script>
  // Roving tabindex: Tab enters the toolbar once; arrows move inside it
  const items = [...document.querySelectorAll('[role="toolbar"] button')];
  items.forEach((btn, i) =>
    btn.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      const next = items[(i + dir + items.length) % items.length];
      items.forEach((b) => (b.tabIndex = -1));
      next.tabIndex = 0;
      next.focus();
    })
  );
  // tabindex="-1": focusable from script, not with Tab
  document.getElementById("search").onclick = () => document.getElementById("results").focus();
</script>

=== hc50 | M | What is the DOM?
**The DOM (Document Object Model) is the browser's in-memory tree representation of an HTML document, plus the API JavaScript uses to read and change it. The browser parses HTML into nodes (document, elements, text, comments); changes made to the DOM through JavaScript are what update what users see.**

### Key ideas
- **Tree of nodes:** `document` → `<html>` → `<head>` / `<body>` → elements and text nodes. Each node has a parent, children and siblings.
- **The DOM is not the HTML source:** the parser fixes invalid markup (inserting `<tbody>`, closing tags), and scripts can change it at any time. "View source" shows the original HTML; DevTools' Elements panel shows the live DOM.
- **Live API:** `querySelector`, `createElement`, `append`, `remove`, `classList`, `textContent`, `addEventListener`.

### Rendering pipeline
DOM + CSSOM → render tree → **layout** (geometry) → **paint** → **composite**. Changing layout properties triggers reflow, which is why batching DOM reads and writes matters for performance.

### Events
Events travel through the tree: a **capture** phase down to the target, then a **bubble** phase back up. Bubbling is what makes event delegation possible.

### Related concepts
- **Virtual DOM (React):** a JavaScript description of the UI that React diffs to compute the minimal real DOM updates.
- **Shadow DOM:** an encapsulated subtree used by Web Components.
- **Accessibility tree:** derived from the DOM, used by assistive technologies.

### Interview tip
Distinguish the DOM from HTML source and from the virtual DOM; interviewers often probe that difference.
--- code
<ul id="list"><li>Learn HTML</li></ul>
<button id="add">Add item</button>
<pre id="tree"></pre>
<script>
  const list = document.getElementById("list");

  // Build new nodes and insert them in one operation
  document.getElementById("add").addEventListener("click", () => {
    const frag = document.createDocumentFragment();
    for (const text of ["Learn CSS", "Learn the DOM"]) {
      const li = document.createElement("li");
      li.textContent = text;          // safe: never parses HTML
      frag.append(li);
    }
    list.append(frag);
    printTree();
  });

  // Walk the live DOM tree
  function printTree(node = list, depth = 0, out = []) {
    const label = node.nodeType === Node.TEXT_NODE ? `"${node.textContent}"` : `<${node.nodeName.toLowerCase()}>`;
    out.push("  ".repeat(depth) + label);
    node.childNodes.forEach((c) => printTree(c, depth + 1, out));
    document.getElementById("tree").textContent = out.join("\n");
    return out;
  }
  printTree();
</script>
