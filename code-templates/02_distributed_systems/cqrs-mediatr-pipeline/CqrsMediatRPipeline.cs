using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;

namespace DistributedSystems.Cqrs;

// =========================================================================
// 1. Command & Query Contracts
// =========================================================================
public record CreateProductCommand(string Name, string Sku, decimal Price) : IRequest<Guid>;
public record GetProductByIdQuery(Guid Id) : IRequest<ProductDto?>;
public record ProductDto(Guid Id, string Name, string Sku, decimal Price);

// =========================================================================
// 2. MediatR Validation Pipeline Behavior (Fail-Fast)
// =========================================================================
public class ValidationPipelineBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationPipelineBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(_validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var failures = validationResults.SelectMany(r => r.Errors).Where(f => f != null).ToList();

        if (failures.Count != 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }
}

// =========================================================================
// 3. MediatR Resiliency Pipeline Behavior (Polly Circuit Breaker & Retries)
// =========================================================================
public class ResilientPipelineBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<ResilientPipelineBehavior<TRequest, TResponse>> _logger;
    private static readonly AsyncCircuitBreakerPolicy CircuitBreakerPolicy = Policy
        .Handle<HttpRequestException>()
        .Or<TimeoutException>()
        .CircuitBreakerAsync(
            exceptionsAllowedBeforeBreaking: 3,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak: (ex, breakDelay) => { Console.WriteLine($"[CIRCUIT OPEN] Service unavailable for {breakDelay.TotalSeconds}s"); },
            onReset: () => { Console.WriteLine("[CIRCUIT CLOSED] Normal operation restored."); });

    public ResilientPipelineBehavior(ILogger<ResilientPipelineBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return await CircuitBreakerPolicy.ExecuteAsync(async () => await next());
    }
}

// =========================================================================
// 4. Command Handler with Domain Validation
// =========================================================================
public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Guid>
{
    public Task<Guid> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var productId = Guid.NewGuid();
        // Insert product into database & emit domain event
        return Task.FromResult(productId);
    }
}

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Sku).NotEmpty().Matches("^[A-Z0-9-]+$");
        RuleFor(x => x.Price).GreaterThan(0);
    }
}
