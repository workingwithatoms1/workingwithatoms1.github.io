#!/usr/bin/env node
/**
 * Insert widget blocks into thermodynamics articles at appropriate locations.
 * Run: node scripts/add-widgets.js
 */
const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '..', 'content', 'modules', 'thermodynamics.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

function findArticle(id) {
  return data.articles.find(a => a.id === id);
}

function insertAfterH3(article, h3Text, blocks) {
  const idx = article.body.findIndex(b => b[0] === 'h3' && b[1] === h3Text);
  if (idx === -1) {
    console.log(`  WARNING: h3 "${h3Text}" not found in ${article.id}`);
    return false;
  }
  // Find the next h3 or end of body to insert before it
  let insertIdx = article.body.length;
  for (let i = idx + 1; i < article.body.length; i++) {
    if (article.body[i][0] === 'h3') { insertIdx = i; break; }
  }
  article.body.splice(insertIdx, 0, ...blocks);
  return true;
}

function insertAtEnd(article, blocks) {
  // Insert before the last element if it's a closing summary, else at end
  article.body.push(...blocks);
}

function hasWidget(article, widgetId) {
  return article.body.some(b => b[0] === 'widget' && b[1] === widgetId);
}

// 5.3 Work & Heat — PV work diagram
const art53 = findArticle('work-and-heat');
if (art53 && !hasWidget(art53, 'pv-work')) {
  insertAfterH3(art53, 'Work', [
    ['widget', 'pv-work', {}]
  ]);
  console.log('Added pv-work to 5.3');
}

// 5.6 Entropy — microstates demo
const art56 = findArticle('entropy-second-law');
if (art56 && !hasWidget(art56, 'entropy-microstates')) {
  insertAfterH3(art56, 'The statistical picture', [
    ['widget', 'entropy-microstates', {}]
  ]);
  console.log('Added entropy-microstates to 5.6');
}

// 5.9 Free Energy — G vs T
const art59 = findArticle('free-energy');
if (art59 && !hasWidget(art59, 'g-vs-t')) {
  insertAfterH3(art59, 'G versus T: how to read a stability plot', [
    ['widget', 'g-vs-t', { "Tm": 933, "dH": 10700, "metal": "Al" }]
  ]);
  console.log('Added g-vs-t to 5.9');
}

// 5.10 Chemical Potential — tangent construction
const art510 = findArticle('chemical-potential');
if (art510 && !hasWidget(art510, 'tangent-construction')) {
  // Add after the section about condensed phases
  insertAfterH3(art510, 'Chemical potential in condensed phases', [
    ['widget', 'tangent-construction', { "Omega": -10000, "T": 1000 }]
  ]);
  console.log('Added tangent-construction to 5.10');
}

// 5.11 Activity — activity plot
const art511 = findArticle('activity-real-behaviour');
if (art511 && !hasWidget(art511, 'activity-plot')) {
  insertAfterH3(art511, "Henry's law", [
    ['widget', 'activity-plot', {}]
  ]);
  console.log('Added activity-plot to 5.11');
}

// 5.12 Solutions & Mixing — mixing curves
const art512 = findArticle('solutions-mixing');
if (art512 && !hasWidget(art512, 'mixing-curves')) {
  insertAfterH3(art512, 'Enthalpy and entropy of mixing', [
    ['widget', 'mixing-curves', {}]
  ]);
  console.log('Added mixing-curves to 5.12');
}

// 5.13 Regular Solution — the big interactive
const art513 = findArticle('regular-solution-model');
if (art513 && !hasWidget(art513, 'regular-solution')) {
  insertAfterH3(art513, 'Spinodal decomposition', [
    ['widget', 'regular-solution', {}]
  ]);
  console.log('Added regular-solution to 5.13');
}

// 5.15 Free Energy to Phase Diagrams — common tangent
const art515 = findArticle('free-energy-to-phase-diagrams');
if (art515 && !hasWidget(art515, 'common-tangent')) {
  insertAfterH3(art515, 'Building a phase diagram temperature by temperature', [
    ['widget', 'common-tangent', {}]
  ]);
  console.log('Added common-tangent to 5.15');
}

// 5.16 Ellingham — interactive chart
const art516 = findArticle('ellingham-diagrams');
if (art516 && !hasWidget(art516, 'ellingham-chart')) {
  insertAfterH3(art516, 'Reading the diagram', [
    ['widget', 'ellingham-chart', {}]
  ]);
  console.log('Added ellingham-chart to 5.16');
}

// 5.17 Predominance — Pourbaix diagram
const art517 = findArticle('predominance-diagrams');
if (art517 && !hasWidget(art517, 'pourbaix-diagram')) {
  insertAfterH3(art517, 'Reading a Pourbaix diagram: iron', [
    ['widget', 'pourbaix-diagram', {}]
  ]);
  console.log('Added pourbaix-diagram to 5.17');
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
console.log('Done.');
