#!/usr/bin/env node
/**
 * Add practice problems to all thermodynamics articles.
 * Run: node scripts/add-problems.js
 */
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('content/modules/thermodynamics.json', 'utf-8'));

function findArticle(id) { return data.articles.find(a => a.id === id); }
function hasProblem(art) { return art.body.some(b => b[0] === 'problem'); }

const problems = {
  'what-thermodynamics-is-for': [
    ['problem', 'Diamond is thermodynamically unstable with respect to graphite at room temperature and pressure. Why does diamond exist at all? What does thermodynamics tell you, and what does it not tell you, about this situation?', [
      ['p', 'Thermodynamics tells you that graphite has a lower Gibbs free energy than diamond at 298 K and 1 atm, so the transformation diamond $\\to$ graphite is spontaneous ($\\Delta G < 0$). What thermodynamics does not tell you is the rate. The transformation requires breaking and reforming every C-C bond in the structure, and the activation energy for this is enormous. At room temperature, the kinetic barrier is insurmountable. Diamond is metastable: thermodynamically unfavoured but kinetically trapped.'],
    ]],
  ],
  'systems-boundaries-state': [
    ['problem', 'You place a sealed steel container of nitrogen gas into a furnace at 800 K. Is the gas an open, closed, or isolated system? What are its degrees of freedom (how many state variables must you specify to define its state)?', [
      ['p', 'The steel container prevents matter exchange but allows energy exchange (heat conducts through the walls). The gas is a <strong>closed</strong> system. It is a single-component ($c = 1$), single-phase ($p = 1$) system. The number of intensive degrees of freedom is $F = c - p + 2 = 1 - 1 + 2 = 2$. You need to specify two independent variables (e.g., $T$ and $P$, or $T$ and $V_m$) to fully define the state. Once the gas equilibrates, $T = 800$ K (set by the furnace), and if you know the amount of gas and the container volume, $P$ is determined by the equation of state.'],
    ]],
  ],
  'work-and-heat': [
    ['problem', 'One mole of an ideal gas at 500 K expands isothermally and reversibly from 10 L to 30 L. Calculate the work done by the gas.', [
      ['p', 'For a reversible isothermal expansion of an ideal gas:'],
      ['eq', 'W = nRT \\ln\\frac{V_2}{V_1} = 1 \\times 8.314 \\times 500 \\times \\ln\\frac{30}{10}'],
      ['eq', 'W = 4157 \\times 1.099 = 4567 \\text{ J} \\approx 4.57 \\text{ kJ}'],
      ['p', 'Since the gas is ideal and the process is isothermal, $\\Delta U = 0$ (internal energy depends only on $T$). By the first law, $Q = W = 4.57$ kJ: all the heat absorbed is converted to work.'],
    ]],
  ],
  'first-law-enthalpy': [
    ['problem', 'Using the formation enthalpies $\\Delta H_f^\\circ$(CO) = $-110.5$ kJ/mol and $\\Delta H_f^\\circ$(CO$_2$) = $-393.5$ kJ/mol, calculate $\\Delta H^\\circ$ for the water-gas shift reaction: CO + H$_2$O $\\to$ CO$_2$ + H$_2$. The formation enthalpy of liquid water is $-285.8$ kJ/mol.', [
      ['p', 'By Hess\'s law:'],
      ['eq', '\\Delta H^\\circ = \\sum \\Delta H_f^\\circ(\\text{products}) - \\sum \\Delta H_f^\\circ(\\text{reactants})'],
      ['eq', '\\Delta H^\\circ = [-393.5 + 0] - [-110.5 + (-285.8)]'],
      ['eq', '\\Delta H^\\circ = -393.5 - (-396.3) = +2.8 \\text{ kJ/mol}'],
      ['p', 'The reaction is very slightly endothermic. Note that $\\Delta H_f^\\circ$(H$_2$) = 0 by convention (it is an element in its standard state). The small $\\Delta H$ means the equilibrium is sensitive to temperature: a modest increase in $T$ shifts the equilibrium toward products (Le Chatelier).'],
    ]],
  ],
  'carnot-cycle': [
    ['problem', 'A geothermal power plant operates between a hot reservoir at 150°C and rejects heat to a river at 15°C. What is the maximum theoretical efficiency? If the plant generates 5 MW of electrical power at 12% actual efficiency, how much heat must it extract from the geothermal source per second?', [
      ['p', '$T_H = 150 + 273 = 423$ K, $T_C = 15 + 273 = 288$ K.'],
      ['eq', '\\eta_{\\text{Carnot}} = 1 - \\frac{288}{423} = 0.319 = 31.9\\%'],
      ['p', 'At 12% actual efficiency, the heat input needed for 5 MW output:'],
      ['eq', 'Q_H = \\frac{W}{\\eta} = \\frac{5 \\times 10^6}{0.12} = 41.7 \\text{ MW}'],
      ['p', 'The plant extracts 41.7 MW of thermal energy from the ground and rejects 36.7 MW to the river. The low temperature of the hot source severely limits the Carnot ceiling. This is why geothermal plants have low efficiencies compared to fossil fuel plants.'],
    ]],
  ],
  'entropy-second-law': [
    ['problem', 'One mole of copper is heated from 300 K to 1000 K at constant pressure. Taking $C_P = 24.4$ J/(mol$\\cdot$K) as constant, calculate the entropy change.', [
      ['eq', '\\Delta S = \\int_{300}^{1000} \\frac{C_P}{T} \\, dT = C_P \\ln\\frac{T_2}{T_1}'],
      ['eq', '\\Delta S = 24.4 \\times \\ln\\frac{1000}{300} = 24.4 \\times 1.204 = 29.4 \\text{ J/(mol}\\cdot\\text{K)}'],
      ['p', 'Note: $C_P$ is not truly constant over this range (it increases with temperature), so this is an approximation. A more accurate calculation would integrate the measured $C_P(T)$ data. The logarithmic dependence means that most of the entropy gain occurs at lower temperatures, where each joule of heat has a larger entropic effect.'],
    ]],
  ],
  'temperature-zeroth-law': [
    ['problem', 'The activation energy for vacancy diffusion in copper is about 0.7 eV. At what temperature does $k_BT$ equal 10% of this barrier? What fraction of atoms have enough thermal energy to overcome the barrier at 300 K and at 1000 K?', [
      ['p', '$k_BT = 0.1 \\times 0.7 = 0.07$ eV when $T = 0.07 / (8.617 \\times 10^{-5}) = 812$ K.'],
      ['p', 'The fraction of atoms with energy $\\geq E_a$ is approximately $\\exp(-E_a / k_BT)$:'],
      ['eq', '\\text{At 300 K: } \\exp\\left(-\\frac{0.7}{0.02585}\\right) = \\exp(-27.1) = 1.8 \\times 10^{-12}'],
      ['eq', '\\text{At 1000 K: } \\exp\\left(-\\frac{0.7}{0.08617}\\right) = \\exp(-8.12) = 3.0 \\times 10^{-4}'],
      ['p', 'At 300 K, essentially no atoms can diffuse. At 1000 K, about 1 in 3000 can. This is why diffusion in solids requires elevated temperatures.'],
    ]],
  ],
  'third-law-absolute-zero': [
    ['problem', 'The standard molar entropy of aluminium at 298 K is 28.3 J/(mol$\\cdot$K). Aluminium melts at 933 K with $\\Delta H_{\\text{fus}} = 10.7$ kJ/mol. Estimate the molar entropy of liquid aluminium at 933 K, assuming $C_P = 24.4$ J/(mol$\\cdot$K) for the solid (constant).', [
      ['p', 'Entropy of solid Al at 933 K:'],
      ['eq', 'S_{\\text{solid}}(933) = S^\\circ(298) + C_P \\ln\\frac{933}{298} = 28.3 + 24.4 \\times 1.142 = 56.2 \\text{ J/(mol}\\cdot\\text{K)}'],
      ['p', 'Entropy of fusion:'],
      ['eq', '\\Delta S_{\\text{fus}} = \\frac{\\Delta H_{\\text{fus}}}{T_m} = \\frac{10700}{933} = 11.5 \\text{ J/(mol}\\cdot\\text{K)}'],
      ['p', 'Total entropy of liquid Al at 933 K:'],
      ['eq', 'S_{\\text{liquid}}(933) = 56.2 + 11.5 = 67.7 \\text{ J/(mol}\\cdot\\text{K)}'],
    ]],
  ],
  'free-energy': [
    ['problem', 'The standard free energy of formation of water vapour at 298 K is $\\Delta G_f^\\circ = -228.6$ kJ/mol. Calculate the equilibrium constant for the reaction 2H$_2$(g) + O$_2$(g) $\\to$ 2H$_2$O(g) at 298 K. Comment on the result.', [
      ['eq', '\\Delta G^\\circ = 2 \\times (-228.6) = -457.2 \\text{ kJ/mol}'],
      ['eq', 'K = \\exp\\left(-\\frac{\\Delta G^\\circ}{RT}\\right) = \\exp\\left(\\frac{457200}{8.314 \\times 298}\\right) = \\exp(184.5)'],
      ['p', '$K \\approx 10^{80}$. This is an astronomically large number: the reaction overwhelmingly favours products at equilibrium. Thermodynamics says hydrogen and oxygen should react completely. The fact that a H$_2$/O$_2$ mixture can sit indefinitely at room temperature without reacting is entirely a kinetic effect (the activation energy is high). A spark provides the activation energy, and the reaction proceeds explosively.'],
    ]],
  ],
  'chemical-potential': [
    ['problem', 'In a binary A-B ideal solution, show that $\\mu_A$ decreases as $x_B$ increases. What is the physical interpretation?', [
      ['p', 'For an ideal solution: $\\mu_A = \\mu_A^* + RT \\ln x_A = \\mu_A^* + RT \\ln(1 - x_B)$.'],
      ['p', 'Since $0 < x_B < 1$, we have $0 < (1 - x_B) < 1$, so $\\ln(1 - x_B) < 0$, and $\\mu_A < \\mu_A^*$. As $x_B$ increases, $x_A$ decreases, $\\ln x_A$ becomes more negative, and $\\mu_A$ drops.'],
      ['p', 'Physically: diluting A reduces its chemical potential. A atoms in a mixture are more \"content\" (lower $\\mu$) than in the pure state, because the mixture has higher configurational entropy. This is why mixing tends to be spontaneous. It is also why boiling points are elevated and freezing points are depressed in solutions: the lower $\\mu$ of the solvent stabilises the liquid phase.'],
    ]],
  ],
  'activity-real-behaviour': [
    ['problem', 'In liquid Fe-Ni alloys at 1600°C, the activity coefficient of Ni follows approximately $\\ln \\gamma_{\\text{Ni}} = -1.3(1 - x_{\\text{Ni}})^2$ (Raoultian standard state). Calculate the activity of Ni in an alloy with $x_{\\text{Ni}} = 0.3$.', [
      ['eq', '\\ln \\gamma_{\\text{Ni}} = -1.3 \\times (1 - 0.3)^2 = -1.3 \\times 0.49 = -0.637'],
      ['eq', '\\gamma_{\\text{Ni}} = e^{-0.637} = 0.529'],
      ['eq', 'a_{\\text{Ni}} = \\gamma_{\\text{Ni}} \\times x_{\\text{Ni}} = 0.529 \\times 0.3 = 0.159'],
      ['p', 'The activity (0.159) is about half the mole fraction (0.3). This is a negative deviation: $\\gamma < 1$, meaning Fe-Ni interactions are more favourable than Ni-Ni interactions. Ni is more stable in the iron solution than ideal mixing would predict. This is consistent with the strong compound-forming tendency of the Fe-Ni system (FeNi$_3$ is an ordered phase).'],
    ]],
  ],
  'solutions-mixing': [
    ['problem', 'Calculate $\\Delta G_{\\text{mix}}$ for an ideal binary solution at $x_B = 0.3$ and $T = 1200$ K. Compare this to the thermal energy $RT$.', [
      ['eq', '\\Delta G_{\\text{mix}} = RT[x_A \\ln x_A + x_B \\ln x_B]'],
      ['eq', '= 8.314 \\times 1200 \\times [0.7 \\ln 0.7 + 0.3 \\ln 0.3]'],
      ['eq', '= 9977 \\times [0.7 \\times (-0.357) + 0.3 \\times (-1.204)]'],
      ['eq', '= 9977 \\times [-0.250 + (-0.361)] = 9977 \\times (-0.611) = -6096 \\text{ J/mol}'],
      ['p', '$RT = 9977$ J/mol. So $|\\Delta G_{\\text{mix}}| \\approx 0.61 \\times RT$. The entropic driving force for mixing is a substantial fraction of the thermal energy scale. An enthalpy of mixing would need to exceed about 6 kJ/mol (positive) to overcome this and cause phase separation at this temperature.'],
    ]],
  ],
  'regular-solution-model': [
    ['problem', 'A binary alloy has $\\Omega = 20$ kJ/mol. Calculate the critical temperature $T_c$ for the miscibility gap. At 800 K, is the equimolar alloy stable as a single phase or does it phase-separate?', [
      ['eq', 'T_c = \\frac{\\Omega}{2R} = \\frac{20000}{2 \\times 8.314} = 1203 \\text{ K}'],
      ['p', 'At 800 K ($T/T_c = 0.665$), we are below $T_c$, so the equimolar alloy is inside the miscibility gap and will phase-separate into an A-rich and a B-rich phase.'],
      ['p', 'Check: $\\partial^2 \\Delta G_{\\text{mix}} / \\partial x^2$ at $x = 0.5$:'],
      ['eq', '-2\\Omega + 4RT = -40000 + 4 \\times 8.314 \\times 800 = -40000 + 26605 = -13395 < 0'],
      ['p', 'The second derivative is negative: the free energy curve is concave down at $x = 0.5$. The alloy is not just metastable but actually inside the spinodal. It will decompose spontaneously without needing nucleation.'],
    ]],
  ],
  'phase-equilibria-gibbs-phase-rule': [
    ['problem', 'In the Fe-C binary phase diagram at 1 atm, the eutectoid reaction occurs at 727°C: austenite ($\\gamma$) $\\to$ ferrite ($\\alpha$) + cementite (Fe$_3$C). How many degrees of freedom does the system have at the eutectoid point?', [
      ['p', '$C = 2$ (Fe and C), $P = 3$ ($\\gamma$, $\\alpha$, Fe$_3$C). At fixed pressure:'],
      ['eq', 'F = C - P + 1 = 2 - 3 + 1 = 0'],
      ['p', 'Zero degrees of freedom. The temperature (727°C) and the compositions of all three phases are completely fixed. You cannot change any variable without losing one of the three phases. This is why the eutectoid appears as a single horizontal line on the phase diagram, not as a region.'],
    ]],
  ],
  'free-energy-to-phase-diagrams': [
    ['problem', 'In a Cu-Ni alloy at 1500 K, the liquidus composition is $x_{\\text{Ni}}^L = 0.38$ and the solidus is $x_{\\text{Ni}}^S = 0.58$. An alloy with overall composition $x_{\\text{Ni}} = 0.45$ is cooled slowly through this temperature. What phases are present, what are their compositions, and what fraction of the alloy is solid?', [
      ['p', 'At 1500 K, $x_0 = 0.45$ lies between $x^L = 0.38$ and $x^S = 0.58$. The alloy is in the two-phase (L + S) region. The liquid has composition $x_{\\text{Ni}} = 0.38$ and the solid has composition $x_{\\text{Ni}} = 0.58$.'],
      ['p', 'By the lever rule:'],
      ['eq', 'f^S = \\frac{x_0 - x^L}{x^S - x^L} = \\frac{0.45 - 0.38}{0.58 - 0.38} = \\frac{0.07}{0.20} = 0.35'],
      ['p', 'The alloy is 35% solid and 65% liquid. The solid is Ni-enriched relative to the overall composition; the liquid is Cu-enriched. As cooling continues, both compositions shift along the solidus and liquidus curves, and the fraction of solid increases until the last liquid disappears at the solidus temperature for $x_0 = 0.45$.'],
    ]],
  ],
  'ellingham-diagrams': [
    ['problem', 'The Ellingham line for aluminium oxidation is approximately $\\Delta G^\\circ = -1120 + 0.21T$ kJ per mol O$_2$. At 1000 K, what is the equilibrium oxygen partial pressure in atm?', [
      ['eq', '\\Delta G^\\circ(1000) = -1120 + 0.21 \\times 1000 = -910 \\text{ kJ/mol O}_2'],
      ['eq', '\\ln P_{\\text{O}_2} = \\frac{\\Delta G^\\circ}{RT} = \\frac{-910000}{8.314 \\times 1000} = -109.4'],
      ['eq', 'P_{\\text{O}_2} = e^{-109.4} \\approx 10^{-47.5} \\text{ atm}'],
      ['p', 'This is an extraordinarily small number. Any detectable amount of oxygen will oxidise aluminium at 1000 K. Alumina is one of the most stable oxides, which is why aluminium is so difficult to produce from its ore and why the protective Al$_2$O$_3$ film on aluminium surfaces is so robust.'],
    ]],
  ],
  'predominance-diagrams': [
    ['problem', 'On the Pourbaix diagram for iron at 25°C, the Fe/Fe$^{2+}$ boundary is at approximately $E = -0.62$ V (vs SHE), independent of pH. Explain why this boundary is horizontal, and calculate the equilibrium concentration of Fe$^{2+}$ if the potential is $-0.44$ V (the standard electrode potential for Fe).', [
      ['p', 'The reaction Fe $\\to$ Fe$^{2+}$ + 2e$^-$ involves no H$^+$ or OH$^-$, so the equilibrium potential does not depend on pH. The boundary is horizontal.'],
      ['p', 'The Nernst equation at 25°C:'],
      ['eq', 'E = E^\\circ + \\frac{0.0257}{2} \\ln [\\text{Fe}^{2+}]'],
      ['p', 'The boundary is drawn at $[\\text{Fe}^{2+}] = 10^{-6}$ M (the conventional threshold for \"significant corrosion\"):'],
      ['eq', 'E = -0.44 + \\frac{0.0257}{2} \\ln(10^{-6}) = -0.44 + 0.01285 \\times (-13.82) = -0.44 - 0.178 = -0.618 \\text{ V}'],
      ['p', 'This matches the $-0.62$ V boundary on the diagram. At $E = -0.44$ V (the standard potential), $[\\text{Fe}^{2+}] = 1$ M: the iron is actively corroding and dissolving at a high rate.'],
    ]],
  ],
};

let count = 0;
for (const [id, probs] of Object.entries(problems)) {
  const art = findArticle(id);
  if (!art) { console.log('SKIP: ' + id + ' not found'); continue; }
  if (hasProblem(art)) { console.log('SKIP: ' + id + ' already has problems'); continue; }
  art.body.push(...probs);
  count += probs.length;
  console.log('Added ' + probs.length + ' problem(s) to ' + id);
}

fs.writeFileSync('content/modules/thermodynamics.json', JSON.stringify(data, null, 2) + '\n');
console.log('Done. ' + count + ' problems added total.');
