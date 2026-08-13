# ASP.NET Core Web API, Middleware Pipeline & DI Architecture

In enterprise backend engineering, ASP.NET Core provides a high-performance, modular HTTP runtime. Understanding its internal request pipeline, dependency injection container mechanics, and routing tree from first principles is essential for architecting low-latency, resilient microservices.

---

## 1. The Kestrel HTTP Pipeline & Middleware Chain

ASP.NET Core processes HTTP requests using a bi-directional pipeline constructed from a series of `RequestDelegate` delegates:

```csharp
public delegate Task RequestDelegate(HttpContext context);
```

```text
Incoming HTTP Request (via Kestrel / Socket)
       │
       ▼
┌───────────────────────────────────────────────────────────┐
│ Middleware 1: Exception Handler & Diagnostics             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ Middleware 2: HTTPS Redirection & HSTS              │ │
│   │   ┌───────────────────────────────────────────────┐ │ │
│   │   │ Middleware 3: Rate Limiting & Throttling      │ │ │
│   │   │   ┌─────────────────────────────────────────┐ │ │ │
│   │   │   │ Middleware 4: Authentication (JWT/OIDC) │ │ │ │
│   │   │   │   ┌───────────────────────────────────┐ │ │ │ │
│   │   │   │   │ Middleware 5: Authorization (RBAC)│ │ │ │ │
│   │   │   │   │   ┌─────────────────────────────┐ │ │ │ │ │
│   │   │   │   │   │ Endpoint / Controller Action│ │ │ │ │ │
│   │   │   │   │   │ (Generates IResult / Action)│ │ │ │ │ │
│   │   │   │   │   └──────────────┬──────────────┘ │ │ │ │ │
│   │   │   │   │                  │ (Response)     │ │ │ │ │
│   │   │   │   │ ◄────────────────┘                │ │ │ │ │
│   │   │   │ ◄─┘                                   │ │ │ │ │
│   │   │ ◄─┘                                       │ │ │ │ │
│   │ ◄─┘                                           │ │ │ │ │
│ ◄─┘                                               │ │ │ │ │
└───────────────────────────────────────────────────────────┘
       │
       ▼
Outgoing HTTP Response (Headers + Body Stream)
```

### Middleware Delegation Mechanics (`Use`, `Run`, `Map`)
- `app.Use(async (context, next) => { ... await next(); ... })`: Executes logic before and after the next middleware in the chain.
- `app.Run(async (context) => { ... })`: Terminal middleware that short-circuits the pipeline and produces the final response.
- `app.Map("/api/v1", branch => { ... })`: Branches the pipeline based on request path matching.

---

## 2. Middleware vs Action Filters vs Endpoint Filters

Understanding where cross-cutting concerns belong prevents subtle execution order bugs:

| Dimension | Middleware | Action Filters (`IAsyncActionFilter`) | Minimal API Endpoint Filters (`IEndpointFilter`) |
| :--- | :--- | :--- | :--- |
| **Pipeline Position** | Raw HTTP level (before routing executes). | Inside MVC pipeline (after routing & model binding). | Minimal API execution stage (lightweight). |
| **Context Available** | `HttpContext` only (no route action metadata). | `ActionExecutingContext` (Action arguments, Controller metadata). | `EndpointFilterInvocationContext` (Arguments, Route handler). |
| **Performance Overhead** | Near-zero allocation. | Higher (MVC action descriptor reflection). | Low allocation (direct delegate wrapper). |
| **Best Use Cases** | Global error logging, CORS, Rate Limiting, Request ID correlation. | Model validation, Action-specific caching, Controller audit logs. | Route-specific input validation, endpoint security checks. |

---

## 3. Dependency Injection (DI) Lifetimes & Captive Dependencies

The Microsoft DI container (`Microsoft.Extensions.DependencyInjection`) manages object lifecycles via `IServiceProvider`:

```text
┌─────────────────┐  Instantiated once per application lifetime.
│    SINGLETON    │  Shared across all threads & requests.
└────────┬────────┘  (e.g., MemoryCache, HttpClientFactory, TelemetryClient)
         │
         ▼
┌─────────────────┐  Instantiated once per HTTP Request Scope.
│     SCOPED      │  Disposed at the end of the HTTP Request.
└────────┬────────┘  (e.g., DbContext, UnitOfWork, CurrentUserAccessor)
         │
         ▼
┌─────────────────┐  Instantiated every single time requested from DI.
│    TRANSIENT    │  Disposed with the enclosing scope.
└─────────────────┘  (e.g., Light stateless formatters, transient validators)
```

