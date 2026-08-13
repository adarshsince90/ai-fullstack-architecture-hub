using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EfCorePerformance;

public class PerformanceDbContext : DbContext
{
    public PerformanceDbContext(DbContextOptions<PerformanceDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Attach Slow Query Interceptor
        optionsBuilder.AddInterceptors(new SlowQueryCommandInterceptor());
        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Indexing strategy
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CustomerId);
            entity.HasIndex(e => e.CreatedAtUtc);

            // Optimistic Concurrency Token
            entity.Property(e => e.RowVersion).IsRowVersion();

            entity.HasMany(e => e.Items)
                  .WithOne()
                  .HasForeignKey(i => i.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        base.OnModelCreating(modelBuilder);
    }

    // =========================================================================
    // 1. Pre-Compiled Query (Zero LINQ compilation overhead per invocation)
    // =========================================================================
    public static readonly Func<PerformanceDbContext, Guid, Task<OrderSummaryDto?>> GetOrderSummaryCompiled =
        EF.CompileAsyncQuery((PerformanceDbContext db, Guid orderId) =>
            db.Orders
              .AsNoTracking()
              .Where(o => o.Id == orderId)
              .Select(o => new OrderSummaryDto(o.Id, o.CustomerId, o.TotalAmount, o.Status))
              .FirstOrDefault()
        );
}

// =========================================================================
// 2. High-Performance Query Service Patterns
// =========================================================================
public class OrderQueryService
{
    private readonly PerformanceDbContext _db;

    public OrderQueryService(PerformanceDbContext db) => _db = db;

    // Split Query Pattern (Eliminates Cartesian Explosion)
    public async Task<Order?> GetOrderDetailsWithItemsAsync(Guid orderId, CancellationToken ct)
    {
        return await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .AsSplitQuery() // Executes 2 clean SQL queries instead of 1 explosive JOIN
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);
    }

    // High-Throughput Batch Update (Direct SQL without loading entities into memory)
    public async Task<int> CancelPendingStaleOrdersAsync(DateTime cutoffUtc, CancellationToken ct)
    {
        return await _db.Orders
            .Where(o => o.Status == "Pending" && o.CreatedAtUtc < cutoffUtc)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(o => o.Status, "Cancelled")
                .SetProperty(o => o.UpdatedAtUtc, DateTime.UtcNow),
                ct);
    }
}

// =========================================================================
// 3. Database Command Interceptor for SQL Performance Logging
// =========================================================================
public class SlowQueryCommandInterceptor : DbCommandInterceptor
{
    private static readonly TimeSpan SlowThreshold = TimeSpan.FromMilliseconds(250);

    public override DbDataReader ReaderExecuted(DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
    {
        if (eventData.Duration > SlowThreshold)
        {
            Console.WriteLine($"[SLOW DB QUERY WARNING] Duration: {eventData.Duration.TotalMilliseconds:F1}ms | SQL: {command.CommandText}");
        }
        return base.ReaderExecuted(command, eventData, result);
    }
}

public record OrderSummaryDto(Guid Id, Guid CustomerId, decimal TotalAmount, string Status);

public class Order
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class Customer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
