#!/usr/bin/env node
/**
 * build-search-index.js — Generate a search index from all module content.
 * Run before deploy: node scripts/build-search-index.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '..', 'content', 'modules');
const OUT = path.join(__dirname, '..', 'content', 'search-index.json');

function extractText(blocks) {
  if (!blocks) return '';
  const parts = [];
  for (const b of blocks) {
    if (!b || !b[1]) continue;
    const type = b[0];
    if (type === 'p' || type === 'h3') {
      // Strip HTML tags and math delimiters
      parts.push(b[1].replace(/<[^>]+>/g, '').replace(/\$[^$]+\$/g, ''));
    } else if (type === 'callout' && b[2]) {
      parts.push(b[1] + ' ' + b[2].replace(/<[^>]+>/g, ''));
    } else if (type === 'ul' || type === 'ol') {
      if (Array.isArray(b[1])) {
        parts.push(b[1].join(' ').replace(/<[^>]+>/g, ''));
      }
    }
  }
  return parts.join(' ');
}

function extractHeadings(blocks) {
  if (!blocks) return [];
  return blocks.filter(b => b[0] === 'h3').map(b => b[1]);
}

const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));
const index = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, file), 'utf-8'));
  const mod = data.module;

  for (const art of data.articles) {
    const text = extractText(art.body);
    const headings = extractHeadings(art.body);

    index.push({
      module: mod.id,
      moduleTitle: mod.title,
      id: art.id,
      number: art.number,
      title: art.title,
      description: art.description || '',
      headings,
      preview: text.substring(0, 200).trim(),
      // Search text: title + description + headings (not full body — keeps index small)
      text: (art.title + ' ' + (art.description || '') + ' ' + headings.join(' ')).toLowerCase(),
    });
  }
}

fs.writeFileSync(OUT, JSON.stringify(index));
const size = fs.statSync(OUT).size;
console.log(`Search index: ${index.length} articles, ${(size / 1024).toFixed(0)} KB`);
