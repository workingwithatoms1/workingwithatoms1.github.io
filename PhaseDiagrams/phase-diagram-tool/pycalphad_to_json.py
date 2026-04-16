#!/usr/bin/env python3
"""
pycalphad_to_json.py — Generate site-compatible phase diagram JSON using
pycalphad's BinaryStrategy mapping API.

Replaces the old compute_binary.py + fix_invariants.py pipeline with a
single script that uses pycalphad's native topology detection.

Output JSON is consumed by the interactive canvas renderer
(scripts/phase-diagram-renderer.js).

Usage:
    python pycalphad_to_json.py data/cost507.tdb AL CU --output ../../content/phase-diagrams/al-cu.json
"""

import argparse
import json
import warnings
import numpy as np
from collections import defaultdict

from pycalphad import Database, equilibrium, variables as v
from pycalphad.mapping import BinaryStrategy

warnings.filterwarnings('ignore')

# ── Phase display names ─────────────────────────────────────────────────
# Solid solutions → Greek letters, intermetallics → formula or Greek
# System-specific overrides can be passed via --names flag or added here.

GLOBAL_DISPLAY = {
    'LIQUID':   'Liquid',
    'FCC_A1':   'α',
    'BCC_A2':   'β',
    'BCC_B2':   'β',
    'HCP_A3':   'α',
    'HCP_ZN':   'η',
    'DIAMOND_A4': 'Si',
}

# Per-system overrides (TDB phase name → display label)
SYSTEM_DISPLAY = {
    'AL-CU': {
        'FCC_A1':       'α',
        'ALCU_THETA':   'θ',
        'ALCU_ETA':     'η₁',
        'ALCU_ETA_P':   'η₂',
        'ALCU_EPSILON': 'ε₂',
        'ALCU_DELTA':   'δ',
        'ALCU_ZETA':    'ζ',
        'BCC_A2':       'β',
        'GAMMA_D83':    'γ₁',
        'GAMMA_H':      'γ₂',
    },
    'AL-MG': {
        'FCC_A1':       'α',
        'HCP_A3':       '(Mg)',
        'ALMG_BETA':    'Al₃Mg₂',
        'ALMG_GAMMA':   'γ',
        'ALMG_EPS':     'ε',
    },
    'AL-SI': {
        'FCC_A1':       'α',
        'DIAMOND_A4':   '(Si)',
    },
    'CU-ZN': {
        'LIQUID':       'Liquid',
        'FCC':          'α',
        'BCC_B2':       'β',
        'BCC':          "β'",
        'GAMMA':        'γ',
        'DELTA':        'δ',
        'EPS':          'ε',
        'HCP':          'η',
    },
    'CU-SI': {
        'FCC_A1':       'α',
        'DIAMOND_A4':   '(Si)',
        'LIQUID':       'Liquid',
        'CU3SI_LT':     'η',
        'CU3SI_MT':     "η'",
        'CU3SI_HT':     "η''",
        'CU15SI4_D86':  'ε',
        'CU33SI7_A13':  'γ',
        'CU33SI7_HT':   'γ (HT)',
        'GAMMA_D82':    'γ₁',
        'GAMMA_D83':    'γ₂',
    },
    'FE-SI': {
        'LIQUID':       'Liquid',
        'BCC_A2':       'α (Fe)',
        'BCC_B2':       'α (Fe)',
        'D03_BCC':      'α (Fe₃Si)',
        'DIS_BCC':      'α (dis)',
        'FCC_A1':       'γ',
        'HCP_A3':       'ε',
        'CBCC_A12':     '(Si)',
        'CUB_A13':      '(Si)',
        'DIAMOND_A4':   '(Si)',
        'FE2SI':        'Fe₂Si',
        'FE3SI7':       'Fe₃Si₇',
        'FE5SI3':       'Fe₅Si₃',
        'FESI':         'FeSi',
        'FESI2':        'FeSi₂',
    },
    'NI-CR': {
        'LIQUID':       'Liquid',
        'FCC_A1':       'γ (Ni)',
        'FCC_A1#2':     'γ (Ni)',
        'BCC_A2':       'α (Cr)',
        'CRNI2':        'CrNi₂',
    },
    'FE-CR': {
        'LIQUID':       'Liquid',
        'BCC_A2':       'α/δ (bcc)',
        'BCC_A2#2':     'α/δ (bcc)',
        'FCC_A1':       'γ (fcc)',
        'SIGMA':        'σ',
        'HIGH_SIGMA':   'σ (HT)',
    },
    'FE-NI': {
        'LIQUID':       'Liquid',
        'BCC_A2':       'α (bcc)',
        'FCC_A1':       'γ (fcc)',
        'FCC_A1#2':     'γ (fcc)',
        'L12_FCC':      'FeNi₃',
        'B2_BCC':       "α' (B2)",
    },
    'FE-MN': {
        'LIQUID':       'Liquid',
        'BCC_A2':       'α (bcc)',
        'FCC_A1':       'γ (fcc)',
        'CBCC_A12':     'α-Mn',
        'CUB_A13':      'β-Mn',
        'HCP_A3':       'ε (hcp)',
    },
    'TI-V': {
        'LIQUID':       'Liquid',
        'HCP_A3':       'α (hcp)',
        'BCC_A2':       'β (bcc)',
        'B2':           'β (bcc)',
    },
    'TI-NB': {
        'LIQUID':       'Liquid',
        'HCP_A3':       'α (hcp)',
        'BCC_A2':       'β (bcc)',
        'A2_BCC':       'β (bcc)',
        'BCC_2SL':      'β (bcc)',
        'BCC_4SL':      'β (bcc)',
    },
    'TI-MO': {
        'LIQUID':       'Liquid',
        'HCP_A3':       'α (hcp)',
        'BCC_A2':       'β (bcc)',
        'OMEGA':        'ω',
    },
    'CU-SN': {
        'LIQUID':       'Liquid',
        'FCC_A1':       'α',
        'BCC_A2':       'β',
        'DO3':          'β',
        'BCT_A5':       '(Sn)',
        'CU41SN11':     'δ',
        'CU3SN':        'ε',
        'HCU6SN5':      'η',
        'LCU6SN5':      "η'",
        'CU10SN3':      'ζ',
    },
}


