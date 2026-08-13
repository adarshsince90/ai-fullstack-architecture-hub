using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GrpcSignalRServices;

public interface ILiveNotificationClient
{
    Task ReceiveOrderStatusUpdate(string orderId, string status, DateTime timestampUtc);
    Task ReceiveSystemAlert(string message, string severity);
}

// =========================================================================
// Real-Time SignalR Hub with Tenant Grouping & Redis Backplane Compatibility
// =========================================================================
[Authorize]
public class LiveNotificationHub : Hub<ILiveNotificationClient>
{
    // Client subscribes to tenant-specific or order-specific groups
    public async Task SubscribeToOrder(string orderId)
    {
        var connectionId = Context.ConnectionId;
        var groupName = $"Order_{orderId}";

        await Groups.AddToGroupAsync(connectionId, groupName);
    }

    public async Task UnsubscribeFromOrder(string orderId)
    {
        var connectionId = Context.ConnectionId;
        var groupName = $"Order_{orderId}";

        await Groups.RemoveFromGroupAsync(connectionId, groupName);
    }

    // Called on connection lifecycle
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
        await base.OnConnectedAsync();
    }
}

// =========================================================================
// Broadcaster Service (Can be called from Web API controllers or background workers)
// =========================================================================
public class OrderNotificationBroadcaster
{
    private readonly IHubContext<LiveNotificationHub, ILiveNotificationClient> _hubContext;

    public OrderNotificationBroadcaster(IHubContext<LiveNotificationHub, ILiveNotificationClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task BroadcastOrderStatusAsync(string orderId, string status)
    {
        // Broadcasts to all connected WebSocket clients across all server instances via Redis Backplane
        await _hubContext.Clients
            .Group($"Order_{orderId}")
            .ReceiveOrderStatusUpdate(orderId, status, DateTime.UtcNow);
    }
}
