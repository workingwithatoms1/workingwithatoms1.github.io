#!/usr/bin/env node
/**
 * Generate module JSON files and HTML shells from the curriculum definition.
 * Run from project root: node scripts/generate-modules.js
 *
 * - Skips overwriting any JSON that already exists (preserves written content)
 * - Always regenerates HTML shells (they're trivial)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Curriculum definition ────────────────────────────────────────────────

const modules = [
  // Part I — Foundations
  { number: 1, title: 'Introduction & Overview', slug: 'introduction', part: 'I', partTitle: 'Foundations', topic: 'Introduction',
    articles: [
      'What is Materials Science?',
      'The Structure-Property-Processing-Performance Tetrahedron',
      'Length Scales in Materials',
      'Classes of Materials',
      'Materials Selection & Design Thinking',
    ]},
  { number: 2, title: 'Atomic Bonding & Structure', slug: 'bonding', part: 'I', partTitle: 'Foundations', topic: 'Bonding',
    articles: [
      'Atomic Structure & Electron Configuration',
      'Ionic Bonding',
      'Covalent Bonding',
      'Metallic Bonding',
      'Secondary Bonding (van der Waals, Hydrogen)',
      'Bond Energy, Interatomic Spacing & Force Curves',
      'Mixed Bonding Character & Pauling\'s Rules',
    ]},
  { number: 3, title: 'Crystallography', slug: 'crystallography', part: 'I', partTitle: 'Foundations', topic: 'Crystallography',
    articles: [
      'Crystal Systems & Bravais Lattices',
      'Miller Indices & Crystallographic Directions',
      'Point Groups & Space Groups',
      'Reciprocal Lattice & Diffraction Geometry',
    ]},
  { number: 4, title: 'Defects', slug: 'defects', part: 'I', partTitle: 'Foundations', topic: 'Defects',
    articles: [
      'Point Defects (Vacancies, Interstitials, Substitutional)',
      'Dislocations (Edge, Screw, Mixed)',
      'Planar Defects (Grain Boundaries, Stacking Faults, Twins)',
      'Solid Solutions & Hume-Rothery Rules',
    ]},
  { number: 5, title: 'Thermodynamics', slug: 'thermodynamics', part: 'I', partTitle: 'Foundations', topic: 'Thermodynamics',
    articles: [
      'Laws of Thermodynamics',
      'Free Energy & Equilibrium',
      'Chemical Potential & Activity',
      'The Regular Solution Model',
    ]},
  { number: 6, title: 'Diffusion & Kinetics', slug: 'diffusion', part: 'I', partTitle: 'Foundations', topic: 'Diffusion',
    articles: [
      'Fick\'s First & Second Laws',
      'Atomistic Mechanisms of Diffusion',
      'Temperature Dependence & Arrhenius Behaviour',
      'Solutions to the Diffusion Equation',
      'The Kirkendall Effect',
      'Reaction Kinetics & the Avrami Equation',
      'TTT & CCT Diagrams',
    ]},
  { number: 7, title: 'Phase Equilibria & Transformations', slug: 'phase-transformations', part: 'I', partTitle: 'Foundations', topic: 'Phase Transformations',
    articles: [
      'Unary & Binary Phase Diagrams',
      'The Lever Rule & Phase Fractions',
      'Ternary Phase Diagrams',
      'Gibbs Phase Rule',
      'Nucleation (Homogeneous & Heterogeneous)',
      'Growth Kinetics',
      'Solidification & Microstructure',
      'Spinodal Decomposition',
      'Precipitation & Age Hardening',
      'Martensitic Transformations',
      'Order-Disorder Transitions',
    ]},

  // Part II — Properties & Behaviour
  { number: 8, title: 'Mechanical Properties', slug: 'mechanical-properties', part: 'II', partTitle: 'Properties & Behaviour', topic: 'Mechanical Properties',
    articles: [
      'Stress & Strain (Engineering vs True)',
      'Elasticity & Elastic Moduli',
      'Plastic Deformation & Slip',
      'Strengthening Mechanisms',
      'Fracture Mechanics (Griffith, K_IC)',
      'Fatigue',
      'Creep & High-Temperature Behaviour',
      'Hardness & Indentation',
    ]},
  { number: 9, title: 'Electronic, Optical & Magnetic Properties', slug: 'electronic-properties', part: 'II', partTitle: 'Properties & Behaviour', topic: 'Electronic Properties',
    articles: [
      'Free Electron Model & Density of States',
      'Band Theory & Brillouin Zones',
      'Semiconductors (Intrinsic & Extrinsic)',
      'Dielectric Properties',
      'Optical Properties (Absorption, Reflection, Luminescence)',
      'Magnetic Behaviour (Dia-, Para-, Ferro-, Antiferro-, Ferri-)',
      'Superconductivity',
    ]},
  { number: 10, title: 'Electrochemistry & Corrosion', slug: 'electrochemistry', part: 'II', partTitle: 'Properties & Behaviour', topic: 'Electrochemistry',
    articles: [
      'Electrochemical Cells & Standard Potentials',
      'The Nernst Equation',
      'Electrode Kinetics & Butler-Volmer',
      'Pourbaix Diagrams',
      'Types of Corrosion',
      'Corrosion Prevention & Protection',
      'Batteries, Fuel Cells & Electrolysers',
    ]},
  { number: 18, title: 'Quantum Mechanics for Materials', slug: 'quantum-mechanics', part: 'II', partTitle: 'Properties & Behaviour', topic: 'Quantum Mechanics',
    articles: [
      'Wave-Particle Duality',
      'The Schrodinger Equation',
      'Quantum Numbers & Orbitals',
      'Pauli Exclusion & Electron Filling',
      'Perturbation Theory & Approximations',
      'From Atoms to Bonds to Bands',
    ]},

  // Part III — Material Classes
  { number: 11, title: 'Metals & Alloys', slug: 'metals', part: 'III', partTitle: 'Material Classes', topic: 'Metals',
    articles: [
      'Structure of Metals',
      'Alloy Design Principles',
      'Steels & Cast Irons',
      'Aluminium Alloys',
      'Titanium Alloys',
      'Nickel Superalloys',
      'Shape Memory Alloys & Intermetallics',
    ]},
  { number: 12, title: 'Ceramics & Glasses', slug: 'ceramics', part: 'III', partTitle: 'Material Classes', topic: 'Ceramics',
    articles: [
      'Crystal Structures of Ceramics',
      'Mechanical Behaviour & Brittle Fracture',
      'Glass Formation & the Glass Transition',
      'Functional Ceramics (Piezoelectric, Ferroelectric)',
      'Refractories & Structural Ceramics',
      'Cement, Concrete & Geopolymers',
      'Ceramic Processing',
    ]},
  { number: 13, title: 'Polymers', slug: 'polymers', part: 'III', partTitle: 'Material Classes', topic: 'Polymers',
    articles: [
      'Polymer Chemistry & Classification',
      'Molecular Weight & Distributions',
      'Chain Conformation & Configuration',
      'Crystallinity in Polymers',
      'Viscoelasticity & Mechanical Behaviour',
      'Glass Transition & Melting',
      'Polymer Processing',
    ]},
  { number: 14, title: 'Composites', slug: 'composites', part: 'III', partTitle: 'Material Classes', topic: 'Composites',
    articles: [
      'Types of Composites',
      'Rule of Mixtures & Bounds',
      'Fibre-Reinforced Composites',
      'Particle & Short-Fibre Composites',
      'Laminate Theory',
      'Failure Mechanisms & Damage Tolerance',
      'Natural & Bio-Inspired Composites',
    ]},

  // Part IV — Practice
  { number: 15, title: 'Characterisation Techniques', slug: 'characterisation', part: 'IV', partTitle: 'Practice', topic: 'Characterisation',
    articles: [
      'X-ray Diffraction (Powder & Single-Crystal)',
      'Scanning Electron Microscopy & EDX',
      'Transmission Electron Microscopy',
      'Spectroscopy (XPS, Raman, FTIR)',
      'Thermal Analysis (DSC, TGA, DTA)',
      'Mechanical Testing & Nanoindentation',
      'Surface & Interface Analysis',
    ]},
  { number: 16, title: 'Manufacturing', slug: 'manufacturing', part: 'IV', partTitle: 'Practice', topic: 'Manufacturing',
    articles: [
      'Casting & Solidification Processing',
      'Deformation Processing (Rolling, Forging, Extrusion)',
      'Powder Metallurgy & Sintering',
      'Joining (Welding, Brazing, Adhesives)',
      'Additive Manufacturing',
      'Heat Treatment',
      'Surface Engineering & Coatings',
    ]},
  { number: 17, title: 'Computational Materials Science', slug: 'computational', part: 'IV', partTitle: 'Practice', topic: 'Computational',
    articles: [
      'Density Functional Theory',
      'Molecular Dynamics',
      'Phase-Field Modelling',
      'CALPHAD & Thermodynamic Databases',
      'Finite Element Methods',
      'Machine Learning in Materials Science',
    ]},

  // Supporting Modules
  { number: 19, title: 'Mathematical Methods', slug: 'mathematical-methods', part: 'S', partTitle: 'Supporting Modules', topic: 'Mathematical Methods',
    articles: [
      'Vectors, Tensors & Matrix Algebra',
      'Ordinary & Partial Differential Equations',
      'Fourier Analysis',
      'Statistical Mechanics Fundamentals',
      'Numerical Methods & Discretisation',
      'Symmetry & Group Theory',
    ]},
];

// ── HTML shell templates ─────────────────────────────────────────────────

const pageShell = (rootPath, initScript) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="${rootPath}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${rootPath}favicon-32.png" sizes="32x32" type="image/png">
  <link rel="stylesheet" href="${rootPath}styles/tokens.css">
  <link rel="stylesheet" href="${rootPath}styles/typography.css">
  <link rel="stylesheet" href="${rootPath}styles/layout.css">
  <link rel="stylesheet" href="${rootPath}styles/components.css">
  <link rel="stylesheet" href="${rootPath}styles/sidenotes.css">
</head>
<body>
  <canvas id="siteBgCanvas"></canvas>
  <nav>
    <canvas class="nav-bg" id="navCanvas"></canvas>
    <a href="${rootPath}" class="logo">Working with atoms.</a>
    <button class="nav-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
    <ul class="nav-links">
      <li><a href="${rootPath}#curriculum">Learn</a></li>
      <li><a href="${rootPath}phase-diagrams/">Phase Diagrams</a></li>
    </ul>
  </nav>
  <main></main>
  <footer style="display:none">
    <div class="footer-logo">Working with atoms.</div>
    <div><a href="${rootPath}about/" style="color:inherit;text-decoration:none;">About</a></div>
  </footer>
  <script type="module">${initScript}</script>
</body>
</html>
`;

const sectionShell = (slug) => pageShell('../', `
    import { renderSectionPage } from '../scripts/renderers/section-page.js';
    renderSectionPage('${slug}');
  `);

const articleShell = (moduleSlug, articleSlug) => pageShell('../../', `
    import { renderArticlePage } from '../../scripts/renderers/article-page.js';
    renderArticlePage('${moduleSlug}', '${articleSlug}', '../../');
  `);

// ── Generate ─────────────────────────────────────────────────────────────

let stats = { json: 0, jsonSkipped: 0, html: 0 };

for (const mod of modules) {
  const dir = path.join(ROOT, mod.slug);
  const jsonPath = path.join(ROOT, 'content', 'modules', `${mod.slug}.json`);

  // Create module directory
  fs.mkdirSync(dir, { recursive: true });

  // Generate JSON (skip if exists — don't overwrite written content)
  if (fs.existsSync(jsonPath)) {
    stats.jsonSkipped++;
  } else {
    const jsonData = {
      module: {
        id: mod.slug,
        number: mod.number,
        title: mod.title,
        part: mod.part,
        partTitle: mod.partTitle,
        topic: mod.topic,
        intro: '',
      },
      articles: mod.articles.map((title, i) => ({
        id: slugify(title),
        number: `${mod.number}.${i + 1}`,
        title: title,
        description: '',
        readingTime: '— min',
        intro: '',
        body: [],
        related: [],
      })),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n');
    stats.json++;
  }

  // Read the JSON back to get article IDs (handles both generated and existing)
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Section landing page shell
  fs.writeFileSync(path.join(dir, 'index.html'), sectionShell(mod.slug));
  stats.html++;

  // Article page shells (directory-based for clean URLs)
  for (const art of data.articles) {
    const artDir = path.join(dir, art.id);
    fs.mkdirSync(artDir, { recursive: true });
    fs.writeFileSync(path.join(artDir, 'index.html'), articleShell(mod.slug, art.id));
    stats.html++;
  }
}

console.log(`Done: ${stats.json} JSON files created, ${stats.jsonSkipped} skipped (already exist), ${stats.html} HTML shells written.`);
