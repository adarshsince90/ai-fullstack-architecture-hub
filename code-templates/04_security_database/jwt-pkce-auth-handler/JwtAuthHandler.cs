using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace SecurityAndData.Auth;

public static class AuthenticationExtensions
{
    // =========================================================================
    // Enterprise OIDC JWT Bearer Authentication Setup with Public JWKS Caching
    // =========================================================================
    public static IServiceCollection AddEnterpriseJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var authority = config["Auth:Authority"] ?? "https://auth.enterprise.com";
        var audience = config["Auth:Audience"] ?? "https://api.enterprise.com";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.Authority = authority;
            options.Audience = audience;
            options.RequireHttpsMetadata = true;

            // Cryptographic Token Validation Parameters (RS256)
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = authority,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30), // Prevent large clock drift tolerances
                ValidateIssuerSigningKey = true,
                NameClaimType = ClaimTypes.NameIdentifier,
                RoleClaimType = ClaimTypes.Role
            };

            // Custom SignalR / WebSocket access token handler
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception is SecurityTokenExpiredException)
                    {
                        context.Response.Headers.Append("Token-Expired", "true");
                    }
                    return Task.CompletedTask;
                }
            };
        });

        // =====================================================================
        // Policy-Based Authorization (Claims & Scopes)
        // =====================================================================
        services.AddAuthorization(options =>
        {
            options.AddPolicy("CanWriteOrders", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireClaim("scope", "orders.write")
                      .RequireRole("PlatformAdmin", "OrderManager"));

            options.AddPolicy("TenantEnforced", policy =>
                policy.RequireAssertion(ctx =>
                    ctx.User.HasClaim(c => c.Type == "tenant_id" && !string.IsNullOrEmpty(c.Value))));
        });

        return services;
    }
}
