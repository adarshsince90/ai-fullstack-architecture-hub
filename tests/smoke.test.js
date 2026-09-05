const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.join(__dirname, '..');
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    failures++;
    console.error(`❌ FAIL: ${name}\n   ${err.message}`);
  }
}

console.log('🧪 Running Senior Preparation Hub Smoke Tests...\n');

// 1. Critical App Files Exist
test('Core application files exist', () => {
  const files = ['index.html', 'styles.css', 'config.js', 'app.js', 'serve.json', 'LICENSE', 'README.md', 'PROGRESS.md', 'docs/Definitions.md'];
  for (const f of files) {
    const p = path.join(rootDir, f);
    assert.strictEqual(fs.existsSync(p), true, `Missing file: ${f}`);
    assert.ok(fs.statSync(p).size > 0, `Empty file: ${f}`);
  }
});

// 2. JSON Schemas Parse Cleanly
test('JSON schemas parse validly', () => {
  const schemas = [
    'docs/mindmap_schema.json',
    'docs/search_index.json',
    'docs/definitions_schema.json',
    'docs/glossary_schema.json'
  ];
  for (const s of schemas) {
    const p = path.join(rootDir, s);
    assert.strictEqual(fs.existsSync(p), true, `Missing schema: ${s}`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(Array.isArray(data) || typeof data === 'object', `Invalid JSON structure in ${s}`);
  }
});

// 3. Glossary Has 290+ Terms Across 19 Sections
test('Glossary schema contains 290+ terms', () => {
  const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/glossary_schema.json'), 'utf8'));
  assert.ok(Array.isArray(data), 'Glossary schema should be an array of sections');
  assert.ok(data.length >= 18, `Expected at least 18 sections, got ${data.length}`);
  
  let totalTerms = 0;
  for (const sec of data) {
    assert.ok(sec.section, 'Section must have a name');
    assert.ok(Array.isArray(sec.terms), `Section ${sec.section} terms must be an array`);
    totalTerms += sec.terms.length;
  }
  assert.ok(totalTerms >= 290, `Expected 290+ terms, found ${totalTerms}`);
});

// 4. All 24 Study Guides Exist in Domain Subdirectories
test('All 24 markdown guides exist across 6 pillars', () => {
  const pillars = [
    '01_dotnet_backend',
    '02_distributed_systems',
    '03_cloud_devops',
    '04_security_database',
    '05_frontend_engineering',
    '06_ai_engineering'
  ];
  let guideCount = 0;
  for (const pillar of pillars) {
    const pillarDir = path.join(rootDir, 'guides', pillar);
    assert.strictEqual(fs.existsSync(pillarDir), true, `Pillar dir missing: ${pillar}`);
    const files = fs.readdirSync(pillarDir).filter(f => f.endsWith('.md') && f !== 'README.md');
    assert.ok(files.length > 0, `No guides found in ${pillar}`);
    guideCount += files.length;
  }
  assert.ok(guideCount >= 24, `Expected at least 24 guides across pillars, found ${guideCount}`);
});

// 5. All 9 Interactive Simulators Exist
test('All 9 visual interactive simulators exist', () => {
  const sims = [
    'interactive/01_dotnet_backend/aspnet_middleware_di_simulator.html',
    'interactive/02_distributed_systems/distributed_saga_simulator.html',
    'interactive/04_security_database/oauth2_pkce_token_flow_simulator.html',
    'interactive/05_frontend_engineering/browser_event_loop_simulator.html',
    'interactive/05_frontend_engineering/react_rendering_visualizer.html',
    'interactive/05_frontend_engineering/angular_signals_reactivity_simulator.html',
    'interactive/05_frontend_engineering/redux_flow_simulator.html',
    'interactive/05_frontend_engineering/transpile_pipeline_visualizer.html',
    'interactive/06_ai_engineering/rag_pipeline_simulator.html'
  ];
  for (const sim of sims) {
    const p = path.join(rootDir, sim);
    assert.strictEqual(fs.existsSync(p), true, `Missing simulator: ${sim}`);
    const content = fs.readFileSync(p, 'utf8');
    assert.ok(content.toLowerCase().includes('<html'), `Simulator ${sim} is not valid HTML`);
  }
});

// 6. Zero Local file:/// Paths in Root Files
test('No local file:/// paths in README or PROGRESS', () => {
  const checkFiles = ['README.md', 'PROGRESS.md', 'index.html', 'app.js'];
  for (const f of checkFiles) {
    const content = fs.readFileSync(path.join(rootDir, f), 'utf8');
    assert.strictEqual(content.includes('file:///c:/Users'), false, `Found local file:/// path in ${f}`);
  }
});

// 7. All Guide Links in Definitions.md Exist & Target Valid Files
test('All guide links in Definitions.md point to valid existing files', () => {
  const recapContent = fs.readFileSync(path.join(rootDir, 'docs/Definitions.md'), 'utf8');
  const linkRegex = /\[`?([^`\]]+)`?\]\(([^)]+)\)/g;
  let match;
  let guideLinkCount = 0;
  while ((match = linkRegex.exec(recapContent)) !== null) {
    const href = match[2].trim();
    if (href.includes('guides/')) {
      guideLinkCount++;
      const cleanPath = href.replace(/^\.\//, '');
      const fullPath = path.join(rootDir, cleanPath);
      assert.strictEqual(fs.existsSync(fullPath), true, `Broken guide link in Definitions.md: ${href}`);
    }
  }
  assert.ok(guideLinkCount > 0, 'Definitions.md should contain at least one guide link');
});

// 8. app.js Guide Link Interception & Path Normalization Regression Safeguards
test('app.js includes regression safeguards for guide link interception & path normalization', () => {
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  
  // Ensure querySelectorAll does NOT use restrictive href^="guides/" which breaks on ./guides/
  assert.strictEqual(
    appJsContent.includes('querySelectorAll(\'a[href^="guides/"]\')'),
    false,
    'app.js must not use restrictive href^="guides/" selector that fails on ./ prefixed links'
  );

  // Ensure app.js contains path normalization stripping leading ./
  assert.ok(
    appJsContent.includes('replace(/^\\.\\//, \'\')'),
    'app.js must include path normalization stripping leading ./'
  );
  
  // Ensure guide link query selectors in app.js match relative links correctly
  assert.ok(
    appJsContent.includes('a[href*="guides/"]') || appJsContent.includes('a[href$=".md"]'),
    'app.js must use flexible guide link selectors (a[href*="guides/"] or a[href$=".md"])'
  );
});

// 9. All MindMap Schema Guide Paths Point to Existing Files
test('All guide paths in mindmap_schema.json point to valid existing files', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/mindmap_schema.json'), 'utf8'));
  let checkedCount = 0;
  for (const domain of schema.domains || []) {
    const topics = domain.subtopics || (domain.levels ? domain.levels.flatMap(l => l.topics) : []);
    for (const t of topics) {
      if (t.guide) {
        checkedCount++;
        const cleanPath = t.guide.replace(/^\.\//, '');
        const fullPath = path.join(rootDir, cleanPath);
        assert.strictEqual(fs.existsSync(fullPath), true, `MindMap schema guide path does not exist: ${t.guide}`);
      }
    }
  }
  assert.ok(checkedCount > 0, 'Mindmap schema should contain valid guide references');
});

// 10. Graph Topology JSON Integrity & Taxonomy Properties
test('docs/graph_topology.json exists and contains valid technical nodes with taxonomy tags', () => {
  const topologyPath = path.join(rootDir, 'docs/graph_topology.json');
  assert.strictEqual(fs.existsSync(topologyPath), true, 'docs/graph_topology.json file must exist');

  const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
  assert.ok(Array.isArray(topology.nodes), 'Topology must contain nodes array');
  assert.ok(Array.isArray(topology.links), 'Topology must contain links array');
  assert.ok(topology.nodes.length >= 130, `Topology node count should be >= 130 (Found: ${topology.nodes.length})`);
  assert.ok(topology.links.length >= 130, `Topology link count should be >= 130 (Found: ${topology.links.length})`);

  // Ensure root node exists
  const rootNode = topology.nodes.find(n => n.id === 'root-web-app-dev');
  assert.ok(rootNode, 'Topology must contain epicenter root-web-app-dev node');
  assert.strictEqual(rootNode.name, 'Web Application Development');

  // Verify all nodes have required taxonomy metadata
  for (const node of topology.nodes) {
    assert.ok(node.id, 'Node must have an id');
    assert.ok(node.name, 'Node must have a name');
    assert.ok(node.taxonomies, `Node ${node.id} must have taxonomies metadata`);
    assert.ok(node.taxonomies.sdlcPhase, `Node ${node.id} must have sdlcPhase taxonomy tag`);
    assert.ok(node.taxonomies.techDomain, `Node ${node.id} must have techDomain taxonomy tag`);
    assert.ok(node.taxonomies.archLayer, `Node ${node.id} must have archLayer taxonomy tag`);
  }
});

// 11. Cache-Busting Version Query Parameter Integrity
test('index.html contains cache-busting query strings on script and style assets', () => {
  const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.ok(indexContent.includes('styles.css?v='), 'styles.css must include ?v= cache-busting tag');
  assert.ok(indexContent.includes('config.js?v='), 'config.js must include ?v= cache-busting tag');
  assert.ok(indexContent.includes('graph_engine.js?v='), 'graph_engine.js must include ?v= cache-busting tag');
  assert.ok(indexContent.includes('app.js?v='), 'app.js must include ?v= cache-busting tag');
});

// 12. HTML Inline app.* Event Handlers Correspond to Defined App Methods
test('All app.* inline handlers in index.html match defined MasterPrepApp methods', () => {
  const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

  const handlerRegex = /(?:onclick|onchange|oninput)=["']app\.([a-zA-Z0-9_]+)\([^)]*\)["']/g;
  let match;
  const methodsFound = new Set();
  while ((match = handlerRegex.exec(indexContent)) !== null) {
    const methodName = match[1];
    methodsFound.add(methodName);
    const hasMethodInAppJs = appJsContent.includes(`${methodName}(`) || appJsContent.includes(`${methodName} =`);
    assert.ok(hasMethodInAppJs, `Method app.${methodName} called in index.html is missing in app.js`);
  }
  assert.ok(methodsFound.size >= 8, `Expected at least 8 app.* handler methods, found ${methodsFound.size}`);
});

// 13. Graph Camera & State Preservation Safeguards
test('app.js preserves graph camera zoom/pan transform when navigating back from guides', () => {
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

  // Verify showGraphDashboardView does NOT call resetCamera() unconditionally
  const showGraphDashboardMatch = appJsContent.match(/async showGraphDashboardView\(\) \{[\s\S]*?\n  \}/);
  assert.ok(showGraphDashboardMatch, 'showGraphDashboardView method must exist in app.js');
  
  const showGraphDashboardBody = showGraphDashboardMatch[0];
  assert.strictEqual(
    showGraphDashboardBody.includes('this.graphEngine.resetCamera()'),
    false,
    'showGraphDashboardView must NOT reset camera state unconditionally on view navigation'
  );

  // Verify window.app explicit global assignment
  assert.ok(appJsContent.includes('window.app = app;'), 'app.js must explicitly bind window.app = app');
});

// 14. Graph Engine API & Legibility Methods Integrity
test('scripts/graph_engine.js contains focusOnCluster, focusOnNode, and legibility filter logic', () => {
  const engineContent = fs.readFileSync(path.join(rootDir, 'scripts/graph_engine.js'), 'utf8');
  assert.ok(engineContent.includes('focusOnCluster('), 'MindMapGraphEngine must include focusOnCluster method');
  assert.ok(engineContent.includes('focusOnNode('), 'MindMapGraphEngine must include focusOnNode method');
  assert.ok(engineContent.includes('resetCamera('), 'MindMapGraphEngine must include resetCamera method');
  assert.ok(engineContent.includes('isFilteredHighlight'), 'MindMapGraphEngine must render text pills for isFilteredHighlight nodes');
});

// 15. Dynamic Category & Topic Dropdown Controls Integrity
test('index.html and app.js include graph-category-select and graph-topic-select controls', () => {
  const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

  assert.ok(indexContent.includes('id="graph-category-select"'), 'index.html must contain graph-category-select element');
  assert.ok(indexContent.includes('id="graph-topic-select"'), 'index.html must contain graph-topic-select element');
  assert.ok(appJsContent.includes('populateGraphCategoryDropdown('), 'app.js must include populateGraphCategoryDropdown method');
  assert.ok(appJsContent.includes('populateGraphTopicDropdown('), 'app.js must include populateGraphTopicDropdown method');
  assert.ok(appJsContent.includes('onCategorySelectChange('), 'app.js must include onCategorySelectChange handler');
  assert.ok(appJsContent.includes('onTopicSelectChange('), 'app.js must include onTopicSelectChange handler');
});

// 16. Quick Recap Top 25 Fast-Track Portal & De-Duplication Integrity
test('Definitions.md contains single canonical topic cards and Fast-Track Portal links', () => {
  const recapContent = fs.readFileSync(path.join(rootDir, 'docs/Definitions.md'), 'utf8');
  
  // Verify Fast-Track Index header exists
  assert.ok(
    recapContent.includes('## 📌 Executive Fast-Track Index (Top 25 Core Topics)'),
    'Definitions.md must contain ## 📌 Executive Fast-Track Index (Top 25 Core Topics)'
  );

  // Verify Top 25 portal contains anchor links
  assert.ok(
    recapContent.includes('[01. C#](#sec-core-net-c-)'),
    'Fast-track portal must contain anchor link for C#'
  );
  assert.ok(
    recapContent.includes('[08. Microservices](#sec-microservices-microservices-architecture)'),
    'Fast-track portal must contain anchor link for Microservices'
  );
  assert.ok(
    recapContent.includes('[20. Angular 8-17](#sec-frontend-angular-8-17)'),
    'Fast-track portal must contain anchor link for Angular'
  );
  assert.ok(
    recapContent.includes('[25. RAG / Azure OpenAI](#sec-ai-enablement-rag)'),
    'Fast-track portal must contain anchor link for RAG'
  );

  // Verify topics are NOT duplicated under Top 25 section
  const top25SectionText = recapContent.substring(
    recapContent.indexOf('## 📌 Executive Fast-Track Index'),
    recapContent.indexOf('## 📌 CORE .NET')
  );
  assert.strictEqual(
    top25SectionText.includes('- **What It Is**:'),
    false,
    'Top 25 section must not contain duplicate full topic definition cards (- **What It Is**:)'
  );
});

// 17. Quick Recap Empty Section Intro Safeguard & 4-Tier Card Lookup Engine
test('app.js includes safeguards against empty recap-section-intro and 4-tier card resolution engine', () => {
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

  // Verify empty section intro safeguard
  assert.ok(
    appJsContent.includes('sectionIntroHtml.replace(/<[^>]*>/g, \'\').trim().length > 0'),
    'app.js must check for non-empty text content before rendering recap-section-intro'
  );

  // Verify 4-tier card resolution engine
  assert.ok(
    appJsContent.includes('document.getElementById(cleanTarget)'),
    'app.js must check direct card element ID for quick-recap internal links'
  );
  assert.ok(
    appJsContent.includes('scrollIntoView({ behavior: \'smooth\', block: \'center\' })'),
    'app.js must smoothly scroll target topic card to the center of the viewport'
  );
});

// 18. Simulator Modal Overlay & Topic Scroll Restoration Engine
test('app.js and index.html support glassmorphic overlay modal and topic scroll restoration', () => {
  const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const stylesCssContent = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');

  // Verify launchSimulator origin tracking and modal display flex
  assert.ok(
    appJsContent.includes('this.simOriginCardId = originCardId'),
    'launchSimulator must record originCardId for scroll restoration'
  );
  assert.ok(
    appJsContent.includes("modal.style.display = 'flex'"),
    'launchSimulator must set modal style to flex display'
  );

  // Verify ESC key listener in app.js
  assert.ok(
    appJsContent.includes("e.key === 'Escape'"),
    'app.js must support ESC key shortcut to close simulator modal'
  );

  // Verify CSS fixed viewport overlay with high z-index
  assert.ok(
    stylesCssContent.includes('position: fixed') && stylesCssContent.includes('z-index: 2500'),
    'styles.css must style simulator-frame-modal as fixed high z-index overlay'
  );

  // Verify index.html backdrop click handler
  assert.ok(
    indexHtmlContent.includes('onclick="if(event.target===this) app.closeSimulator()"'),
    'index.html must handle backdrop clicks to dismiss modal'
  );
});

// 19. Staff System Design Hub HTML Modules & Interactive Components
test('Staff System Design Hub modules exist with valid HTML and architectural content', () => {
  const modules = [
    'docs/system_design/hld_framework.html',
    'docs/system_design/fundamentals.html',
    'docs/system_design/storage_and_caching.html',
    'docs/system_design/consensus_and_transactions.html',
    'docs/system_design/architectural_primitives.html',
    'docs/system_design/case_studies.html',
    'docs/system_design/observability_request_flow.html'
  ];

  for (const m of modules) {
    const fullPath = path.join(rootDir, m);
    assert.strictEqual(fs.existsSync(fullPath), true, `Missing System Design module: ${m}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.length > 500, `System Design module ${m} appears empty or truncated`);
    assert.ok(content.toLowerCase().includes('<!doctype html') || content.toLowerCase().includes('<html'), `${m} must be valid HTML`);
  }

  // Verify HLD framework contains interactive capacity math elements
  const hldContent = fs.readFileSync(path.join(rootDir, 'docs/system_design/hld_framework.html'), 'utf8');
  assert.ok(hldContent.includes('calc-dau') || hldContent.includes('calculateCapacity') || hldContent.includes('Back-of-the-Envelope'), 'HLD framework must contain capacity calculations');

  // Verify Storage & Caching module contains Bloom filter & LSM content
  const storageContent = fs.readFileSync(path.join(rootDir, 'docs/system_design/storage_and_caching.html'), 'utf8');
  assert.ok(storageContent.includes('LSM-Tree') && storageContent.includes('Bloom Filter'), 'Storage module must contain LSM and Bloom Filter content');

  // Verify Consensus module contains Quorum & Saga content
  const consensusContent = fs.readFileSync(path.join(rootDir, 'docs/system_design/consensus_and_transactions.html'), 'utf8');
  assert.ok(consensusContent.includes('Quorum') && consensusContent.includes('Saga'), 'Consensus module must contain Quorum and Saga content');

  // Verify Observability module contains request flow tracing content
  const obsContent = fs.readFileSync(path.join(rootDir, 'docs/system_design/observability_request_flow.html'), 'utf8');
  assert.ok(obsContent.includes('Request Flow') || obsContent.includes('Observability') || obsContent.includes('OpenTelemetry'), 'Observability module must contain request flow architecture content');
});

