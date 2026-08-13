# React Custom Hooks, State Architecture & Redux Toolkit (RTK)

In enterprise React engineering, building performant, maintainable applications requires mastering the functional component execution lifecycle, custom hook composition, and scalable state architecture. Senior and Lead Engineers must understand hook closure mechanics, Context API performance traps, and Redux Toolkit event-sourcing with Immer.

---

## 1. React Hooks Execution Model & Stale Closures

In React, functional components execute from top to bottom on **every single render cycle**. Hooks (`useState`, `useEffect`, `useCallback`) rely on a **linked list of hook cells** stored on the component's Fiber node.

```text
Component Render #1 (State: count = 0)
  ├── Hook 1: useState(0)      ──► Cell 1: { memoizedState: 0 }
  ├── Hook 2: useEffect(fn)    ──► Cell 2: { create: fn, deps: [] }
  └── Closure captures count = 0 in memory!

Component Render #2 (State: count = 1)
  ├── Hook 1: useState(1)      ──► Cell 1: { memoizedState: 1 }
  └── New closure created with count = 1!
```

### The Stale Closure Bug:
```javascript
// ❌ BUGGY: Stale Closure
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // ⚠️ Closes over 'count' from Render #1 forever!
      // Always computes 0 + 1 = 1 on every timer tick!
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []); // Empty deps captures initial render state

  return <h1>{count}</h1>;
}

// ✅ FIX: Functional State Updater
setCount(prevCount => prevCount + 1); // Reads latest in-memory state directly from Fiber!
```

---

## 2. When to Use `useMemo` & `useCallback` (Senior Trade-Offs)

Over-optimizing with `useMemo` and `useCallback` adds memory allocation overhead (allocating dependency arrays and cache objects) that can be more expensive than cheap primitive recalculations.

```text
┌────────────────────────────────────────────────────────┐
│ WHEN TO USE MEMOIZATION:                               │
│                                                        │
│ 1. Expensive Calculations (Math, large array filters): │
│    const filtered = useMemo(() => heavySort(list), [list]);
│                                                        │
│ 2. Preserving Referentially Stable Callbacks:          │
│    Passing callbacks to memoized children (React.memo):│
│    const onSave = useCallback((id) => api(id), []);   │
│                                                        │
│ 3. useEffect Dependency References:                    │
│    Preventing infinite effect loops caused by objects. │
└────────────────────────────────────────────────────────┘
```

---

## 3. The State Management Spectrum: Context API vs Redux Toolkit

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LOCAL STATE (useState / useReducer)                                 │
│    • Form inputs, modal open/close, accordion toggles.                 │
├────────────────────────────────────────────────────────────────────────┤
│ 2. CONTEXT API (Dependency Injection / Static Config)                  │
│    • Theme (Dark/Light), Current User, Localization/i18n.              │
│    • ⚠️ PITFALL: Context is NOT a state management tool! Any change    │
│      in context value forces an immediate RE-RENDER of ALL consuming   │
│      child components, bypassing React.memo!                           │
├────────────────────────────────────────────────────────────────────────┤
│ 3. REDUX TOOLKIT (RTK) (Global Event-Sourcing & Complex Workflows)     │
│    • Multi-step checkouts, shopping carts, normalized caching.         │
│    • Selectors (useSelector) provide fine-grained component re-renders.│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Redux Toolkit (RTK) & Immer Proxy Mutations

Redux Toolkit uses **Immer** under the hood. Immer wraps your state in a JavaScript `Proxy` object, allowing you to write "mutating" syntax that is safely converted into an immutable state copy:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem { id: string; name: string; quantity: number; }
interface CartState { items: CartItem[]; }

const initialState: CartState = { items: [] };

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Looks mutable, but Immer creates an immutable structural clone!
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        existing.quantity += action.payload.quantity; // Direct mutation safe!
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    }
  }
});
```

---

## 5. Server State vs Client State (RTK Query / Apollo Client)

- **Client State**: Ephemeral UI state (open drawers, draft form text).
- **Server State**: Remote data owned by the backend database (users, orders).
- **Normalized Caching**: RTK Query and Apollo Client store server data as a normalized relational table keyed by `__typename:id`. When an entity updates, every component bound to that entity updates automatically without manual dispatching.

---

## 6. Senior & Lead Interview Scenarios

### Q1: Why do React Hooks forbid conditional calls (e.g. inside `if` statements or loops)?
**Lead Answer**: React does not associate hook state by variable names; it stores hook cells as a flat **singly-linked list** on the component's Fiber node (`fiber.memoizedState`). On subsequent renders, React walks this linked list sequentially. If a hook is called conditionally, the index order shifts, causing subsequent hooks to receive the wrong state pointers and corrupting the component's memory.

### Q2: How do you resolve massive re-render cascades caused by React Context API?
**Lead Answer**:
1. **Split Contexts**: Separate rapidly changing state from static state (e.g., split `UserContext` into `UserAuthContext` and `UserDispatchContext`).
2. **Component Colocation**: Push state down as close as possible to the leaf components that actually use it.
3. **Adopt RTK or Zustand**: Migrate high-frequency shared state to Redux Toolkit or Zustand, where components subscribe via selectors (`useSelector(state => state.activeTab)`) and only re-render when their specific selected slice changes.
