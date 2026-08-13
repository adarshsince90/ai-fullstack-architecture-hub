using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DistributedSystems.Outbox;

public class OutboxMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; }
}

public interface IMessageBusProducer
{
    Task PublishAsync(string topic, string key, string payloadJson, CancellationToken ct);
}

// =========================================================================
// Transactional Outbox Background Poller / Publisher Worker
// =========================================================================
public class OutboxPublisherWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IMessageBusProducer _messageBus;
    private readonly ILogger<OutboxPublisherWorker> _logger;
    private const int BatchSize = 100;
    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(3);

    public OutboxPublisherWorker(
        IServiceProvider serviceProvider,
        IMessageBusProducer messageBus,
        ILogger<OutboxPublisherWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _messageBus = messageBus;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxPublisherWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<OutboxDbContext>();

                // Fetch unprocessed outbox messages (with optimistic locking or row locks)
                var pendingMessages = await db.OutboxMessages
                    .Where(m => m.ProcessedAtUtc == null && m.RetryCount < 5)
                    .OrderBy(m => m.CreatedAtUtc)
                    .Take(BatchSize)
                    .ToListAsync(stoppingToken);

                if (pendingMessages.Count > 0)
                {
                    foreach (var message in pendingMessages)
                    {
                        try
                        {
                            await _messageBus.PublishAsync(
                                topic: message.EventType,
                                key: message.Id.ToString(),
                                payloadJson: message.PayloadJson,
                                ct: stoppingToken);

                            message.ProcessedAtUtc = DateTime.UtcNow;
                            message.Error = null;
                        }
                        catch (Exception ex)
                        {
                            message.RetryCount++;
                            message.Error = ex.Message;
                            _logger.LogWarning(ex, "Failed to publish Outbox message {Id}. Retry count: {RetryCount}", message.Id, message.RetryCount);
                        }
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error processing outbox messages batch.");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }
    }
}

public class OutboxDbContext : DbContext
{
    public OutboxDbContext(DbContextOptions<OutboxDbContext> options) : base(options) { }
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
}
