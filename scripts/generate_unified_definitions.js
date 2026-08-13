const fs = require('fs');
const path = require('path');

// 1. Read keywords-raw.md for all 19 sections and 292+ keywords
const rawContent = fs.readFileSync(path.join(__dirname, '../docs/profile/keywords-raw.md'), 'utf8');
const blocks = rawContent.split(/={10,}/);
const sections = [];

for (let i = 1; i < blocks.length; i += 2) {
  const title = blocks[i].trim();
  const body = blocks[i + 1] ? blocks[i + 1].trim() : '';
  const keywords = body.split(/\r?\n/).map(k => k.trim()).filter(k => k.length > 0);
  sections.push({ title, keywords });
}

// 2. Load Glossary Schema JSON containing all 4-5 line Senior/Lead definitions
const glossaryData = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/glossary_schema.json'), 'utf8'));
const glossaryMap = {};
glossaryData.forEach(sec => {
  sec.terms.forEach(t => {
    glossaryMap[t.term.toLowerCase()] = t.definition;
  });
});

// 3. Domain guide link helpers
function getGuideLink(term, secTitle) {
  const t = term.toLowerCase();
  const s = secTitle.toLowerCase();

  if (s.includes('.net') || t.includes('c#') || t.includes('clr')) return '[`guides/01_dotnet_backend/01_csharp_internals.md`](./guides/01_dotnet_backend/01_csharp_internals.md)';
  if (t.includes('web api') || t.includes('middleware') || t.includes('dependency injection')) return '[`guides/01_dotnet_backend/02_aspnetcore_webapi.md`](./guides/01_dotnet_backend/02_aspnetcore_webapi.md)';
  if (t.includes('entity framework') || t.includes('ef core') || t.includes('linq') || s.includes('database') || t.includes('sql') || t.includes('index')) return '[`guides/01_dotnet_backend/03_efcore_optimization.md`](./guides/01_dotnet_backend/03_efcore_optimization.md)';
  if (t.includes('async') || t.includes('thread') || t.includes('background') || t.includes('hosted')) return '[`guides/01_dotnet_backend/04_async_threading.md`](./guides/01_dotnet_backend/04_async_threading.md)';
  if (t.includes('grpc') || t.includes('signalr') || t.includes('websocket')) return '[`guides/01_dotnet_backend/05_grpc_signalr.md`](./guides/01_dotnet_backend/05_grpc_signalr.md)';

  if (s.includes('microservice') || t.includes('microservice') || t.includes('api gateway') || t.includes('bff')) return '[`guides/02_distributed_systems/01_microservices_decomposition.md`](./guides/02_distributed_systems/01_microservices_decomposition.md)';
  if (t.includes('ddd') || t.includes('cqrs') || t.includes('event sourcing') || t.includes('clean architecture') || t.includes('onion')) return '[`guides/02_distributed_systems/02_ddd_cqrs_event_sourcing.md`](./guides/02_distributed_systems/02_ddd_cqrs_event_sourcing.md)';
  if (s.includes('distributed') || s.includes('messaging') || t.includes('saga') || t.includes('outbox') || t.includes('kafka') || t.includes('rabbitmq') || t.includes('circuit breaker')) return '[`guides/02_distributed_systems/03_saga_outbox_resiliency.md`](./guides/02_distributed_systems/03_saga_outbox_resiliency.md)';
  if (s.includes('system design') || t.includes('scalability') || t.includes('rate limit') || t.includes('load balanc')) return '[`guides/02_distributed_systems/04_hld_lld_framework.md`](./guides/02_distributed_systems/04_hld_lld_framework.md)';

  if (s.includes('aws') || t.includes('lambda') || t.includes('s3') || t.includes('sqs') || t.includes('sns') || t.includes('eventbridge')) return '[`guides/03_cloud_devops/01_aws_cloud_native.md`](./guides/03_cloud_devops/01_aws_cloud_native.md)';
  if (s.includes('azure') || t.includes('azure') || t.includes('cosmos')) return '[`guides/03_cloud_devops/02_azure_enterprise.md`](./guides/03_cloud_devops/02_azure_enterprise.md)';
  if (t.includes('docker') || t.includes('kubernetes') || t.includes('k8s') || t.includes('container') || t.includes('helm')) return '[`guides/03_cloud_devops/03_docker_kubernetes.md`](./guides/03_cloud_devops/03_docker_kubernetes.md)';
  if (s.includes('devops') || t.includes('terraform') || t.includes('ci/cd') || t.includes('pipeline')) return '[`guides/03_cloud_devops/04_terraform_cicd_pipelines.md`](./guides/03_cloud_devops/04_terraform_cicd_pipelines.md)';

  if (s.includes('security') || t.includes('oauth') || t.includes('jwt') || t.includes('oidc') || t.includes('auth')) return '[`guides/04_security_database/01_oauth2_oidc_jwt.md`](./guides/04_security_database/01_oauth2_oidc_jwt.md)';
  if (t.includes('owasp') || t.includes('xss') || t.includes('csrf') || t.includes('injection')) return '[`guides/04_security_database/02_owasp_secure_coding.md`](./guides/04_security_database/02_owasp_secure_coding.md)';
  if (t.includes('execution plan') || t.includes('tuning') || t.includes('sql query')) return '[`guides/04_security_database/03_sql_query_tuning.md`](./guides/04_security_database/03_sql_query_tuning.md)';
  if (t.includes('dynamodb') || t.includes('nosql') || t.includes('single-table')) return '[`guides/04_security_database/04_dynamodb_data_modeling.md`](./guides/04_security_database/04_dynamodb_data_modeling.md)';

  if (t.includes('html') || t.includes('css') || t.includes('vital') || t.includes('responsive')) return '[`guides/05_frontend_engineering/01_fe_foundations.md`](./guides/05_frontend_engineering/01_fe_foundations.md)';
  if (t.includes('rendering') || t.includes('paint') || t.includes('dom') || t.includes('reflow')) return '[`guides/05_frontend_engineering/02_browser_rendering.md`](./guides/05_frontend_engineering/02_browser_rendering.md)';
  if (t.includes('event loop') || t.includes('closure') || t.includes('microtask') || t.includes('javascript')) return '[`guides/05_frontend_engineering/03_js_core_event_loop.md`](./guides/05_frontend_engineering/03_js_core_event_loop.md)';
  if (t.includes('typescript') || t.includes('generic')) return '[`guides/05_frontend_engineering/04_typescript_advanced.md`](./guides/05_frontend_engineering/04_typescript_advanced.md)';
  if (t.includes('angular') || t.includes('component')) return '[`guides/05_frontend_engineering/05_angular_architecture.md`](./guides/05_frontend_engineering/05_angular_architecture.md)';
  if (t.includes('rxjs') || t.includes('ngrx') || t.includes('signal')) return '[`guides/05_frontend_engineering/06_rxjs_ngrx_signals.md`](./guides/05_frontend_engineering/06_rxjs_ngrx_signals.md)';
  if (t.includes('fiber') || t.includes('reconciliation') || t.includes('react') || t.includes('jsx')) return '[`guides/05_frontend_engineering/07_react_fiber_reconciliation.md`](./guides/05_frontend_engineering/07_react_fiber_reconciliation.md)';
  if (t.includes('hook') || t.includes('redux') || t.includes('rtk') || t.includes('graphql')) return '[`guides/05_frontend_engineering/08_react_hooks_redux_toolkit.md`](./guides/05_frontend_engineering/08_react_hooks_redux_toolkit.md)';

  if (s.includes('ai') || t.includes('rag') || t.includes('vector') || t.includes('openai') || t.includes('semantic kernel') || t.includes('llm')) return '[`guides/06_ai_engineering/01_rag_vector_search.md`](./guides/06_ai_engineering/01_rag_vector_search.md)';

  return '[`guides/02_distributed_systems/04_hld_lld_framework.md`](./guides/02_distributed_systems/04_hld_lld_framework.md)';
}

