using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. DI Scope Validation (Captive Dependency Guard)
// ==========================================
builder.Host.UseDefaultServiceProvider((context, options) =>
{
    // Throws an exception at application startup if a Scoped service is injected into a Singleton!
    options.ValidateScopes = context.HostingEnvironment.IsDevelopment();
    options.ValidateOnBuild = true;
});

// ==========================================
// 2. Service Registrations & Pooling
// ==========================================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext Pooling: Reuses DbContext instances to eliminate GC allocations
builder.Services.AddDbContextPool<AppDbContext>(options =>
{
    options.UseInMemoryDatabase("EnterpriseDb");
    options.EnableDetailedErrors();
    options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
});

// Built-in Rate Limiting (.NET 8/10)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("GlobalPublicLimiter", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 20;
    });
});

// Register Application Services with Explicit Lifetimes
builder.Services.AddSingleton<ITelemetryMetricsService, TelemetryMetricsService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

var app = builder.Build();

// ==========================================
// 3. HTTP Request Middleware Pipeline
// ==========================================

// Global Exception Handling producing RFC 7807 ProblemDetails
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
        var exception = exceptionHandlerFeature?.Error;

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected enterprise error occurred",
            Detail = app.Environment.IsDevelopment() ? exception?.Demystify().ToString() : "Please contact platform support.",
            Instance = context.Request.Path
        };
        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRateLimiter();

// Custom Correlation ID Middleware
app.Use(async (context, next) =>
{
    const string CorrelationHeader = "X-Correlation-ID";
    if (!context.Request.Headers.TryGetValue(CorrelationHeader, out var correlationId))
    {
        correlationId = Guid.NewGuid().ToString("N");
        context.Request.Headers[CorrelationHeader] = correlationId;
    }
    context.Response.Headers[CorrelationHeader] = correlationId;
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("GlobalPublicLimiter");

// High-Performance Minimal API Endpoint
app.MapGet("/health/liveness", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

app.Run();

// Supporting mock interfaces for compilation
public interface ITelemetryMetricsService { void RecordRequest(); }
public class TelemetryMetricsService : ITelemetryMetricsService { public void RecordRequest() { } }
public interface IUserRepository { }
public class UserRepository : IUserRepository { public UserRepository(AppDbContext db) { } }
public class AppDbContext : DbContext { public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { } }
