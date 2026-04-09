#!/usr/bin/env python3
"""
compute_binary.py — Compute a binary phase diagram from a TDB file.

Takes a CALPHAD TDB file and two element names, computes equilibrium on a
fine grid using PyCalphad, extracts phase boundary curves from two-phase
equilibrium compositions, finds invariant points from curve topology,
applies cubic spline smoothing, and outputs a structured JSON file ready
for the interactive canvas renderer.

Usage:
    python compute_binary.py data/alzn_mey.tdb AL ZN --output output/alzn.json

Requirements:
    pip install pycalphad scipy numpy

Pipeline:
    1. Load TDB, identify and filter phases
    2. Coarse equilibrium grid over full (T, x) range
    3. Extract two-phase boundary compositions
    4. Detect invariant temperatures from curve topology
    5. Fine-grid re-computation near invariant temperatures
    6. Build boundary curves with cubic spline smoothing
    7. Classify invariant reactions (eutectic, eutectoid, peritectic, etc.)
    8. Snap curve endpoints to invariant points
    9. Auto-generate phase region labels
   10. Output structured JSON
"""

import argparse
import json
import sys
import numpy as np
from collections import defaultdict
from scipy.interpolate import CubicSpline
from pycalphad import Database, equilibrium
import pycalphad.variables as v


# ── Helpers ──────────────────────────────────────────────────────────────

def smooth_curve(T_vals, X_vals, n=80):
    """Cubic spline interpolation of a boundary curve parameterised by T."""
    T = np.array(T_vals, dtype=float)
    X = np.array(X_vals, dtype=float)
    _, idx = np.unique(T, return_index=True)
    T, X = T[idx], X[idx]
    if len(T) < 4:
        return [[round(float(x), 5), round(float(t), 2)] for x, t in zip(X, T)]
    cs = CubicSpline(T, X, bc_type='natural')
    T_s = np.linspace(T[0], T[-1], n)
    X_s = np.clip(cs(T_s), 0, 1)
    return [[round(float(x), 5), round(float(t), 2)] for x, t in zip(X_s, T_s)]


def interp_curve(pts, T):
    """Interpolate composition on a curve at temperature T."""
    for i in range(len(pts) - 1):
        t0, t1 = pts[i][1], pts[i + 1][1]
        if (t0 <= T <= t1) or (t1 <= T <= t0):
            frac = (T - t0) / (t1 - t0) if t1 != t0 else 0
            return pts[i][0] + frac * (pts[i + 1][0] - pts[i][0])
    return None


def classify_phase(name):
    """Classify a phase as 'liquid' or 'solid' from its name."""
    upper = name.upper().replace('_', '')
    if 'LIQUID' in upper or upper == 'L':
        return 'liquid'
    return 'solid'


# ── Phase extraction ─────────────────────────────────────────────────────

def extract_two_phase(eq, el2, T_arr, X_arr):
    """Extract two-phase equilibrium compositions from an equilibrium result."""
    two_phase = defaultdict(list)

    for i_T in range(len(T_arr)):
        T_val = float(T_arr[i_T])
        for i_X in range(len(X_arr)):
            ph = []
            for k in range(eq.Phase.shape[-1]):
                pname = str(eq.Phase.values[0, 0, i_T, i_X, k])
                npval = eq.NP.values[0, 0, i_T, i_X, k]
                if pname != '' and not np.isnan(npval) and npval > 1e-6:
                    xzn = float(eq.X.sel(component=el2).values[0, 0, i_T, i_X, k])
                    ph.append((pname, xzn))

            if len(ph) == 2:
                ph.sort(key=lambda p: p[1])
                pair = (ph[0][0], ph[1][0])
                two_phase[pair].append((T_val, ph[0][1], ph[1][1]))

    # Deduplicate per T
    clean = {}
    for pair, pts in two_phase.items():
        by_T = defaultdict(list)
        for T, x1, x2 in pts:
            by_T[T].append((x1, x2))
        deduped = []
        for T in sorted(by_T.keys()):
            vals = by_T[T]
            deduped.append((T, float(np.mean([v[0] for v in vals])),
                               float(np.mean([v[1] for v in vals]))))
        clean[pair] = deduped

    return clean


