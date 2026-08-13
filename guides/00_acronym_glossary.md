# Master Frontend & React Acronym Glossary

This reference guide breaks down every core abbreviation in the Frontend, React, Build Tooling, and Web Architecture landscape—defined from **first principles** using **Backend & Systems mental models**.

---

## 🗺️ Master End-to-End Pipeline: Source JSX to Pixels on Screen

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: BUILD TIME (CI/CD Server / Local Dev)                                                   │
│                                                                                                  │
│  [Source JSX Code] ──► Transpiler Parser ──► Build AST ──► AST Transformer ──► [Bundle JS Output] │
│  <button />            (esbuild/Babel)       (Node Tree)    (JSX -> JS)        React.createElement │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ HTTP Fetch over CDN (AWS S3 + CloudFront)
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: NETWORK & BROWSER PARSING                                                               │
│                                                                                                  │
│  HTML Stream ───────────────► HTML Parser ─────────────► Real DOM Tree                           │
│  CSS Stream ────────────────► CSS Parser  ─────────────► CSSOM Tree                              │
│  Bundle JS Stream ──────────► V8 Engine Parser ────────► V8 AST ──► Bytecode (Ignition)           │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ Execute Bytecode
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: REACT EXECUTION & VDOM RECONCILIATION                                                   │
│                                                                                                  │
│  Execute React Components ──► Create VDOM Tree ──► Fiber Diffing Engine ──► Minimal DOM Patches  │
│  (State / Props Change)       (In-Memory Objects)  (Old VDOM vs New VDOM)   (element.setAttribute) │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ Mutate Real DOM
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: CRITICAL RENDERING PATH & GRAPHICS HARDWARE                                             │
│                                                                                                  │
│  DOM + CSSOM ──► Render Tree ──► Layout (Reflow) ──► Paint Instructions ──► GPU Raster (Pixels)  │
│                                  (Calculate Bounds)   (Draw Calls)          (60-120 FPS Output)  │
```

---

## 🎯 The 2x2 Separation Matrix: Build-Time vs Browser & React vs Native

```
┌──────────────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────┐
│                              │ ⚛️ REACT SPECIFIC (Framework Layer)       │ 🌐 NATIVE BROWSER / JS (Universal Engine) │
├──────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ 🛠️ BEFORE BROWSER            │ • JSX Syntax                             │ • Transpiler AST (Babel / esbuild parser)│
│    (Build-Time / CI Server)  │ • React Transpiler Plugins               │ • SASS / PostCSS compilation             │
│                              │   (`react/jsx-runtime`)                  │ • Minification & JS Bundling             │
├──────────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ 🌐 INSIDE BROWSER            │ • Virtual DOM (VDOM Tree)                │ • Real DOM & CSSOM Trees                 │
│    (Runtime Engine)          │ • Fiber Reconciliation (Diffing Engine)  │ • V8 Engine & V8 AST / Bytecode          │
│                              │ • React Hooks (`useState`, `useEffect`)  │ • Layout / Reflow, Paint & Compositing   │
│                              │ • State Management (Redux, RTK, Context) │ • Event Loop & Microtask / Macrotask Queue│
└──────────────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 1. Core Transpilation & Compiler Terms

### **AST** — Abstract Syntax Tree
* **Full Form**: Abstract Syntax Tree
* **What it is**: A hierarchical tree representation of source code structure produced by a compiler parser.
* **Backend Analogy**: Exactly like how a SQL engine (PostgreSQL parser) converts a raw query string into an Execution Plan Tree, or how `javac`/`gcc` parses C++/Java source files into AST nodes (`BinaryOp`, `FunctionDeclaration`, `VariableDecl`).
* **Frontend Context**: Transpilers like **Babel**, **SWC**, and **esbuild** parse JS/JSX into an AST, traverse and transform nodes (e.g., converting JSX `<div />` into `React.createElement("div")`), and then generate output JavaScript code.

### **JSX** — JavaScript XML / JavaScript Syntax Extension
* **Full Form**: JavaScript Syntax Extension (commonly referred to as JavaScript XML)
* **What it is**: An XML-like syntax extension for JavaScript created by React. It allows writing UI structure inside JS code without using raw string templates.
* **Backend Analogy**: Domain-Specific Language (DSL) or Macro expansion (like Rust macros or C preprocessor directives).
* **Crucial Takeaway**: Browsers **cannot** execute JSX natively. Build tools use an **AST** parser to convert:
  ```jsx
  <button onClick={handleClick}>Click Me</button>
  ```
  into pure JavaScript:
  ```js
  React.createElement("button", { onClick: handleClick }, "Click Me");
  ```

