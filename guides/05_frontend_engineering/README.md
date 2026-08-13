# Domain 5: Frontend Engineering & Multi-Framework Ecosystem

Welcome to the **Frontend Engineering** domain guide. This unified curriculum is structured progressively from web foundations and core JavaScript/TypeScript to modern enterprise frameworks (Angular 8–17 & React 18/19), state management architectures, and cross-framework comparisons.

---

## 🗺️ Progressive Learning Mind Map

```text
Frontend Engineering
 ├── Level 1: Foundations
 │    ├── HTML5 Semantic Architecture & Accessibility (ARIA)
 │    ├── CSS3 Modern Layouts (Flexbox, Grid, Custom Properties)
 │    └── Browser Rendering Pipeline & Core Web Vitals (LCP, INP, CLS)
 │
 ├── Level 2: Core JavaScript & TypeScript
 │    ├── ES6+ Closures, Prototypes & Memory Leaks
 │    ├── Event Loop, Call Stack, Microtasks & Macrotasks
 │    └── TypeScript 5+ Advanced Types, Generics & Discriminated Unions
 │
 ├── Level 3: Angular Ecosystem
 │    ├── Component Architecture, Dependency Injection & Change Detection (Zone.js vs OnPush)
 │    ├── RxJS Observables, Operators & Subject Multicasting
 │    └── NgRx Global Store vs Angular Signals Fine-Grained Reactivity
 │
 └── Level 4: React Ecosystem
      ├── React Fiber Architecture & Concurrent Mode
      ├── Virtual DOM Reconciliation Diffing & JSX Compilation
      ├── Custom Hooks Mechanics & Closures
      └── Redux Toolkit (RTK) Event-Sourcing & Immer Mutation Drafts
```

---

## 📚 Detailed Guides

### 📌 Level 1: Foundations
- [01_fe_foundations.md](./guides/05_frontend_engineering/01_fe_foundations.md) — Semantic HTML5, CSS layout engines, Critical Rendering Path.
- [02_browser_rendering.md](./guides/05_frontend_engineering/02_browser_rendering.md) — DOM/CSSOM tree construction, Layout/Reflow, Repaint, Compositing layers, Core Web Vitals.

### 📌 Level 2: Core JavaScript & TypeScript
- [03_js_core_event_loop.md](./guides/05_frontend_engineering/03_js_core_event_loop.md) — Execution contexts, Lexical scopes, Event Loop phases, Promise microtask queues.
- [04_typescript_advanced.md](./guides/05_frontend_engineering/04_typescript_advanced.md) — Generics, Mapped Types, `infer` keyword, Conditional Types, strict null checking.

### 📌 Level 3: Angular Ecosystem
- [05_angular_architecture.md](./guides/05_frontend_engineering/05_angular_architecture.md) — Hierarchical DI, Standalone Components, `ChangeDetectionStrategy.OnPush`.
- [06_rxjs_ngrx_signals.md](./guides/05_frontend_engineering/06_rxjs_ngrx_signals.md) — RxJS streaming vs Signals reactive primitives (`signal`, `computed`, `effect`), NgRx Reducer patterns.

### 📌 Level 4: React Ecosystem
- [07_react_fiber_reconciliation.md](./guides/05_frontend_engineering/07_react_fiber_reconciliation.md) — Fiber Node 2-phase lifecycle (Render/Reconcile vs Commit), key prop heuristics, Virtual DOM diffing.
- [08_react_hooks_redux_toolkit.md](./guides/05_frontend_engineering/08_react_hooks_redux_toolkit.md) — Hook closure traps, `useMemo`/`useCallback`, Context API vs Redux Toolkit (RTK), Immer immutable drafts.

---

## ⚡ Cross-Framework Mental Model Comparison

| Architectural Concept | Angular Paradigm | React Paradigm | Systems / Backend Equivalent |
| :--- | :--- | :--- | :--- |
| **Component Model** | Class-based with `@Component` decorators & DI | Pure Functional Components `(props) => JSX` | Controller / Request Handler |
| **Change Detection** | Dirty checking via Zone.js or Signals graph | Top-down re-render with Fiber Reconciliation diff | State Diffing / Dirty Tracking |
| **Reactivity Primitive** | RxJS Observables / Angular Signals | `useState`, `useReducer`, `useEffect` | Event Streams / In-memory state |
| **State Management** | NgRx / ComponentStore / Signals | Redux Toolkit (RTK) / Zustand | CQRS / Event-Sourcing Log |
| **Dependency Injection**| Built-in hierarchical IoC container | React Context API / Custom Hooks | Service Locator / Scoped DI |
