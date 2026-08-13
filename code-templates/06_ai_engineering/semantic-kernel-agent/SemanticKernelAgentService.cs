using System.ComponentModel;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace AiEngineering.SemanticKernel;

// =========================================================================
// 1. Enterprise Native Plugin with Strongly-Typed Attributes
// =========================================================================
public class EnterpriseDatabasePlugin
{
    private readonly ILogger<EnterpriseDatabasePlugin> _logger;

    public EnterpriseDatabasePlugin(ILogger<EnterpriseDatabasePlugin> logger)
    {
        _logger = logger;
    }

    [KernelFunction, Description("Searches customer database and returns account tier, active services, and balance.")]
    public Task<string> GetCustomerAccountAsync(
        [Description("The unique customer identifier, e.g. CUST-1001")] string customerId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Native tool invoked: GetCustomerAccount for {CustomerId}", customerId);

        // Mock database response
        var accountInfo = new
        {
            CustomerId = customerId,
            Tier = "Enterprise Platinum",
            Balance = 4250.00,
            ActiveSubscriptions = new[] { "Azure Cloud Suite", "24/7 Premium Support" }
        };

        return Task.FromResult(JsonSerializer.Serialize(accountInfo));
    }

    [KernelFunction, Description("Applies a promotional credit discount to the customer account balance.")]
    public Task<bool> ApplyPromotionalCreditAsync(
        [Description("The customer ID")] string customerId,
        [Description("The credit amount in USD, e.g. 50.00")] decimal creditAmount,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Native tool invoked: ApplyPromotionalCredit of ${Amount} to {CustomerId}", creditAmount, customerId);
        return Task.FromResult(true);
    }
}

// =========================================================================
// 2. Production Semantic Kernel Autonomous Agent Service
// =========================================================================
public class SemanticKernelAgentService
{
    private readonly Kernel _kernel;
    private readonly IChatCompletionService _chatService;
    private readonly ILogger<SemanticKernelAgentService> _logger;

    public SemanticKernelAgentService(
        ILogger<SemanticKernelAgentService> logger,
        ILogger<EnterpriseDatabasePlugin> pluginLogger)
    {
        _logger = logger;

        // Initialize Semantic Kernel Builder
        var builder = Kernel.CreateBuilder();

        // Configure Azure OpenAI Chat Completion connector
        builder.AddAzureOpenAIChatCompletion(
            deploymentName: "gpt-4o",
            endpoint: "https://enterprise-ai.openai.azure.com/",
            apiKey: "dummy-key-for-template"
        );

        // Register Native Plugins
        builder.Plugins.AddFromObject(new EnterpriseDatabasePlugin(pluginLogger), "DatabasePlugin");

        _kernel = builder.Build();
        _chatService = _kernel.GetRequiredService<IChatCompletionService>();
    }

    public async Task<string> ProcessUserPromptWithAutoToolCallingAsync(string userPrompt, CancellationToken ct = default)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage("You are an autonomous enterprise AI platform assistant. Answer queries factually using registered database tools.");
        chatHistory.AddUserMessage(userPrompt);

        // Enable Automatic Tool Selection & Execution Loop
        var executionSettings = new OpenAIPromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),
            Temperature = 0.2, // Deterministic factual execution
            MaxTokens = 1000
        };

        try
        {
            var response = await _chatService.GetChatMessageContentAsync(
                chatHistory,
                executionSettings,
                _kernel,
                ct
            );

            return response.Content ?? "No response generated.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during agent execution loop.");
            return $"Error: {ex.Message}";
        }
    }
}
