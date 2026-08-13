# Domain 1 Code Templates: Backend & .NET Core

Production-grade code patterns, minimal API templates, and architectural skeletons for .NET 8/10.

---

## 📂 Templates Directory

```text
code-templates/01_dotnet_backend/
 └── clean-architecture-webapi/
      ├── Program.cs                  # ASP.NET Core Web API with Middleware & DI
      ├── Controllers/UsersController.cs # High-performance async endpoints
      └── Infrastructure/AppDbContext.cs # EF Core DbContext with optimized queries
```

### 1. Clean Architecture Web API Skeleton
- [clean-architecture-webapi/Program.cs](./code-templates/01_dotnet_backend/clean-architecture-webapi/Program.cs)
- Demonstrates:
  - Global Exception Handling Middleware
  - Service lifetimes (`Scoped`, `Singleton`, `Transient`)
  - Connection pooling with `AddDbContextPool`
  - Health checks & OpenAPI / Swagger integration
