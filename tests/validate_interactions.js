const fs = require('fs');
const path = require('path');

console.log('🔍 Auditing Interactive Elements and Click Handlers across Hub...\n');

let issues = [];

// 1. Audit index.html click handlers and modal wiring
const indexPath = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

if (!indexHtml.includes('id="sim-modal"')) {
  issues.push('index.html is missing #sim-modal container');
}
if (!indexHtml.includes('id="sim-iframe"')) {
  issues.push('index.html is missing #sim-iframe');
}
if (!indexHtml.includes('id="sd-module-iframe"')) {
  issues.push('index.html is missing #sd-module-iframe');
}

// Check all inline onclick in index.html
const onclickMatches = [...indexHtml.matchAll(/onclick="([^"]+)"/g)];
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');

onclickMatches.forEach(match => {
  const handler = match[1];
  if (handler.startsWith('app.')) {
    const methodName = handler.replace('app.', '').split('(')[0].trim();
    if (!appJs.includes(`${methodName}(`) && !appJs.includes(`${methodName} =`)) {
      issues.push(`index.html calls non-existent app method: ${methodName}`);
    }
  }
});

// 2. Audit all visual simulator files across domain subdirectories
function getHtmlFilesRecursive(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getHtmlFilesRecursive(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const simDir = path.join(__dirname, '..', 'interactive');
const simFiles = getHtmlFilesRecursive(simDir);

console.log(`Found ${simFiles.length} interactive simulators in interactive/`);

simFiles.forEach(filePath => {
  const file = path.relative(simDir, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('<script>') && !content.includes('<script ')) {
    issues.push(`Simulator ${file} has no script tag`);
  }
});

// 3. Audit System Design Hub HTML files
const sdDir = path.join(__dirname, '..', 'docs', 'system_design');
const sdFiles = fs.readdirSync(sdDir).filter(f => f.endsWith('.html'));

console.log(`Found ${sdFiles.length} System Design module files in docs/system_design/`);

sdFiles.forEach(file => {
  const content = fs.readFileSync(path.join(sdDir, file), 'utf-8');
  if (content.includes('switchTab(') && !content.includes('function switchTab')) {
    issues.push(`System Design ${file} uses switchTab() but function definition is missing`);
  }
  if (content.includes('switchSubTab(') && !content.includes('function switchSubTab')) {
    issues.push(`System Design ${file} uses switchSubTab() but function definition is missing`);
  }
});

// 4. Check CSS modal rules
const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf-8');
if (!stylesCss.includes('.simulator-frame-modal')) {
  issues.push('styles.css is missing .simulator-frame-modal');
}

console.log('\n--- Interactivity Audit Results ---');
if (issues.length === 0) {
  console.log('✅ ALL INTERACTIVE SECTIONS & SIMULATORS PASSED INTEGRITY & CLICK AUDIT WITH ZERO ERRORS!');
} else {
  console.error(`❌ Found ${issues.length} potential interactivity issues:`);
  issues.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
  process.exit(1);
}
