# Azure OpenAI Enterprise Integration & Microsoft Semantic Kernel in .NET

Microsoft Semantic Kernel (SK) is an enterprise open-source SDK that integrates Large Language Models (LLMs) like GPT-4o with conventional C# programming languages. Senior and Lead Engineers must understand how to construct autonomous AI agents, register native plugins, and manage automatic function calling loops securely.

---

## 1. Azure OpenAI Enterprise Security Foundations

Unlike public consumer APIs, **Azure OpenAI Service** provides enterprise-grade compliance:
- **Zero Training on Customer Data**: Prompts, completions, and fine-tuning data are never used to train or improve any OpenAI or Microsoft models.
- **Data Isolation & Encryption**: Data is encrypted at rest (Customer-Managed Keys / CMK) and in transit (TLS 1.3), hosted entirely within your private Azure Virtual Network (VNet) via **Private Endpoints**.
- **Automated Content Filtering**: Real-time evaluation for hate speech, self-harm, sexual content, and prompt injection attacks.

---

## 2. Microsoft Semantic Kernel Architecture

```text
┌────────────────────────────────────────────────────────┐
│ SEMANTIC KERNEL (.NET 8/10)                            │
│                                                        │
│  [ Kernel Core / Dependency Injection Container ]      │
│       │                                                │
│       ├──► [ AI Connectors ] (Azure OpenAI, Ollama)    │
│       │                                                │
│       ├──► [ Native Plugins ] (C# Methods with         │
│       │    [KernelFunction] & [Description] attributes)│
│       │                                                │
│       ├──► [ Semantic Prompt Functions ]               │
│       │                                                │
│       └──► [ Memory / Vector Stores ]                  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼ (Automatic Function Calling Loop)
┌────────────────────────────────────────────────────────┐
│ 1. User Prompt: "Book flight FL-99 and charge my card" │
│ 2. LLM evaluates registered native plugin tools        │
│ 3. LLM returns ToolCall: FlightPlugin.Book("FL-99")    │
│ 4. Semantic Kernel invokes native C# method on server  │
│ 5. Tool result fed back to LLM ──► Final User Response │
└────────────────────────────────────────────────────────┘
```

---

## 3. Native Plugin Implementation & Tool Calling

### 1. Creating a Native C# Plugin:
```csharp
using System.ComponentModel;
using Microsoft.SemanticKernel;

public class OrderManagementPlugin
{
    [KernelFunction, Description("Retrieves real-time order status and shipment tracking by Order ID.")]
    public async Task<string> GetOrderStatusAsync(
        [Description("The unique identifier of the order, e.g. ORD-9823")] string orderId,
        CancellationToken ct)
    {
        // Executes standard database query or API call
        return $"Order {orderId} is SHIPPED via FedEx (Tracking: 789234982). Estimated delivery: Tomorrow.";
    }

    [KernelFunction, Description("Cancels a pending order and initiates a refund.")]
    public async Task<bool> CancelOrderAsync(
        [Description("The unique order ID to cancel")] string orderId,
        CancellationToken ct)
    {
        Console.WriteLine($"[ACTION] Order {orderId} cancelled in database.");
        return true;
    }
}
```

### 2. Registering and Running Automatic Tool Calling:
```csharp
var builder = Kernel.CreateBuilder();

builder.AddAzureOpenAIChatCompletion(
    deploymentName: "gpt-4o",
    endpoint: "https://enterprise-openai.openai.azure.com/",
    apiKey: "secret-azure-api-key"
);

// Register Plugins
builder.Plugins.AddFromType<OrderManagementPlugin>("OrderPlugin");

var kernel = builder.Build();

// Enable Automatic Tool Selection
var executionSettings = new OpenAIPromptExecutionSettings
{
    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
};

var chatService = kernel.GetRequiredService<IChatCompletionService>();
var chatHistory = new ChatHistory();
chatHistory.AddUserMessage("Where is my order ORD-9823?");

var response = await chatService.GetChatMessageContentAsync(
    chatHistory,
    executionSettings,
    kernel
);

Console.WriteLine(response.Content);
// Output: "Your order ORD-9823 has shipped via FedEx (Tracking: 789234982) and is estimated to arrive tomorrow."
```

---

## 4. Senior & Lead Interview Scenarios

### Q1: How do you prevent an autonomous AI Agent from executing unauthorized destructive actions in Semantic Kernel?
**Lead Answer**: Use a **Human-in-the-Loop (HITL)** and **Permission Filter** pattern:
1. Implement an `IFunctionInvocationFilter` in Semantic Kernel to intercept all tool call invocations.
2. For read-only operations (`GetOrderStatus`), allow auto-execution.
3. For destructive mutations (`CancelOrder`, `TransferFunds`, `DeleteAccount`), the filter intercepts the call, generates a pending authorization token, and prompts the user for explicit confirmation (or 2FA verification) before permitting execution.

### Q2: What is the difference between Semantic Kernel and LangChain?
**Lead Answer**:
- **LangChain (Python/TS)**: Large ecosystem, rich for prototyping, but historically had rapid API churn and complex abstractions.
- **Semantic Kernel (.NET/C#/Python/Java)**: Built by Microsoft with enterprise design patterns: native Dependency Injection (`Microsoft.Extensions.DependencyInjection`), standard telemetry via `ActivitySource` and `ILogger`, strong typing, and direct alignment with Microsoft Copilot ecosystem.
