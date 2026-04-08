/* ==========================================================================
   Main entry point — wires up all canvas renderers and page behaviour
   ========================================================================== */

import { createHalftoneRenderer } from './halftone.js';
import {
  heroField,
  articleBgField,
  // Part I — Foundations
  fieldIntro,
  fieldOrbital,
  fieldLattice,
  fieldDefects,
  fieldPhaseFlow,
  fieldDiffusion,
  fieldBurst,
  // Part II — Properties & Behaviour
  fieldStress,
  fieldInterference,
  fieldDissolution,
  // Part III — Material Classes
  fieldCrystalline,
  fieldAmorphous,
  fieldChain,
  fieldStrata,
  // Part IV — Practice
  fieldDiffraction,
  fieldCascade,
  fieldMatrix,
  // Supporting Modules
  fieldQuantum,
  fieldLissajous
} from './fields.js';
import { initSiteBackground } from './site-bg.js';
import { initNav } from './nav.js';

/* --- Static background (render once) ------------------------------------ */

initSiteBackground('siteBgCanvas');

/* --- Nav scroll + canvas ------------------------------------------------ */

initNav();

/* --- Hero halftone ------------------------------------------------------ */

const heroCanvas = document.getElementById('heroCanvas');
if (heroCanvas) {
  createHalftoneRenderer(heroCanvas, {
    spacing: 10,
    maxRadius: 5,
    field: heroField
  });
}

/* --- Curriculum cards --------------------------------------------------- */

const cardConfigs = [
  // Part I — Foundations
  { id: 'card-intro',          field: fieldIntro        },
  { id: 'card-bonding',        field: fieldOrbital      },
  { id: 'card-crystallography', field: fieldLattice     },
  { id: 'card-defects',        field: fieldDefects      },
  { id: 'card-thermo',         field: fieldPhaseFlow    },
  { id: 'card-diffusion',      field: fieldDiffusion    },
  { id: 'card-phase-trans',    field: fieldBurst        },
  // Part II — Properties & Behaviour
  { id: 'card-mechanical',     field: fieldStress       },
  { id: 'card-electronic',     field: fieldInterference },
  { id: 'card-electrochem',    field: fieldDissolution  },
  // Part III — Material Classes
  { id: 'card-metals',         field: fieldCrystalline  },
  { id: 'card-ceramics',       field: fieldAmorphous    },
  { id: 'card-polymers',       field: fieldChain        },
  { id: 'card-composites',     field: fieldStrata       },
  // Part IV — Practice
  { id: 'card-characterisation', field: fieldDiffraction },
  { id: 'card-manufacturing',    field: fieldCascade    },
  { id: 'card-computational',    field: fieldMatrix     },
  // Supporting Modules
  { id: 'card-quantum',        field: fieldQuantum      },
  { id: 'card-maths',          field: fieldLissajous    },
];

for (const cfg of cardConfigs) {
  const el = document.getElementById(cfg.id);
  if (!el) continue;
  const canvas = el.querySelector('canvas');
  if (!canvas) continue;
  createHalftoneRenderer(canvas, {
    spacing: 8,
    maxRadius: 3.5,
    field: cfg.field,
    static: true
  });
}

/* --- Article background ------------------------------------------------- */

const articleCanvas = document.getElementById('articleBgCanvas');
if (articleCanvas) {
  createHalftoneRenderer(articleCanvas, {
    spacing: 12,
    maxRadius: 3,
    field: articleBgField
  });
}