def get_display_name(phase, system_key):
    """Get display name for a phase, checking system-specific then global."""
    sys_map = SYSTEM_DISPLAY.get(system_key, {})
    if phase in sys_map:
        return sys_map[phase]
    if phase in GLOBAL_DISPLAY:
        return GLOBAL_DISPLAY[phase]
    return phase.replace('_', ' ')


# ── BinaryStrategy computation ──────────────────────────────────────────

def find_melting_points(dbf, el1, el2):
    """Find pure-element melting points by scanning for liquid stability."""
    comps = [el1, el2, 'VA']
    phases = list(dbf.phases.keys())
    mps = []
    for x_test in [0.001, 0.999]:
        for T in range(400, 5000, 5):
            eq = equilibrium(dbf, comps, phases,
                             {v.N: 1, v.P: 101325, v.T: T, v.X(el2): [x_test]})
            stable = set()
            for vtx in range(eq.Phase.shape[-1]):
                try:
                    ph = str(eq.Phase.values.flat[vtx])
                    np_val = eq.NP.values.flat[vtx]
                    if ph and ph.strip() and not np.isnan(np_val) and np_val > 0.01:
                        stable.add(ph.upper())
                except (IndexError, ValueError):
                    pass
            if any('LIQUID' in p for p in stable):
                mps.append(T)
                break
    return mps


