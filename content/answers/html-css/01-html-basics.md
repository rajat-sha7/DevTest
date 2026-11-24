=== hc1 | E | What is HTML?
**HTML (HyperText Markup Language) is the standard markup language for web pages. It describes the structure and meaning of content, such as headings, paragraphs, links, images, forms and media, using elements written as tags. Browsers parse it into the DOM, CSS styles it and JavaScript makes it interactive.**

### Key ideas
- **Elements and tags:** `<p>Hello</p>` is a paragraph element with an opening tag, content and a closing tag. Some elements are void and have no closing tag (`<img>`, `<input>`, `<br>`).
- **Attributes** add information: `<a href="/about">`, `<img alt="Logo">`.
- **Nesting** creates a tree: elements contain other elements.
- **Semantics:** elements carry meaning (`<nav>`, `<article>`, `<button>`), which helps accessibility, SEO and maintainability.

### The three layers of the web
- **HTML:** structure and meaning.
- **CSS:** presentation (layout, colors, typography).
- **JavaScript:** behavior.

### Who defines it
HTML is a **Living Standard** maintained by the WHATWG and updated continuously rather than in numbered versions. "HTML5" was the last numbered version and is now just "HTML".

### Modern HTML is powerful on its own
Many features that used to need JavaScript are now built in: `<dialog>` modals, the `popover` attribute, exclusive `<details name>` accordions, form validation, `loading="lazy"` images, and the `<search>` landmark.

### Interview tip
Emphasize that HTML is about meaning, not appearance: choose elements for what content *is*, and let CSS decide how it looks.
--- code
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My first page</title>
  </head>
  <body>
    <header>
      <h1>Welcome</h1>
      <nav><a href="#about">About</a> · <a href="#contact">Contact</a></nav>
    </header>
    <main>
      <article id="about">
        <h2>About us</h2>
        <p>HTML gives this content <strong>structure</strong> and <em>meaning</em>.</p>
        <img src="https://picsum.photos/320/120" alt="Random landscape" width="320" height="120">
      </article>
    </main>
    <footer><p>&copy; 2026 Example Inc.</p></footer>
  </body>
</html>

=== hc2 | E | What is the structure of an HTML document?
**Every HTML document starts with `<!doctype html>`, followed by a root `<html lang="...">` element containing two children: `<head>`, which holds metadata (charset, viewport, title, styles, scripts, SEO tags), and `<body>`, which holds the visible content, usually organized with landmarks such as `<header>`, `<nav>`, `<main>` and `<footer>`.**

### The skeleton
1. `<!doctype html>`: puts the browser in standards mode.
2. `<html lang="en">`: the root; `lang` helps screen readers, translation and hyphenation.
3. `<head>`:
   - `<meta charset="utf-8">` first, within the first 1024 bytes.
   - `<meta name="viewport" content="width=device-width, initial-scale=1">` for responsive pages.
   - `<title>`: required, shown in tabs and search results.
   - `<meta name="description">`, `<link rel="icon">`, `<link rel="stylesheet">`, `<script defer>`, Open Graph tags.
4. `<body>`: everything users see.

### Body landmarks
- `<header>`: introductory content, logo, site navigation.
- `<nav>`: major navigation links.
- `<main>`: the primary content; only one visible per page.
- `<aside>`: related but secondary content.
- `<footer>`: copyright, contact, secondary links.
- `<article>` and `<section>` structure content inside `<main>`.

### Why structure matters
- Screen reader users jump between landmarks and headings.
- Search engines understand content better.
- CSS and JavaScript are easier to write against clear structure.

### Good practice
One `<h1>` describing the page, headings in order (`h2` under `h1`, and so on), and valid nesting (no `<div>` inside `<p>`).
--- code
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Blog | Example</title>
    <meta name="description" content="Articles about modern HTML and CSS.">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
    <script src="/app.js" defer></script>
  </head>
  <body>
    <header>
      <a href="/">Example</a>
      <nav aria-label="Main"><a href="/blog">Blog</a> <a href="/about">About</a></nav>
    </header>
    <main>
      <h1>Latest articles</h1>
      <article>
        <h2>Container queries in practice</h2>
        <p>Components that adapt to their container, not the viewport.</p>
      </article>
    </main>
    <aside>Popular tags</aside>
    <footer>&copy; 2026 Example</footer>
  </body>
</html>

=== hc3 | E | What is <!DOCTYPE html>?
**`<!doctype html>` is the document type declaration at the very top of an HTML file. It tells the browser to render the page in standards mode, following modern HTML and CSS rules, instead of quirks mode, which emulates old, inconsistent browser behavior. It is not a tag or an element, and it is case-insensitive.**

### Why it exists
In the 1990s and 2000s, browsers implemented CSS differently. When standards-compliant rendering arrived, browsers kept a **quirks mode** for old pages so they would not break. The doctype is the switch: with it, you get standards mode; without it, the browser guesses and usually picks quirks mode.

### What quirks mode changes
- Box sizing: widths may include padding and borders (old IE box model).
- Tables do not inherit font sizes.
- Percentage heights and some inline layout behave differently.
- Various CSS parsing differences.

These cause hard-to-debug layout differences, which is why the doctype is mandatory in practice.

### Old doctypes
HTML 4.01 and XHTML had long declarations referencing DTDs, for example `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">`. The modern HTML doctype is short because HTML is no longer based on SGML DTDs.

### Rules
- It must be the first thing in the document (only whitespace or comments before it, and comments can trigger issues in old browsers).
- `<!DOCTYPE html>` and `<!doctype html>` are equivalent.

