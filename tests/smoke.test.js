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

console.log('\n--- Summary ---');
if (failures === 0) {
  console.log('🎉 ALL SMOKE TESTS PASSED CLEANLY!\n');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED!\n`);
  process.exit(1);
}
