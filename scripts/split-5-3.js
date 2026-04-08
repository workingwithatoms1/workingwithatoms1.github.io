#!/usr/bin/env node
/**
 * Split article 5.3 into three articles and renumber 5.4+ by +2.
 * Run from project root: node scripts/split-5-3.js
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '..', 'content', 'modules', 'thermodynamics.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const oldArticles = data.articles;
const old53 = oldArticles.find(a => a.id === 'work-heat-first-law');
const old53idx = oldArticles.indexOf(old53);
const body = old53.body;

// Find split points by h3 headings
function findH3(body, title) {
  return body.findIndex(b => b[0] === 'h3' && b[1] === title);
}

const firstLawIdx = findH3(body, 'The first law');
const carnotIdx = findH3(body, 'The Carnot cycle');

// Split body into three
const workHeatBody = body.slice(0, firstLawIdx);
const firstLawBody = body.slice(firstLawIdx, carnotIdx);
const carnotBody = body.slice(carnotIdx);

// Create three new articles
const art53 = {
  id: 'work-and-heat',
  number: '5.3',
  title: 'Work & Heat',
  description: 'PV work, heat, path dependence, heat capacity, and the Dulong-Petit law.',
  readingTime: '10 min',
  intro: 'The two currencies of energy transfer between a system and its surroundings are work and heat. Both are path functions: the amount depends on how the process is carried out, not just the initial and final states. Understanding them precisely is essential before stating the first law.',
  body: workHeatBody,
  related: [
    { title: 'Systems, Boundaries & State', url: 'systems-boundaries-state' },
    { title: 'The First Law & Enthalpy', url: 'first-law-enthalpy' },
    { title: 'Entropy & the Second Law', url: 'entropy-second-law' }
  ]
};

const art54 = {
  id: 'first-law-enthalpy',
  number: '5.4',
  title: 'The First Law & Enthalpy',
  description: 'Energy conservation, the enthalpy accounting framework, phase transitions, Hess\'s law, and Kirchhoff\'s law.',
  readingTime: '14 min',
  intro: 'The first law of thermodynamics is a bookkeeping rule. Energy cannot be created or destroyed, only transferred between a system and its surroundings as heat or work. This article states the law, then builds the enthalpy framework that makes it practical for constant-pressure experiments.',
  body: firstLawBody,
  related: [
    { title: 'Work & Heat', url: 'work-and-heat' },
    { title: 'The Carnot Cycle', url: 'carnot-cycle' },
    { title: 'Free Energy', url: 'free-energy' }
  ]
};

const art55 = {
  id: 'carnot-cycle',
  number: '5.5',
  title: 'The Carnot Cycle',
  description: 'The theoretical maximum efficiency of heat engines, and why it matters.',
  readingTime: '8 min',
  intro: 'The first law tells you that energy is conserved. It does not tell you how efficiently you can convert heat into work. That question was answered by Sadi Carnot in 1824, in a remarkable paper written before entropy, the second law, or even the first law had been formulated.',
  body: carnotBody,
  related: [
    { title: 'Work & Heat', url: 'work-and-heat' },
    { title: 'The First Law & Enthalpy', url: 'first-law-enthalpy' },
    { title: 'Entropy & the Second Law', url: 'entropy-second-law' }
  ]
};

// Remove the intro sentence from 5.5 body (it's now in the intro field)
// The first body element is the h3 "The Carnot cycle", keep it
// But the first paragraph after it duplicates the intro, remove it
if (art55.body.length > 1 && art55.body[1][0] === 'p' && art55.body[1][1].includes('first law tells you')) {
  art55.body.splice(1, 1); // remove the duplicate intro paragraph
}

// Also remove the h3 "The Carnot cycle" since it's now the article title
if (art55.body[0][0] === 'h3' && art55.body[0][1] === 'The Carnot cycle') {
  art55.body.splice(0, 1);
}

// Build new articles array
const newArticles = [
  ...oldArticles.slice(0, old53idx),
  art53,
  art54,
  art55,
  ...oldArticles.slice(old53idx + 1)
];

// Renumber articles 5.6+ (old 5.4 = entropy becomes 5.6, etc.)
const numberMap = {}; // old number -> new number
for (let i = 0; i < newArticles.length; i++) {
  const oldNum = newArticles[i].number;
  const newNum = `5.${i + 1}`;
  if (oldNum !== newNum) {
    numberMap[oldNum] = newNum;
  }
  newArticles[i].number = newNum;
}

// Update in-text references like "article 5.8" or "article 5.7"
function updateRefs(str) {
  return str.replace(/article 5\.(\d+)/g, (match, num) => {
    const oldNum = `5.${num}`;
    return numberMap[oldNum] ? `article ${numberMap[oldNum]}` : match;
  });
}

function updateBody(body) {
  return body.map(block => {
    if (typeof block === 'string') return updateRefs(block);
    return block.map(item => {
      if (typeof item === 'string') return updateRefs(item);
      if (Array.isArray(item)) return updateBody(item); // nested body (derivation)
      return item;
    });
  });
}

for (const art of newArticles) {
  art.intro = updateRefs(art.intro);
  art.body = updateBody(art.body);
  // Update descriptions too
  art.description = updateRefs(art.description);
}

// Also update module intro
data.module.intro = updateRefs(data.module.intro);

data.articles = newArticles;

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');

console.log(`Split 5.3 into 3 articles. Total articles: ${newArticles.length}`);
console.log('Number mapping:', numberMap);