### How to check
`document.compatMode` returns `"CSS1Compat"` in standards mode and `"BackCompat"` in quirks mode.
--- code
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Doctype demo</title>
    <style>
      .box { width: 200px; padding: 20px; border: 5px solid #4f46e5; }
    </style>
  </head>
  <body>
    <div class="box">Standards mode: total width is 250px (200 + 40 + 10)</div>
    <p>Rendering mode: <strong id="mode"></strong></p>
    <script>
      // "CSS1Compat" = standards mode, "BackCompat" = quirks mode
      document.getElementById("mode").textContent = document.compatMode;
    </script>
  </body>
</html>

=== hc4 | E | Difference between HTML4 and HTML5?
**HTML5 replaced HTML 4.01 with a simpler doctype, semantic elements (`header`, `nav`, `main`, `article`, `section`, `footer`), native audio and video, `canvas` and SVG inline, new form input types and validation, and APIs like local storage, geolocation and history. It also defined precise parsing rules so all browsers handle errors the same way. Today "HTML5" is simply HTML, a Living Standard maintained by the WHATWG.**

### Main differences
| | HTML 4.01 | HTML5 / HTML Living Standard |
|---|---|---|
| Doctype | long, DTD-based | `<!doctype html>` |
| Charset | `<meta http-equiv="Content-Type" ...>` | `<meta charset="utf-8">` |
| Layout markup | `<div id="header">` everywhere | semantic elements |
| Media | plugins (Flash, Silverlight) | `<video>`, `<audio>`, `<track>` |
| Graphics | images and plugins | `<canvas>`, inline `<svg>` |
| Forms | text, password, checkbox, radio | `email`, `url`, `date`, `number`, `range`, `color`, `search`; `required`, `pattern`, `placeholder` |
| Parsing | browser-specific error handling | standardized parsing algorithm |
| Presentational tags | `<font>`, `<center>`, `<frame>` | removed; use CSS |
| APIs | few | Web Storage, History, Drag and Drop, Web Workers, and many more |

### Living Standard
After HTML5 (2014), the W3C and WHATWG agreed in 2019 that the WHATWG HTML Living Standard is the single source of truth. Features are added continuously: `<dialog>`, `popover`, `<search>`, `inert`, exclusive `<details name>`, `loading="lazy"`, `fetchpriority`, invoker commands (`command`/`commandfor`).

### Interview tip
Mention semantics, multimedia, forms and APIs, then note that version numbers no longer exist.
--- code
<!-- HTML 4.01 style -->
<!-- <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<div id="header"><font size="5">Site</font></div>
<object data="movie.swf" type="application/x-shockwave-flash"></object> -->

<!-- Modern HTML -->
<header><h1>Site</h1></header>
<main>
  <video controls width="320" preload="metadata" poster="https://picsum.photos/320/180">
    <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm" type="video/webm">
    Your browser does not support video.
  </video>
  <form>
    <label>Email <input type="email" required placeholder="you@example.com"></label>
    <label>Date <input type="date"></label>
    <label>Volume <input type="range" min="0" max="10"></label>
    <button>Send</button>
  </form>
  <canvas id="c" width="120" height="40" style="border:1px solid #ccc"></canvas>
</main>
<script>document.getElementById("c").getContext("2d").fillRect(10, 10, 60, 20);</script>

=== hc5 | E | What are semantic tags?
**Semantic tags are HTML elements whose names describe the meaning of their content, such as `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, `<button>` and `<time>`. Unlike generic `<div>` and `<span>`, they tell browsers, assistive technologies and search engines what each part of the page is.**

### Why they matter
- **Accessibility:** screen readers expose landmarks (`banner`, `navigation`, `main`, `contentinfo`) and let users jump between them. Semantic controls like `<button>` are keyboard-focusable and announced correctly for free.
- **SEO:** search engines understand page structure, main content and articles better.
- **Maintainability:** code reads like a document outline.
- **Default behavior:** `<details>` toggles, `<dialog>` traps focus as a modal, `<a href>` navigates, `<form>` submits, all without JavaScript.

### Semantic vs non-semantic
- Non-semantic: `<div>`, `<span>`. They mean nothing; use them only for styling or grouping when no element fits.
- Semantic: everything with a specific meaning, including inline ones like `<strong>`, `<em>`, `<code>`, `<abbr>`, `<mark>`, `<time datetime>`.

### Common mistakes
- **Div soup:** `<div class="button" onclick=...>` instead of `<button>`. It is not focusable or announced as a button.
- Using headings for size rather than structure; style headings with CSS instead.
- Multiple visible `<main>` elements.
- Using `<section>` as a generic wrapper; a section should have a heading.

### Rule of thumb
Pick the element that describes what the content is; if nothing fits, use a `<div>` or `<span>`.
--- code
<style>
  body { font-family: system-ui; margin: 0; }
  header, footer { background: #eef2ff; padding: 8px 16px; }
  main { display: grid; grid-template-columns: 1fr 160px; gap: 16px; padding: 16px; }
  aside { background: #f8fafc; padding: 8px; }
</style>
<header>
  <strong>DevQnA</strong>
  <nav aria-label="Main"><a href="#">Home</a> · <a href="#">Topics</a></nav>
</header>
<main>
  <article>
    <h1>Understanding semantic HTML</h1>
    <p>Published <time datetime="2026-11-21">21 Nov 2026</time></p>
    <section>
      <h2>Why it matters</h2>
      <p>Screen readers announce <strong>landmarks</strong> and <em>headings</em>.</p>
    </section>
    <button type="button">Bookmark</button>
  </article>
  <aside><h2>Related</h2><a href="#">ARIA basics</a></aside>
</main>
<footer><small>&copy; 2026 DevQnA</small></footer>

=== hc6 | E | Examples of semantic elements?
**Common semantic elements include landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<search>`), content sections (`<article>`, `<section>`, `<figure>`, `<figcaption>`), text-level meaning (`<strong>`, `<em>`, `<mark>`, `<time>`, `<abbr>`, `<code>`, `<blockquote>`, `<cite>`), interactive elements (`<button>`, `<a>`, `<details>`, `<summary>`, `<dialog>`) and forms (`<form>`, `<label>`, `<fieldset>`, `<legend>`, `<output>`).**

### Landmarks
- `<header>`: introductory content for the page or a section.
- `<nav>`: major navigation blocks.
- `<main>`: the dominant content of the page.
- `<aside>`: tangential content such as sidebars and callouts.
- `<footer>`: footer for the page or a section.
- `<search>`: wraps a search form; Baseline since 2023 and widely available since April 2026.

### Sectioning content
- `<article>`: self-contained, could be syndicated (blog post, comment, product card).
- `<section>`: a thematic grouping with a heading.
- `<figure>` and `<figcaption>`: images, charts or code with a caption.

### Text-level semantics
- `<strong>` (importance), `<em>` (stress emphasis), `<mark>` (highlight).
- `<time datetime="2026-11-21">` machine-readable dates.
- `<abbr title="Cascading Style Sheets">CSS</abbr>`.
- `<code>`, `<kbd>`, `<samp>`, `<pre>` for code and keyboard input.
- `<blockquote cite>`, `<q>`, `<cite>` for quotations.
- `<address>` for contact information.

### Interactive
`<button>`, `<a href>`, `<details>`/`<summary>`, `<dialog>`, `<menu>`.

