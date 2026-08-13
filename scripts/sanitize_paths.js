const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.agents', '.gemini'].includes(entry.name)) continue;
      processDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.html') || entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('./')) {
        console.log(`Sanitizing: ${fullPath}`);
        content = content.replaceAll('./', './');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir(rootDir);
console.log('Path sanitization complete!');
