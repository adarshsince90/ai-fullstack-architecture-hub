using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace SecurityAndData.DynamoDb;

public record UserProfileDto(string UserId, string Email, string FullName, string Tier);
public record OrderSummaryDto(string OrderId, string UserId, decimal TotalAmount, string Status, string CreatedAtIso);

// =========================================================================
// Production DynamoDB Single-Table Repository Pattern (AWS SDK v3)
// =========================================================================
public class DynamoDbSingleTableRepository
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private const string TableName = "EnterpriseMasterTable";

    public DynamoDbSingleTableRepository(IAmazonDynamoDB dynamoDb)
    {
        _dynamoDb = dynamoDb;
    }

    // 1. Fetch User Profile + All Recent Orders in a Single Network Query!
    public async Task<(UserProfileDto? User, List<OrderSummaryDto> Orders)> GetUserAndOrdersAsync(string userId, CancellationToken ct)
    {
        var request = new QueryRequest
        {
            TableName = TableName,
            KeyConditionExpression = "PK = :pk AND SK begins_with(:skPrefix)",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":pk", new AttributeValue { S = $"USER#{userId}" } },
                { ":skPrefix", new AttributeValue { S = "ORDER#" } }
            },
            ConsistentRead = false // Consumes 0.5 RCU (Eventually Consistent)
        };

        var response = await _dynamoDb.QueryAsync(request, ct);

        var orders = new List<OrderSummaryDto>();
        foreach (var item in response.Items)
        {
            orders.Add(new OrderSummaryDto(
                OrderId: item["SK"].S.Replace("ORDER#", ""),
                UserId: userId,
                TotalAmount: decimal.Parse(item["TotalAmount"].N),
                Status: item["Status"].S,
                CreatedAtIso: item["CreatedAt"].S
            ));
        }

        // Fetch User Metadata
        var userRequest = new GetItemRequest
        {
            TableName = TableName,
            Key = new Dictionary<string, AttributeValue>
            {
                { "PK", new AttributeValue { S = $"USER#{userId}" } },
                { "SK", new AttributeValue { S = "METADATA" } }
            }
        };

        var userRes = await _dynamoDb.GetItemAsync(userRequest, ct);
        UserProfileDto? user = null;
        if (userRes.IsItemSet)
        {
            user = new UserProfileDto(
                UserId: userId,
                Email: userRes.Item["Email"].S,
                FullName: userRes.Item["FullName"].S,
                Tier: userRes.Item["Tier"].S
            );
        }

        return (user, orders);
    }

    // 2. Atomic ACID Checkout Transaction (User Balance Deduct + Order Insert)
    public async Task<bool> ExecuteAtomicCheckoutAsync(string userId, string orderId, decimal orderTotal, CancellationToken ct)
    {
        var transactRequest = new TransactWriteItemsRequest
        {
            TransactItems = new List<TransactWriteItem>
            {
                // Item 1: Insert New Order
                new()
                {
                    Put = new Put
                    {
                        TableName = TableName,
                        Item = new Dictionary<string, AttributeValue>
                        {
                            { "PK", new AttributeValue { S = $"USER#{userId}" } },
                            { "SK", new AttributeValue { S = $"ORDER#{orderId}" } },
                            { "TotalAmount", new AttributeValue { N = orderTotal.ToString() } },
                            { "Status", new AttributeValue { S = "CONFIRMED" } },
                            { "CreatedAt", new AttributeValue { S = DateTime.UtcNow.ToString("o") } }
                        }
                    }
                },
                // Item 2: Deduct User Credit with Pre-Condition Check!
                new()
                {
                    Update = new Update
                    {
                        TableName = TableName,
                        Key = new Dictionary<string, AttributeValue>
                        {
                            { "PK", new AttributeValue { S = $"USER#{userId}" } },
                            { "SK", new AttributeValue { S = "METADATA" } }
                        },
                        UpdateExpression = "SET Balance = Balance - :cost",
                        ConditionExpression = "Balance >= :cost", // Aborts transaction if insufficient funds!
                        ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                        {
                            { ":cost", new AttributeValue { N = orderTotal.ToString() } }
                        }
                    }
                }
            }
        };

        try
        {
            await _dynamoDb.TransactWriteItemsAsync(transactRequest, ct);
            return true;
        }
        catch (TransactionCanceledException)
        {
            // Condition check failed (Insufficient balance)
            return false;
        }
    }
}