def compute(tdb_path, el1, el2, t_min=250, t_max=None, t_step=3, x_step=0.005):
    """Run BinaryStrategy and return strategy + database + auto t_max."""
    dbf = Database(tdb_path)
    comps = [el1, el2, 'VA']
    phases = list(dbf.phases.keys())

    # Auto-detect t_max from melting points if not specified
    if t_max is None:
        print(f"  Finding melting points...")
        mps = find_melting_points(dbf, el1, el2)
        if not mps:
            raise RuntimeError(
                f"find_melting_points({el1},{el2}) returned empty. "
                "TDB may have liquid instability or a multi-component parameter conflict. "
                "Pass --tmax explicitly, or try a dedicated binary TDB.")
        t_max = max(mps) + 100
        print(f"    Melting points: {mps} → t_max = {t_max} K")

    conds = {
        v.N: 1, v.P: 101325,
        v.T: (t_min, t_max, t_step),
        v.X(el2): (0, 1, x_step),
    }

    print(f"  Mapping {el1}-{el2} ({len(phases)} candidate phases), T=[{t_min}, {t_max}] K...")
    strategy = BinaryStrategy(dbf, comps, phases=phases, conditions=conds)
    strategy.do_map()

    return dbf, strategy, comps, phases, t_max


# ── Extract curves ──────────────────────────────────────────────────────

def extract_curves(strategy, el2):
    """
    Extract boundary curves as [[x, T], ...] arrays from tieline data.

    Curve IDs follow the convention the renderer expects:
      PREFIX_low  — lower-composition boundary of a two-phase region
      PREFIX_high — higher-composition boundary
    where PREFIX = PHASE1_PHASE2 (sorted alphabetically).

    The renderer uses matching prefixes to identify two-phase regions
    and the 'name' field (e.g. "FCC_A1 boundary") to identify which
    phase each curve belongs to.
    """
    x_var, y_var = v.X(el2), v.T
    tieline_data = strategy.get_tieline_data(x_var, y_var)

    curves = []
    pair_counter = defaultdict(int)

    for td in tieline_data:
        # Each tieline has .data with one entry per phase on the boundary
        phase_curves = []
        for spd in td.data:
            xp = spd.x
            yp = spd.y
            ph = spd.phase
            valid = ~np.isnan(yp) & (yp > 0)
            if valid.sum() < 2:
                continue

            pts = list(zip(xp[valid].tolist(), yp[valid].tolist()))
            pts = [[round(x, 5), round(t, 2)] for x, t in pts]
            pts.sort(key=lambda p: p[1])

            # Average composition to determine low/high side
            avg_x = np.mean([p[0] for p in pts])
            phase_curves.append({'phase': ph, 'pts': pts, 'avg_x': avg_x})

        if len(phase_curves) < 2:
            # Single-phase boundary (edge of diagram) — still include
            for pc in phase_curves:
                curves.append({
                    'id': f'{pc["phase"]}_edge',
                    'name': f'{pc["phase"]} boundary',
                    'pts': pc['pts'],
                    'closed': None,
                })
            continue

        # Sort by average composition: lower x = _low, higher x = _high
        phase_curves.sort(key=lambda c: c['avg_x'])

        # Build pair prefix from the two phase names (sorted alphabetically)
        p1 = phase_curves[0]['phase']
        p2 = phase_curves[1]['phase']
        pair_key = '_'.join(sorted([p1, p2]))
        count = pair_counter[pair_key]
        pair_counter[pair_key] += 1
        suffix = '' if count == 0 else f'_{count}'

        prefix = f'{pair_key}{suffix}'

        curves.append({
            'id': f'{prefix}_low',
            'name': f'{phase_curves[0]["phase"]} boundary',
            'pts': phase_curves[0]['pts'],
            'closed': None,
        })
        curves.append({
            'id': f'{prefix}_high',
            'name': f'{phase_curves[1]["phase"]} boundary',
            'pts': phase_curves[1]['pts'],
            'closed': None,
        })

    return curves


# ── Extract invariants (special points + isotherms) ─────────────────────