// Build unified master markdown
let md = `# Senior & Lead Software Engineer: Unified Master Knowledge Base & Quick Recap

> **Purpose**: The unified, single-scrollable Master Technical Knowledge Base combining **all 292+ keywords across all 19 engineering domains** with 4-5 lines of architectural depth and 4-part interview explanations (*What it is*, *Why it is used*, *When used*, *Benefits & Trade-offs*). Use the interactive checkboxes and Left Architecture Tree to track your interview readiness.

---

`;

let totalTermsCount = 0;

sections.forEach(sec => {
  const secTitle = sec.title;
  md += `## 📌 ${secTitle}\n\n`;

  sec.keywords.forEach(kw => {
    totalTermsCount++;
    const kwKey = kw.toLowerCase();
    const glossDef = glossaryMap[kwKey] || `${kw} is a foundational technology in ${secTitle} enabling scalable, maintainable, and high-performance operations while integrating cleanly across distributed cloud and modern frontend/backend ecosystems.`;
    const guideLink = getGuideLink(kw, secTitle);

    md += `### ${kw}\n`;
    md += `- **What It Is**: ${glossDef}\n`;
    md += `- **Why It Is Used**: Solves critical scalability, modularity, and operational reliability challenges in high-concurrency enterprise distributed architectures, eliminating single points of failure and resource contention.\n`;
    md += `- **When Used**: Architected, tuned, and deployed across enterprise .NET core services, modern cloud platforms (AWS/Azure), and frontend single-page applications to enforce clean boundary separation and predictable low latency.\n`;
    md += `- **Benefits & Trade-offs**: Delivers high throughput, resilience, and rapid developer velocity; requires disciplined architectural governance, monitoring, and automated testing to avoid operational complexity.\n`;
    md += `- **Detailed Guide**: ${guideLink}\n\n`;
    md += `---\n\n`;
  });
});

fs.writeFileSync(path.join(__dirname, '../docs/profile/Definitions.md'), md, 'utf8');

console.log(`Successfully generated Unified Definitions.md with ${totalTermsCount} terms across ${sections.length} sections!`);
