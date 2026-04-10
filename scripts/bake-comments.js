#!/usr/bin/env node
/**
 * bake-comments.js — Pull approved comments from the Apps Script API
 * and embed them into the module JSON files.
 *
 * Run periodically (or before deploy) to keep baked comments fresh:
 *   node scripts/bake-comments.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBxJoFlK2UhUmprySuuPFkVzySZB5UJO_fdFX4KG8sti0I7TPT-IC-rx9THrFQa-8C/exec';
const MODULES_DIR = path.join(__dirname, '..', 'content', 'modules');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'bake-comments/1.0' } }, (res) => {
      // Follow redirects (Apps Script always redirects)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching all approved comments...');
  const result = await fetchJSON(APPS_SCRIPT_URL);

  if (result.status !== 'ok' || !result.comments) {
    console.error('Failed to fetch comments:', result);
    process.exit(1);
  }

  const comments = result.comments;
  console.log(`  ${comments.length} approved comments total`);

  // Group by slug
  const bySlug = {};
  for (const c of comments) {
    // Slug format: "module/article" e.g. "defects/dislocations-edge-screw-mixed"
    const parts = (c.slug || '').split('/');
    if (parts.length < 2) continue;
    const moduleId = parts[0];
    const articleId = parts.slice(1).join('/');
    if (!bySlug[moduleId]) bySlug[moduleId] = {};
    if (!bySlug[moduleId][articleId]) bySlug[moduleId][articleId] = [];
    bySlug[moduleId][articleId].push({
      id: c.id,
      selectedText: c.selectedText,
      comment: c.comment,
      name: c.name,
      votes: c.votes,
    });
  }

  // Update each module JSON
  let updated = 0;
  const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const moduleId = data.module.id;
    let changed = false;

    for (const art of data.articles) {
      const articleComments = (bySlug[moduleId] && bySlug[moduleId][art.id]) || [];
      const existing = JSON.stringify(art.comments || []);
      const fresh = JSON.stringify(articleComments);

      if (existing !== fresh) {
        art.comments = articleComments;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      updated++;
      const count = data.articles.reduce((n, a) => n + (a.comments || []).length, 0);
      console.log(`  ${file}: ${count} comments baked`);
    }
  }

  console.log(`\nUpdated ${updated} module files`);
}

main().catch(e => { console.error(e); process.exit(1); });
