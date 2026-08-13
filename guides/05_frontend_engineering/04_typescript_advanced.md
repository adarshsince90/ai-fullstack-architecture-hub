# Advanced TypeScript Type System, Generics & Metaprogramming

TypeScript is not merely "JavaScript with type annotations"—it is a Turing-complete, compile-time type-level functional programming language. Senior and Lead Engineers must know how to build strongly-typed libraries, eliminate `any`, and design compile-time invariants.

---

## 1. Conditional Types & the `infer` Keyword

Conditional types allow types to branch dynamically based on type relationships: `T extends U ? X : Y`.

```typescript
// Unwrapping Promise inner types dynamically:
type AwaitedType<T> = T extends Promise<infer R> ? AwaitedType<R> : T;

type ResponseType = AwaitedType<Promise<Promise<{ id: string; name: string }>>>;
// Result: { id: string; name: string }

// Extracting Function Return Types:
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

---

## 2. Discriminated Unions & Exhaustiveness Checking

Discriminated unions combine a literal "tag" property with pattern matching to guarantee complete compile-time branch coverage:

```typescript
type ApiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; error: Error };

function renderUi(state: ApiState): string {
  switch (state.status) {
    case 'idle': return 'Click to load';
    case 'loading': return 'Spinner...';
    case 'success': return `Items: ${state.data.join(', ')}`;
    case 'error': return `Failed: ${state.error.message}`;
    default: {
      // 🛡️ Exhaustive Check: If a new state is added to ApiState,
      // TypeScript throws a COMPILE ERROR here!
      const _unreachable: never = state;
      throw new Error(`Unhandled state: ${_unreachable}`);
    }
  }
}
```

---

## 3. Mapped Types & Key Remapping via `as`

Mapped types transform existing object properties into new shapes:

```typescript
// 1. Deep Readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 2. Generating Getter Methods for any Interface:
type User = { id: string; age: number };

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// Result: { getId: () => string; getAge: () => number; }
```

---

## 4. Template Literal Types for Type-Safe Routing & Events

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = '/users' | '/orders' | '/products';

type ApiRoute = `${HttpMethod} ${ApiEndpoint}`;
// Result: "GET /users" | "GET /orders" | "POST /users" | ... (12 exact string combinations!)

// Type-safe event bus listener:
type Entity = 'user' | 'order';
type Action = 'created' | 'updated' | 'deleted';
type DomainEventName = `${Entity}:${Action}`; // "user:created" | "order:deleted" ...
```

---

## 5. Senior & Lead Interview Scenarios

### Q1: What is the difference between `unknown` and `any` in TypeScript?
**Lead Answer**: 
- `any` disables all type-checking entirely, allowing arbitrary property access and method calls that bypass compile-time safety and propagate runtime errors.
- `unknown` is the type-safe counterpart of `any`. You can assign any value to an `unknown` variable, but TypeScript forbids performing operations on it (or passing it to typed functions) until you explicitly narrow the type using type guards (`typeof`, `instanceof`, or custom type predicates `is`).

### Q2: How do you implement a strictly type-safe `Pick` and `Omit` from scratch?
**Lead Answer**:
```typescript
// Custom Pick
type StrictPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Custom Omit (using Exclude mapped keys)
type StrictOmit<T, K extends keyof any> = {
  [P in Exclude<keyof T, K>]: T[P];
};
```