// 20. System Design Hub Mapping in Mindmap Schema & Graph Topology
test('System Design Hub is mapped in mindmap_schema.json and graph_topology.json', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/mindmap_schema.json'), 'utf8'));
  const domain = schema.domains.find(d => d.id === 'system-design-mastery');
  assert.ok(domain, 'mindmap_schema.json must contain system-design-mastery domain');
  assert.ok(Array.isArray(domain.subtopics) && domain.subtopics.length >= 7, 'system-design-mastery domain must have at least 7 subtopics');

  const topology = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/graph_topology.json'), 'utf8'));
  const sdNode = topology.nodes.find(n => n.id === 'domain-system-design-mastery');
  assert.ok(sdNode, 'graph_topology.json must contain domain-system-design-mastery node');
});

// 21. Multi-Theme Token Architecture & Switcher Tests
test('5 Curated Themes are properly tokenized and wired in CSS, JS, and HTML', () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Verify all 5 themes are defined in styles.css
  const requiredThemes = ['obsidian-dark', 'slate-light', 'alpine-nord', 'warm-sepia', 'tokyo-midnight'];
  for (const theme of requiredThemes) {
    assert.ok(
      stylesCss.includes(`data-theme="${theme}"`) || (theme === 'obsidian-dark' && stylesCss.includes(':root')),
      `styles.css must declare token block for theme: ${theme}`
    );
  }

  // Verify core token variables exist across light & dark themes
  const requiredTokens = ['--bg-primary', '--bg-card', '--text-main', '--primary', '--glass-bg', '--glass-border'];
  for (const token of requiredTokens) {
    assert.ok(stylesCss.includes(token), `styles.css must declare core token: ${token}`);
  }

  // Verify app.js theme manager methods
  assert.ok(appJs.includes('initTheme'), 'app.js must implement initTheme()');
  assert.ok(appJs.includes('setTheme'), 'app.js must implement setTheme()');
  assert.ok(appJs.includes('toggleThemeDropdown'), 'app.js must implement toggleThemeDropdown()');
  assert.ok(appJs.includes('cycleTheme'), 'app.js must implement cycleTheme()');
  for (const theme of requiredThemes) {
    assert.ok(appJs.includes(`'${theme}'`), `app.js must register theme: ${theme}`);
  }

  // Verify index.html theme switcher components
  assert.ok(indexHtml.includes('id="theme-switcher-container"'), 'index.html must contain theme-switcher-container');
  assert.ok(indexHtml.includes('id="theme-dropdown-menu"'), 'index.html must contain theme-dropdown-menu');
  assert.ok(indexHtml.includes('data-gnav-theme'), 'index.html sidebar must contain mobile theme switcher options');
});

