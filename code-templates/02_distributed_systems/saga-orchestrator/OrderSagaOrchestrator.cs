namespace DistributedSystems.Saga;

public enum SagaStep { NotStarted, PaymentReserved, InventoryLocked, OrderConfirmed, Failed, Compensated }

public record OrderSagaState(Guid OrderId, Guid CustomerId, decimal Amount, SagaStep CurrentStep, string? FailureReason);

// =========================================================================
// Distributed Saga Orchestrator with Forward Actions & Compensations
// =========================================================================
public class OrderSagaOrchestrator
{
    private readonly IPaymentService _paymentService;
    private readonly IInventoryService _inventoryService;
    private readonly IOrderRepository _orderRepo;

    public OrderSagaOrchestrator(
        IPaymentService paymentService,
        IInventoryService inventoryService,
        IOrderRepository orderRepo)
    {
        _paymentService = paymentService;
        _inventoryService = inventoryService;
        _orderRepo = orderRepo;
    }

    public async Task<OrderSagaState> ExecuteSagaAsync(Guid orderId, Guid customerId, decimal amount, CancellationToken ct)
    {
        var state = new OrderSagaState(orderId, customerId, amount, SagaStep.NotStarted, null);

        try
        {
            // Step 1: Forward Action - Authorize Payment
            var paymentResult = await _paymentService.AuthorizePaymentAsync(orderId, amount, ct);
            if (!paymentResult.IsSuccess)
            {
                return await HandleFailureAsync(state with { FailureReason = paymentResult.ErrorMessage }, SagaStep.NotStarted, ct);
            }
            state = state with { CurrentStep = SagaStep.PaymentReserved };

            // Step 2: Forward Action - Reserve Inventory
            var inventoryResult = await _inventoryService.ReserveInventoryAsync(orderId, ct);
            if (!inventoryResult.IsSuccess)
            {
                // Trigger Compensating Transaction!
                return await HandleFailureAsync(state with { FailureReason = inventoryResult.ErrorMessage }, SagaStep.PaymentReserved, ct);
            }
            state = state with { CurrentStep = SagaStep.InventoryLocked };

            // Step 3: Complete Order
            await _orderRepo.MarkOrderAsConfirmedAsync(orderId, ct);
            return state with { CurrentStep = SagaStep.OrderConfirmed };
        }
        catch (Exception ex)
        {
            return await HandleFailureAsync(state with { FailureReason = ex.Message }, state.CurrentStep, ct);
        }
    }

    // =========================================================================
    // Compensating Transaction Handlers (Rollback previous steps)
    // =========================================================================
    private async Task<OrderSagaState> HandleFailureAsync(OrderSagaState state, SagaStep failedAtStep, CancellationToken ct)
    {
        switch (failedAtStep)
        {
            case SagaStep.InventoryLocked:
                // Step 2 compensation: Release inventory
                await _inventoryService.ReleaseInventoryAsync(state.OrderId, ct);
                goto case SagaStep.PaymentReserved;

            case SagaStep.PaymentReserved:
                // Step 1 compensation: Refund / void payment
                await _paymentService.RefundPaymentAsync(state.OrderId, state.Amount, ct);
                break;
        }

        await _orderRepo.MarkOrderAsFailedAsync(state.OrderId, state.FailureReason ?? "Unknown Error", ct);
        return state with { CurrentStep = SagaStep.Compensated };
    }
}

public interface IPaymentService
{
    Task<(bool IsSuccess, string? ErrorMessage)> AuthorizePaymentAsync(Guid orderId, decimal amount, CancellationToken ct);
    Task RefundPaymentAsync(Guid orderId, decimal amount, CancellationToken ct);
}

public interface IInventoryService
{
    Task<(bool IsSuccess, string? ErrorMessage)> ReserveInventoryAsync(Guid orderId, CancellationToken ct);
    Task ReleaseInventoryAsync(Guid orderId, CancellationToken ct);
}

public interface IOrderRepository
{
    Task MarkOrderAsConfirmedAsync(Guid orderId, CancellationToken ct);
    Task MarkOrderAsFailedAsync(Guid orderId, string reason, CancellationToken ct);
}
