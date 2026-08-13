# Domain-Driven Design (DDD), CQRS & Event Sourcing

Enterprise systems operating at scale encounter immense domain complexity. Domain-Driven Design (DDD) provides tactical and strategic blueprints to model software around business realities, while CQRS and Event Sourcing provide the architectural foundation for high-performance write throughput and full auditability.

---

## 1. Domain-Driven Design (DDD) Tactical Building Blocks

```text
┌────────────────────────────────────────────────────────┐
│ BOUNDED CONTEXT (e.g. Order Fulfillment Bounded Context│
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ AGGREGATE (Cluster of Domain Objects)            │  │
│  │                                                  │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │ AGGREGATE ROOT (Order Entity)               │ │  │
│  │  │  ├── Id: OrderId (Strongly-Typed Id)        │ │  │
│  │  │  ├── Status: OrderStatus                    │ │  │
│  │  │  │                                          │ │  │
│  │  │  ├── LineItems: List<OrderLineItem> (Entity)│ │  │
│  │  │  │    └── Quantity, ProductId               │ │  │
│  │  │  │                                          │ │  │
│  │  │  └── ShippingAddress: Address (Value Object)│ │  │
│  │  │       └── Street, City, ZipCode             │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │  Domain Event: OrderPlacedDomainEvent            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Core Concepts:
- **Entity**: An object with a unique, continuous identity (`Id`) across its lifecycle (e.g., `Order`, `Customer`).
- **Value Object**: An immutable object defined entirely by its structural attributes with no conceptual identity (e.g., `Money(Amount, Currency)`, `Address`). Two value objects with identical properties are equal (`a.Equals(b) == true`).
- **Aggregate & Aggregate Root**: A transactional consistency boundary. External callers may ONLY reference and mutate the Aggregate through the Aggregate Root (`Order`). Inner entities cannot be modified directly from outside.
- **Domain Event**: A record of something meaningful that happened in the domain in past tense (e.g., `OrderShippedEvent`, `PaymentReceivedEvent`).

---

## 2. Command Query Responsibility Segregation (CQRS)

CQRS splits the single application data model into separate models for **mutations (Commands)** and **reads (Queries)**:

```text
               ┌───────────────┐
               │  HTTP Client  │
               └───────┬───────┘
                       │
       ┌───────────────┴───────────────┐
       │ (Write Path)                  │ (Read Path)
       ▼                               ▼
┌───────────────┐               ┌───────────────┐
│ CreateOrder   │               │ GetOrderById  │
│ Command       │               │ Query         │
└──────┬────────┘               └───────┬───────┘
       │                                │
       ▼                                ▼
┌───────────────┐               ┌───────────────┐
│ Write Model   │               │ Read Model    │
│ (Aggregates,  │               │ (Denormalized │
│ Validation,   │               │ DTOs, Dapper/ │
│ EF Core)      │               │ Redis/Elastic)│
└──────┬────────┘               └───────▲───────┘
       │                                │
       ▼ (Publishes Event)              │ (Async Projection)
┌────────────────┐              ┌───────┴───────┐
│ Domain Events  │ ───────────► │ Projection    │
│ (Kafka/SQS)    │              │ Background Wkr│
└────────────────┘              └───────────────┘
```

---

## 3. CQRS Implementation in .NET with MediatR Pipeline Behaviors

MediatR acts as an in-process mediator allowing cross-cutting concerns (Validation, Polly Retries, Performance Logging) to wrap every command/query cleanly:

```csharp
// 1. Command Definition
public record CreateOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : IRequest<Result<Guid>>;

// 2. MediatR Validation Pipeline Behavior
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators) => _validators = validators;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var context = new ValidationContext<TRequest>(request);
        var validationFailures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(result => result.Errors)
            .Where(f => f != null)
            .ToList();

        if (validationFailures.Count != 0)
        {
            throw new ValidationException(validationFailures);
        }

        return await next(); // Proceed to Command Handler
    }
}
```

---

## 4. Event Sourcing Mechanics

In traditional CRUD systems, you store only the **current state** of an entity (e.g., `Status = "Shipped"`), overwriting previous history. In **Event Sourcing**, the state is stored as an **immutable, append-only sequence of domain events**:

```text
Event Stream for Aggregate (OrderId: #9821):
┌───┬─────────────────────────┬──────────────────────┬─────────────┐
│Ver│ Event Type              │ Payload              │ Timestamp   │
├───┼─────────────────────────┼──────────────────────┼─────────────┤
│ 1 │ OrderCreated            │ CustomerId, Total:500│ 10:00:01 AM │
│ 2 │ ShippingAddressUpdated  │ NewAddress: NY 10001 │ 10:02:15 AM │
│ 3 │ ItemAdded               │ ProductId: 44, Qty: 1│ 10:05:00 AM │
│ 4 │ PaymentProcessed        │ TxId: pay_89234      │ 10:05:30 AM │
└───┴─────────────────────────┴──────────────────────┴─────────────┘
```

### Rehydrating Aggregate State:
To reconstruct the aggregate in memory, fetch all events for that ID and replay them sequentially:

```csharp
public class OrderAggregate
{
    public Guid Id { get; private set; }
    public decimal TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }

    public void Apply(OrderCreatedEvent evt)
    {
        Id = evt.OrderId;
        TotalAmount = evt.TotalAmount;
        Status = OrderStatus.Created;
    }

    public void Apply(PaymentProcessedEvent evt)
    {
        Status = OrderStatus.Paid;
    }
}
```

### Snapshotting for Performance:
When an aggregate accumulates 5,000+ events, replaying from event 0 becomes slow. A **Snapshot Worker** periodically captures state at Version 5000 (`Snapshot_v5000`). Rehydration only replays events that occurred **after** version 5000.

---

## 5. Senior & Lead Interview Scenarios

### Q1: What are the biggest trade-offs and risks of adopting Event Sourcing?
**Lead Answer**:
- **Benefits**: Complete audit trail, ability to travel back in time, zero data loss, high write performance (append-only sequential disk I/O).
- **Trade-offs / Risks**:
  1. **Event Schema Evolution**: As business logic changes over 5 years, older event schemas must be versioned or "upcasted" to prevent deserialization errors.
  2. **Eventual Consistency**: Read models update asynchronously; user interfaces must handle momentary propagation lag gracefully.
  3. **High Cognitive Complexity**: Unsuitable for simple CRUD applications.

### Q2: How do you handle optimistic concurrency in an Event-Sourced aggregate?
**Lead Answer**: Every append operation passes an `ExpectedVersion`. If two concurrent requests attempt to append to an aggregate currently at Version 4, the database / event store applies a unique constraint on `(StreamId, Version)`. The second write fails with `ConcurrencyException`, prompting the application to re-fetch the stream and retry the business logic.
