# High-Level (HLD) & Low-Level (LLD) System Design Framework

In Senior, Staff, and Lead engineering interviews, System Design evaluations test your ability to structure ambiguous requirements into scalable, fault-tolerant distributed architectures with justified engineering trade-offs.

---

## 1. The 45-Minute System Design Interview Blueprint

```text
┌────────────────────────────────────────────────────────┐
│ Step 1: Requirements Scoping & Clarification (5 mins)  │
│  ├── Functional Requirements (Core 2-3 user actions)   │
│  └── Non-Functional Requirements (SLA: Availability,   │
│      Latency, Scale, Consistency, Durability)          │
├────────────────────────────────────────────────────────┤
│ Step 2: Back-of-the-Envelope Calculations (5 mins)     │
│  ├── QPS (Queries Per Second) Peak & Average           │
│  └── Storage & Bandwidth per day / per 5 years         │
├────────────────────────────────────────────────────────┤
│ Step 3: High-Level Architecture (15 mins)              │
│  ├── Client ──► CDN/WAF ──► Load Balancer ──► Gateway  │
│  ├── Stateless Compute Services ──► Caches ──► DBs     │
│  └── Asynchronous Message Queues & Workers             │
├────────────────────────────────────────────────────────┤
│ Step 4: Deep Dive & Critical Bottlenecks (15 mins)     │
│  ├── Database Partitioning & Sharding Strategy         │
│  ├── Cache Invalidation & Thundering Herd Prevention   │
│  └── Concurrency / Race Condition Mitigations          │
├────────────────────────────────────────────────────────┤
│ Step 5: Failure Modes & Resiliency (5 mins)            │
│  └── Circuit Breakers, Multi-Region DR, DLQs, Metrics   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Enterprise Caching Strategies

```text
1. Cache-Aside (Lazy Loading):
   App ──► Check Cache ──(Miss)──► Query DB ──► Write to Cache ──► Return

2. Write-Through:
   App ──► Write to Cache ──► Cache writes synchronously to DB ──► Done

3. Write-Behind (Write-Back):
   App ──► Write to Cache ──► Return immediately
           └── (Async Worker flushes cache batches to DB periodically)
```

### Cache Stampede (Thundering Herd) Prevention:
When a high-traffic cache key expires, thousands of concurrent requests miss the cache and hit the database simultaneously.
- **Distributed Mutex Lock**: The first thread acquires a Redis lock to query the DB and refresh the cache; other threads wait or return stale data.
- **Probabilistic Early Expiration (XFetch)**: Background threads randomly recompute the cache before the TTL expires based on request probability:
  $$\Delta \cdot \beta \cdot \ln(\text{random}())$$

---

## 3. Database Sharding & Consistent Hashing

When database data exceeds a single server's disk or memory capacity, partition the dataset across multiple nodes.

```text
CONSISTENT HASHING RING:
             Node A (Token: 0 - 99)
                  ┌──────┐
            ▲     │      │     ▲
            │     └──────┘     │
        ┌───┴──────────────────┴───┐
        │                          │
Node D  │     HASH RING (0 - 360)  │  Node B
(Token: │                          │  (Token: 100 - 199)
300-359)│                          │
        └───┬──────────────────┬───┘
            │     ┌──────┐     │
            ▼     │      │     ▼
             Node C (Token: 200 - 299)
```

- **Consistent Hashing**: Minimizes key re-distribution when adding/removing nodes ($K/N$ keys moved).
- **Virtual Nodes (VNodes)**: Assigns multiple virtual token slots to each physical server to prevent hot-spot data skew.

---

## 4. Distributed Rate Limiting Algorithms

| Algorithm | Mechanics | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Token Bucket** | Tokens refill at fixed rate; requests consume 1 token. | Handles bursty traffic smoothly. | Memory overhead for tracking tokens. |
| **Leaky Bucket** | Requests queue in bucket; processed at constant rate. | Smooths egress rate to downstream APIs. | Drops bursts when queue is full. |
| **Sliding Window Counter** | Weights counts across current and previous time window. | Low memory (2 counters per user), high accuracy. | Assumes uniform distribution in previous window. |

### Redis Sliding Window Log using Lua Script:
```lua
-- Atomic Lua Script executed in Redis
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove expired timestamps older than (now - window)
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current requests in window
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return 1 -- Allowed
else
    return 0 -- Rejected (HTTP 429)
end
```

---

## 5. CAP Theorem vs PACELC Theorem

In a distributed data store, **CAP Theorem** states that during a Network Partition (**P**), you must choose between Consistency (**C**) or Availability (**A**).

### The PACELC Theorem (Senior/Lead Distinction):
If there is a **P**artition: Choose between **A**vailability or **C**onsistency.  
**E**lse (Normal Operation): Choose between **L**atency or **C**onsistency.

```text
Storage Engine Classifications:
- DynamoDB / Cosmos DB (Eventual): PA/EL (Optimized for Availability & Low Latency)
- Spanner / CockroachDB:           PC/EC (Optimized for Strong Consistency)
- MongoDB / PostgreSQL Primary:    PC/EC
```

---

## 6. Senior & Lead Interview Scenarios

### Q1: How would you design a distributed ID generation service (like Twitter Snowflake)?
**Lead Answer**: Traditional auto-increment database keys create central bottlenecks and single points of failure. Use a 64-bit ID generator:
- **1 bit**: Sign bit (0).
- **41 bits**: Epoch timestamp in milliseconds (~69 years lifespan).
- **10 bits**: Machine/Node ID (supports up to 1,024 distributed worker nodes).
- **12 bits**: Sequence number (supports up to 4,096 IDs per millisecond per node).
*Properties*: 64-bit integer, time-sortable, decentralized, generates ~4 million unique IDs/sec per node without inter-service coordination.
