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

console.log('\n--- Summary ---');
if (failures === 0) {
  console.log('🎉 ALL SMOKE TESTS PASSED CLEANLY!\n');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