// 22. Guide Reader Enhancements & Code Copy Buttons
test('Guide Reader has reading progress bar, reading time badges, and copy buttons', () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Verify markup and styles
  assert.ok(indexHtml.includes('id="guide-reading-progress"'), 'index.html must contain guide-reading-progress element');
  assert.ok(indexHtml.includes('id="guide-read-time-display"'), 'index.html must contain guide-read-time-display element');
  assert.ok(stylesCss.includes('.guide-reading-progress'), 'styles.css must style guide-reading-progress');
  assert.ok(stylesCss.includes('.copy-code-btn'), 'styles.css must style copy-code-btn');
  assert.ok(stylesCss.includes('.code-block-wrapper'), 'styles.css must style code-block-wrapper');

  // Verify app.js integration
  assert.ok(appJs.includes('copyCodeSnippet'), 'app.js must implement copyCodeSnippet()');
  assert.ok(appJs.includes('initSpotlightEffect'), 'app.js must implement initSpotlightEffect()');
  assert.ok(appJs.includes('min read'), 'app.js must compute estimated reading time');
});

// 23. Global Universal Command Palette (⌘K / Ctrl+K)
test('Command Palette is wired in index.html, styles.css, and app.js', () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Verify modal markup
  assert.ok(indexHtml.includes('id="command-palette-modal"'), 'index.html must contain command-palette-modal');
  assert.ok(indexHtml.includes('id="cmd-palette-input"'), 'index.html must contain cmd-palette-input');
  assert.ok(indexHtml.includes('id="cmd-results-list"'), 'index.html must contain cmd-results-list');

  // Verify styles
  assert.ok(stylesCss.includes('.command-palette-overlay'), 'styles.css must define command-palette-overlay');
  assert.ok(stylesCss.includes('.command-palette-dialog'), 'styles.css must define command-palette-dialog');
  assert.ok(stylesCss.includes('.cmd-item'), 'styles.css must define cmd-item');

  // Verify controller methods
  assert.ok(appJs.includes('initCommandPalette'), 'app.js must implement initCommandPalette()');
  assert.ok(appJs.includes('openCommandPalette'), 'app.js must implement openCommandPalette()');
  assert.ok(appJs.includes('filterCommandPalette'), 'app.js must implement filterCommandPalette()');
  assert.ok(appJs.includes('executeCommandItem'), 'app.js must implement executeCommandItem()');
});