# ── Main pipeline ────────────────────────────────────────────────────────

def compute_binary(tdb_path, el1, el2, T_min=300, T_max=1000, T_step=2, X_step=0.005):
    """Main computation pipeline."""
    el1, el2 = el1.upper(), el2.upper()
    print(f"Loading {tdb_path}...")
    db = Database(tdb_path)

    comps = [el1, el2, 'VA']
    all_phases = list(db.phases.keys())
    phases = all_phases
    print(f"Elements: {el1}, {el2}")
    print(f"Phases in TDB: {all_phases}")

    # ── Step 1: Coarse equilibrium grid ──
    print(f"Computing coarse grid (T: {T_min}-{T_max} step {T_step}, X step {X_step})...")
    eq = equilibrium(db, comps, phases,
                     {v.X(el2): (0, 1, X_step),
                      v.T: (T_min, T_max, T_step),
                      v.P: 101325, v.N: 1})

    T_arr = eq.T.values
    X_arr = eq.coords[f'X_{el2}'].values
    print(f"Grid: {len(T_arr)} T x {len(X_arr)} X = {len(T_arr) * len(X_arr)} points")

    clean = extract_two_phase(eq, el2, T_arr, X_arr)
    print(f"Two-phase regions found: {len(clean)}")
    for pair, pts in clean.items():
        print(f"  {pair[0]} + {pair[1]}: {len(pts)} T values, "
              f"T={pts[0][0]:.0f}-{pts[-1][0]:.0f}")

    # ── Step 2: Build preliminary curves ──
    print("Building preliminary curves...")
    curves = []

    for pair, pts in clean.items():
        T_vals = [p[0] for p in pts]
        x_low = [p[1] for p in pts]
        x_high = [p[2] for p in pts]
        p1_name, p2_name = pair

        if p1_name == p2_name:
            # Miscibility gap — closed dome
            left = smooth_curve(T_vals, x_low, 40)
            right = smooth_curve(T_vals, x_high, 40)
            dome = left + right[::-1]
            curves.append({
                'id': f'{p1_name}_misc_gap',
                'name': 'miscibility gap',
                'pts': dome,
                'closed': True,
                'pair': pair,
            })
        else:
            # Check for jumps in the low-x curve
            jump_idx = None
            for i in range(len(x_low) - 1):
                if abs(x_low[i + 1] - x_low[i]) > 0.1:
                    jump_idx = i
                    break

            if jump_idx is not None:
                curves.append({
                    'id': f'{p1_name}_{p2_name}_low_left',
                    'name': f'{p1_name} boundary',
                    'pts': smooth_curve(T_vals[:jump_idx + 1], x_low[:jump_idx + 1], 60),
                    'pair': pair,
                })
                curves.append({
                    'id': f'{p1_name}_{p2_name}_low_right',
                    'name': f'{p1_name} boundary',
                    'pts': smooth_curve(T_vals[jump_idx + 1:], x_low[jump_idx + 1:], 30),
                    'pair': pair,
                })
            else:
                curves.append({
                    'id': f'{p1_name}_{p2_name}_low',
                    'name': f'{p1_name} boundary',
                    'pts': smooth_curve(T_vals, x_low,
                                       min(80, max(30, len(T_vals) // 2))),
                    'pair': pair,
                })

            curves.append({
                'id': f'{p1_name}_{p2_name}_high',
                'name': f'{p2_name} boundary',
                'pts': smooth_curve(T_vals, x_high,
                                   min(80, max(30, len(T_vals) // 2))),
                'pair': pair,
            })

    # ── Step 3: Detect invariant temperatures ──
    print("Detecting invariant temperatures...")

    # Collect all curve endpoints
    endpoints = []
    for c in curves:
        pts = c['pts']
        if len(pts) > 0:
            endpoints.append({'x': pts[0][0], 'T': pts[0][1], 'curve': c['id'], 'end': 'start', 'pair': c.get('pair')})
            endpoints.append({'x': pts[-1][0], 'T': pts[-1][1], 'curve': c['id'], 'end': 'end', 'pair': c.get('pair')})

    # Group endpoints by temperature (rounded to 4K)
    by_T = defaultdict(list)
    for ep in endpoints:
        T_round = round(ep['T'] / 4) * 4
        by_T[T_round].append(ep)

    invariant_temps = []
    for T_round, eps in by_T.items():
        if len(eps) >= 3:
            # Multiple curves meeting = candidate invariant
            avg_T = np.mean([ep['T'] for ep in eps])
            invariant_temps.append(round(float(avg_T), 1))

    # Also check for dome junctions: where a misc gap starts at same T as other curves
    dome_curves = [c for c in curves if c.get('closed')]
    for dome in dome_curves:
        dome_T = dome['pts'][0][1]  # bottom of dome
        # Check if any non-dome curve ends/starts near this T
        for c in curves:
            if c is dome or c.get('closed'):
                continue
            for pt in [c['pts'][0], c['pts'][-1]]:
                if abs(pt[1] - dome_T) < 6 and dome_T not in invariant_temps:
                    invariant_temps.append(round(dome_T, 1))

    invariant_temps = sorted(set(invariant_temps))
    print(f"Candidate invariant temperatures: {invariant_temps}")

    # ── Step 4: Fine-grid re-computation near invariants ──
    if invariant_temps:
        print("Re-computing with fine grid near invariant temperatures...")
        fine_T_ranges = []
        for T_inv in invariant_temps:
            fine_T_ranges.extend(np.arange(
                max(T_min, T_inv - 15),
                min(T_max, T_inv + 15),
                0.5
            ))
        fine_T_ranges = sorted(set(fine_T_ranges))

        if fine_T_ranges:
            eq_fine = equilibrium(db, comps, phases,
                                 {v.X(el2): (0, 1, X_step),
                                  v.T: fine_T_ranges,
                                  v.P: 101325, v.N: 1})

            fine_T_arr = np.array(fine_T_ranges)
            fine_clean = extract_two_phase(eq_fine, el2, fine_T_arr, X_arr)

            # Merge fine data into coarse data
            for pair, fine_pts in fine_clean.items():
                if pair in clean:
                    # Merge, preferring fine data at overlapping temperatures
                    existing_Ts = {p[0] for p in clean[pair]}
                    for pt in fine_pts:
                        if pt[0] not in existing_Ts:
                            clean[pair].append(pt)
                    clean[pair].sort(key=lambda p: p[0])
                else:
                    clean[pair] = fine_pts

            # Rebuild curves with merged data
            print("Rebuilding curves with fine data...")
            curves = []
            for pair, pts in clean.items():
                T_vals = [p[0] for p in pts]
                x_low = [p[1] for p in pts]
                x_high = [p[2] for p in pts]
                p1_name, p2_name = pair

                if p1_name == p2_name:
                    left = smooth_curve(T_vals, x_low, 50)
                    right = smooth_curve(T_vals, x_high, 50)
                    dome = left + right[::-1]
                    curves.append({
                        'id': f'{p1_name}_misc_gap',
                        'name': 'miscibility gap',
                        'pts': dome,
                        'closed': True,
                        'pair': pair,
                    })
                else:
                    jump_idx = None
                    for i in range(len(x_low) - 1):
                        if abs(x_low[i + 1] - x_low[i]) > 0.1:
                            jump_idx = i
                            break

                    if jump_idx is not None:
                        curves.append({
                            'id': f'{p1_name}_{p2_name}_low_left',
                            'name': f'{p1_name} boundary',
                            'pts': smooth_curve(T_vals[:jump_idx + 1], x_low[:jump_idx + 1], 60),
                            'pair': pair,
                        })
                        curves.append({
                            'id': f'{p1_name}_{p2_name}_low_right',
                            'name': f'{p1_name} boundary',
                            'pts': smooth_curve(T_vals[jump_idx + 1:], x_low[jump_idx + 1:], 40),
                            'pair': pair,
                        })
                    else:
                        curves.append({
                            'id': f'{p1_name}_{p2_name}_low',
                            'name': f'{p1_name} boundary',
                            'pts': smooth_curve(T_vals, x_low,
                                               min(100, max(40, len(T_vals) // 2))),
                            'pair': pair,
                        })

                    curves.append({
                        'id': f'{p1_name}_{p2_name}_high',
                        'name': f'{p2_name} boundary',
                        'pts': smooth_curve(T_vals, x_high,
                                           min(100, max(40, len(T_vals) // 2))),
                        'pair': pair,
                    })

    # ── Step 5: Detect invariant points and classify reactions ──
    print("Detecting and classifying invariant reactions...")
    special_points = []
    isotherms = []

    # Re-collect endpoints after rebuild
    endpoints = []
    for c in curves:
        pts = c['pts']
        if len(pts) > 0:
            endpoints.append({'x': pts[0][0], 'T': pts[0][1], 'curve': c, 'end': 'start'})
            endpoints.append({'x': pts[-1][0], 'T': pts[-1][1], 'curve': c, 'end': 'end'})

    by_T = defaultdict(list)
    for ep in endpoints:
        T_round = round(ep['T'] / 4) * 4
        by_T[T_round].append(ep)

    for T_round, eps in sorted(by_T.items()):
        if len(eps) < 3:
            continue

        avg_T = round(float(np.mean([ep['T'] for ep in eps])), 1)
        xs = sorted(set(round(ep['x'], 5) for ep in eps))

        # Also interpolate all curves at this temperature to find full extent
        all_xs_at_T = list(xs)
        for c in curves:
            x_at_T = interp_curve(c['pts'], avg_T)
            if x_at_T is not None:
                all_xs_at_T.append(round(x_at_T, 5))
        all_xs_at_T = sorted(set(all_xs_at_T))

        # Classify the reaction by checking which phases are involved
        phases_above = set()
        phases_below = set()
        for ep in eps:
            pair = ep['curve'].get('pair', ('?', '?'))
            for pname in pair:
                if ep['end'] == 'start' and ep['curve']['pts'][0][1] >= avg_T - 2:
                    phases_below.update(pair)
                if ep['end'] == 'end' and ep['curve']['pts'][-1][1] >= avg_T - 2:
                    phases_below.update(pair)
                if ep['end'] == 'start' and ep['curve']['pts'][0][1] <= avg_T + 2:
                    phases_above.update(pair)
                if ep['end'] == 'end' and ep['curve']['pts'][-1][1] <= avg_T + 2:
                    phases_above.update(pair)

        has_liquid_above = any(classify_phase(p) == 'liquid' for p in phases_above)
        has_liquid_below = any(classify_phase(p) == 'liquid' for p in phases_below)
        solids_above = {p for p in phases_above if classify_phase(p) == 'solid'}
        solids_below = {p for p in phases_below if classify_phase(p) == 'solid'}

        # Classify
        if has_liquid_above and not has_liquid_below:
            if len(solids_below) >= 2:
                reaction_type = 'eutectic'
            else:
                reaction_type = 'eutectic'
        elif has_liquid_above and has_liquid_below:
            reaction_type = 'peritectic'
        elif not has_liquid_above and not has_liquid_below:
            if len(solids_below) >= 2:
                reaction_type = 'eutectoid'
            else:
                reaction_type = 'peritectoid'
        else:
            reaction_type = 'invariant'

        print(f"  {reaction_type} at T={avg_T}K, x={all_xs_at_T[0]:.4f}-{all_xs_at_T[-1]:.4f}")

        # Add special points at each endpoint composition
        for ep in eps:
            sp_name = f'{reaction_type} ({ep["curve"]["id"]})'
            special_points.append({
                'x': round(ep['x'], 5),
                'T': avg_T,
                'name': sp_name,
                'type': 'triple',
            })

        # Add isotherm spanning the full extent
        isotherms.append({
            'T': avg_T,
            'x_start': all_xs_at_T[0],
            'x_end': all_xs_at_T[-1],
            'name': reaction_type.capitalize(),
        })

    # ── Step 6: Dome junctions and critical points ──
    dome_curves_list = [c for c in curves if c.get('closed')]
    for dome in dome_curves_list:
        dome_T = dome['pts'][0][1]

        # Junction points where dome meets other curves
        for c in curves:
            if c is dome or c.get('closed'):
                continue
            c_end_T = c['pts'][-1][1]
            c_start_T = c['pts'][0][1]

            if abs(c_end_T - dome_T) < 6:
                jx = round((c['pts'][-1][0] + dome['pts'][0][0]) / 2, 5)
                jT = round((c_end_T + dome_T) / 2, 1)
                special_points.append({
                    'x': jx, 'T': jT,
                    'name': f'junction ({c["id"]})',
                    'type': 'junction',
                })
            if abs(c_start_T - dome_T) < 6:
                jx = round((c['pts'][0][0] + dome['pts'][-1][0]) / 2, 5)
                jT = round((c_start_T + dome_T) / 2, 1)
                special_points.append({
                    'x': jx, 'T': jT,
                    'name': f'junction ({c["id"]})',
                    'type': 'junction',
                })

        # Critical point: top of dome
        half = len(dome['pts']) // 2
        left_branch = dome['pts'][:half]
        right_branch = dome['pts'][half:]
        if left_branch and right_branch:
            top_l = max(left_branch, key=lambda p: p[1])
            top_r = max(right_branch, key=lambda p: p[1])
            special_points.append({
                'x': round((top_l[0] + top_r[0]) / 2, 5),
                'T': max(top_l[1], top_r[1]),
                'name': 'critical point',
                'type': 'critical',
            })

    # Melting points
    for c in curves:
        for pt in [c['pts'][0], c['pts'][-1]]:
            if pt[0] < 0.01 and pt[1] > T_min + 50:
                special_points.append({
                    'x': 0.0, 'T': round(pt[1], 1),
                    'name': f'{el1} melting point',
                    'type': 'melt',
                })
            if pt[0] > 0.99 and pt[1] > T_min + 50:
                special_points.append({
                    'x': 1.0, 'T': round(pt[1], 1),
                    'name': f'{el2} melting point',
                    'type': 'melt',
                })

    # Deduplicate special points
    deduped_sp = []
    for sp in special_points:
        is_dup = False
        for existing in deduped_sp:
            if abs(sp['x'] - existing['x']) < 0.005 and abs(sp['T'] - existing['T']) < 5:
                is_dup = True
                break
        if not is_dup:
            deduped_sp.append(sp)
    special_points = deduped_sp

    # ── Step 7: Snap curve endpoints to invariant points ──
    print("Snapping curve endpoints to invariant points...")
    SNAP_TOL_X = 0.03
    SNAP_TOL_T = 8

    for c in curves:
        if c.get('closed'):
            continue
        for end_idx, end_label in [(0, 'start'), (-1, 'end')]:
            pt = c['pts'][end_idx]
            best_sp = None
            best_dist = float('inf')
            for sp in special_points:
                dx = abs(pt[0] - sp['x'])
                dT = abs(pt[1] - sp['T'])
                if dx < SNAP_TOL_X and dT < SNAP_TOL_T:
                    dist = dx + dT / 100  # weighted distance
                    if dist < best_dist:
                        best_dist = dist
                        best_sp = sp
            if best_sp:
                c['pts'][end_idx] = [best_sp['x'], best_sp['T']]

    # ── Step 8: Auto-generate phase region labels ──
    print("Generating phase region labels...")
    labels = []

    # Sample a grid of test points and determine stable phases at each
    # Use the equilibrium result from the coarse grid
    label_points = []
    test_xs = np.arange(0.05, 0.96, 0.1)
    test_Ts = np.arange(T_min + 50, T_max - 50, 80)

    for tx in test_xs:
        for tT in test_Ts:
            # Determine which region this point is in by checking
            # which curves bound it (simple approach: check if point
            # is inside any two-phase region)
            in_two_phase = False
            region_name = None

            for c_pair, c_pts in clean.items():
                # Find T values that bracket tT
                for i in range(len(c_pts) - 1):
                    T0, x0_lo, x0_hi = c_pts[i]
                    T1, x1_lo, x1_hi = c_pts[i + 1]
                    if T0 <= tT <= T1:
                        frac = (tT - T0) / (T1 - T0) if T1 != T0 else 0
                        x_lo = x0_lo + frac * (x1_lo - x0_lo)
                        x_hi = x0_hi + frac * (x1_hi - x0_hi)
                        if x_lo <= tx <= x_hi:
                            in_two_phase = True
                            p1, p2 = c_pair
                            if p1 == p2:
                                region_name = f'{p1}1 + {p1}2'
                            else:
                                region_name = f'{p1} + {p2}'
                            break
                if in_two_phase:
                    break

            if not in_two_phase:
                # Single phase — determine which one
                # Find the nearest two-phase boundary to figure out which phase we're in
                # Simple heuristic: check what phase pair is closest and which side we're on
                pass  # Skip single-phase labels for now (harder to automate)

            if region_name:
                label_points.append((tx, tT, region_name))

    # Group nearby label points with same region name and pick centroid
    from itertools import groupby
    label_points.sort(key=lambda p: p[2])
    for name, group in groupby(label_points, key=lambda p: p[2]):
        pts = list(group)
        cx = float(np.mean([p[0] for p in pts]))
        cT = float(np.mean([p[1] for p in pts]))
        labels.append({
            'text': name,
            'x': round(cx, 3),
            'T': round(cT, 1),
            'style': 'region',
        })

    # ── Step 9: Output ──
    output_curves = []
    for c in curves:
        out = {
            'id': c['id'],
            'name': c['name'],
            'pts': c['pts'],
        }
        if c.get('closed'):
            out['closed'] = True
        output_curves.append(out)

    result = {
        'system': f'{el1}-{el2}',
        'reference': '',
        'special_points': special_points,
        'curves': output_curves,
        'isotherms': isotherms,
        'labels': labels,
    }

    print(f"\n{'='*60}")
    print(f"System: {result['system']}")
    print(f"Special points: {len(special_points)}")
    for sp in special_points:
        print(f"  {sp['type']:10s} {sp['name']:40s} x={sp['x']:.5f} T={sp['T']:.1f}")
    print(f"Curves: {len(output_curves)}")
    for c in output_curves:
        print(f"  {c['id']:30s} ({c['name']:20s}) {len(c['pts'])} pts "
              f"{'[closed]' if c.get('closed') else ''}")
    print(f"Isotherms: {len(isotherms)}")
    for iso in isotherms:
        print(f"  {iso['name']:20s} T={iso['T']:.1f} x={iso['x_start']:.5f}-{iso['x_end']:.5f}")
    print(f"Labels: {len(labels)}")
    for lbl in labels:
        print(f"  {lbl['text']:20s} at x={lbl['x']:.3f} T={lbl['T']:.1f}")

    return result


def main():
    parser = argparse.ArgumentParser(description='Compute binary phase diagram from TDB file')
    parser.add_argument('tdb', help='Path to TDB file')
    parser.add_argument('el1', help='Element 1 (e.g. AL)')
    parser.add_argument('el2', help='Element 2 (e.g. ZN)')
    parser.add_argument('--output', '-o', default=None, help='Output JSON path')
    parser.add_argument('--tmin', type=float, default=300, help='Min temperature (K)')
    parser.add_argument('--tmax', type=float, default=1000, help='Max temperature (K)')
    parser.add_argument('--tstep', type=float, default=2, help='Temperature step (K)')
    parser.add_argument('--xstep', type=float, default=0.005, help='Composition step')

    args = parser.parse_args()

    result = compute_binary(args.tdb, args.el1, args.el2,
                           T_min=args.tmin, T_max=args.tmax,
                           T_step=args.tstep, X_step=args.xstep)

    output_path = args.output or f'output/{args.el1.lower()}{args.el2.lower()}.json'
    with open(output_path, 'w') as f:
        json.dump(result, f, separators=(',', ':'))

    size = len(json.dumps(result, separators=(',', ':')))
    print(f"\nWritten to {output_path} ({size:,} bytes)")


if __name__ == '__main__':
    main()
