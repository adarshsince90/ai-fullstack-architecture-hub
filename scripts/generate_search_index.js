const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', 'guides');
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'search_index.json');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.md') && !file.toLowerCase().includes('readme')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
  
  const lines = content.split('\n');
  let title = '';
  const headers = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !title) {
      title = trimmed.replace('# ', '').trim();
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const headerText = trimmed.replace(/^###?\s+/, '').trim();
      if (headerText && !headerText.includes('---')) {
        headers.push(headerText);
      }
    }
  });

  // Extract domain name from path
  const parts = relativePath.split('/');
  const domainDir = parts.length > 1 ? parts[1] : '';

  return {
    path: relativePath,
    title: title || path.basename(filePath, '.md'),
    domainDir: domainDir,
    headers: headers
  };
}

function generateIndex() {
  console.log('🔍 Scanning guides directory for deep search indexing...');
  const files = getAllFiles(GUIDES_DIR);
  console.log(`📚 Found ${files.length} guide files.`);

  const index = files.map(parseMarkdownFile);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`✅ Search index successfully generated at: ${OUTPUT_FILE} (${fs.statSync(OUTPUT_FILE).size} bytes)`);
}

generateIndex();
