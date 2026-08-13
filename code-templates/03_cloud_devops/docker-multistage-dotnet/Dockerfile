# =========================================================================
# Stage 1: Build & Publish Stage (Using Full .NET SDK)
# =========================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Leverage Docker layer caching by copying and restoring csproj first
COPY ["CleanArchitectureWebApi.csproj", "./"]
RUN dotnet restore "CleanArchitectureWebApi.csproj" --runtime linux-musl-x64

# Copy source code and build optimized release artifacts
COPY . .
RUN dotnet publish "CleanArchitectureWebApi.csproj" \
    -c Release \
    -r linux-musl-x64 \
    --no-restore \
    -o /app/publish \
    /p:PublishReadyToRun=true \
    /p:PublishTrimmed=false

# =========================================================================
# Stage 2: Hardened, Non-Root Runtime Stage
# =========================================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final

# Install required security updates and tzdata
RUN apk update && apk upgrade && apk add --no-cache tzdata

WORKDIR /app

# Configure ASP.NET Core environment variables for container environments
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_EnableDiagnostics=0

# Create unprivileged system user and group (prevents container breakout)
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Copy published binaries from build stage with strict ownership
COPY --from=build --chown=appuser:appgroup /app/publish .

# Switch to non-root user
USER appuser

# Expose Kestrel application port
EXPOSE 8080

# Health check instruction
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health/liveness || exit 1

ENTRYPOINT ["dotnet", "CleanArchitectureWebApi.dll"]