def extract_invariants(strategy, dbf, comps, all_phases, el2, system_key,
                       t_min, t_max):
    """Extract invariant points and isothermal tie lines."""
    x_var, y_var = v.X(el2), v.T
    invariant_data = strategy.get_invariant_data(x_var, y_var)

    special_points = []
    isotherms = []

    for inv in invariant_data:
        xs = inv.x
        ys = inv.y
        phases = inv.phases

        if len(xs) < 2:
            continue

        avg_T = float(np.mean(ys))
        x_min = float(np.min(xs))
        x_max = float(np.max(xs))

        # Classify reaction from phase identities + composition ordering
        rtype = classify_invariant(
            phases, xs, ys, dbf, comps, all_phases, el2)

        isotherms.append({
            'T': round(avg_T, 1),
            'x_start': round(x_min, 5),
            'x_end': round(x_max, 5),
            'name': rtype,
        })

        for x, y in zip(xs, ys):
            special_points.append({
                'x': round(float(x), 5),
                'T': round(float(y), 1),
                'name': f'{rtype}',
                'type': 'triple',
            })

    return special_points, isotherms


def classify_invariant(phases, xs, ys, dbf, comps, all_phases, el2):
    """
    Classify a binary invariant reaction from its three phases and their
    compositions at the invariant temperature.

    Binary invariant types (on cooling):
        Liquid involved:
          Eutectic      L → α + β       (liquid has intermediate composition)
          Peritectic    L + α → β       (liquid at one end)
          Monotectic    L₁ → L₂ + α    (two liquids)
          Catatectic    α → L + β       (solid decomposes into liquid + solid)

        All solid:
          Eutectoid     γ → α + β       (high-T phase has intermediate x)
          Peritectoid   α + β → γ       (product has intermediate x)

    Strategy: sort phases by composition, check which phase has intermediate
    x, then determine if it's the high-T or low-T phase by sampling
    equilibrium just above the invariant.
    """
    if len(phases) < 3 or len(xs) < 3:
        return 'Invariant'

    # Sort by composition
    sorted_data = sorted(zip(xs, ys, phases), key=lambda p: p[0])
    x_left, _, p_left = sorted_data[0]
    x_mid, _, p_mid = sorted_data[1]
    x_right, _, p_right = sorted_data[2]

    avg_T = float(np.mean(ys))

    is_liq = lambda p: 'LIQUID' in p.upper()
    n_liq = sum(1 for p in phases if is_liq(p))

    # ── Two liquids → Monotectic ──
    if n_liq == 2:
        return 'Monotectic'

    # ── One liquid ──
    if n_liq == 1:
        if is_liq(p_mid):
            # Liquid at intermediate composition → Eutectic (L → S₁ + S₂)
            return 'Eutectic'
        else:
            # Liquid at one end → Peritectic (L + S₁ → S₂)
            return 'Peritectic'

    # ── All solid — sample above invariant to determine high-T phase ──
    try:
        x_test = float(x_mid)
        eq = equilibrium(
            dbf, comps, all_phases,
            {v.N: 1, v.P: 101325, v.T: avg_T + 5,
             v.X(el2): [x_test]}
        )
        above_phases = set()
        for vtx in range(eq.Phase.shape[-1]):
            ph = str(eq.Phase.values.flat[vtx])
            np_val = eq.NP.values.flat[vtx]
            if ph and ph.strip() and not np.isnan(np_val) and np_val > 0.01:
                above_phases.add(ph)

        # If the mid-composition phase is stable above → it decomposes on cooling
        if p_mid in above_phases:
            return 'Eutectoid'
        else:
            return 'Peritectoid'
    except Exception:
        # Fallback: assume eutectoid
        return 'Eutectoid'


# ── Auto-label single-phase regions ─────────────────────────────────────

MIN_WIDTH_INTERNAL = 0.015  # wide enough to place a short label inside
ADJACENT_OFFSET    = 0.008  # how far into adjacent region for narrow labels


