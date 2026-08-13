# RxJS Streams, NgRx Store & Angular Fine-Grained Signals

State management and reactive streams are core pillars of modern frontend architecture. Senior and Lead Engineers must know how to navigate the spectrum from asynchronous event streaming (RxJS) to global event-sourcing (NgRx) and fine-grained reactive primitives (Angular Signals).

---

## 1. RxJS Reactive Streams & The 4 Higher-Order Operators

An Observable represents a lazy, push-based stream of multiple values over time. Understanding higher-order mapping operators prevents race conditions and memory leaks:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. switchMap (Cancellable / Latest Wins):                              │
│    Cancels the previous inner subscription when a new value arrives.   │
│    • Use Case: Live Search Autocomplete (Discards slow stale requests).│
├────────────────────────────────────────────────────────────────────────┤
│ 2. mergeMap / flatMap (Concurrent / Parallel):                         │
│    Subscribes to all inner streams concurrently without cancellation.  │
│    • Use Case: Parallel file chunk uploads or multiple item deletes.   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. concatMap (Sequential / Queueing):                                  │
│    Queues inner streams and runs them in strict sequential order.      │
│    • Use Case: Financial transactions or ordered chat message posting. │
├────────────────────────────────────────────────────────────────────────┤
│ 4. exhaustMap (Ignore / Non-Reentrant):                                │
│    Ignores all new source emissions while an inner stream is active.   │
│    • Use Case: Submit buttons (Prevents double-click duplicate orders).│
└────────────────────────────────────────────────────────────────────────┘
```

### Search Typeahead Implementation:
```typescript
searchTerm$.pipe(
  debounceTime(300),                   // Waits 300ms of user typing inactivity
  distinctUntilChanged(),              // Discards identical consecutive inputs
  switchMap(term => this.api.search(term)) // Cancels previous pending HTTP request!
).subscribe(results => this.render(results));
```

---

## 2. NgRx Store: Unidirectional Event-Sourced Architecture

```text
               ┌───────────────────────┐
               │   Angular Component   │
               └───────────┬───────────┘
                           │ 1. Dispatch(Action)
                           ▼
               ┌───────────────────────┐
               │     Action Object     │ (type: '[Order] Checkout')
               └───────────┬───────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│ Reducer (Pure)  │                 │ NgRx Effect     │ (Async I/O / HTTP)
│ (State, Action) │                 │ (Listens for    │
│  ──► New State  │                 │  Action ──► API)│
└────────┬────────┘                 └────────┬────────┘
         │                                   │ (Dispatches Success Action)
         ▼                                   ▼
┌─────────────────────────────────────────────────────┐
│ Immutably Stored Global State Tree                  │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼ (Memoized createSelector)
┌─────────────────────────────────────────────────────┐
│ Component receives slice via async pipe / Signal    │
└─────────────────────────────────────────────────────┘
```

---

## 3. Angular Signals: Fine-Grained Push-Pull Reactivity

Introduced in Angular 16+, **Signals** provide synchronous, fine-grained reactive primitives that track dependencies automatically:

```typescript
import { signal, computed, effect } from '@angular/core';

// 1. Writable Signal
const quantity = signal(2);
const price = signal(50);

// 2. Computed Signal (Derived & Memoized)
// Recalculates ONLY when quantity or price changes!
const total = computed(() => quantity() * price());

// 3. Effect (Side-effect runner)
effect(() => {
  console.log(`Current cart total: $${total()}`);
});

// Mutating state:
quantity.set(3); // Log: "Current cart total: $150"
```

### Why Signals Outperform Zone.js & RxJS for Template Reactivity:
- **Glitch-Free Dependency Graph**: If Signal A triggers Computed B and Computed C, which both feed Computed D, Angular's Push-Pull engine guarantees D is evaluated **exactly once** with zero intermediate "glitch" values.
- **Zone-less Future**: Signals notify the framework precisely *which* DOM binding needs updating, eliminating top-to-bottom dirty checking of entire component trees.

---

## 4. Senior & Lead Interview Scenarios

### Q1: When should you choose Angular Signals over RxJS Observables?
**Lead Answer**:
- **Use Signals**: For synchronous state management, component local UI state, derived calculations (`computed()`), and template data bindings. Signals are simpler, memory-leak proof (no manual `unsubscribe()` required), and provide fine-grained reactivity.
- **Use RxJS**: For asynchronous, event-driven streams over time: WebSockets, debounced user keystrokes, multi-step asynchronous cancellation pipelines (`switchMap`), and complex event composition (`combineLatest`, `forkJoin`).

### Q2: How does NgRx `createSelector` prevent redundant re-renders?
**Lead Answer**: NgRx selectors implement **result caching / memoization**. A selector function only recalculates its output projection when the referenced input state slice references change (`===` reference equality). If unrelated parts of the global state tree mutate, the selector immediately returns its previously cached result reference, allowing `OnPush` components to skip change detection completely.
