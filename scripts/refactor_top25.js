const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'profile', 'Definitions.md');
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '### 📌 Executive Fast-Track Index (Top 25 Core Topics)';
const endMarker = '## 📌 CORE .NET';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newTop25 = `### 📌 Executive Fast-Track Index (Top 25 Core Topics)

> **Fast-Track Portal**: Click any priority topic below to jump directly to its canonical source-of-truth card under its respective domain section—placing you directly beneath the **Domain System Lifecycle Flowchart**!

### Core Backend & Data Persistence
- ⚡ [01. C#](#sec-core-net-c-)
- ⚡ [02. ASP.NET Core](#sec-core-net-asp-net-core)
- ⚡ [03. Web API](#sec-core-net-web-api)
- ⚡ [04. Entity Framework Core](#sec-databases-entity-framework-core)
- ⚡ [05. SQL Server](#sec-databases-sql-server)
- ⚡ [06. PostgreSQL](#sec-databases-postgresql)
- ⚡ [07. LINQ](#sec-core-net-linq)

### Distributed Systems & Cloud Architecture
- ⚡ [08. Microservices](#sec-microservices-microservices)
- ⚡ [09. Distributed Systems](#sec-distributed-systems-distributed-systems)
- ⚡ [10. CQRS](#sec-architecture-design-cqrs)
- ⚡ [11. Saga Pattern](#sec-microservices-saga-pattern)
- ⚡ [12. AWS Services](#sec-aws-aws-services)
- ⚡ [13. Docker](#sec-devops-docker)
- ⚡ [14. Kubernetes](#sec-devops-kubernetes)

### Security & Data Engineering
- ⚡ [15. Authentication & JWT](#sec-security-authentication-jwt)
- ⚡ [16. OAuth2 / OIDC](#sec-security-oauth2-oidc)
- ⚡ [17. DynamoDB](#sec-databases-dynamodb)

### Frontend Engineering & Frameworks
- ⚡ [18. JavaScript (ES6+)](#sec-frontend-javascript-es6-)
- ⚡ [19. TypeScript](#sec-frontend-typescript)
- ⚡ [20. Angular 8-17](#sec-frontend-angular-8-17)
- ⚡ [21. ReactJS](#sec-frontend-reactjs)
- ⚡ [22. Redux Toolkit](#sec-frontend-redux-toolkit)

### Observability & AI Engineering
- ⚡ [23. OpenTelemetry](#sec-observability-opentelemetry)
- ⚡ [24. Performance Optimization](#sec-architect-principal-engineer-track-performance-optimization)
- ⚡ [25. RAG / Azure OpenAI](#sec-ai-enablement-rag-azure-openai)

---

`;

  const updatedContent = content.substring(0, startIndex) + newTop25 + content.substring(endIndex);
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
  console.log('✅ Successfully refactored Top 25 section in Definitions.md');
} else {
  console.error('❌ Markers not found:', { startIndex, endIndex });
}
