import { Component, ChangeDetectionStrategy, signal, computed, effect, inject, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// =========================================================================
// 1. Angular Fine-Grained Signals State Store (Signal Store Pattern)
// =========================================================================
@Injectable({ providedIn: 'root' })
export class CartSignalsStore {
  // Writable State Signals
  readonly items = signal<OrderItem[]>([
    { id: '101', name: 'Cloud Architecture Handbook', price: 49.99, quantity: 1 },
    { id: '102', name: 'Microservices Design Patterns', price: 59.99, quantity: 2 }
  ]);
  readonly taxRate = signal<number>(0.08); // 8% tax

  // Computed Derived State (Glitch-free, automatic memoization!)
  readonly subtotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  readonly taxAmount = computed(() => this.subtotal() * this.taxRate());

  readonly grandTotal = computed(() => this.subtotal() + this.taxAmount());

  readonly totalItemCount = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity, 0)
  );

  constructor() {
    // Reactive Effect for telemetry / audit logging
    effect(() => {
      console.log(`[ANALYTICS] Cart updated: ${this.totalItemCount()} items, Grand Total: $${this.grandTotal().toFixed(2)}`);
    });
  }

  // State Mutation Methods
  updateQuantity(id: string, delta: number) {
    this.items.update(currentItems =>
      currentItems
        .map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter(item => item.quantity > 0)
    );
  }

  clearCart() {
    this.items.set([]);
  }
}

// =========================================================================
// 2. Standalone Angular 17+ Component with OnPush
// =========================================================================
@Component({
  selector: 'app-cart-manager',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cart-container">
      <h2>🛒 Enterprise Cart Manager (Angular Signals)</h2>

      @if (store.items().length > 0) {
        <ul class="cart-list">
          @for (item of store.items(); track item.id) {
            <li class="cart-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">\${{ item.price }}</span>
              <div class="qty-controls">
                <button (click)="store.updateQuantity(item.id, -1)">-</button>
                <span class="qty">{{ item.quantity }}</span>
                <button (click)="store.updateQuantity(item.id, 1)">+</button>
              </div>
            </li>
          }
        </ul>

        <div class="cart-summary">
          <div>Subtotal: <strong>\${{ store.subtotal().toFixed(2) }}</strong></div>
          <div>Tax (8%): <strong>\${{ store.taxAmount().toFixed(2) }}</strong></div>
          <div class="grand-total">Grand Total: <strong>\${{ store.grandTotal().toFixed(2) }}</strong></div>
        </div>

        <button class="btn-checkout" (click)="checkout()">Complete Order</button>
      } @else {
        <p class="empty-msg">Your shopping cart is empty.</p>
      }
    </div>
  `
})
export class UserOrderSignalsComponent {
  readonly store = inject(CartSignalsStore);

  checkout() {
    alert(`Order placed for $${this.store.grandTotal().toFixed(2)}!`);
    this.store.clearCart();
  }
}
