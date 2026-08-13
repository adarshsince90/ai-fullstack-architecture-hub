# React Fiber Architecture, Reconciliation & Virtual DOM Internals

This guide explains how React works under the hood from first principles using pure JavaScript and systems engineering mental models.

---

## 1. Why the Virtual DOM & React Fiber Exist

In early web development, directly mutating the browser DOM (`document.getElementById('item').innerHTML = ...`) was expensive because every DOM modification triggers browser **Reflow (Layout calculation)** and **Repaint**.

React introduced two revolutionary abstractions:
1. **Virtual DOM**: A lightweight in-memory JavaScript representation of the actual DOM tree (Plain JS Objects).
2. **React Fiber Engine (React 16+)**: A complete rewrite of React's core reconciliation algorithm that replaced the synchronous stack-based reconciler with an asynchronous, incremental, interruptible virtual call stack.

---

## 2. The Fiber Node Data Structure

Each component instance in React corresponds to a **Fiber Node**—a plain JavaScript object acting as a unit of work.

```javascript
// Simplified conceptual Fiber Node
const fiberNode = {
  type: UserProfileComponent,  // Component function or DOM tag ('div')
  key: 'user-101',              // Unique key for list reconciliation
  props: { userId: 101 },      // Input properties
  
  // Tree Traversal Pointers (Singly Linked List)
  child: FiberNode,            // First direct child
  sibling: FiberNode,          // Next sibling component
  return: FiberNode,           // Parent Fiber Node
  
  // State & Effects
  memoizedState: { count: 0 }, // In-memory Hook linked list (useState, useReducer)
  alternate: CurrentFiberNode, // Pointer to previous committed fiber (Double Buffering)
  flags: 0b0000000000000010,   // Bitmask for DOM mutations (Placement, Update, Deletion)
};
```

---

## 3. The Two-Phase Lifecycle: Render Phase vs Commit Phase

React Fiber separates UI updates into two distinct phases to achieve smooth 60fps rendering:

```text
State Update Triggered (e.g. setState)
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ Phase 1: Render / Reconciliation Phase (Async / Interruptible) │
│                                                        │
│ • Traverses the Fiber tree using linked list pointers.  │
│ • Compares old Fiber vs new Virtual DOM elements (Diff).│
│ • Computes required DOM mutations and tags flags.     │
│ • Can be paused, aborted, or prioritized (Concurrent). │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Commit Phase (Synchronous / Blocking)         │
│                                                        │
│ • Takes the completed Fiber Work-in-Progress tree.     │
│ • Applies DOM mutations (createElement, removeChild).  │
│ • Swaps Work-in-Progress tree to Current tree.         │
│ • Fires synchronous layout effects (useLayoutEffect)   │
│   and asynchronous effects (useEffect).                │
└────────────────────────────────────────────────────────┘
```

---

## 4. Reconciliation Diffing Heuristics

React's $O(n)$ diffing algorithm operates on two key assumptions:
1. **Two elements of different types will produce different trees**: Changing from `<div><Counter /></div>` to `<span><Counter /></span>` causes React to destroy the entire old DOM sub-tree and rebuild it from scratch.
2. **Stable Keys in Lists**: The `key` prop gives React a unique identity to track items across re-orders and deletions without destroying and re-mounting identical DOM nodes.

> [!WARNING]
> **Anti-Pattern: Using Array Index as Key**
> Using index (`key={index}`) when list items can be re-ordered, filtered, or prepended causes React to reuse mismatched Fiber nodes, resulting in component state corruption and unnecessary DOM repaints. Always use stable business IDs (e.g., `key={user.id}`).
