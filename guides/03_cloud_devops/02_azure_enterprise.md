# Azure Enterprise Architecture & Cloud Services

Microsoft Azure provides deep enterprise capabilities for distributed computing, identity governance, and globally distributed databases. Senior and Lead Engineers must understand Azure Cosmos DB consistency models, Managed Identity security boundaries, and enterprise messaging mechanics from first principles.

---

## 1. Azure Compute: App Services vs Azure Functions

```text
┌────────────────────────────────────────────────────────┐
│ 1. Azure App Service (PaaS Compute)                   │
│    • Continuous, long-running ASP.NET Core web apps    │
│    • Deployment Slots (Staging ──swap──► Production)   │
│    • Built-in Auto-Scale & TLS / Custom Domain Mgmt    │
├────────────────────────────────────────────────────────┤
│ 2. Azure Functions (Serverless FaaS)                   │
│    • Consumption Plan: Scale-to-zero, billed per ms    │
│    • Premium Plan (EP): Eliminates cold starts, VNet   │
│    • Declarative Triggers & Input/Output Bindings      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Azure Cosmos DB: The 5 Consistency Models

Cosmos DB is a globally distributed, multi-model NoSQL database. Unlike simple relational engines that offer binary ACID options, Cosmos DB allows fine-tuning the trade-off between **Data Consistency** and **Availability/Latency (PACELC Theorem)**:

```text
Strongest Consistency (Higher Latency)
  ▲
  │  1. STRONG: Linearizable reads. Guarantees reading the latest committed write globally.
  │  2. BOUNDED STALENESS: Reads lag behind writes by at most K versions or T time interval.
  │  3. SESSION (Default): Read-your-own-writes guarantee within a single client session.
  │  4. CONSISTENT PREFIX: Reads never see out-of-order writes (no dirty reads or skips).
  │  5. EVENTUAL: Out-of-order, best-effort convergence with lowest latency and highest availability.
  ▼
Weakest Consistency (Lowest Latency & Highest Throughput)
```

### Partition Key Heuristics & Request Units (RUs):
- **Request Unit (RU)**: Normalized unit of CPU, memory, and IOPS. A 1KB point read of an item consumes 1 RU.
- **Partition Key Selection**: Must have high cardinality (millions of distinct values like `TenantId` or `CustomerId`) to distribute data and throughput evenly across physical partitions and avoid "hot partition" throttling (HTTP 429 Too Many Requests).

---

## 3. Azure Enterprise Security: Key Vault & Managed Identities

Traditional applications stored database connection strings and client secrets in `appsettings.json` or environment variables—creating catastrophic credential exposure risks.

```text
┌────────────────────────────────────────────────────────┐
│ Zero-Trust Managed Identity Flow:                      │
│                                                        │
│  [ Azure App Service / AKS ]                           │
│  (System-Assigned Managed Identity)                    │
│            │                                           │
│            │ 1. Requests OAuth token from Azure IMDS   │
│            ▼                                           │
│  [ Microsoft Entra ID (Azure AD) ]                     │
│            │                                           │
│            │ 2. Issues short-lived token based on      │
│            ▼    Azure RBAC Role Assignment             │
│  [ Azure Key Vault / Azure SQL / Cosmos DB ]           │
│  (Validates token & grants access without passwords!)  │
└────────────────────────────────────────────────────────┘
```

### Managed Identity Types:
- **System-Assigned**: Tied directly to the lifecycle of the Azure resource. Automatically deleted when the resource is dropped.
- **User-Assigned**: Standalone Azure resource that can be shared across multiple VM/container instances with identical access permissions.

---

## 4. Azure Messaging Landscape: Service Bus vs Event Hubs vs Event Grid

| Dimension | Azure Service Bus | Azure Event Hubs | Azure Event Grid |
| :--- | :--- | :--- | :--- |
| **Model** | Enterprise Message Broker (AMQP) | Distributed Streaming Log (Kafka-compatible) | Reactive Event Routing (Pub/Sub) |
| **Primary Use** | Financial transactions, order processing, workflow commands. | Big data ingestion, IoT telemetry, real-time analytics. | Reactive ops events (e.g., `BlobCreated`, VM alerts). |
| **Ordering** | FIFO via **Message Sessions**. | Strict ordering per **Partition**. | No ordering guarantees. |
| **Deduplication** | Built-in Duplicate Detection window. | Consumer-managed offset tracking. | At-least-once delivery. |

---

## 5. Senior & Lead Interview Scenarios

### Q1: Why is "Session" consistency the recommended default in Azure Cosmos DB?
**Lead Answer**: Session consistency provides the optimal balance between cost, performance, and user experience. It guarantees that an individual user session always reads its own writes (monotonic reads, monotonic writes, and read-your-writes), preventing jarring UI glitches where a user updates their profile and immediately sees old data upon refresh. Concurrently, it offers 100% write availability and 2x lower RU read costs compared to Strong consistency.

### Q2: How do you implement zero-downtime deployments in Azure App Service?
**Lead Answer**: Use **Deployment Slots**. Deploy the new build to the `Staging` slot, warm up the application by invoking health check endpoints and pre-compiling JIT code, and verify telemetry. Then execute an **Instant Slot Swap**. The Azure load balancer swaps the virtual IP routing tables instantaneously without dropping existing TCP connections or restarting the production container instance.
