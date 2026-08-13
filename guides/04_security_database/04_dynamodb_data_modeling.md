# DynamoDB Data Modeling & Single-Table NoSQL Design

In high-scale cloud architectures, Amazon DynamoDB delivers single-digit millisecond latency at any scale. However, applying relational database normalized thinking to DynamoDB results in expensive full-table scans and performance failures. Senior and Lead Engineers must design NoSQL schemas based on **Access Patterns** and **Single-Table Design**.

---

## 1. DynamoDB Architecture & Partition Key Mechanics

```text
┌────────────────────────────────────────────────────────┐
│ DYNAMODB STORAGE ARCHITECTURE                          │
│                                                        │
│ Hash(Partition Key) ──► Maps to Physical Storage Node  │
│                                                        │
│ Physical Partition 1:  [ Hash 0x0000 - 0x3FFF ]        │
│ Physical Partition 2:  [ Hash 0x4000 - 0x7FFF ]        │
│ Physical Partition 3:  [ Hash 0x8000 - 0xBFFF ]        │
│ Physical Partition 4:  [ Hash 0xC000 - 0xFFFF ]        │
└────────────────────────────────────────────────────────┘
```

- **Partition Key (PK)**: Determines physical partition placement via an internal MD5 hash function.
- **Sort Key (SK)**: Orders items contiguously on physical disk within that partition, enabling ultra-fast range queries (`begins_with`, `between`, `>`, `<`).

---

## 2. The Single-Table Design Philosophy

Instead of creating separate tables for `Users`, `Orders`, and `OrderItems` (which would require multiple round-trips because DynamoDB has no `JOIN` operation), store all entities in a **single table** using generic `PK` and `SK` attribute names.

```text
┌─────────────────┬─────────────────┬────────────────────┬────────────────────┐
│ PK (Partition)  │ SK (Sort Key)   │ Type / Entity      │ Attributes         │
├─────────────────┼─────────────────┼────────────────────┼────────────────────┤
│ USER#101        │ METADATA        │ User Profile       │ Email, Name, Tier  │
│ USER#101        │ ORDER#2026-0801 │ Order Summary      │ Total: $140.00     │
│ USER#101        │ ORDER#2026-0802 │ Order Summary      │ Total: $89.50      │
│ ORDER#2026-0801 │ ITEM#SKU-99     │ Order Line Item    │ Qty: 2, Price: $50 │
│ ORDER#2026-0801 │ ITEM#SKU-44     │ Order Line Item    │ Qty: 1, Price: $40 │
└─────────────────┴─────────────────┴────────────────────┴────────────────────┘
```

### Access Patterns Satisfied in a Single Query:
1. **Get User Profile**: `Query(PK = "USER#101" AND SK = "METADATA")`
2. **Get User & All Their Orders**: `Query(PK = "USER#101" AND SK begins_with "ORDER#")`
3. **Get Full Order with All Line Items**: `Query(PK = "ORDER#2026-0801")`

---

## 3. Global Secondary Indexes (GSI) & Sparse Indexes

When you need an alternate access pattern (e.g. query orders by `Status`), create a **Global Secondary Index (GSI)** with its own partition key:

```text
┌────────────────────────────────────────────────────────┐
│ GSI-1: Inverted Index for Reverse Queries              │
│                                                        │
│ GSI1-PK: SK (e.g., ORDER#2026-0801)                    │
│ GSI1-SK: PK (e.g., USER#101)                           │
└────────────────────────────────────────────────────────┘
```

### Sparse Indexes for Filtering:
In DynamoDB, an item is only populated in a GSI if the item **contains the GSI partition key attribute**.
- **Use Case**: Query all orders that are currently `PENDING_SHIPMENT`.
- If an order is shipped, delete the `IsPending` attribute. The item automatically disappears from the GSI, creating an ultra-compact index of only active actionable items.

---

## 4. Capacity Planning: RCU, WCU & Hot Partitioning

- **Read Capacity Unit (RCU)**: One strongly consistent read per second for an item up to 4KB (or two eventually consistent reads).
- **Write Capacity Unit (WCU)**: One write per second for an item up to 1KB.

### Hot Partition Mitigation (Key Salting):
If 100,000 requests/sec write to a single partition key (e.g. `DATE#2026-08-12`), the physical partition throttles.
- **Solution**: Append a randomized salt suffix: `DATE#2026-08-12#0`, `DATE#2026-08-12#1`, ... `DATE#2026-08-12#9` to distribute writes evenly across 10 physical partitions.

---

## 5. Senior & Lead Interview Scenarios

### Q1: When should you NOT use DynamoDB Single-Table Design?
**Lead Answer**:
1. **Ad-Hoc Analytical Queries**: When business analysts need flexible, unpredictable SQL queries and pivots (use Snowflake / BigQuery / PostgreSQL).
2. **Rapidly Evolving Early-Stage Startups**: When access patterns change weekly; altering access patterns in Single-Table requires rebuilding composite keys and migrating data.
3. **GraphQL Flexible Schemas**: When relationships require deep arbitrary tree traversals.

### Q2: How do you achieve ACID transactions across multiple items in DynamoDB?
**Lead Answer**: Use `TransactWriteItems` and `TransactGetItems`. `TransactWriteItems` allows up to 100 actions (or 4MB of data) across multiple items and tables in an all-or-nothing atomic transaction with full condition checks (`ConditionCheck`), consuming 2x WCUs for two-phase commit consensus.
