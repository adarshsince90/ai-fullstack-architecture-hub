const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'docs', 'Definitions.md'),
  path.join(__dirname, '..', 'docs', 'profile', 'Definitions.md')
];

const newTop25 = `## 📌 Executive Fast-Track Index (Top 25 Core Topics)

> **Fast-Track Portal**: Click any priority topic below to jump directly to its canonical source-of-truth card under its respective domain section—placing you directly beneath the **Domain System Lifecycle Flowchart**!

### Core Backend & Data Persistence
- ⚡ [01. C#](#sec-core-net-c-)
- ⚡ [02. ASP.NET Core](#sec-core-net-asp-net-core-web-api)
- ⚡ [03. Web API](#sec-core-net-asp-net-core-web-api)
- ⚡ [04. Entity Framework Core](#sec-databases-entity-framework-core)
- ⚡ [05. SQL Server](#sec-databases-sql-server)
- ⚡ [06. PostgreSQL](#sec-databases-sql-server)
- ⚡ [07. LINQ](#sec-core-net-linq)

### Distributed Systems & Cloud Architecture
- ⚡ [08. Microservices](#sec-microservices-microservices-architecture)
- ⚡ [09. Distributed Systems](#sec-microservices-distributed-systems)
- ⚡ [10. CQRS](#sec-architecture-design-cqrs)
- ⚡ [11. Saga Pattern](#sec-distributed-systems-saga-pattern)
- ⚡ [12. AWS Services](#sec-aws-lambda)
- ⚡ [13. Docker](#sec-devops-docker)
- ⚡ [14. Kubernetes](#sec-devops-kubernetes)

### Security & Data Engineering
- ⚡ [15. Authentication & JWT](#sec-security-authentication)
- ⚡ [16. OAuth2 / OIDC](#sec-security-oauth-2-0)
- ⚡ [17. DynamoDB](#sec-databases-dynamodb)

### Frontend Engineering & Frameworks
- ⚡ [18. JavaScript (ES6+)](#sec-frontend-javascript-es6-)
- ⚡ [19. TypeScript](#sec-frontend-typescript)
- ⚡ [20. Angular 8-17](#sec-frontend-angular-8-17)
- ⚡ [21. ReactJS](#sec-frontend-reactjs)
- ⚡ [22. Redux Toolkit](#sec-frontend-redux-toolkit)

### Observability & AI Engineering
- ⚡ [23. OpenTelemetry](#sec-observability-opentelemetry)
- ⚡ [24. Performance Optimization](#sec-system-design-hld-lld-performance)
- ⚡ [25. RAG / Azure OpenAI](#sec-ai-enablement-rag)
- 📡 [26. Enterprise Observability & Request Flow Architecture Guide (Interactive)](docs/strategy/index.html)

---

`;

targetFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  let startIndex = content.indexOf('## 📌 Top 25');
  if (startIndex === -1) {
    startIndex = content.indexOf('## 📌 Executive Fast-Track Index');
  }
  if (startIndex === -1) {
    startIndex = content.indexOf('### 📌 Executive Fast-Track Index');
  }

  const endIndex = content.indexOf('## 📌 CORE .NET');

  if (startIndex !== -1 && endIndex !== -1) {
    const updatedContent = content.substring(0, startIndex) + newTop25 + content.substring(endIndex);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✅ Successfully refactored Top 25 section in ${path.basename(filePath)}`);
  } else {
    console.error(`❌ Markers not found in ${path.basename(filePath)}:`, { startIndex, endIndex });
  }
});
