# 03. React Fundamentals & Angular-to-React Concept Mapping

## 🌉 Angular to React: Mental Model Bridge

Coming from Angular (8-16) and TypeScript, here is your cheat sheet mapping Angular concepts to React paradigms:

| Angular (RxJS/Zone.js) | React (Hooks/JSX) | Conceptual Difference |
| :--- | :--- | :--- |
| **Component (`@Component`)** | Functional Component | React components are pure functions of `(props, state) => JSX`. |
| **`@Input()`** | `props` | Passed down read-only from parent to child. |
| **`@Output()` / `EventEmitter`** | Callback props (`onItemSelect`) | React passes callback functions down to children to communicate back up. |
| **`ngOnInit` / `ngOnDestroy`** | `useEffect(() => { return () => cleanup() }, [])` | React unifies component lifecycles into declarative side-effect synchronizations. |
| **Services / Dependency Injection** | React Context (`useContext`) / Custom Hooks | Shared state/logic passed down the tree via Context providers or custom composable hooks. |
| **Zone.js Change Detection** | Virtual DOM (VDOM) Fiber Reconciliation | React re-runs component functions when `state` or `props` change, building a VDOM diff. |
| **`BehaviorSubject` / Signals** | `useState` / `useReducer` / Redux | Reactive values in React trigger re-renders of the component and its children. |

---

## 🎣 React Hooks Core Reference

### 1. `useState` & `useReducer`
```jsx
// Simple State
const [count, setCount] = useState(0);
// Updater function syntax to prevent stale state bugs:
setCount(prevCount => prevCount + 1);

// Complex State with useReducer
const initialState = { count: 0 };
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    default: throw new Error();
  }
}
const [state, dispatch] = useReducer(reducer, initialState);
```

---

### 2. `useEffect` Synchronization
`useEffect` synchronizes your component with an external system (APIs, subscriptions, DOM listeners).

```jsx
useEffect(() => {
  const socket = connectToWebSocket();
  
  // Cleanup function (runs before re-running effect & on unmount)
  return () => {
    socket.disconnect();
  };
}, []); // Empty array = run once on mount, cleanup on unmount
```

> ⚠️ **Key Rule:** Never omit dependencies used inside `useEffect` without proper memoization, or you will cause stale closure bugs.

---

### 3. Performance Optimization: `useMemo`, `useCallback`, and `React.memo`

- **`React.memo`:** Wraps a component so it only re-renders if its props change (shallow comparison).
- **`useMemo`:** Caches the **result of a calculation** between renders.
- **`useCallback`:** Caches a **function definition** between renders so child components receiving the callback don't re-render.

```jsx
import React, { useState, useCallback, useMemo } from 'react';

const ChildComponent = React.memo(({ onItemClick, data }) => {
  console.log('Child rendered!');
  return <button onClick={onItemClick}>{data.title}</button>;
});

function ParentComponent() {
  const [count, setCount] = useState(0);

  // Memoize heavy calculation
  const expensiveCalculation = useMemo(() => {
    return count * 10000;
  }, [count]);

  // Memoize callback function reference
  const handleClick = useCallback(() => {
    console.log('Clicked!');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment ({count})</button>
      <ChildComponent onItemClick={handleClick} data={{ title: 'Submit' }} />
    </div>
  );
}
```

---

## ⚡ React Fiber & Reconciliation Algorithm

1. **Virtual DOM:** In-memory representation of DOM nodes.
2. **Reconciliation (Fiber):** React's diffing engine compares the new VDOM tree with the previous VDOM tree.
3. **Diffing Rules:**
   - Elements of different types produce different trees (e.g. `<div>` replaced by `<span>` unmounts entire subtree).
   - Keys (`key={item.id}`) tell React which list items were moved, added, or deleted across renders. Never use array index `key={index}` for dynamic/reordered lists!