---

## 2. Browser & Rendering Engine Terms

### **DOM** — Document Object Model
* **Full Form**: Document Object Model
* **What it is**: The browser's live, in-memory object tree representing the active HTML document structure.
* **Backend Analogy**: The primary in-memory database / state table of the browser process. Mutating real DOM nodes causes heavy layout recalculated (Reflow) and repainting operations.

### **VDOM** — Virtual Document Object Model
* **Full Form**: Virtual Document Object Model
* **What it is**: A lightweight plain JavaScript object tree maintained in memory by React that mirrors the real DOM structure.
* **Backend Analogy**: Shadow copy / Write-Ahead Log (WAL). React compares the old VDOM tree with the new VDOM tree (Diffing) and applies only the calculated diffs (Reconciliation) to the real DOM in a single batched operation.

### **CSSOM** — CSS Object Model
* **Full Form**: CSS Object Model
* **What it is**: The parsed representation of all CSS rules and stylesheets present on the page. Combined with the DOM tree to form the **Render Tree**.

---

## 3. Rendering Strategies

### **CSR** — Client-Side Rendering
* **Full Form**: Client-Side Rendering
* **What it is**: The backend returns a minimal HTML file (containing `<div id="root"></div>` and a `<script>` tag). The browser downloads the JS bundle, executes React, fetches JSON data via API, and constructs the DOM entirely on the user's machine.

### **SSR** — Server-Side Rendering
* **Full Form**: Server-Side Rendering
* **What it is**: The backend server runs Node.js/React to execute component logic, fetch data, render full HTML strings on the fly for each HTTP request, and stream the HTML back to the browser.
* **Backend Analogy**: Traditional dynamic rendering engines like Spring MVC (Thymeleaf), Django templates, or Rails ERB.

### **SSG** — Static Site Generation
* **Full Form**: Static Site Generation
* **What it is**: HTML pages are pre-compiled and rendered at **build time** on a CI server and uploaded directly to static storage (e.g., AWS S3 + CloudFront CDN).

### **ISR** — Incremental Static Regeneration
* **Full Form**: Incremental Static Regeneration
* **What it is**: SSG pages regenerated asynchronously in the background on demand when requested after a stale cache TTL (Time To Live).

### **RSC** — React Server Components
* **Full Form**: React Server Components
* **What it is**: React components that execute exclusively on the backend server, fetching database/microservice data directly without sending any JavaScript bundle code to the browser client.

---

## 4. React & State Architecture

### **HOC** — Higher-Order Component
* **Full Form**: Higher-Order Component
* **What it is**: A function that takes a component as an argument and returns an enhanced component.
* **Backend Analogy**: Decorator Pattern / Express Middleware wrapper (e.g., `withAuth(UserProfileHandler)`).

### **RTK** — Redux Toolkit
* **Full Form**: Redux Toolkit
* **What it is**: The official, standard toolset for efficient Redux development. Provides utilities like `createSlice` and `createAsyncThunk` built on top of `Immer` for immutable state updates.
* **Backend Analogy**: Spring Boot for Java or ORMs (SQLAlchemy/Prisma) that eliminate verbose boilerplate.

### **FP** — Functional Programming
* **Full Form**: Functional Programming
* **What it is**: Programming paradigm emphasizing pure functions, immutability, and side-effect isolation (`useState`, `useReducer`, Redux Reducers).

---

## 5. Network & Web Protocols

### **CORS** — Cross-Origin Resource Sharing
* **Full Form**: Cross-Origin Resource Sharing
* **What it is**: An HTTP header mechanism (`Access-Control-Allow-Origin`) that allows a server to indicate any origins (domain, scheme, or port) other than its own from which a browser should permit loading resources.

### **SPA** — Single Page Application
* **Full Form**: Single Page Application
* **What it is**: A web application that loads a single web document and updates the body content dynamically via JS without full browser page reloads.

### **PWA** — Progressive Web App
* **Full Form**: Progressive Web App
* **What it is**: A web app enhanced with Service Workers (background workers) and Web App Manifests to offer offline caching, push notifications, and native app-like capabilities.