def compute_labels(dbf, strategy, comps, phases, el2, system_key,
                   t_min, t_max):
    """
    Auto-label single-phase regions.

    1. Place at centroid of wide regions.
    2. For narrow phases, place label just outside the boundary in the
       adjacent two-phase region (offset by ADJACENT_OFFSET).
    3. If truly no space, skip.

    Regions can split across the diagram — each fragment gets its own label.
    """
    nx, nt = 80, 45
    x_arr = np.linspace(0.003, 0.997, nx)
    t_arr = np.linspace(t_min + 5, t_max - 5, nt)

    # ── Grid sample: identify single-phase points ──
    samples = []
    for T_val in t_arr:
        eq = equilibrium(
            dbf, comps, phases,
            {v.N: 1, v.P: 101325, v.T: T_val, v.X(el2): x_arr}
        )
        for ix, x_val in enumerate(x_arr):
            stable = set()
            for vtx in range(eq.Phase.shape[-1]):
                try:
                    ph = str(eq.Phase.values.flat[ix * eq.Phase.shape[-1] + vtx])
                    np_val = eq.NP.values.flat[ix * eq.NP.shape[-1] + vtx]
                    if ph and ph.strip() and not np.isnan(np_val) and np_val > 0.01:
                        stable.add(ph)
                except (IndexError, ValueError):
                    pass
            if len(stable) == 1:
                samples.append({'x': float(x_val), 'T': float(T_val),
                                'phase': list(stable)[0]})

    # ── Group by DISPLAY name so multi-variant phases (e.g. BCC_A2, BCC_2SL
    #    both displayed as "β (bcc)") merge into a single label region ──
    groups = defaultdict(list)
    for s in samples:
        disp = get_display_name(s['phase'], system_key)
        groups[disp].append((s['x'], s['T']))

    # ── Split disconnected clusters by (x, T) proximity ──
    # A phase that appears in two disconnected regions (rare but possible,
    # e.g. retrograde solubility or multiple solvus domes) should get two
    # labels. Split when neighbouring samples differ by >0.08 in x AND
    # >150 K in T, i.e. no reasonable continuous path between them.
    clusters = []
    for disp, points in groups.items():
        pts = sorted(points, key=lambda p: p[0])
        current = [pts[0]]
        for i in range(1, len(pts)):
            dx = pts[i][0] - pts[i - 1][0]
            # Look across the current cluster for any T-neighbour within 150 K
            t_near = any(abs(pts[i][1] - p[1]) < 150 for p in current[-20:])
            if dx > 0.08 and not t_near:
                clusters.append((disp, current))
                current = []
            current.append(pts[i])
        clusters.append((disp, current))

    # ── Recover phases the grid missed (line compounds) ──
    found_displays = set(groups.keys())
    tieline_data = strategy.get_tieline_data(v.X(el2), v.T)
    all_mapped = set(strategy.get_all_phases()) - {''}

    for phase in all_mapped:
        disp = get_display_name(phase, system_key)
        if disp in found_displays:
            continue
        xs, ys = [], []
        for td in tieline_data:
            for spd in td.data:
                if spd.phase == phase:
                    valid = ~np.isnan(spd.y) & (spd.y > 0)
                    xs.extend(spd.x[valid].tolist())
                    ys.extend(spd.y[valid].tolist())
        if xs:
            cx = float(np.median(xs))
            cy = float(np.median(ys))
            clusters.append((disp, [(cx, cy)]))
            found_displays.add(disp)
            print(f"    Recovered: {phase} → {disp} at x={cx:.3f}, T={cy:.0f}")

    # ── Place labels ──
    labels = []
    for display, points in clusters:
        pts = np.array(points)
        cx = float(np.mean(pts[:, 0]))
        cy = float(np.mean(pts[:, 1]))
        x_extent = float(pts[:, 0].max() - pts[:, 0].min())

        if x_extent >= MIN_WIDTH_INTERNAL:
            # Rule 1 — wide region: label at centroid
            labels.append({
                'text': display,
                'x': round(cx, 3),
                'T': round(cy, 1),
                'style': 'phase-large' if display == 'Liquid' else 'phase',
            })
        else:
            # Rule 2 — narrow / line compound: offset into adjacent space
            label_x = cx + ADJACENT_OFFSET if cx < 0.05 else cx - ADJACENT_OFFSET
            labels.append({
                'text': display,
                'x': round(label_x, 3),
                'T': round(cy, 1),
                'style': 'phase',
            })

    # Clamp to visible range
    for lab in labels:
        lab['x'] = round(max(0.01, min(0.99, lab['x'])), 3)

    return labels


