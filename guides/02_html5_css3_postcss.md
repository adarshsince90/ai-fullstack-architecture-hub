# 02. HTML5, CSS3, PostCSS, Gulp & Esbuild

## 🧱 HTML5 & Accessibility (a11y)

### 1. Semantic HTML Structure
Always use semantic tags instead of generic `<div>` soup. Semantics improve SEO, readability, and accessibility tree parsing by screen readers.

```html
<header>
  <nav aria-label="Main Navigation">
    <ul>
      <li><a href="/home">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Senior Frontend Engineering</h1>
    <section>
      <h2>Key Responsibilities</h2>
    </section>
  </article>
  <aside>
    <h3>Related Topics</h3>
  </aside>
</main>
<footer>
  <p>&copy; 2026</p>
</footer>
```

### 2. ARIA Best Practices
- **First rule of ARIA:** Use native HTML elements first (`<button>` instead of `<div onClick=... role="button">`).
- Use `aria-expanded="true/false"` for collapsible menus.
- Use `aria-live="polite"` for dynamic notifications without interrupting screen reader speech.

---

## 🎨 Modern CSS3 (Flexbox, Grid & Custom Properties)

### Flexbox vs. CSS Grid
- **Flexbox:** One-dimensional layout (row OR column). Ideal for component alignment, nav bars, button groups.
- **CSS Grid:** Two-dimensional layout (rows AND columns simultaneously). Ideal for page-level layouts, dashboard card grids.

```css
/* Modern Responsive Grid without Media Queries */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* Flexbox Centering */
.center-box {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### CSS Custom Properties (Variables)
Unlike SASS variables which compile away, CSS variables exist live in the DOM and inherit hierarchically.

```css
:root {
  --primary-color: #6366f1;
  --bg-dark: #0a0c14;
}

[data-theme="dark"] {
  --primary-color: #38bdf8;
  --bg-dark: #0f172a;
}

.card {
  background-color: var(--bg-dark);
  color: var(--primary-color);
}
```

---

## ⚙️ CSS Post-Processors: PostCSS

### What is PostCSS?
PostCSS is a tool for transforming CSS with JS plugins. It parses CSS code into an Abstract Syntax Tree (AST), runs plugins over the AST, and outputs transformed CSS.

### Key Plugins
1. **Autoprefixer:** Automatically adds vendor prefixes (`-webkit-`, `-moz-`, `-ms-`) based on your target browser list in `browserslist`.
2. **postcss-nested:** Allows nesting CSS rules like SASS natively.
3. **cssnano:** Minifies CSS for production.

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-nested'),
    require('autoprefixer')({
      overrideBrowserslist: ['> 1%', 'last 2 versions']
    }),
    require('cssnano')({ preset: 'default' })
  ]
};
```

---

## 🛠️ Task Runners (Gulp) vs Next-Gen Bundlers (Esbuild)

### Gulp (Task Automation)
Gulp uses Node streams to execute sequential or parallel build workflows.

```javascript
// gulpfile.js
const { src, dest, series, parallel } = require('gulp');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');

function compileStyles() {
  return src('src/styles/*.css')
    .pipe(postcss([autoprefixer()]))
    .pipe(dest('dist/css'));
}

exports.default = series(compileStyles);
```

### Esbuild (Ultra-fast Bundler written in Go)
Esbuild compiles JavaScript/TypeScript and packages CSS up to **100x faster** than traditional webpack setups due to Go's parallelized architecture and efficient memory usage.

```javascript
// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['chrome90', 'firefox88', 'safari14'],
  outfile: 'dist/bundle.js',
}).catch(() => process.exit(1));
```