### The Captive Dependency Trap (Critical Lead Interview Topic)
A **Captive Dependency** occurs when a service with a longer lifetime holds a reference to a service with a shorter lifetime.

```csharp
// ❌ DANGEROUS: Captive Dependency
public class GlobalMetricsService // Registered as SINGLETON
{
    private readonly AppDbContext _dbContext; // Registered as SCOPED!

    public GlobalMetricsService(AppDbContext dbContext)
    {
        // _dbContext is now trapped forever in the Singleton instance!
        // 1. Memory Leak: Entity ChangeTracker grows infinitely.
        // 2. Concurrency Exception: DbContext is NOT thread-safe! Concurrent requests crash with InvalidOperationException.
        _dbContext = dbContext;
    }
}
```

### How to Fix Captive Dependencies:
1. **Enable Scope Validation in Development & CI**:
   ```csharp
   var builder = WebApplication.CreateBuilder(args);
   builder.Host.UseDefaultServiceProvider((context, options) => {
       options.ValidateScopes = true;
       options.ValidateOnBuild = true;
   });
   ```
2. **Inject `IServiceScopeFactory` instead of Scoped service**:
   ```csharp
   public class GlobalMetricsService // Singleton
   {
       private readonly IServiceScopeFactory _scopeFactory;
       public GlobalMetricsService(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

       public async Task RecordMetricAsync(CancellationToken ct)
       {
           using var scope = _scopeFactory.CreateScope();
           var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
           await dbContext.Metrics.AddAsync(new MetricRecord(), ct);
           await dbContext.SaveChangesAsync(ct);
       }
   }
   ```

---

## 4. Minimal APIs vs Controller-Based APIs

.NET 6+ introduced Minimal APIs as a high-performance alternative to traditional MVC Controllers:

```text
Traditional Controllers:
Request ──► Kestrel ──► Routing ──► MVC Middleware ──► Controller Factory (Reflection) ──► Model Binder ──► Filters ──► Action

Minimal APIs:
Request ──► Kestrel ──► Routing (DFA Tree) ──► Compiled RequestDelegate ──► Handler
```

### Architectural Comparison
- **Throughput & Memory**: Minimal APIs achieve ~20–30% higher RPS and drastically lower memory allocation by bypassing the MVC model binding/filter reflection overhead.
- **Source Generators**: Minimal APIs utilize C# source generators at compile time (`MapGet()`), making them natively compatible with **Native AOT (Ahead-of-Time compilation)**.
- **Organization Strategy for Large Systems**: Use `Carter` or custom extension modules (`app.MapUserEndpoints()`, `app.MapOrderEndpoints()`) to keep code modular rather than putting hundreds of endpoints in `Program.cs`.

---

## 5. Built-In Rate Limiting (.NET 8/10)

`System.Threading.RateLimiting` provides native middleware without external dependencies:

```csharp
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("PublicApiLimit", opt => {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 10;
    });
});

app.UseRateLimiter();
app.MapGet("/api/data", () => "Data").RequireRateLimiting("PublicApiLimit");
```

---

## 6. Senior & Lead Interview Scenarios

### Q1: How do you handle unhandled exceptions across distributed microservices in ASP.NET Core?
**Lead Answer**: Use `app.UseExceptionHandler()` combined with `IProblemDetailsFactory` to emit RFC 7807 compliant `ProblemDetails` JSON. Never catch exceptions and return empty 200s or raw stack traces. Inject an OpenTelemetry `ActivitySource` or correlation ID into the `ProblemDetails.Extensions` dictionary so frontend error monitors (Sentry/Datadog) can cross-reference the backend trace in Jaeger/AWS X-Ray.

### Q2: Why is `DbContext` registered as `Scoped` instead of `Transient` or `Singleton`?
**Lead Answer**: 
- If **Singleton**: `DbContext` is not thread-safe. Multiple concurrent HTTP requests executing queries simultaneously cause race conditions and crash with `InvalidOperationException: A second operation was started on this context before a previous operation completed`. Additionally, its change tracker would grow monotonically, leaking memory.
- If **Transient**: Every injected dependency within the same request receives a separate `DbContext` instance with its own change tracker and connection pool slot, breaking unit-of-work transaction atomicity.
- Therefore, **Scoped** guarantees that all services handling a single HTTP request share the exact same Unit of Work and connection, which is cleanly disposed at request termination.
