using Grpc.Core;

namespace GrpcSignalRServices;

// Simulated gRPC Protobuf generated classes
public class OrderRequest { public string OrderId { get; set; } = string.Empty; public double Amount { get; set; } }
public class OrderResponse { public string OrderId { get; set; } = string.Empty; public bool IsSuccess { get; set; } public string Status { get; set; } = string.Empty; }
public class PriceFeedRequest { public string Symbol { get; set; } = string.Empty; }
public class PriceTick { public string Symbol { get; set; } = string.Empty; public double Price { get; set; } public long Timestamp { get; set; } }

// =========================================================================
// Production gRPC Service with Unary, Server Streaming & Bidirectional RPC
// =========================================================================
public class OrderProcessingGrpcService
{
    // 1. High-Speed Unary RPC
    public async Task<OrderResponse> ProcessOrder(OrderRequest request, ServerCallContext context)
    {
        // Enforce deadline check
        if (context.Deadline < DateTime.UtcNow)
        {
            throw new RpcException(new Status(StatusCode.DeadlineExceeded, "Request timeout"));
        }

        // Simulate fast order execution
        await Task.Delay(10, context.CancellationToken);

        return new OrderResponse
        {
            OrderId = request.OrderId,
            IsSuccess = true,
            Status = "Settled"
        };
    }

    // 2. Server Streaming RPC (Live Price Ticker)
    public async Task StreamLivePrices(
        PriceFeedRequest request,
        IServerStreamWriter<PriceTick> responseStream,
        ServerCallContext context)
    {
        var random = new Random();
        double currentPrice = 150.00;

        while (!context.CancellationToken.IsCancellationRequested)
        {
            currentPrice += (random.NextDouble() - 0.49) * 2.0;

            var tick = new PriceTick
            {
                Symbol = request.Symbol,
                Price = Math.Round(currentPrice, 2),
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await responseStream.WriteAsync(tick);
            await Task.Delay(250, context.CancellationToken); // 4 ticks per second
        }
    }
}