### Forms
`<label>`, `<fieldset>`/`<legend>`, `<output>`, `<meter>`, `<progress>`, `<datalist>`.
--- code
<style>body { font-family: system-ui; } figure { margin: 0; } mark { background: #fde68a; }</style>
<search>
  <form role="search"><label>Search <input type="search" name="q"></label></form>
</search>
<article>
  <header><h2>Release notes</h2><p>Updated <time datetime="2026-11-21">today</time></p></header>
  <p>The <abbr title="HyperText Markup Language">HTML</abbr> spec is a <mark>living standard</mark>.</p>
  <p>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to search. Run <code>npm run dev</code>.</p>
  <blockquote cite="https://html.spec.whatwg.org/">
    <p>HTML is the World Wide Web's core markup language.</p>
  </blockquote>
  <figure>
    <img src="https://picsum.photos/240/100" alt="Chart of browser support" width="240" height="100">
    <figcaption>Figure 1: support over time</figcaption>
  </figure>
  <details><summary>Changelog</summary><p>Added popover support.</p></details>
  <p>Storage used: <meter value="0.7">70%</meter></p>
  <footer><address>Contact: <a href="mailto:team@example.com">team@example.com</a></address></footer>
</article>

=== hc7 | E | What is <div> vs <span>?
**`<div>` and `<span>` are both generic containers with no meaning. `<div>` is a block-level element (starts on a new line and takes the full width by default) used to group larger chunks of content for layout. `<span>` is an inline element (flows within text) used to wrap a few words for styling or scripting.**

### `<div>`
- Default `display: block`.
- Groups sections, cards, layout wrappers, grid and flex containers.
- Can contain almost any flow content.

### `<span>`
- Default `display: inline`.
- Wraps part of a text: a colored word, a badge inside a sentence, a highlighted price.
- Must contain only phrasing (inline) content; putting a `<div>` inside a `<span>` is invalid.

### Both are non-semantic
Screen readers and search engines treat them as plain containers. Before reaching for them, check whether a semantic element fits:
- Instead of `<div class="header">`, use `<header>`.
- Instead of `<div onclick>` acting as a button, use `<button>`.
- Instead of `<span class="bold">` for important text, use `<strong>`.
- Instead of `<span class="date">`, use `<time datetime>`.

### Display can be changed
CSS can make a `<span>` behave like a block (`display: block`) or a `<div>` inline (`display: inline-flex`), but the content model rules (what may go inside) stay the same.

### Interview tip
Say "block vs inline", "both non-semantic", and "prefer semantic elements first".
--- code
<style>
  body { font-family: system-ui; }
  .card { border: 2px solid #4f46e5; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .price { color: #16a34a; font-weight: 700; }
  .badge { background: #fee2e2; color: #b91c1c; padding: 0 6px; border-radius: 999px; font-size: 12px; }
</style>

<!-- div: block-level grouping, each starts on a new line -->
<div class="card">
  <h3>Running shoes <span class="badge">Sale</span></h3>
  <!-- span: inline, flows inside the sentence -->
  <p>Now only <span class="price">$49</span> instead of $79.</p>
</div>
<div class="card">Another card on its own line</div>

<p>Inline spans: <span>one</span> <span>two</span> <span>three</span></p>

=== hc8 | E | What is a block vs inline element?
**Block-level elements start on a new line and stretch to fill the available width, and they accept width, height and vertical margins (`<div>`, `<p>`, `<h1>`, `<section>`, `<ul>`). Inline elements flow within a line of text, take only the width of their content, and ignore `width`, `height` and vertical margins (`<span>`, `<a>`, `<strong>`, `<em>`, `<code>`). The difference comes from the CSS `display` property.**

### Block (`display: block`)
- Starts on a new line; following content moves below.
- Width defaults to 100% of the container.
- `width`, `height`, `margin` and `padding` all work as expected.
- Examples: `div`, `p`, headings, `ul`, `ol`, `li`, `section`, `article`, `header`, `footer`, `form`, `table`, `blockquote`.

### Inline (`display: inline`)
- Sits next to other inline content and wraps across lines.
- Width and height are ignored; size comes from content.
- Horizontal margin and padding apply; vertical padding paints but does not push surrounding lines apart, and vertical margin is ignored.
- Examples: `span`, `a`, `strong`, `em`, `code`, `abbr`, `label`.

### In between
- **`inline-block`:** flows inline but accepts width, height and vertical spacing (buttons, badges).
- **Replaced inline elements** like `<img>`, `<input>`, `<button>` are inline by default but have intrinsic dimensions, so width and height work.

### Modern CSS terms
CSS Display Level 3 splits `display` into an outer type (block or inline) and an inner type (flow, flex, grid): `display: inline flex` equals `inline-flex`.

### HTML content model
HTML itself now talks about "flow" and "phrasing" content rather than block and inline, but the CSS behavior is what interviewers mean.
--- code
<style>
  body { font-family: system-ui; }
  .block { background: #e0e7ff; margin: 8px 0; padding: 8px; }
  .inline { background: #fde68a; padding: 8px; margin: 20px; width: 300px; height: 100px; } /* width/height ignored */
  .inline-block { display: inline-block; background: #bbf7d0; width: 120px; height: 40px; margin: 8px; vertical-align: middle; }
</style>

<div class="block">Block: full width, new line</div>
<div class="block">Another block below</div>

<p>
  Text with <span class="inline">an inline span</span> that keeps flowing in the line,
  ignoring width and height. Vertical padding overlaps neighboring lines.
</p>

<p>
  Mixed: <span class="inline-block">inline-block</span> respects size
  <span class="inline-block">and margins</span> but stays in the line.
</p>

=== hc9 | E | What is the <meta> tag?
**`<meta>` is a void element inside `<head>` that provides metadata about the document which is not displayed on the page: the character encoding, viewport settings for mobile, the description shown in search results, social sharing information (Open Graph), theme colors, and instructions for crawlers.**

### Common meta tags
- `<meta charset="utf-8">`: character encoding; should be the first element in `<head>`.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`: responsive layout on mobile.
- `<meta name="description" content="...">`: page summary, often used as the search snippet.
- `<meta name="robots" content="noindex, nofollow">`: crawler instructions.
- `<meta name="theme-color" content="#4f46e5" media="(prefers-color-scheme: light)">`: browser UI color.
- `<meta name="color-scheme" content="light dark">`: tells the browser the page supports both, so default form controls and scrollbars match before CSS loads.
- `<meta property="og:title">`, `og:description`, `og:image`, `og:url`: link previews on social apps and chat tools.
- `<meta name="twitter:card" content="summary_large_image">`.
- `<meta http-equiv="Content-Security-Policy" content="...">`: a CSP fallback when you cannot set headers.

### Attributes
- `name` + `content` for named metadata.
- `property` + `content` for Open Graph (RDFa).
- `http-equiv` + `content` to emulate HTTP headers.
- `charset` for encoding.

### Things meta does not do anymore
`<meta name="keywords">` is ignored by major search engines. `<meta http-equiv="refresh">` redirects are bad for accessibility and SEO; use server redirects.

### Frameworks
Next.js's Metadata API, React 19's built-in `<title>` and `<meta>` hoisting, and similar tools generate these tags for you.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CSS Container Queries Guide | DevQnA</title>
  <meta name="description" content="Learn how container queries let components adapt to their parent's size, with live examples.">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0b1020" media="(prefers-color-scheme: dark)">

  <!-- Social previews -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="CSS Container Queries Guide">
  <meta property="og:description" content="Components that adapt to their container.">
  <meta property="og:image" content="https://example.com/og/container-queries.png">
  <meta property="og:url" content="https://example.com/guides/container-queries">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Keep staging out of search results -->
  <!-- <meta name="robots" content="noindex"> -->
</head>
<body><h1>CSS Container Queries Guide</h1></body>
</html>

=== hc10 | E | What is the viewport meta tag?
**The viewport meta tag, `<meta name="viewport" content="width=device-width, initial-scale=1">`, tells mobile browsers to use the device's actual width as the layout width and not to zoom out. Without it, phones render the page as if it were about 980px wide and shrink it, so text is tiny and media queries do not work as expected.**

### Why it is needed
Early mobile browsers assumed sites were built for desktops. They laid pages out on a virtual 980px viewport and zoomed out to fit. The viewport tag opts your responsive design out of that behavior.

### Common values
- `width=device-width`: layout viewport equals the screen width in CSS pixels.
- `initial-scale=1`: no zoom on load.
- `viewport-fit=cover`: extend into the notch and rounded-corner areas on phones; then pad content with `env(safe-area-inset-*)`.
- `interactive-widget=resizes-content`: makes the layout viewport shrink when the on-screen keyboard opens (supported in Chromium and Firefox).

### Avoid
- `maximum-scale=1` or `user-scalable=no`: blocks pinch-zoom, which fails accessibility guidelines (WCAG 1.4.4 Resize Text). Modern iOS ignores it for accessibility reasons anyway.
- Fixed widths like `width=600`.

### Related CSS
- Viewport units `vw`, `vh`, and the newer `svh`, `lvh` and `dvh` (small, large and dynamic viewport heights), which handle mobile browser toolbars.
- Media queries now match real device widths.

### Interview tip
Explain the 980px default and the accessibility reason not to disable zoom.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <!-- The standard responsive viewport (do not disable user zoom) -->
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Viewport demo</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 16px; padding-inline: max(16px, env(safe-area-inset-left)); }
    .hero { min-height: 100dvh; display: grid; place-items: center; background: #eef2ff; } /* dvh adapts to mobile toolbars */
    @media (max-width: 600px) { h1 { font-size: 1.5rem; } }
  </style>
</head>
<body>
  <section class="hero"><h1>Readable on every phone</h1></section>
  <p>Viewport width: <span id="w"></span>px</p>
  <script>document.getElementById("w").textContent = window.innerWidth;</script>
</body>
</html>

=== hc11 | E | What is <head> vs <body>?
**`<head>` contains information about the document that is mostly not displayed: metadata, the title, links to stylesheets and icons, scripts and SEO or social tags. `<body>` contains all the content users see and interact with: text, images, links, forms and media. Every HTML document has exactly one of each inside `<html>`.**

### `<head>` contents
- `<meta charset>`, `<meta name="viewport">`, `<meta name="description">`.
- `<title>` (required).
- `<link rel="stylesheet">`, `<link rel="icon">`, `<link rel="preload">`, `<link rel="preconnect">`, `<link rel="canonical">`, `<link rel="manifest">`.
- `<style>` for critical inline CSS.
- `<script>` (preferably with `defer` or `type="module"`).
- `<base>` (rare), Open Graph and structured data (`<script type="application/ld+json">`).

### `<body>` contents
- Landmarks and content: `<header>`, `<nav>`, `<main>`, `<footer>`, headings, text, images, forms.
- Scripts at the end of the body (an older pattern from before `defer`).

### Performance details
- Stylesheets in `<head>` are render-blocking, so the page does not flash unstyled.
- Classic scripts without `defer`/`async` block HTML parsing; place them carefully.
- Preload critical resources (hero image, fonts) with `<link rel="preload">` or use `fetchpriority="high"` on the image.

### Parser behavior
If you omit `<head>` or `<body>` tags, the browser inserts them automatically. Elements that cannot be in the head (like a `<div>`) implicitly close it and start the body.

### Frameworks
React 19 lets components render `<title>`, `<meta>` and `<link>` anywhere and hoists them into `<head>`.
--- code
<!doctype html>
<html lang="en">
  <head>
    <!-- Not displayed: information about the page -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Head vs body</title>
    <link rel="preconnect" href="https://picsum.photos">
    <style>
      body { font-family: system-ui; }
      .note { background: #fef9c3; padding: 8px; }
    </style>
    <script type="module">
      // Module scripts are deferred automatically
      document.querySelector(".note").textContent += " (script ran after parsing)";
    </script>
  </head>
  <body>
    <!-- Displayed: what users see -->
    <h1>Visible content lives in body</h1>
    <p class="note">The title above appears only in the browser tab</p>
    <img src="https://picsum.photos/200/80" alt="Example image" width="200" height="80">
  </body>
</html>

=== hc12 | E | What is the <title> tag?
**`<title>` sets the document's title, which appears in the browser tab, bookmarks and history, is announced by screen readers when the page loads, and is usually used as the clickable headline in search results. It goes in `<head>`, is required for a valid document, and should be unique and descriptive for every page.**

### Writing good titles
- Put the most specific information first: `"Edit profile | Settings | DevQnA"`.
- Keep it concise; search engines typically show about 50 to 60 characters.
- Make each page's title unique, matching the page's main heading.
- Avoid keyword stuffing.

### Accessibility
Screen reader users hear the title first; in single-page apps, update it on every route change so users know the page changed (WCAG 2.4.2 Page Titled).

### Dynamic titles
- JavaScript: `document.title = "3 new messages | Inbox"`.
- **React 19:** render `<title>` anywhere in a component and React hoists it into `<head>`.
- **Next.js:** the Metadata API (`export const metadata = { title }`, `title.template`).
- **React Router:** `meta` exports in framework mode.

### Details
- Only one `<title>` per document; it contains text only (no markup).
- It is different from the `title` attribute, which creates a tooltip on any element and is not reliable for accessibility.

### SEO
Search engines may rewrite titles that are missing, duplicated or unhelpful, so it pays to write them deliberately.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order #1042 | Orders | Acme Store</title>
</head>
<body>
  <h1>Order #1042</h1>
  <p>Unread notifications: <output id="count">0</output></p>
  <button id="ping">Simulate new message</button>
  <script>
    const base = "Order #1042 | Orders | Acme Store";
    let unread = 0;
    document.getElementById("ping").addEventListener("click", () => {
      unread++;
      document.getElementById("count").textContent = unread;
      // Dynamic titles help users notice updates in background tabs
      document.title = `(${unread}) ${base}`;
    });
  </script>
</body>
</html>

=== hc13 | E | What is the <link> tag?
**`<link>` is a void element, usually in `<head>`, that connects the document to external resources. Its `rel` attribute says what the relationship is: stylesheets (`rel="stylesheet"`), icons (`rel="icon"`), resource hints (`preload`, `preconnect`, `prefetch`, `modulepreload`), the canonical URL, alternate languages, the web app manifest and more.**

### Common uses
- **Stylesheets:** `<link rel="stylesheet" href="/styles.css">`, optionally with `media="print"` or a media query.
- **Icons:** `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`.
- **Resource hints:**
  - `preconnect`: open a connection early to a critical origin (fonts, CDN).
  - `dns-prefetch`: resolve DNS only.
  - `preload`: fetch a resource needed soon on this page (`as="font"`, `as="image"`, with `crossorigin` for fonts).
  - `modulepreload`: preload JavaScript modules.
  - `prefetch`: low-priority fetch for a likely next navigation.
- **SEO:** `<link rel="canonical" href="...">`, `<link rel="alternate" hreflang="fr" href="...">`.
- **PWA:** `<link rel="manifest" href="/manifest.webmanifest">`.
- **Feeds:** `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`.

### Useful attributes
`href`, `rel`, `as`, `type`, `media`, `crossorigin`, `integrity` (Subresource Integrity), `fetchpriority`, `blocking="render"`, `imagesrcset`/`imagesizes` (for preloading responsive images).

### `<link>` vs `<a>`
`<link>` describes relationships for the browser and is not clickable; `<a>` creates a hyperlink for users.

### Performance tips
Preload only what is needed early; too many preloads compete with each other. Stylesheets are render-blocking by default, which avoids a flash of unstyled content.
--- code
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Link examples</title>

  <!-- Stylesheets (one only for print) -->
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/print.css" media="print">

  <!-- Icons and app manifest -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">

  <!-- Resource hints -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
  <link rel="modulepreload" href="/js/app.js">

  <!-- SEO -->
  <link rel="canonical" href="https://example.com/guides/link-tag">
  <link rel="alternate" hreflang="fr" href="https://example.com/fr/guides/link-tag">
</head>
<body><h1>The link element</h1></body>
</html>

=== hc14 | E | What is the <script> tag?
**`<script>` embeds or references JavaScript (or data blocks like JSON). By default a classic script blocks HTML parsing while it downloads and runs; `defer`, `async` and `type="module"` change that. It can contain inline code or load a file with `src`, and it appears in `<head>` or `<body>`.**

### Loading modes
- **Classic (no attributes):** parsing stops, the script downloads and executes, then parsing resumes. Avoid in `<head>`.
- **`defer`:** downloads in parallel, runs after the document is parsed, in order. Good default for app scripts.
- **`async`:** downloads in parallel, runs as soon as it is ready (order not guaranteed). Good for independent scripts like analytics.
- **`type="module"`:** ES modules; deferred by default, strict mode, supports `import`/`export`, scoped variables. Add `async` to run as soon as ready.
- **`nomodule`:** fallback for very old browsers that do not support modules (rarely needed today).

### Other attributes
- `crossorigin`, `integrity` (Subresource Integrity for CDN files), `referrerpolicy`, `nonce` (for Content Security Policy), `fetchpriority`, `blocking="render"`.
- `type="importmap"`: map bare module specifiers to URLs.
- `type="application/ld+json"`: structured data for search engines.
- `type="speculationrules"`: prerender or prefetch likely next pages (Chromium).

### Best practices
- Prefer `defer` or modules for scripts in `<head>`.
- Keep inline scripts small; move code to files that can be cached.
- Avoid `document.write`.
- Load third-party scripts with `async` and consider their performance and security cost.
--- code
<!-- Import map: bare specifiers for ES modules -->
<script type="importmap">
  { "imports": { "confetti": "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm" } }
</script>

<!-- Module script: deferred by default, scoped, supports import -->
<script type="module">
  import confetti from "confetti";
  document.querySelector("#party").addEventListener("click", () => confetti());
</script>

<!-- Structured data for search engines (not executed) -->
<script type="application/ld+json">
  { "@context": "https://schema.org", "@type": "Organization", "name": "DevQnA" }
</script>

<!-- Classic deferred script would look like: <script src="/app.js" defer></script> -->

<button id="party">Celebrate 🎉</button>
<p id="status">Status: <span>parsing…</span></p>
<script>
  // Inline classic script: runs immediately at this point in the document
  document.querySelector("#status span").textContent = "inline script ran";
</script>

=== hc15 | M | Difference: defer vs async?
**Both `defer` and `async` download an external script in parallel without blocking HTML parsing. A `defer` script runs after the whole document has been parsed, just before `DOMContentLoaded`, and deferred scripts run in document order. An `async` script runs as soon as it finishes downloading, which can interrupt parsing, and async scripts run in whatever order they arrive.**

### Timeline
- **No attribute:** parse, stop, download, execute, continue parsing.
- **`async`:** parse while downloading, stop briefly to execute when ready, continue.
- **`defer`:** parse while downloading, finish parsing, then execute in order.

### When to use which
| | `defer` | `async` |
|---|---|---|
| Execution time | after parsing, before `DOMContentLoaded` | as soon as downloaded |
| Order | preserved | not guaranteed |
| DOM available | yes, fully parsed | maybe not |
| Good for | app code, scripts that depend on each other or on the DOM | independent scripts: analytics, ads, widgets |

### Modules
`<script type="module">` behaves like `defer` by default. `<script type="module" async>` runs as soon as the module and its imports are ready.

### Notes
- Both only apply to external scripts with `src` (except `async` on modules, which also works inline).
- Scripts inserted dynamically with JavaScript are async by default.
- `DOMContentLoaded` waits for deferred scripts but not for async ones.
- With both attributes, modern browsers use `async`.

### Performance
Putting `defer` scripts in `<head>` lets the browser discover and download them early while still not blocking rendering, which is better than placing classic scripts at the end of `<body>`.
--- code
<p>Open the console and reload to see execution order.</p>

<!-- Simulated scripts using data URLs so the demo is self-contained -->
<script defer src="data:text/javascript,console.log('defer 1: runs after parsing, in order')"></script>
<script defer src="data:text/javascript,console.log('defer 2: always after defer 1')"></script>
<script async src="data:text/javascript,console.log('async: runs whenever it is ready')"></script>

<script>
  console.log("inline classic: runs immediately while parsing");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded: after deferred scripts");
  });
</script>

<!-- Typical real-world usage:
<script src="/js/app.js" defer></script>
<script src="https://analytics.example.com/script.js" async></script>
-->
<p>Last element in the document.</p>

=== hc16 | E | What is the <img> tag?
**`<img>` embeds an image. It is a void element that needs `src` (the image URL) and `alt` (a text alternative), and should have `width` and `height` so the browser reserves space and avoids layout shift. Modern attributes like `srcset`, `sizes`, `loading="lazy"`, `decoding` and `fetchpriority` make images responsive and fast.**

### Essential attributes
- **`src`:** the image file.
- **`alt`:** describes the image for screen readers and when it fails to load; `alt=""` for decorative images.
- **`width` and `height`:** intrinsic size in pixels; the browser uses the ratio to reserve space before loading (prevents Cumulative Layout Shift). CSS can still resize it (`max-width: 100%; height: auto`).

### Performance attributes
- **`srcset` + `sizes`:** let the browser choose the best file for the screen size and pixel density.
- **`loading="lazy"`:** defer offscreen images. Do not lazy-load the main above-the-fold image.
- **`fetchpriority="high"`:** prioritize the Largest Contentful Paint image.
- **`decoding="async"`:** decode off the main thread.

### Formats
- **AVIF** and **WebP** for photos (much smaller than JPEG), JPEG as fallback.
- **SVG** for icons and logos.
- **PNG** when you need lossless images with transparency.
- Use `<picture>` to offer multiple formats with fallbacks.

### Accessibility
Write `alt` text that conveys purpose: for a linked logo, use the destination ("DevQnA home"); for informative charts, summarize the data.

### Common mistakes
Missing `alt`, missing dimensions, huge images scaled down with CSS, and lazy-loading the hero image.
--- code
<style>
  body { font-family: system-ui; }
  img { max-width: 100%; height: auto; border-radius: 8px; } /* responsive while keeping aspect ratio */
</style>

<!-- Hero image: high priority, not lazy, responsive sizes -->
<img
  src="https://picsum.photos/id/1015/800/400"
  srcset="https://picsum.photos/id/1015/400/200 400w, https://picsum.photos/id/1015/800/400 800w, https://picsum.photos/id/1015/1600/800 1600w"
  sizes="(max-width: 600px) 100vw, 800px"
  width="800" height="400"
  alt="River winding through a mountain valley"
  fetchpriority="high">

<!-- Offscreen image: lazy loaded -->
<img src="https://picsum.photos/id/1025/400/300" width="400" height="300" loading="lazy" decoding="async"
     alt="Pug wrapped in a blanket">

<!-- Decorative image: empty alt so screen readers skip it -->
<img src="https://picsum.photos/id/1040/400/40" width="400" height="40" alt="">

=== hc17 | E | What is the alt attribute?
**The `alt` attribute on `<img>` (and `<area>`, `<input type="image">`) provides a text alternative for an image. Screen readers read it aloud, browsers show it if the image fails to load, and search engines use it to understand images. Every image needs an `alt`, set to an empty string (`alt=""`) when the image is purely decorative.**

### How to write good alt text
- **Informative images:** describe the information or purpose briefly: `alt="Bar chart: sales grew 40% in Q3"`.
- **Functional images** (inside links or buttons): describe the action or destination, not the picture: `alt="Search"`, `alt="DevQnA home"`.
- **Decorative images:** `alt=""` so assistive technology skips them. Better still, use CSS backgrounds for pure decoration.
- **Images of text:** repeat the text.
- **Complex images** (charts, diagrams): a short alt plus a longer description nearby or via `<figure>` and `<figcaption>`.

### Avoid
- "Image of..." or "Picture of..." (screen readers already announce "image").
- File names like `IMG_2048.jpg`.
- Keyword stuffing for SEO.
- Omitting `alt` entirely: screen readers may read the file name instead.
- Very long alt text; aim for one or two sentences.

### Standards
WCAG 1.1.1 (Non-text Content) requires text alternatives for non-text content. Automated tools such as axe and Lighthouse flag missing `alt` attributes.

### Context matters
The same photo may need different alt text on different pages, depending on why it is there.
--- code
<style>body { font-family: system-ui; } img { vertical-align: middle; }</style>

<!-- Informative: conveys the data -->
<figure>
  <img src="https://picsum.photos/id/180/320/160" width="320" height="160"
       alt="Laptop on a desk showing a sales dashboard">
  <figcaption>Our new analytics dashboard</figcaption>
</figure>

<!-- Functional: describes the destination, not the picture -->
<a href="/">
  <img src="https://picsum.photos/id/1/40/40" width="40" height="40" alt="DevQnA home">
</a>

<!-- Decorative: empty alt, skipped by screen readers -->
<img src="https://picsum.photos/id/1060/320/20" width="320" height="20" alt="">

<!-- Broken image: the alt text is displayed instead -->
<p><img src="/does-not-exist.png" width="200" height="40" alt="Company logo (failed to load)"></p>

=== hc18 | E | What is the <a> tag?
**The `<a>` (anchor) element creates a hyperlink to another page, a file, a location within the page (`#id`), an email address (`mailto:`) or a phone number (`tel:`). It needs an `href` to be a real, keyboard-focusable link. Links navigate; buttons perform actions.**

### Key attributes
- **`href`:** the destination (absolute or relative URL, `#fragment`, `mailto:`, `tel:`).
- **`target="_blank"`:** open in a new tab. Modern browsers imply `rel="noopener"`, but adding `rel="noopener noreferrer"` is still common and harmless.
- **`rel`:** relationship: `noopener`, `noreferrer`, `nofollow`, `sponsored`, `ugc`, `external`, `me`.
- **`download`:** download the file instead of navigating (same-origin or `blob:`/`data:` URLs).
- **`hreflang`, `type`, `referrerpolicy`, `ping`.**

### Accessibility
- Link text must make sense out of context: "Read the pricing guide", not "click here".
- Warn users when a link opens a new tab or downloads a file.
- Do not use `<a>` without `href` as a button, or a `<div>` as a link.
- Visible focus styles and enough color contrast; do not rely on color alone to identify links in text.

### Links vs buttons
- Navigation to a URL: `<a href>`.
- Actions (submit, open a modal, toggle): `<button>`.

### Fragments and scrolling
`href="#pricing"` scrolls to `id="pricing"`. CSS `scroll-behavior: smooth` and `scroll-margin-top` (to offset sticky headers) improve this. Text fragments (`#:~:text=...`) can link to specific text in Chromium and Safari.
--- code
<style>
  body { font-family: system-ui; }
  a { color: #4f46e5; text-underline-offset: 3px; }
  a:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
  html { scroll-behavior: smooth; }
  #faq { scroll-margin-top: 16px; margin-top: 60vh; }
</style>

<nav>
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a">MDN: the anchor element</a> |
  <a href="https://html.spec.whatwg.org/" target="_blank" rel="noopener noreferrer">HTML spec (opens in a new tab)</a> |
  <a href="#faq">Jump to FAQ</a>
</nav>

<p>
  Contact <a href="mailto:support@example.com?subject=Help">support@example.com</a> or call
  <a href="tel:+911234567890">+91 12345 67890</a>.
</p>
<p><a href="data:text/plain,Hello%20from%20DevQnA" download="hello.txt">Download hello.txt</a></p>

<h2 id="faq">FAQ</h2>
<p>You scrolled here with a fragment link.</p>

=== hc19 | E | Difference: absolute vs relative URL?
**An absolute URL contains the full address, including the scheme and host (`https://example.com/docs/guide.html`), and points to the same place from anywhere. A relative URL is resolved against the current document's URL (or a `<base>` element): `guide.html`, `../images/logo.png` or root-relative `/docs/guide.html`.**

### Types of relative URLs
- **Document-relative:** `about.html` or `./about.html` (same folder), `../index.html` (parent folder).
- **Root-relative:** `/images/logo.png`, resolved from the site's origin. The most common choice in web apps.
- **Protocol-relative:** `//cdn.example.com/lib.js` uses the current scheme; outdated now that everything is HTTPS, so use `https://` explicitly.
- **Fragment-only:** `#section` scrolls within the page.
- **Query-only:** `?page=2` keeps the path and changes the query.

### When to use which
- **Absolute:** links to other sites, canonical URLs, Open Graph images, sitemaps, emails and RSS feeds (content viewed outside your site).
- **Root-relative:** internal links and assets in most apps; they survive moving pages between folders and changing domains.
- **Document-relative:** static sites that may be hosted under different subpaths, documentation folders, local files.

### Resolution rules
`new URL("../img/a.png", "https://example.com/blog/post/")` gives `https://example.com/blog/img/a.png`. A trailing slash on the base changes the result, which is a common source of broken links.

### `<base>`
`<base href="https://example.com/app/">` changes how all relative URLs on the page resolve. It is easy to misuse, so prefer explicit paths.
--- code
<style>body { font-family: system-ui; } code { background: #f1f5f9; padding: 0 4px; }</style>
<ul>
  <li>Absolute: <a href="https://developer.mozilla.org/en-US/docs/Learn">https://developer.mozilla.org/en-US/docs/Learn</a></li>
  <li>Root-relative: <a href="/docs/getting-started">/docs/getting-started</a></li>
  <li>Document-relative: <a href="../pricing.html">../pricing.html</a></li>
  <li>Fragment: <a href="#out">#out</a></li>
</ul>

<p id="out">Resolved against <code>https://example.com/blog/post/</code>:</p>
<pre id="results"></pre>
<script>
  const base = "https://example.com/blog/post/";
  const inputs = ["comments.html", "./img/cover.png", "../archive/", "/about", "?page=2", "#top", "https://other.site/x"];
  document.getElementById("results").textContent = inputs
    .map((u) => `${u.padEnd(18)} -> ${new URL(u, base).href}`)
    .join("\n");
</script>

=== hc20 | E | What is the <form> element?
**`<form>` groups interactive controls that collect user input and submits them to a URL (`action`) using an HTTP method (`method="get"` or `"post"`). It gives you built-in behaviors: submission on Enter, native validation, `FormData` serialization, reset, and accessibility semantics, without JavaScript.**

### Key attributes
- **`action`:** where to send the data (defaults to the current URL).
- **`method`:** `get` (data in the query string, for searches and filters) or `post` (data in the body, for changes). `dialog` closes a parent `<dialog>`.
- **`enctype`:** `application/x-www-form-urlencoded` (default) or `multipart/form-data` (required for file uploads).
- **`novalidate`:** skip native validation (when you render custom messages).
- **`autocomplete`:** `on`/`off` for the whole form.
- **`target`, `name`, `rel`, `accept-charset`.**

### How submission works
1. The user presses a submit button or Enter in a text field.
2. Constraint validation runs (`required`, `type`, `pattern`, `min`/`max`).
3. A `submit` event fires; JavaScript can call `event.preventDefault()` to handle it.
4. Controls with a `name` are serialized; disabled controls and those without `name` are skipped.

### Working with JavaScript
- `new FormData(form)` reads all values; `Object.fromEntries(formData)` makes an object.
- `form.requestSubmit()` submits with validation; `form.submit()` skips validation and the event.
- `form.reset()` restores default values.
- Frameworks build on this (React 19 `<form action={fn}>`, Next.js Server Actions, React Router `<Form>`).

### Accessibility
Every control needs a label, group related controls with `<fieldset>` and `<legend>`, and use a real `<button type="submit">`.
--- code
<style>
  body { font-family: system-ui; }
  form { display: grid; gap: 10px; max-width: 320px; }
  fieldset { border: 1px solid #cbd5e1; border-radius: 8px; }
</style>
<form id="signup" action="/api/signup" method="post">
  <label>Name <input name="name" required autocomplete="name"></label>
  <label>Email <input type="email" name="email" required autocomplete="email"></label>
  <fieldset>
    <legend>Plan</legend>
    <label><input type="radio" name="plan" value="free" checked> Free</label>
    <label><input type="radio" name="plan" value="pro"> Pro</label>
  </fieldset>
  <label><input type="checkbox" name="terms" required> I accept the terms</label>
  <button type="submit">Create account</button>
  <button type="reset">Reset</button>
</form>
<pre id="out"></pre>
<script>
  document.getElementById("signup").addEventListener("submit", (e) => {
    e.preventDefault(); // handle with JS for the demo (valid data only reaches here)
    document.getElementById("out").textContent = JSON.stringify(Object.fromEntries(new FormData(e.target)), null, 2);
  });
</script>

=== hc21 | E | What are form elements?
**Form elements are the controls and helpers used inside forms: `<input>` (with many types), `<textarea>`, `<select>` with `<option>` and `<optgroup>`, `<button>`, `<label>`, `<fieldset>` and `<legend>`, `<datalist>`, `<output>`, `<progress>` and `<meter>`. Together they collect, describe, group and display user input with built-in accessibility and validation.**

### The controls
- **`<input>`:** single-line fields and widgets: `text`, `email`, `password`, `number`, `date`, `checkbox`, `radio`, `range`, `color`, `file`, `search`, `tel`, `url`, `hidden`.
- **`<textarea>`:** multi-line text; `rows`, `maxlength`. CSS `field-sizing: content` (Baseline 2026) makes it grow with its content.
- **`<select>`:** dropdown or list (`multiple`, `size`); `<optgroup>` groups options. Newer browsers support fully stylable selects with `appearance: base-select`.
- **`<button>`:** `type="submit"` (default inside forms), `"button"`, or `"reset"`.

### Helpers
- **`<label>`:** names a control; clicking it focuses or toggles the control.
- **`<fieldset>` + `<legend>`:** groups related controls (radio groups, address blocks); `disabled` on a fieldset disables everything inside.
- **`<datalist>`:** suggestions for an input (`list` attribute).
- **`<output>`:** displays a calculation result.
- **`<progress>` and `<meter>`:** task progress and measurements.

### Shared attributes
`name`, `value`, `required`, `disabled`, `readonly`, `placeholder`, `autocomplete`, `autofocus`, `form` (associate a control with a form elsewhere on the page), `min`/`max`/`step`, `pattern`, `minlength`/`maxlength`.

### Accessibility basics
Label everything, keep a logical tab order, use `autocomplete` tokens so browsers can autofill, and announce errors clearly.
--- code
<style>
  body { font-family: system-ui; }
  form { display: grid; gap: 10px; max-width: 340px; }
  textarea { field-sizing: content; min-height: 3lh; } /* grows with content where supported */
</style>
<form oninput="total.value = (qty.valueAsNumber || 0) * 25">
  <label>Full name <input name="name" autocomplete="name"></label>
  <label>Country
    <input name="country" list="countries" placeholder="Start typing…">
    <datalist id="countries"><option value="India"><option value="Germany"><option value="Brazil"></datalist>
  </label>
  <label>Size
    <select name="size">
      <optgroup label="Regular"><option>S</option><option selected>M</option><option>L</option></optgroup>
      <optgroup label="Plus"><option>XL</option></optgroup>
    </select>
  </label>
  <label>Quantity <input type="number" id="qty" name="qty" min="1" max="10" value="1"></label>
  <p>Total: $<output name="total" for="qty">25</output></p>
  <fieldset><legend>Gift wrap</legend>
    <label><input type="checkbox" name="wrap"> Add gift wrap</label>
  </fieldset>
  <label>Note <textarea name="note"></textarea></label>
  <label>Upload <progress value="40" max="100">40%</progress></label>
  <button>Order</button>
</form>

=== hc22 | E | What are input types?
**The `type` attribute of `<input>` selects the kind of control and its built-in behavior: `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`, `time`, `datetime-local`, `month`, `week`, `color`, `range`, `checkbox`, `radio`, `file`, `hidden`, `submit`, `reset`, `button` and `image`. Choosing the right type gives free validation, the right mobile keyboard and native pickers.**

### Text-like
- `text`: default single-line text.
- `email`: validates email format; email keyboard on mobile; `multiple` for comma-separated lists.
- `password`: masked; use `autocomplete="current-password"` or `"new-password"` for password managers.
- `tel`: phone keypad (no format validation; add `pattern`).
- `url`: validates absolute URLs.
- `search`: may show a clear button; pairs with the `<search>` element.

### Numbers and ranges
- `number`: spinner, `min`/`max`/`step`; not suitable for things like card numbers or ZIP codes (use `text` with `inputmode="numeric"`).
- `range`: slider for approximate values.

### Dates and times
`date`, `time`, `datetime-local`, `month`, `week` open native pickers and return ISO strings (`2026-11-21`).

### Choice
`checkbox` (independent on/off), `radio` (one of a group sharing a `name`).

### Others
- `color`: color picker returning `#rrggbb`.
- `file`: file chooser; `accept="image/*"`, `multiple`, `capture` on mobile.
- `hidden`: data sent with the form but not shown.
- `submit`, `reset`, `button`, `image`: buttons (prefer `<button>` elements).

### Related attributes
`inputmode` (keyboard hint without validation), `enterkeyhint`, `autocomplete`, `pattern`, `required`.
--- code
<style>
  body { font-family: system-ui; }
  form { display: grid; grid-template-columns: max-content 1fr; gap: 8px 12px; max-width: 420px; align-items: center; }
</style>
<form>
  <label for="e">email</label> <input id="e" type="email" autocomplete="email">
  <label for="p">password</label> <input id="p" type="password" autocomplete="new-password" minlength="12">
  <label for="t">tel</label> <input id="t" type="tel" autocomplete="tel">
  <label for="u">url</label> <input id="u" type="url" placeholder="https://">
  <label for="n">number</label> <input id="n" type="number" min="0" max="100" step="5">
  <label for="zip">PIN code</label> <input id="zip" type="text" inputmode="numeric" pattern="[0-9]{6}">
  <label for="r">range</label> <input id="r" type="range" min="0" max="10">
  <label for="d">date</label> <input id="d" type="date" min="2026-01-01">
  <label for="dt">datetime-local</label> <input id="dt" type="datetime-local">
  <label for="c">color</label> <input id="c" type="color" value="#4f46e5">
  <label for="f">file</label> <input id="f" type="file" accept="image/*" multiple>
  <span>checkbox</span> <label><input type="checkbox" checked> Subscribe</label>
  <span>radio</span> <span><label><input type="radio" name="s" checked> S</label> <label><input type="radio" name="s"> M</label></span>
  <input type="hidden" name="source" value="landing">
  <span></span> <button>Submit</button>
</form>

=== hc23 | E | What is the label tag?
**`<label>` gives a form control its accessible name and visible caption. Screen readers read the label when the control is focused, and clicking the label focuses the input or toggles the checkbox or radio, which makes small controls easier to hit. Connect it with `for` matching the control's `id`, or by wrapping the control inside the label.**

### Two ways to associate
- **Explicit:** `<label for="email">Email</label> <input id="email">`.
- **Implicit:** `<label>Email <input></label>`.
Both work; explicit labels are more flexible for layout.

### Why placeholders are not labels
Placeholder text disappears when typing, often has low contrast, and is not reliably announced. Always use a real label (it can be visually hidden with a `.sr-only` class if the design requires).

### Groups
Radio buttons and checkbox groups need a group label: `<fieldset>` with a `<legend>` ("Shipping method"), and each option has its own `<label>`.

### Other ways to name controls
- `aria-label`: when no visible text exists (icon-only buttons).
- `aria-labelledby`: point to existing visible text.
Prefer a visible `<label>` for form fields.

### Extra help text
Connect hints and error messages with `aria-describedby`, so they are read after the label.

### Rules
- One label per control (multiple labels are allowed but confusing).
- Do not put interactive elements (links, buttons) inside a label.
- Labels should describe the field, not repeat instructions.

### Standards
WCAG 1.3.1 (Info and Relationships), 3.3.2 (Labels or Instructions) and 4.1.2 (Name, Role, Value).
--- code
<style>
  body { font-family: system-ui; }
  .field { display: grid; gap: 4px; margin-bottom: 12px; max-width: 300px; }
  .hint { color: #64748b; font-size: 13px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

<div class="field">
  <label for="email">Email address</label>
  <input id="email" type="email" aria-describedby="email-hint" autocomplete="email">
  <span id="email-hint" class="hint">We'll send a confirmation link.</span>
</div>

<!-- Implicit association + larger click target -->
<label><input type="checkbox" name="news"> Send me product updates</label>

<fieldset>
  <legend>Shipping method</legend>
  <label><input type="radio" name="ship" value="std" checked> Standard (free)</label><br>
  <label><input type="radio" name="ship" value="exp"> Express ($9)</label>
</fieldset>

<!-- Visually hidden label for a compact search box -->
<label for="q" class="sr-only">Search articles</label>
<input id="q" type="search" placeholder="Search…">

=== hc24 | E | What is the placeholder attribute?
**`placeholder` shows a short hint inside an empty text-like input or textarea, such as an example format (`name@example.com`), and disappears as soon as the user types. It is a hint, not a label: it should never replace a visible `<label>`, because it vanishes during typing, often has poor contrast, and is not reliably announced by assistive technology.**

### Good uses
- Example values: `placeholder="e.g. 2026-11-21"` or `"+91 98765 43210"`.
- Short hints in a search box that also has a (possibly visually hidden) label.

### Problems when misused
- Users forget what the field was for once they start typing.
- Light gray text often fails contrast requirements (WCAG 1.4.3).
- Some users mistake placeholder text for a prefilled value and skip the field.
- Translation tools and some screen readers handle it inconsistently.

### Better alternatives for instructions
Put format rules or requirements in helper text below the field, linked with `aria-describedby`.

### Styling
- `::placeholder` pseudo-element: `input::placeholder { color: #64748b; }` (ensure 4.5:1 contrast if it carries information).
- `:placeholder-shown` matches inputs currently showing the placeholder, which enables CSS-only "floating label" patterns.

### Applies to
`text`, `search`, `email`, `url`, `tel`, `password`, `number` and `<textarea>`. Not to checkboxes, radios, dates or `<select>`.
--- code
<style>
  body { font-family: system-ui; }
  .field { position: relative; margin: 16px 0; max-width: 300px; }
  input { width: 100%; padding: 18px 10px 6px; font-size: 16px; border: 1px solid #94a3b8; border-radius: 6px; box-sizing: border-box; }
  input::placeholder { color: #64748b; }                 /* accessible contrast */
  .field label { position: absolute; left: 10px; top: 14px; color: #475569; transition: all 0.15s; pointer-events: none; }
  input:focus + label, input:not(:placeholder-shown) + label { top: 2px; font-size: 12px; } /* floating label */
  .hint { font-size: 13px; color: #475569; }
</style>

<!-- Bad: placeholder used as the only label -->
<p><input placeholder="Email"></p>

<!-- Good: real label + example placeholder + helper text -->
<div class="field">
  <input id="phone" type="tel" placeholder="+91 98765 43210" aria-describedby="phone-hint">
  <label for="phone">Phone number</label>
</div>
<p id="phone-hint" class="hint">Include your country code.</p>

=== hc25 | E | What is the required attribute?
**`required` is a boolean attribute that marks a form control as mandatory. The browser blocks submission if the field is empty, focuses the first invalid field, shows a native message, and exposes the requirement to assistive technology. It works on most `<input>` types, `<select>` and `<textarea>`, and for radio groups on any radio with the shared `name`.**

### Behavior
- Empty required fields fail constraint validation, so the `submit` event does not fire.
- CSS pseudo-classes: `:required`, `:optional`, `:invalid`, `:valid`, and `:user-invalid` / `:user-valid`, which only match after the user has interacted (Baseline since 2023), so you avoid showing errors before the user types.
- JavaScript: `input.validity.valueMissing`, `form.checkValidity()`, `form.reportValidity()`, `input.setCustomValidity("message")`.

### Special cases
- **Checkbox:** must be checked (consent boxes).
- **Radio group:** one option must be selected.
- **`<select>`:** the first option must have an empty `value` to act as a placeholder ("Choose…").
- **File inputs:** a file must be chosen.
- Ignored for `hidden`, `range`, `color` and button types, and for `disabled` or `readonly` fields.

### UX and accessibility
- Show which fields are required visually (an asterisk with a legend, or "(required)" text), not only with color.
- Screen readers announce "required" automatically.
- Use `aria-required="true"` only on custom controls that are not native inputs.
- Use `novalidate` on the form if you render your own messages, but keep `required` for semantics.

### Remember
Client-side validation is for user experience; always validate on the server too.
--- code
<style>
  body { font-family: system-ui; }
  form { display: grid; gap: 10px; max-width: 320px; }
  input:user-invalid, select:user-invalid { border: 2px solid #dc2626; }  /* only after interaction */
  input:user-valid { border: 2px solid #16a34a; }
  .req::after { content: " *"; color: #dc2626; }
</style>
<p><span class="req"></span> = required</p>
<form>
  <label class="req" for="n">Name</label>
  <input id="n" name="name" required>

  <label class="req" for="topic">Topic</label>
  <select id="topic" name="topic" required>
    <option value="">Choose…</option>
    <option>Billing</option><option>Technical</option>
  </select>

  <fieldset><legend class="req">Contact method</legend>
    <label><input type="radio" name="contact" value="email" required> Email</label>
    <label><input type="radio" name="contact" value="phone"> Phone</label>
  </fieldset>

  <label><input type="checkbox" name="agree" required> I agree to the privacy policy</label>
  <button>Submit</button>
</form>

=== hc26 | M | What is the pattern attribute?
**`pattern` specifies a regular expression that the value of a text-like input (`text`, `tel`, `email`, `url`, `password`, `search`) must fully match for the form to be valid. It is anchored automatically, so `pattern="[0-9]{6}"` means exactly six digits. Pair it with a clear hint and a `title` or custom message, because the default error is generic.**

### Rules
- The whole value must match: browsers wrap it as `^(?:pattern)$`.
- Since 2023, browsers compile it with the `v` flag (Unicode sets), so some characters must be escaped inside character classes, such as `-` at certain positions, or the pattern is ignored. Test patterns in the browser.
- Empty values are not checked by `pattern`; add `required` if the field must be filled.
- No flags allowed (case-insensitive matching is not available; include both cases).

### Examples
- Indian PIN code: `[1-9][0-9]{5}`.
- Username: `[a-z0-9_]{3,16}`.
- Hex color: `#[0-9a-fA-F]{6}`.
- Strong password hint: `(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{12,}`.

### Messages
- `title` text is shown in some browsers as part of the error tooltip.
- Better: helper text visible near the field, and `setCustomValidity()` for a specific message in the `invalid` event.
- Style with `:user-invalid`.

### When not to use it
- For emails and URLs, prefer `type="email"` and `type="url"`.
- For numbers with ranges, `type="number"` with `min`/`max`, or `inputmode="numeric"` plus `pattern` for codes.
- For complex rules (dates, cross-field checks), validate in JavaScript and on the server.
--- code
<style>
  body { font-family: system-ui; }
  form { display: grid; gap: 6px; max-width: 320px; }
  input:user-invalid { border: 2px solid #dc2626; }
  small { color: #475569; }
</style>
<form id="f">
  <label for="pin">PIN code</label>
  <input id="pin" name="pin" inputmode="numeric" pattern="[1-9][0-9]{5}" required aria-describedby="pin-hint">
  <small id="pin-hint">6 digits, cannot start with 0</small>

  <label for="user">Username</label>
  <input id="user" name="user" pattern="[a-z0-9_]{3,16}" required aria-describedby="user-hint">
  <small id="user-hint">3-16 characters: lowercase letters, numbers, underscore</small>

  <label for="color">Brand color</label>
  <input id="color" name="color" pattern="#[0-9a-fA-F]{6}" placeholder="#4f46e5">

  <button>Save</button>
</form>
<script>
  const user = document.getElementById("user");
  user.addEventListener("invalid", () => {
    user.setCustomValidity(user.validity.patternMismatch ? "Use only a-z, 0-9 and _, 3 to 16 characters." : "");
  });
  user.addEventListener("input", () => user.setCustomValidity(""));
</script>
