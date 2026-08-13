# Frontend Foundations: HTML5 Semantics, Modern CSS3 & Core Web Vitals

Modern frontend engineering begins with semantic document structure, scalable CSS layout engines, and deterministic web performance optimization. Senior and Lead Engineers must understand the browser layout engine, layout algorithms, and Core Web Vitals (CWV) metrics from first principles.

---

## 1. HTML5 Semantics & Accessibility (A11y)

HTML5 semantic tags provide structural meaning to browser rendering engines, screen readers (assistive technology), and search engine crawlers:

```text
┌────────────────────────────────────────────────────────┐
│ <header> - Global site branding & top navigation       │
├────────────────────────────────────────────────────────┤
│ <nav>   - Accessible landmark for navigation links     │
├────────────────────────────────────────────────────────┤
│ <main>  - Unique primary content of the document       │
│  ├── <article> - Self-contained, syndicatable content  │
│  ├── <section> - Thematic grouping with a heading      │
│  └── <aside>   - Tangential content / sidebar info     │
├────────────────────────────────────────────────────────┤
│ <footer> - Copyright, legal links, and footer metadata │
└────────────────────────────────────────────────────────┘
```

### Accessibility (ARIA & WCAG 2.1 AA Compliance):
- **Native over ARIA**: Always use native HTML elements (`<button>`, `<dialog>`, `<input>`) instead of `<div role="button">`. Native elements come pre-packaged with keyboard focus management (`Tab`, `Enter`, `Space`) and screen-reader accessibility trees.
- **Form Association**: Ensure `<label for="email-input">` matches `<input id="email-input">` or wrap `<label><input /></label>`.

---

## 2. Modern CSS3: Flexbox vs CSS Grid

```text
┌────────────────────────────────────────────────────────┐
│ 1. CSS FLEXBOX (1-Dimensional Layout Engine)           │
│    • Operates along ONE axis (Row OR Column).          │
│    • Content-driven: Items size based on their content.│
│    • Ideal for: Navbars, button groups, card headers.  │
├────────────────────────────────────────────────────────┤
│ 2. CSS GRID (2-Dimensional Layout Engine)              │
│    • Operates along BOTH axes (Rows AND Columns).      │
│    • Container-driven: Layout structure dictates items.│
│    • Ideal for: Page layouts, dashboards, galleries.   │
└────────────────────────────────────────────────────────┘
```

### Flexbox Key Mechanics:
- `flex: 1 1 auto` $\to$ `flex-grow: 1`, `flex-shrink: 1`, `flex-basis: auto`.
- `justify-content` aligns along the **Main Axis**; `align-items` aligns along the **Cross Axis**.

### Modern CSS Grid Power Patterns:
```css
/* Responsive Grid with Zero Media Queries! */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

---

## 3. Core Web Vitals (CWV) Optimization from First Principles

Google's Core Web Vitals measure real-world user experience (Field Data / CrUX):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LCP (Largest Contentful Paint) - Loading Performance (< 2.5s)       │
│    Measures when the largest visible text block or image is rendered.  │
│    • Key Fix: Preload hero image: <link rel="preload" as="image" ...>  │
│    • Add fetchpriority="high" to the LCP <img> element.                │
│    • Inline Critical CSS and eliminate render-blocking JS in <head>.   │
├────────────────────────────────────────────────────────────────────────┤
│ 2. INP (Interaction to Next Paint) - Responsiveness (< 200ms)          │
│    Replaced FID (First Input Delay). Measures worst latency across ALL │
│    user clicks/taps during the entire page session until next frame.   │
│    • Key Fix: Break long JS tasks (>50ms) using scheduler.yield() or   │
│      requestIdleCallback().                                            │
│    • Debounce high-frequency input and search filter handlers.         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CLS (Cumulative Layout Shift) - Visual Stability (< 0.1)            │
│    Measures unexpected layout shifts while the user is reading.        │
│    • Key Fix: Always set explicit width/height or aspect-ratio on      │
│      images, videos, and dynamic ad containers.                        │
│    • Use font-display: optional or size-adjust for web fonts.          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Senior & Lead Interview Scenarios

### Q1: How do you eliminate render-blocking JavaScript and CSS to improve LCP?
**Lead Answer**:
1. **Critical CSS Inlining**: Extract and inline the above-the-fold CSS directly into a `<style>` block in the HTML document `<head>`. Load non-critical CSS asynchronously via `<link rel="preload" as="style" onload="this.rel='stylesheet'">`.
2. **Asynchronous JavaScript Execution**: Add `defer` (executes in document order after HTML parsing completes) or `async` (executes immediately upon download) to all `<script>` tags, preventing HTML parser blocking.
3. **Resource Hints**: Use `rel="preconnect"` and `rel="dns-prefetch"` for third-party CDNs and API origins.

### Q2: What causes high INP (Interaction to Next Paint) in React/Angular applications and how do you fix it?
**Lead Answer**: High INP occurs when a user interaction (e.g. clicking a filter checkbox) triggers a synchronous JavaScript task that hogs the main thread for >50ms, delaying the browser from painting the next visual frame.
- **Mitigation**:
  - In **React 18+**: Wrap non-urgent state updates in `startTransition(() => setFilter(val))` or `useDeferredValue()`, allowing high-priority keystrokes/clicks to interrupt background rendering.
  - Yield the main thread: Break heavy data transformations using `await scheduler.yield()` or Web Workers.
