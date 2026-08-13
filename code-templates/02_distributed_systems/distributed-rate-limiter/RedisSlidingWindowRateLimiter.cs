using StackExchange.Redis;

namespace DistributedSystems.RateLimiting;

// =========================================================================
// Distributed Sliding Window Log Rate Limiter using Atomic Redis Lua Script
// =========================================================================
public class RedisSlidingWindowRateLimiter
{
    private readonly IDatabase _redisDb;

    // Atomic Lua Script: ZREMRANGEBYSCORE -> ZCARD -> ZADD -> EXPIRE
    private const string SlidingWindowLuaScript = @"
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local clearBefore = now - window

        -- 1. Remove expired timestamps outside the sliding window
        redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

        -- 2. Check total requests remaining in current window
        local currentRequests = redis.call('ZCARD', key)

        if currentRequests < limit then
            -- 3. Add current request timestamp (using uniquely salted score/member)
            redis.call('ZADD', key, now, now .. ':' .. ARGV[4])
            redis.call('EXPIRE', key, window + 1)
            return 1 -- Allowed
        else
            return 0 -- Rate Limit Exceeded (HTTP 429)
        end
    ";

    private readonly LuaScript _preparedScript;

    public RedisSlidingWindowRateLimiter(IConnectionMultiplexer redis)
    {
        _redisDb = redis.GetDatabase();
        _preparedScript = LuaScript.Prepare(SlidingWindowLuaScript);
    }

    public async Task<bool> IsRequestAllowedAsync(string clientId, int maxRequests, TimeSpan window)
    {
        var key = $"ratelimit:{clientId}";
        var nowUnixSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var windowSeconds = (int)window.TotalSeconds;
        var uniqueSalt = Guid.NewGuid().ToString("N")[..8];

        var result = await _redisDb.ScriptEvaluateAsync(_preparedScript, new
        {
            key = (RedisKey)key,
            now = nowUnixSeconds,
            window = windowSeconds,
            limit = maxRequests,
            salt = uniqueSalt
        });

        return (int)result == 1;
    }
}
