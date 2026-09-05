const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', 'guides');
const SYSTEM_DESIGN_DIR = path.join(__dirname, '..', 'docs', 'system_design');
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'search_index.json');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
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

function parseHtmlModule(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');

  let title = '';
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i) || content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const headers = [];
  const headerRegex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const headerText = match[1].replace(/&[a-z]+;/g, ' ').trim();
    if (headerText && !headers.includes(headerText)) {
      headers.push(headerText);
    }
  }

  return {
    path: relativePath,
    title: title || path.basename(filePath, '.html'),
    domainDir: 'system_design',
    headers: headers
  };
}

function generateIndex() {
  console.log('🔍 Scanning guides and system design directories for deep search indexing...');
  const mdFiles = getAllFiles(GUIDES_DIR);
  console.log(`📚 Found ${mdFiles.length} guide files.`);

  let htmlFiles = [];
  if (fs.existsSync(SYSTEM_DESIGN_DIR)) {
    htmlFiles = fs.readdirSync(SYSTEM_DESIGN_DIR)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(SYSTEM_DESIGN_DIR, f));
    console.log(`🏛️ Found ${htmlFiles.length} system design HTML modules.`);
  }

  const index = [
    ...mdFiles.map(parseMarkdownFile),
    ...htmlFiles.map(parseHtmlModule)
  ];

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`✅ Search index successfully generated at: ${OUTPUT_FILE} (${fs.statSync(OUTPUT_FILE).size} bytes)`);
}

generateIndex();

