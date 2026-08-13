# Real-Time & High-Performance RPC: gRPC & SignalR

Modern enterprise architectures demand two distinct communication paradigms: **high-throughput, low-latency inter-service Remote Procedure Calls (RPC)** and **bi-directional, event-driven client-to-server real-time updates**. In .NET, these are fulfilled by **gRPC** and **SignalR**.

---

## 1. gRPC Architecture & HTTP/2 Foundations

gRPC is an open-source, contract-first RPC framework designed for microservices and polyglot systems.

```text
┌────────────────────────────────────────────────────────┐
│ Client App (C#, Go, Java)                              │
│  └── Strongly-Typed Generated Client Stub              │
└──────────────────────────┬─────────────────────────────┘
                           │ 1. Binary Serialized Protobuf Payload
                           │ 2. HTTP/2 Transport (Multiplexed Streams)
                           │ 3. HPACK Header Compression
                           ▼
┌────────────────────────────────────────────────────────┐
│ ASP.NET Core gRPC Server                               │
│  └── Generated Base Service Implementation             │
└────────────────────────────────────────────────────────┘
```

### Why gRPC Outperforms REST/JSON:
1. **Protocol Buffers (Protobuf)**: Binary serialization produces payloads up to **80% smaller** and deserializes **5–8x faster** than JSON strings.
2. **HTTP/2 Multiplexing**: Multiple concurrent RPC requests and responses travel across a **single TCP connection**, eliminating TCP handshake latency and head-of-line blocking at the connection level.
3. **Strict Contracts**: `.proto` IDL files serve as the single source of truth for polyglot client generation.

---

## 2. The 4 gRPC Streaming Modes

```text
1. Unary RPC:
   Client ──────── Request ───────► Server
   Client ◄─────── Response ────── Server

2. Server Streaming RPC (e.g., Live Price Tickers):
   Client ──────── Request ───────► Server
   Client ◄─── Stream Item 1 ───── Server
   Client ◄─── Stream Item 2 ───── Server
   Client ◄─── Stream Item 3 ───── Server

3. Client Streaming RPC (e.g., File Uploads / Sensor Ingestion):
   Client ──── Stream Chunk 1 ────► Server
   Client ──── Stream Chunk 2 ────► Server
   Client ◄─────── Response ────── Server

4. Bidirectional Streaming RPC (e.g., Real-time Chat / Collaborative Editing):
   Client ◄─── Continuous Stream ──► Server
```

### C# Bidirectional Streaming Implementation:
```csharp
public override async Task ChatStream(
    IAsyncStreamReader<ChatMessage> requestStream,
    IServerStreamWriter<ChatMessage> responseStream,
    ServerCallContext context)
{
    while (await requestStream.MoveNext(context.CancellationToken))
    {
        var currentMessage = requestStream.Current;
        var reply = new ChatMessage { Text = $"Echo: {currentMessage.Text}", Timestamp = Timestamp.FromDateTime(DateTime.UtcNow) };
        await responseStream.WriteAsync(reply);
    }
}
```

---

## 3. SignalR Real-Time Communications

ASP.NET Core SignalR simplifies adding bi-directional real-time web capabilities (client pushes to server, server broadcasts to clients).

```text
┌────────────────────────────────────────────────────────┐
│ Transport Fallback Hierarchy:                          │
│ 1. WebSockets (Full Duplex, Lowest Latency)            │
│ 2. Server-Sent Events (SSE) (Server-to-Client only)    │
│ 3. Long Polling (Emulated push via repeated HTTP reqs) │
└────────────────────────────────────────────────────────┘
```

### SignalR Hub Definition:
```csharp
public class OrderNotificationHub : Hub<IOrderClient>
{
    // Client joins a group based on tenant or order ID
    public async Task JoinOrderGroup(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Order_{orderId}");
    }

    // Server-to-Client broadcast
    public async Task NotifyOrderStatus(string orderId, string status)
    {
        await Clients.Group($"Order_{orderId}").ReceiveStatusUpdate(orderId, status);
    }
}

public interface IOrderClient
{
    Task ReceiveStatusUpdate(string orderId, string status);
}
```

---

## 4. Scaling SignalR in Multi-Instance Cloud Environments

In a distributed web farm (Kubernetes, AWS ECS, Azure App Services), client WebSocket connections terminate at different server instances.

```text
Client A (Connected to Server 1)        Client B (Connected to Server 2)
           │                                       ▲
           ▼                                       │
┌──────────────────────┐               ┌──────────────────────┐
│  ASP.NET Instance 1  │               │  ASP.NET Instance 2  │
└──────────┬───────────┘               └───────────▲──────────┘
           │                                       │
           ▼                                       │
┌─────────────────────────────────────────────────────────────┐
│ Redis Pub/Sub Backplane (or Azure SignalR Service)          │
│ └── Broadcasts message across all distributed server nodes  │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Options:
1. **Redis Backplane (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`)**:
   - Uses Redis Pub/Sub channels to sync broadcasts across nodes.
   - Low cost, but requires managing Redis throughput and WebSocket connection limits per server node.
2. **Azure SignalR Service**:
   - Fully managed proxy that handles 1M+ concurrent persistent WebSocket connections, shielding backend compute instances.

---

## 5. Architectural Comparison: gRPC vs SignalR vs REST

| Dimension | gRPC | SignalR | REST / HTTP APIs |
| :--- | :--- | :--- | :--- |
| **Primary Use Case** | Microservice-to-microservice high-speed RPC. | Browser/mobile real-time push notifications & live updates. | Public APIs, CRUD endpoints, web client data fetching. |
| **Transport** | HTTP/2 (binary Protobuf). | WebSockets / SSE / Long Polling (JSON / MessagePack). | HTTP/1.1 or HTTP/2 (JSON / XML). |
| **Browser Support** | Limited without gRPC-Web proxy. | Native and universal across all browsers. | Universal. |
| **Streaming** | Native 4-way streaming. | Full-duplex Hub streaming. | Chunked transfer encoding / SSE. |

---

## 6. Senior & Lead Interview Scenarios

### Q1: How do you secure gRPC and SignalR endpoints in an enterprise zero-trust environment?
**Lead Answer**: 
- **gRPC**: Enforce Mutual TLS (mTLS) for cryptographic service-to-service authentication and use JWT bearer tokens passed via gRPC request metadata (`Metadata.Entry("Authorization", "Bearer ...")`) validated via ASP.NET Core Authorization interceptors.
- **SignalR**: Because standard browser WebSockets do not support sending custom HTTP headers during the initial WebSocket handshake, pass the JWT token via query string parameter (`?access_token=...`) and configure `JwtBearerEvents.OnMessageReceived` to extract the token from the query path.

### Q2: How do you handle client reconnections and missed events in SignalR?
**Lead Answer**: Network partitions will temporarily drop WebSocket connections. SignalR provides `withAutomaticReconnect()` on the client, which attempts exponential backoff retries. However, SignalR is **not a message persistence queue**. To guarantee zero lost messages, the client must track the last received `SequenceNumber` / `Timestamp` and upon reconnection, query a REST or gRPC endpoint to replay missed events from an append-only event store or Redis stream.
