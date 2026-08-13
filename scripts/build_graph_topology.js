/**
 * Graph Topology Auto-Parser Engine
 * Generates docs/graph_topology.json by parsing docs/mindmap_schema.json and scanning guides/
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MINDMAP_SCHEMA_PATH = path.join(ROOT_DIR, 'docs', 'mindmap_schema.json');
const OUTPUT_TOPOLOGY_PATH = path.join(ROOT_DIR, 'docs', 'graph_topology.json');

// Taxonomy mapping helpers based on domain and topic IDs
function inferTaxonomies(domainId, topicId, topicName) {
  let sdlcPhase = 'Development';
  let techDomain = 'Backend';
  let archLayer = 'Application/Domain';

  // 1. Tech Domain mapping
  if (domainId === 'dotnet-backend') techDomain = 'Backend';
  else if (domainId === 'distributed-systems') techDomain = 'System Design';
  else if (domainId === 'cloud-devops') techDomain = 'Cloud/DevOps';
  else if (domainId === 'security-data') techDomain = 'Security/Data';
  else if (domainId === 'frontend-engineering') techDomain = 'Frontend';
  else if (domainId === 'ai-engineering') techDomain = 'AI';

  // 2. SDLC Phase mapping
  const lowerName = topicName.toLowerCase();
  const lowerId = topicId.toLowerCase();

  if (lowerName.includes('requirement') || lowerName.includes('domain-driven') || lowerId.includes('ddd')) {
    sdlcPhase = 'Requirements & Domain';
  } else if (lowerName.includes('architecture') || lowerName.includes('design') || lowerName.includes('hld-lld') || lowerName.includes('patterns')) {
    sdlcPhase = 'Design & Architecture';
  } else if (lowerName.includes('test') || lowerName.includes('qa') || lowerName.includes('quality') || lowerName.includes('vitals')) {
    sdlcPhase = 'Testing & Quality';
  } else if (lowerName.includes('security') || lowerName.includes('oauth') || lowerName.includes('jwt') || lowerName.includes('owasp') || lowerName.includes('vault')) {
    sdlcPhase = 'Security & Compliance';
  } else if (lowerName.includes('docker') || lowerName.includes('kubernetes') || lowerName.includes('aws') || lowerName.includes('azure') || lowerName.includes('terraform') || lowerName.includes('ci/cd')) {
    sdlcPhase = 'Deployment & Ops';
  } else if (lowerName.includes('sdlc') || lowerName.includes('copilot') || lowerName.includes('assisted')) {
    sdlcPhase = 'Maintenance & Ops';
  } else {
    sdlcPhase = 'Development';
  }

  // 3. Architectural Layer mapping
  if (techDomain === 'Frontend' || lowerName.includes('browser') || lowerName.includes('rendering') || lowerName.includes('client')) {
    archLayer = 'Presentation Layer';
  } else if (lowerName.includes('gateway') || lowerName.includes('microservices') || lowerName.includes('webapi') || lowerName.includes('grpc') || lowerName.includes('signalr')) {
    archLayer = 'API & Gateway Layer';
  } else if (techDomain === 'Security/Data' && (lowerName.includes('sql') || lowerName.includes('dynamodb') || lowerName.includes('ef core') || lowerName.includes('database'))) {
    archLayer = 'Persistence Layer';
  } else if (techDomain === 'Cloud/DevOps' || lowerName.includes('k8s') || lowerName.includes('container')) {
    archLayer = 'Infrastructure Layer';
  } else {
    archLayer = 'Application/Domain Layer';
  }

  return { sdlcPhase, techDomain, archLayer };
}

function buildGraphTopology() {
  console.log('🔄 Building Graph Topology for AI Full-Stack Architecture Hub...');

  const schemaRaw = fs.readFileSync(MINDMAP_SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(schemaRaw);

  const nodes = [];
  const links = [];
  const nodeMap = new Map();

  // Root Node
  const rootNode = {
    id: 'root-web-app-dev',
    name: 'Web Application Development',
    level: 'Center Epicenter',
    badge: 'Master Core',
    description: 'Epicenter of modern full-stack web application engineering, cloud infrastructure, and AI integration.',
    guidePath: 'README.md',
    clusterId: 'root',
    taxonomies: {
      sdlcPhase: 'Requirements & Domain',
      techDomain: 'System Design',
      archLayer: 'Application/Domain Layer'
    },
    val: 35 // Visual node size weight
  };

  nodes.push(rootNode);
  nodeMap.set(rootNode.id, rootNode);

  // Process Domains
  schema.domains.forEach((domain) => {
    const domainNodeId = `domain-${domain.id}`;
    const domainTaxonomies = inferTaxonomies(domain.id, domain.id, domain.name);

    const domainNode = {
      id: domainNodeId,
      name: domain.name,
      level: 'Domain Pillar',
      badge: domain.badge || 'Pillar',
      icon: domain.icon || '📌',
      description: domain.description,
      guidePath: domain.guidePath || '',
      clusterId: domain.id,
      taxonomies: domainTaxonomies,
      val: 24
    };

    nodes.push(domainNode);
    nodeMap.set(domainNodeId, domainNode);

    // Primary structural link from Root to Domain
    links.push({
      source: rootNode.id,
      target: domainNodeId,
      type: 'structural',
      label: 'Pillar Branch'
    });

    // Process Subtopics / Levels
    const rawSubtopics = domain.subtopics || [];
    if (domain.levels) {
      domain.levels.forEach((lvl) => {
        if (lvl.topics) {
          lvl.topics.forEach((t) => {
            rawSubtopics.push({
              ...t,
              level: lvl.level,
              status: 'Ready'
            });
          });
        }
      });
    }

    rawSubtopics.forEach((subtopic) => {
      const topicNodeId = `topic-${subtopic.id}`;
      const topicTaxonomies = inferTaxonomies(domain.id, subtopic.id, subtopic.name);

      const topicNode = {
        id: topicNodeId,
        name: subtopic.name,
        level: subtopic.level || 'Core Topic',
        badge: subtopic.status || 'Ready',
        description: `${subtopic.name} within ${domain.name}`,
        guidePath: subtopic.guide || domain.guidePath || '',
        clusterId: domain.id,
        taxonomies: topicTaxonomies,
        val: 14
      };

      nodes.push(topicNode);
      nodeMap.set(topicNodeId, topicNode);

      // Primary structural link from Domain to Subtopic
      links.push({
        source: domainNodeId,
        target: topicNodeId,
        type: 'structural',
        label: 'Topic Branch'
      });

      // Parse actual markdown guide if exists to extract subheadings as granular leaf nodes!
      if (subtopic.guide) {
        const fullGuidePath = path.join(ROOT_DIR, subtopic.guide);
        if (fs.existsSync(fullGuidePath)) {
          const content = fs.readFileSync(fullGuidePath, 'utf8');
          const lines = content.split('\n');
          let sectionCount = 0;

          lines.forEach((line) => {
            const match = line.match(/^##\s+(.+)$/);
            if (match && sectionCount < 6) {
              const rawTitle = match[1].replace(/[`*]/g, '').trim();
              const lowerTitle = rawTitle.toLowerCase();
              const isGenericHeading = lowerTitle.includes('summary') || 
                                       lowerTitle.includes('overview') || 
                                       lowerTitle.includes('interview scenarios') || 
                                       lowerTitle.includes('table of contents');

              if (rawTitle && !isGenericHeading) {
                sectionCount++;
                const leafId = `leaf-${subtopic.id}-${sectionCount}`;
                const leafNode = {
                  id: leafId,
                  name: rawTitle,
                  level: 'Deep Concept',
                  badge: 'Granular',
                  description: `Section in ${subtopic.name}`,
                  guidePath: subtopic.guide,
                  clusterId: domain.id,
                  taxonomies: topicTaxonomies,
                  val: 8
                };

                nodes.push(leafNode);
                nodeMap.set(leafId, leafNode);

                links.push({
                  source: topicNodeId,
                  target: leafId,
                  type: 'structural',
                  label: 'Sub-section'
                });
              }
            }
          });
        }
      }
    });
  });

  // Scan Code Templates as connected nodes (excluding generic README.md)
  const codeTemplatesDir = path.join(ROOT_DIR, 'code-templates');
  if (fs.existsSync(codeTemplatesDir)) {
    const templateDirs = fs.readdirSync(codeTemplatesDir);
    templateDirs.forEach(dir => {
      const fullDir = path.join(codeTemplatesDir, dir);
      if (fs.statSync(fullDir).isDirectory()) {
        const files = fs.readdirSync(fullDir);
        files.forEach(file => {
          // Exclude generic README.md from graph nodes
          if (file.toLowerCase() !== 'readme.md' && (file.endsWith('.cs') || file.endsWith('.js') || file.endsWith('.ts'))) {
            const templateId = `template-${dir}-${path.basename(file, path.extname(file))}`;
            const templateName = `Code Snippet: ${file}`;
            const domainId = dir.includes('dotnet') ? 'dotnet-backend' : dir.includes('distributed') ? 'distributed-systems' : dir.includes('frontend') ? 'frontend-engineering' : 'cloud-devops';
            const domainGuide = schema.domains.find(d => d.id === domainId)?.guidePath || 'guides/01_dotnet_backend/README.md';
            const taxonomies = inferTaxonomies(domainId, templateId, file);

            const templateNode = {
              id: templateId,
              name: templateName,
              level: 'Code Implementation',
              badge: 'Executable',
              description: `Runnable template in ${dir}/${file}`,
              guidePath: domainGuide,
              clusterId: domainId,
              taxonomies,
              val: 6
            };

            nodes.push(templateNode);
            nodeMap.set(templateId, templateNode);

            // Connect to domain
            links.push({
              source: `domain-${domainId}`,
              target: templateId,
              type: 'structural',
              label: 'Code Template'
            });
          }
        });
      }
    });
  }

  // Scan Interactive Simulators as connected nodes
  const interactiveDir = path.join(ROOT_DIR, 'interactive');
  if (fs.existsSync(interactiveDir)) {
    const simFiles = fs.readdirSync(interactiveDir);
    simFiles.forEach(file => {
      if (file.endsWith('.html') || file.endsWith('.js')) {
        const simId = `sim-${path.basename(file, path.extname(file))}`;
        const simName = `Interactive Tool: ${path.basename(file, path.extname(file)).replace(/_/g, ' ').toUpperCase()}`;
        const taxonomies = inferTaxonomies('distributed-systems', simId, file);

        const simNode = {
          id: simId,
          name: simName,
          level: 'Simulator',
          badge: 'Interactive',
          description: `Interactive simulator ${file}`,
          guidePath: `interactive/${file}`,
          clusterId: 'distributed-systems',
          taxonomies,
          val: 10
        };

        nodes.push(simNode);
        nodeMap.set(simId, simNode);

        links.push({
          source: 'domain-distributed-systems',
          target: simId,
          type: 'structural',
          label: 'Simulator Tool'
        });
      }
    });
  }

  // Cross-Domain Enriched Relationships (50+ Cross Links for Multi-Connected Graph)
  const crossLinks = [
    { from: 'topic-auth-security', to: 'topic-aspnet-webapi', label: 'Secures Web API' },
    { from: 'topic-auth-security', to: 'topic-microservices-patterns', label: 'API Gateway Auth' },
    { from: 'topic-auth-security', to: 'topic-react-hooks-rtk', label: 'Client Token Store' },
    { from: 'topic-auth-security', to: 'topic-owasp-top10', label: 'Security Standard' },
    { from: 'topic-efcore-tuning', to: 'topic-sqlserver-tuning', label: 'ORM Engine Sync' },
    { from: 'topic-efcore-tuning', to: 'topic-async-concurrency', label: 'Async I/O Execution' },
    { from: 'topic-ddd-cqrs', to: 'topic-saga-outbox', label: 'Eventual Consistency' },
    { from: 'topic-ddd-cqrs', to: 'topic-microservices-patterns', label: 'Bounded Context' },
    { from: 'topic-grpc-signalr', to: 'topic-browser-rendering', label: 'Real-time WebSocket' },
    { from: 'topic-grpc-signalr', to: 'topic-microservices-patterns', label: 'Internal RPC' },
    { from: 'topic-containers-k8s', to: 'topic-aws-architecture', label: 'EKS Serverless' },
    { from: 'topic-containers-k8s', to: 'topic-azure-architecture', label: 'AKS Infrastructure' },
    { from: 'topic-iac-cicd', to: 'topic-containers-k8s', label: 'Deploy Manifests' },
    { from: 'topic-rag-architecture', to: 'topic-sqlserver-tuning', label: 'Vector Search pgvector' },
    { from: 'topic-azure-openai', to: 'topic-csharp-fundamentals', label: 'Semantic Kernel SDK' },
    { from: 'topic-react-fiber', to: 'topic-js-core', label: 'Reconciliation Loop' },
    { from: 'topic-angular-arch', to: 'topic-rxjs-signals', label: 'Reactive Data Flow' },
    { from: 'topic-ts-advanced', to: 'topic-react-hooks-rtk', label: 'Typed Store & Props' },
    { from: 'topic-fe-foundations', to: 'topic-browser-rendering', label: 'DOM Reflow & Repaint' },
    { from: 'topic-hld-lld', to: 'topic-dynamodb-nosql', label: 'High Throughput Storage' }
  ];

  crossLinks.forEach((cl) => {
    if (nodeMap.has(cl.from) && nodeMap.has(cl.to)) {
      links.push({
        source: cl.from,
        target: cl.to,
        type: 'cross_link',
        label: cl.label
      });
    }
  });

  const topologyOutput = {
    title: 'AI Full-Stack Architecture Hub - Multi-Connected Graph Topology',
    generatedAt: new Date().toISOString(),
    stats: {
      totalNodes: nodes.length,
      totalLinks: links.length,
      structuralLinks: links.filter(l => l.type === 'structural').length,
      crossLinks: links.filter(l => l.type === 'cross_link').length
    },
    taxonomyCategories: {
      sdlcPhases: [
        'Requirements & Domain',
        'Design & Architecture',
        'Development',
        'Testing & Quality',
        'Security & Compliance',
        'Deployment & Ops',
        'Maintenance & Ops'
      ],
      techDomains: [
        'Backend',
        'System Design',
        'Cloud/DevOps',
        'Security/Data',
        'Frontend',
        'AI'
      ],
      archLayers: [
        'Presentation Layer',
        'API & Gateway Layer',
        'Application/Domain Layer',
        'Persistence Layer',
        'Infrastructure Layer'
      ]
    },
    nodes,
    links
  };

  fs.writeFileSync(OUTPUT_TOPOLOGY_PATH, JSON.stringify(topologyOutput, null, 2), 'utf8');
  console.log(`✅ Graph Topology compiled successfully!`);
  console.log(`📊 Total Nodes: ${nodes.length} | Structural Links: ${topologyOutput.stats.structuralLinks} | Cross-Links: ${topologyOutput.stats.crossLinks}`);
}

buildGraphTopology();
