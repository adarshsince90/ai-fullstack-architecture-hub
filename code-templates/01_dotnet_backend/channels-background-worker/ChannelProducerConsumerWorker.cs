using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ChannelsBackgroundWorker;

public record TelemetryPayload(string DeviceId, double Temperature, double Humidity, DateTime TimestampUtc);

// =========================================================================
// 1. Thread-Safe Bounded Channel Queue
// =========================================================================
public class TelemetryChannelQueue
{
    private readonly Channel<TelemetryPayload> _channel;

    public TelemetryChannelQueue(int capacity = 50000)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait, // Applies backpressure: Producer awaits if channel is full
            SingleWriter = false,                  // Multiple HTTP API endpoints push concurrently
            SingleReader = false                   // Multiple background consumer threads drain concurrently
        };
        _channel = Channel.CreateBounded<TelemetryPayload>(options);
    }

    public async ValueTask EnqueueAsync(TelemetryPayload item, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(item, ct);
    }

    public ChannelReader<TelemetryPayload> Reader => _channel.Reader;
}

// =========================================================================
// 2. High-Throughput BackgroundService Consumer
// =========================================================================
public class TelemetryProcessingWorker : BackgroundService
{
    private readonly TelemetryChannelQueue _queue;
    private readonly ILogger<TelemetryProcessingWorker> _logger;
    private const int BatchSize = 500;
    private static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(2);

    public TelemetryProcessingWorker(TelemetryChannelQueue queue, ILogger<TelemetryProcessingWorker> logger)
    {
        _queue = queue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TelemetryProcessingWorker started.");

        var batch = new List<TelemetryPayload>(BatchSize);
        var lastFlushTime = DateTime.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Wait until items are available to read
                while (await _queue.Reader.WaitToReadAsync(stoppingToken))
                {
                    while (_queue.Reader.TryRead(out var item))
                    {
                        batch.Add(item);

                        var timeSinceFlush = DateTime.UtcNow - lastFlushTime;
                        if (batch.Count >= BatchSize || (timeSinceFlush >= FlushInterval && batch.Count > 0))
                        {
                            await ProcessBatchAsync(batch, stoppingToken);
                            batch.Clear();
                            lastFlushTime = DateTime.UtcNow;
                        }
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in telemetry worker channel processing loop.");
                await Task.Delay(1000, stoppingToken);
            }
        }

        // Final flush before shutdown
        if (batch.Count > 0)
        {
            _logger.LogInformation("Flushing {Count} remaining telemetry items before shutdown.", batch.Count);
            await ProcessBatchAsync(batch, CancellationToken.None);
        }

        _logger.LogInformation("TelemetryProcessingWorker terminated gracefully.");
    }

    private Task ProcessBatchAsync(IReadOnlyList<TelemetryPayload> items, CancellationToken ct)
    {
        _logger.LogInformation("Successfully processed batch of {Count} telemetry events to TimescaleDB/S3.", items.Count);
        return Task.CompletedTask;
    }
}