// 24. Header Interview Readiness Mastery Gauge
test('Header Mastery Gauge is wired in index.html, styles.css, and app.js', () => {
  const stylesCss = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Verify header gauge markup & popover
  assert.ok(indexHtml.includes('id="header-mastery-gauge"'), 'index.html must contain header-mastery-gauge');
  assert.ok(indexHtml.includes('id="header-mastery-pct"'), 'index.html must contain header-mastery-pct');
  assert.ok(indexHtml.includes('id="mastery-popover"'), 'index.html must contain mastery-popover');
  assert.ok(indexHtml.includes('id="mastery-popover-list"'), 'index.html must contain mastery-popover-list');

  // Verify CSS styles
  assert.ok(stylesCss.includes('.header-mastery-gauge'), 'styles.css must define header-mastery-gauge');
  assert.ok(stylesCss.includes('.mastery-progress-pill'), 'styles.css must define mastery-progress-pill');
  assert.ok(stylesCss.includes('.mastery-popover'), 'styles.css must define mastery-popover');

  // Verify app.js methods
  assert.ok(appJs.includes('updateHeaderMasteryGauge'), 'app.js must implement updateHeaderMasteryGauge()');
  assert.ok(appJs.includes('toggleMasteryPopover'), 'app.js must implement toggleMasteryPopover()');
});

console.log('\n--- Summary ---');
if (failures === 0) {
  console.log('🎉 ALL SMOKE TESTS PASSED CLEANLY!\n');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}


