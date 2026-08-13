const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '../docs/profile/keywords-raw.md');
const content = fs.readFileSync(rawPath, 'utf8');

const blocks = content.split(/={10,}/);
const sections = [];

for (let i = 1; i < blocks.length; i += 2) {
  const title = blocks[i].trim();
  const body = blocks[i + 1] ? blocks[i + 1].trim() : '';
  const keywords = body.split(/\r?\n/).map(k => k.trim()).filter(k => k.length > 0);
  sections.push({ title, keywords });
}

console.log('Clean sections count:', sections.length);
sections.forEach(s => {
  console.log(`- ${s.title} (${s.keywords.length} keywords)`);
});
