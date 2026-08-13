const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'profile', 'Definitions.md');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Interactive Flowchart Headers Replacement
const flowcharts = {
  databases: `> **Architectural Data Systems Lifecycle**:
> 📖 **Deep Guides**: [SQL & Postgres Engine Tuning](guides/04_security_database/03_sql_query_tuning.md) | [EF Core Optimization](guides/01_dotnet_backend/03_efcore_optimization.md) | [DynamoDB Single-Table Design](guides/04_security_database/04_dynamodb_data_modeling.md)
> \`\`\`text
> [1. Data Modeling & Normalization]
>        │
>        ├───────────────────────────────┐
>        ▼                               ▼
> [Relational Engine]           [NoSQL Key-Value / Doc]
> (SQL Server / PostgreSQL)     (DynamoDB Single-Table)
>        │                               │
>        ▼                               ▼
> [Indexing: B-Tree/GIN/Vector] [Partition (PK) & Sort (SK)]
>        │                               │
>        ▼                               ▼
> [ORM Access: EF Core / Npgsql] [Direct HTTP / AWS SDK]
>        │                               │
>        └───────────────┬───────────────┘
>                        │
>                        ▼
>     [Multi-Tier Caching: Redis & MemoryCache]
> \`\`\``,

  dotnet: `> **ASP.NET Core Systems Execution Flow**:
> 📖 **Deep Guides**: [C# Internals](guides/01_dotnet_backend/01_csharp_internals.md) | [Web API & Middleware](guides/01_dotnet_backend/02_aspnetcore_webapi.md) | [EF Core Optimization](guides/01_dotnet_backend/03_efcore_optimization.md)
> \`\`\`text
> [Incoming HTTP Request] ──► [Middleware Request Pipeline]
>                                     │ (DI Scope Resolved)
>                                     ▼
>                             [Controller / Minimal API]
>                                     │ (Async/Await Task)
>                                     ▼
>                             [Domain Logic & EF Core ORM]
>                                     │
>                                     ▼
>                             [Background / Hosted Services]
> \`\`\``,

  frontend: `> **Modern Frontend Engineering Architecture Flow**:
> 📖 **Deep Guides**: [JS Event Loop](guides/05_frontend_engineering/03_js_core_event_loop.md) | [Angular Architecture](guides/05_frontend_engineering/05_angular_architecture.md) | [React Fiber & VDOM](guides/05_frontend_engineering/07_react_fiber_reconciliation.md) | [Redux Toolkit Flow](guides/05_frontend_engineering/08_react_hooks_redux_toolkit.md)
> \`\`\`text
> [HTML5 Semantic DOM & CSS3 Layouts]
>                 │
>                 ▼
> [JS V8 Engine: Call Stack, Event Loop & Microtasks]
>                 │
>                 ▼
> [Component Engine: Angular Signals / React Fiber]
>                 │
>                 ▼
> [State Management: Redux RTK Event-Sourcing / RxJS]
> \`\`\``,

  distributed: `> **Enterprise Distributed Systems Architecture Flow**:
> 📖 **Deep Guides**: [Microservices Architecture](guides/02_distributed_systems/01_microservices_architecture.md) | [DDD & CQRS Event Sourcing](guides/02_distributed_systems/02_ddd_cqrs_event_sourcing.md) | [Distributed Saga & Outbox](guides/02_distributed_systems/03_saga_outbox_resiliency.md)
> \`\`\`text
> [Client Request] ──► [API Gateway / Rate Limiter]
>                             │
>                             ▼
>                     [Bounded Context Microservices]
>                             │
>              ┌──────────────┴──────────────┐
>              ▼                             ▼
>    [CQRS Write Model]             [CQRS Read Model]
>    (Saga & Outbox Pattern)        (Denormalized Cache / Elastic)
>              │                             │
>              └──────────────┬──────────────┘
>                             │
>                             ▼
>             [Distributed Tracing: OpenTelemetry]
> \`\`\``,

  ai: `> **Enterprise RAG & Vector Search Systems Flow**:
> 📖 **Deep Guides**: [RAG & Vector Search Pipelines](guides/06_ai_engineering/01_rag_vector_search.md) | [Azure Enterprise Services](guides/03_cloud_devops/02_azure_enterprise.md)
> \`\`\`text
> [User Prompt] ──► [Embedding Generator]
>                           │
>                           ▼
>             [Vector DB: pgvector / Azure Search]
>                           │ (Cosine Similarity Top-K)
>                           ▼
>             [Grounded Prompt Augmentation]
>                           │
>                           ▼
>             [Azure OpenAI LLM Response Generation]
> \`\`\``
};