# ── Assemble JSON ───────────────────────────────────────────────────────

def build_json(system, reference, curves, special_points, isotherms, labels,
               system_key):
    """Build the final JSON structure for the renderer."""
    # Strip internal 'phase' key from curves
    clean_curves = []
    for c in curves:
        clean_curves.append({
            'id': c['id'],
            'name': c['name'],
            'pts': c['pts'],
            'closed': c['closed'],
        })

    # Emit a raw→display phase-name map so the hover pill matches the on-diagram
    # labels (renderer reads it as data.phaseNames).
    raw_phases = set()
    for c in curves:
        raw_phases.add(c['name'].replace(' boundary', ''))
    phase_names = {raw: get_display_name(raw, system_key) for raw in sorted(raw_phases)}

    return {
        'system': system,
        'reference': reference,
        'special_points': special_points,
        'curves': clean_curves,
        'isotherms': isotherms,
        'labels': labels,
        'phaseNames': phase_names,
    }


# ── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Generate phase diagram JSON via pycalphad mapping')
    parser.add_argument('tdb', help='Path to TDB file')
    parser.add_argument('el1', help='Element 1 (e.g. AL)')
    parser.add_argument('el2', help='Element 2 (e.g. CU)')
    parser.add_argument('--tmin', type=float, default=250)
    parser.add_argument('--tmax', type=float, default=None,
                        help='Max temperature (K). Auto-detected from melting points if omitted.')
    parser.add_argument('--ref', default='COST 507 (Ansara, Dinsdale & Rand, 1998)')
    parser.add_argument('--output', '-o', required=True)
    args = parser.parse_args()

    el1 = args.el1.upper()
    el2 = args.el2.upper()
    system = f'{el1.capitalize()}-{el2.capitalize()}'
    system_key = f'{el1}-{el2}'

    print(f"Building {system} phase diagram...")

    # 1. Compute (t_max auto-detected if not specified)
    dbf, strategy, comps, all_phases, t_max = compute(
        args.tdb, el1, el2, args.tmin, args.tmax)

    # 2. Extract curves
    print("  Extracting boundary curves...")
    curves = extract_curves(strategy, el2)
    print(f"    {len(curves)} boundary curves")
    if not curves:
        raise RuntimeError(
            f"No boundary curves extracted for {system}. Equilibrium likely "
            "returned no stable phases — check TDB compatibility (e.g. try "
            "a dedicated binary TDB).")

    # 3. Extract invariants
    print("  Extracting invariants...")
    special_points, isotherms = extract_invariants(
        strategy, dbf, comps, all_phases, el2, system_key,
        args.tmin, t_max)
    print(f"    {len(special_points)} special points, {len(isotherms)} isotherms")

    # 4. Auto-label
    print("  Labelling phase regions...")
    labels = compute_labels(dbf, strategy, comps, all_phases, el2, system_key,
                            args.tmin, t_max)
    print(f"    {len(labels)} labels:")
    for lab in sorted(labels, key=lambda l: l['x']):
        print(f"      {lab['text']:12s}  x={lab['x']:.3f}, T={lab['T']:.1f}")

    # 5. Build JSON
    data = build_json(system, args.ref, curves, special_points, isotherms, labels,
                      system_key)

    with open(args.output, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nSaved to {args.output}")


if __name__ == '__main__':
    main()
