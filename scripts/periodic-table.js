/* ==========================================================================
   Periodic table element selector for phase diagram lookup
   ========================================================================== */

const ELEMENTS = [
  // [symbol, name, number, row, col]
  ['H','Hydrogen',1,0,0],['He','Helium',2,0,17],
  ['Li','Lithium',3,1,0],['Be','Beryllium',4,1,1],
  ['B','Boron',5,1,12],['C','Carbon',6,1,13],['N','Nitrogen',7,1,14],['O','Oxygen',8,1,15],['F','Fluorine',9,1,16],['Ne','Neon',10,1,17],
  ['Na','Sodium',11,2,0],['Mg','Magnesium',12,2,1],
  ['Al','Aluminium',13,2,12],['Si','Silicon',14,2,13],['P','Phosphorus',15,2,14],['S','Sulfur',16,2,15],['Cl','Chlorine',17,2,16],['Ar','Argon',18,2,17],
  ['K','Potassium',19,3,0],['Ca','Calcium',20,3,1],
  ['Sc','Scandium',21,3,2],['Ti','Titanium',22,3,3],['V','Vanadium',23,3,4],['Cr','Chromium',24,3,5],['Mn','Manganese',25,3,6],['Fe','Iron',26,3,7],['Co','Cobalt',27,3,8],['Ni','Nickel',28,3,9],['Cu','Copper',29,3,10],['Zn','Zinc',30,3,11],
  ['Ga','Gallium',31,3,12],['Ge','Germanium',32,3,13],['As','Arsenic',33,3,14],['Se','Selenium',34,3,15],['Br','Bromine',35,3,16],['Kr','Krypton',36,3,17],
  ['Rb','Rubidium',37,4,0],['Sr','Strontium',38,4,1],
  ['Y','Yttrium',39,4,2],['Zr','Zirconium',40,4,3],['Nb','Niobium',41,4,4],['Mo','Molybdenum',42,4,5],['Tc','Technetium',43,4,6],['Ru','Ruthenium',44,4,7],['Rh','Rhodium',45,4,8],['Pd','Palladium',46,4,9],['Ag','Silver',47,4,10],['Cd','Cadmium',48,4,11],
  ['In','Indium',49,4,12],['Sn','Tin',50,4,13],['Sb','Antimony',51,4,14],['Te','Tellurium',52,4,15],['I','Iodine',53,4,16],['Xe','Xenon',54,4,17],
  ['Cs','Caesium',55,5,0],['Ba','Barium',56,5,1],
  ['La','Lanthanum',57,5,2],['Hf','Hafnium',72,5,3],['Ta','Tantalum',73,5,4],['W','Tungsten',74,5,5],['Re','Rhenium',75,5,6],['Os','Osmium',76,5,7],['Ir','Iridium',77,5,8],['Pt','Platinum',78,5,9],['Au','Gold',79,5,10],['Hg','Mercury',80,5,11],
  ['Tl','Thallium',81,5,12],['Pb','Lead',82,5,13],['Bi','Bismuth',83,5,14],['Po','Polonium',84,5,15],['At','Astatine',85,5,16],['Rn','Radon',86,5,17],
  // Lanthanides (row 8, offset)
  ['Ce','Cerium',58,8,3],['Pr','Praseodymium',59,8,4],['Nd','Neodymium',60,8,5],['Pm','Promethium',61,8,6],['Sm','Samarium',62,8,7],['Eu','Europium',63,8,8],['Gd','Gadolinium',64,8,9],['Tb','Terbium',65,8,10],['Dy','Dysprosium',66,8,11],['Ho','Holmium',67,8,12],['Er','Erbium',68,8,13],['Tm','Thulium',69,8,14],['Yb','Ytterbium',70,8,15],['Lu','Lutetium',71,8,16],
];

// Noble gases and other elements unlikely to have binary phase diagrams
const EXCLUDED = new Set(['He','Ne','Ar','Kr','Xe','Rn','Tc','Pm','Po','At']);

/**
 * Build and mount the periodic table selector.
 *
 * @param {HTMLElement} container — element to mount into
 * @param {Set<string>} availablePairs — set of "El1-El2" keys (alphabetical)
 * @param {Function} onSelect — called with (el1, el2) when a pair is selected
 */
export function createPeriodicTable(container, availablePairs, onSelect) {
  let selected = null;

  function pairKey(a, b) {
    return [a, b].sort().join('-');
  }

  function hasPartner(sym) {
    for (const key of availablePairs) {
      const [a, b] = key.split('-');
      if (a === sym || b === sym) return true;
    }
    return false;
  }

  function partnersOf(sym) {
    const partners = new Set();
    for (const key of availablePairs) {
      const [a, b] = key.split('-');
      if (a === sym) partners.add(b);
      if (b === sym) partners.add(a);
    }
    return partners;
  }

  function render() {
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'pt-grid';

    const partners = selected ? partnersOf(selected) : null;

    for (const [sym, name, num, row, col] of ELEMENTS) {
      const cell = document.createElement('button');
      cell.className = 'pt-cell';
      cell.style.gridRow = row + 1;
      cell.style.gridColumn = col + 1;
      cell.innerHTML = `<span class="pt-num">${num}</span><span class="pt-sym">${sym}</span>`;
      cell.title = name;

      const excluded = EXCLUDED.has(sym);
      const hasData = hasPartner(sym);

      if (sym === selected) {
        cell.classList.add('pt-selected');
      } else if (selected && partners.has(sym)) {
        cell.classList.add('pt-available');
      } else if (selected) {
        cell.classList.add('pt-unavailable');
      } else if (!hasData || excluded) {
        cell.classList.add('pt-unavailable');
      }

      cell.addEventListener('click', () => {
        if (excluded) return;

        if (sym === selected) {
          // Deselect
          selected = null;
          render();
          return;
        }

        if (selected) {
          // Second selection — pass in click order (first=left, second=right)
          const key = pairKey(selected, sym);
          if (availablePairs.has(key)) {
            onSelect(selected, sym);
          }
          selected = null;
          render();
          return;
        }

        // First selection
        if (hasData) {
          selected = sym;
          render();
        }
      });

      grid.appendChild(cell);
    }

    // Lanthanide separator marker
    const sep = document.createElement('div');
    sep.className = 'pt-sep';
    sep.style.gridRow = '9';
    sep.style.gridColumn = '3';
    sep.textContent = '*';
    grid.appendChild(sep);

    const marker = document.createElement('div');
    marker.className = 'pt-sep';
    marker.style.gridRow = '6';
    marker.style.gridColumn = '3';
    marker.textContent = '*';

    container.appendChild(grid);
  }

  render();
  return { deselect() { selected = null; render(); } };
}