// Replace flowcharts
content = content.replace(/> \*\*Architectural Data Systems Lifecycle\*\*:[\s\S]*?```text[\s\S]*?```/, flowcharts.databases);
content = content.replace(/> \*\*ASP\.NET Core Systems Execution Flow\*\*:[\s\S]*?```text[\s\S]*?```/, flowcharts.dotnet);
content = content.replace(/> \*\*Modern Frontend Engineering Architecture Flow\*\*:[\s\S]*?```text[\s\S]*?```/, flowcharts.frontend);
content = content.replace(/> \*\*Enterprise Distributed Systems Architecture Flow\*\*:[\s\S]*?```text[\s\S]*?```/, flowcharts.distributed);
content = content.replace(/> \*\*Enterprise RAG & Vector Search Systems Flow\*\*:[\s\S]*?```text[\s\S]*?```/, flowcharts.ai);

// Helper to re-order cards within a section
function reorderSectionTopics(sectionTitle, orderedTopicNames) {
  const sectionHeader = `## ${sectionTitle}`;
  const sectionIdx = content.indexOf(sectionHeader);
  if (sectionIdx === -1) return;

  // Find next H2 section or EOF
  const nextSectionIdx = content.indexOf('\n## ', sectionIdx + 5);
  const endIdx = nextSectionIdx === -1 ? content.length : nextSectionIdx;

  const sectionText = content.substring(sectionIdx, endIdx);
  const lines = sectionText.split('\n');

  // Extract section intro lines (everything before first ### )
  let introLines = [];
  const cards = [];
  let currentTitle = '';
  let currentCardLines = [];

  for (let line of lines) {
    if (line.startsWith('### ')) {
      if (!currentTitle) {
        introLines = currentCardLines;
      } else {
        cards.push({ title: currentTitle, text: currentCardLines.join('\n').trim() });
      }
      currentTitle = line.replace('### ', '').trim();
      currentCardLines = [line];
    } else {
      currentCardLines.push(line);
    }
  }
  if (currentTitle) {
    cards.push({ title: currentTitle, text: currentCardLines.join('\n').trim() });
  }

  // Sort cards according to orderedTopicNames; unmentioned cards stay at the end
  const sortedCards = [];
  orderedTopicNames.forEach(tName => {
    const cardIdx = cards.findIndex(c => c.title.toLowerCase() === tName.toLowerCase());
    if (cardIdx !== -1) {
      sortedCards.push(cards[cardIdx]);
      cards.splice(cardIdx, 1);
    }
  });
  // Append any remaining cards
  sortedCards.push(...cards);

  // Reconstruct section
  const newSectionText = introLines.join('\n').trim() + '\n\n' + sortedCards.map(c => c.text).join('\n\n---\n\n') + '\n\n';
  content = content.substring(0, sectionIdx) + newSectionText + content.substring(endIdx);
}

// 2. Re-order FRONTEND domain cards
reorderSectionTopics('📌 FRONTEND', [
  'HTML5',
  'CSS3',
  'JavaScript (ES6+)',
  'Event Loop',
  'Promises',
  'Async/Await',
  'TypeScript',
  'SPA',
  'Component Architecture',
  'Angular 8-17',
  'ReactJS',
  'Virtual DOM',
  'Fiber',
  'Redux Toolkit',
  'Signals',
  'esbuild',
  'PostCSS'
]);

// 3. Re-order DATABASES domain cards
reorderSectionTopics('📌 DATABASES', [
  'Database Design',
  'Data Modeling',
  'Normalization',
  'SQL Server',
  'PostgreSQL',
  'Indexes',
  'CTEs',
  'Transactions',
  'Query Optimization',
  'Execution Plans',
  'Entity Framework Core',
  'Code First',
  'Migrations',
  'DynamoDB',
  'Redis'
]);

// Write updated content
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Successfully updated Definitions.md with interactive flowchart chips & pedagogical topic ordering');
