# Angular Enterprise Architecture: Standalone Components, DI & Change Detection

Angular is an enterprise-grade TypeScript framework featuring compile-time template checking, hierarchical dependency injection, and fine-grained change detection. Senior and Lead Engineers must understand Standalone component migration, injector resolution hierarchies, and the mechanics of Zone.js vs OnPush performance.

---

## 1. Standalone Components vs Legacy NgModules

Starting in Angular 14–17+, **Standalone Components** eliminate the boilerplate and cognitive overhead of `NgModule`:

```typescript
// Modern Standalone Angular 17+ Component
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (user(); as u) {
      <div class="user-card">
        <h3>{{ u.name }}</h3>
        <p>{{ u.email }}</p>
      </div>
    } @else {
      <p>Loading user profile...</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent {
  private userService = inject(UserService); // Modern inject() function
  user = this.userService.currentUser;
}
```

---

## 2. Hierarchical Dependency Injection (Injector Tree)

Angular's DI system is a two-tiered hierarchical tree:

```text
┌────────────────────────────────────────────────────────┐
│ 1. ENVIRONMENT INJECTOR HIERARCHY                      │
│    • NullInjector (Top: Throws Error if not found)     │
│    • ModuleInjector (Root / providedIn: 'root')        │
│      └── Instantiated once as an app-wide Singleton!   │
├────────────────────────────────────────────────────────┤
│ 2. ELEMENT INJECTOR HIERARCHY                          │
│    • Component Level (providers: [FeatureService])     │
│      └── Created when component mounts, destroyed when │
│          component is unmounted!                       │
│    • Directive Level                                   │
└────────────────────────────────────────────────────────┘
```

### DI Resolution Modifiers:
- `@Self()`: Looks ONLY in the component's immediate Element Injector.
- `@SkipSelf()`: Skips the immediate component and begins search in parent injectors.
- `@Optional()`: Returns `null` instead of throwing error if dependency is missing.
- `@Host()`: Stops looking at the boundary of the host component template.

---

## 3. Change Detection: Zone.js vs `OnPush` Strategy

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. DEFAULT CHANGE DETECTION (Zone.js Traversal)                        │
│    Any async event (click, timer, HTTP) ──► Zone.js monkey-patches     │
│    ──► Angular runs dirty-checking across 100% OF EVERY COMPONENT      │
│    in the entire application tree! (Can cause massive CPU overhead)    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. ONPUSH STRATEGY (ChangeDetectionStrategy.OnPush)                    │
│    Angular SKIPS dirty-checking the component sub-tree UNLESS:         │
│    • An @Input() reference changes (Immutable Object Reference).       │
│    • An event handler originated from inside this component.           │
│    • An Observable bound via the `async` pipe emits.                   │
│    • An Angular Signal read in the template changes.                   │
│    • Explicitly triggered via `ChangeDetectorRef.markForCheck()`.      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Modern Control Flow & Deferrable Views (Angular 17+)

```text
@defer (on viewport; prefetch on idle) {
  <app-heavy-analytics-chart [data]="chartData()" />
} @placeholder {
  <div class="skeleton-loader">Loading Chart...</div>
}
```
- **`@defer`**: Automatically code-splits the imported component into an independent lazy-loaded JavaScript chunk and downloads it only when it scrolls into the user's viewport!

---

## 5. Senior & Lead Interview Scenarios

### Q1: What is the difference between `ChangeDetectorRef.markForCheck()` and `ChangeDetectorRef.detectChanges()`?
**Lead Answer**:
- `detectChanges()` runs change detection **immediately** and synchronously on the current component and its immediate children. Useful for detached components or micro-optimizations, but can cause `ExpressionChangedAfterItHasBeenCheckedError` if used improperly.
- `markForCheck()` does NOT run change detection immediately. Instead, it marks the current component and all of its ancestors as "dirty", informing Angular to check this path during the next scheduled top-to-bottom change detection cycle. This is the safe and standard pattern for `OnPush` components.

### Q2: How do you migrate an enterprise legacy Angular application with 50+ NgModules to Standalone Components?
**Lead Answer**:
1. Run the official Angular CLI migration schematic: `ng generate @angular/core:standalone`.
2. Phase 1: Convert child leaf components, pipes, and directives to `standalone: true`.
3. Phase 2: Convert feature modules into standalone routing configs (`loadChildren: () => import('./routes')`).
4. Phase 3: Eliminate `AppModule` and bootstrap using `bootstrapApplication(AppComponent, { providers: [...] })`.
