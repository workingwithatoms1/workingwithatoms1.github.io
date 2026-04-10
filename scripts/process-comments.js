#!/usr/bin/env node
/**
 * process-comments.js — Triage and apply community comments.
 *
 * For each approved comment in the module JSONs:
 * 1. Check if it's sensible and relevant to materials science
 * 2. Classify as "basic" (can auto-apply) or "major" (needs human review)
 * 3. If basic: apply the change to the article body following tone guidance
 * 4. If major: add to Tasks/major-suggestions.md for manual review
 * 5. Mark processed comments as "integrated" so they're removed on next bake
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 *
 * Tone guidance (from the site's established style):
 * - University level, tone of an engaged professor
 * - Rigorous but not dry
 * - No AI-isms, no em-dashes, no "it turns out that", "at its core", "let's dive in"
 * - Short direct sentences, vary rhythm
 * - Real numbers from real materials
 * - Equations arrive as natural conclusions of physical arguments
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MODULES_DIR = path.join(__dirname, '..', 'content', 'modules');
const MAJOR_FILE = path.join(__dirname, '..', 'Tasks', 'major-suggestions.md');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.log('No ANTHROPIC_API_KEY set — skipping comment processing');
  process.exit(0);
}

function callClaude(prompt, maxTokens = 1024) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content && parsed.content[0]) {
            resolve(parsed.content[0].text);
          } else {
            reject(new Error('Unexpected response: ' + data.substring(0, 200)));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function triageComment(comment, articleTitle, articleBody) {
  const prompt = `You are reviewing a community comment on a materials science educational article.

Article: "${articleTitle}"
Highlighted text: "${comment.selectedText}"
Comment: "${comment.comment}"
Author: ${comment.name}

Classify this comment into one of:
1. "reject" — spam, off-topic, or not constructive
2. "basic" — a small, clear improvement (typo fix, clarification, adding a number/example, rewording for clarity). Can be applied without oversight.
3. "major" — significant restructuring, adding new sections, changing technical content, or anything that needs expert review.

Respond with ONLY a JSON object:
{"classification": "basic|major|reject", "reason": "one sentence explanation"}`;

  const response = await callClaude(prompt, 200);
  try {
    // Extract JSON from response
    const match = response.match(/\{[^}]+\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {}
  return { classification: 'major', reason: 'Could not parse triage response' };
}

async function applyBasicComment(comment, article) {
  // Find the block containing the highlighted text
  const blocks = article.body;
  if (!blocks) return null;

  let targetIdx = -1;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = Array.isArray(block) ? (block[1] || '') : '';
    if (typeof text === 'string' && text.includes(comment.selectedText.substring(0, 30))) {
      targetIdx = i;
      break;
    }
  }

  if (targetIdx === -1) return null;

  const block = blocks[targetIdx];
  const blockType = block[0];
  const blockText = block[1];

  const prompt = `You are editing a materials science educational article. Apply the following community suggestion.

TONE RULES (strict):
- University level, engaged professor tone
- Rigorous but not dry
- Short direct sentences, vary rhythm
- NO em-dashes (use commas, semicolons, parentheses)
- NO: "it turns out that", "at its core", "let's dive in", "crucially", "remarkably", "notably"
- Real numbers from real materials
- Equations as natural conclusions of physical arguments

CURRENT TEXT (${blockType} block):
${blockText}

HIGHLIGHTED SECTION: "${comment.selectedText}"
SUGGESTION: "${comment.comment}"

Apply the suggestion to improve the text. Return ONLY the complete replacement text for this block — no explanation, no quotes, just the improved text. If the suggestion doesn't make sense or would reduce quality, return the original text unchanged.`;

  const newText = await callClaude(prompt, 500);

  // Basic sanity check — the response should be similar length and not contain meta-commentary
  if (!newText || newText.length < 10) return null;
  if (newText.includes('Here is') || newText.includes('I\'ve ')) return null;

  return { blockIdx: targetIdx, blockType, oldText: blockText, newText: newText.trim() };
}

async function main() {
  const majorSuggestions = [];
  let applied = 0;
  let rejected = 0;
  let majorCount = 0;

  const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let changed = false;

    for (const art of data.articles) {
      if (!art.comments || art.comments.length === 0) continue;

      const processedIds = new Set();

      for (const comment of art.comments) {
        if (!comment.id || !comment.comment) continue;

        console.log(`\n  Processing: "${comment.comment.substring(0, 50)}..." on ${art.title}`);

        // Triage
        const triage = await triageComment(comment, art.title, art.body);
        console.log(`    Triage: ${triage.classification} — ${triage.reason}`);

        if (triage.classification === 'reject') {
          processedIds.add(comment.id);
          rejected++;
          continue;
        }

        if (triage.classification === 'major') {
          majorSuggestions.push({
            module: data.module.id,
            article: art.id,
            title: art.title,
            comment: comment.comment,
            selectedText: comment.selectedText,
            author: comment.name,
            votes: comment.votes,
            reason: triage.reason,
          });
          majorCount++;
          continue;
        }

        // Basic — try to apply
        const edit = await applyBasicComment(comment, art);
        if (edit && edit.newText !== edit.oldText) {
          console.log(`    Applied: ${edit.oldText.substring(0, 40)}... → ${edit.newText.substring(0, 40)}...`);
          art.body[edit.blockIdx][1] = edit.newText;
          processedIds.add(comment.id);
          changed = true;
          applied++;
        } else {
          console.log(`    Skipped: no change needed or couldn't apply`);
        }
      }

      // Remove processed comments
      if (processedIds.size > 0) {
        art.comments = art.comments.filter(c => !processedIds.has(c.id));
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  Updated ${file}`);
    }
  }

  // Write major suggestions
  if (majorSuggestions.length > 0) {
    let md = '# Major Suggestions (needs review)\n\n';
    md += `_Updated: ${new Date().toISOString().split('T')[0]}_\n\n`;

    // Read existing file to avoid duplicates
    let existing = '';
    if (fs.existsSync(MAJOR_FILE)) {
      existing = fs.readFileSync(MAJOR_FILE, 'utf-8');
    }

    for (const s of majorSuggestions) {
      const entry = `### ${s.title} (${s.module}/${s.article})`;
      if (existing.includes(s.comment.substring(0, 40))) continue; // skip duplicates
      md += `${entry}\n`;
      md += `> "${s.selectedText.substring(0, 100)}"\n\n`;
      md += `**${s.author}** (${s.votes} votes): ${s.comment}\n\n`;
      md += `_Reason: ${s.reason}_\n\n---\n\n`;
    }

    if (md.includes('###')) {
      fs.mkdirSync(path.dirname(MAJOR_FILE), { recursive: true });
      fs.writeFileSync(MAJOR_FILE, md);
      console.log(`\n  Wrote ${majorSuggestions.length} major suggestions to ${MAJOR_FILE}`);
    }
  }

  console.log(`\n  Summary: ${applied} applied, ${rejected} rejected, ${majorCount} major`);
}

main().catch(e => { console.error(e); process.exit(1); });
