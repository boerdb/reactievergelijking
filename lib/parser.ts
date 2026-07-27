// Parser voor scheikundige reactievergelijkingen.
// Ondersteunt:
//   - elementen zoals H, O, Na, Cl, Fe
//   - subscript-getallen zoals H2O, CO2, H2SO4
//   - coëfficiënten zoals 2 H2O, 3 CO2
//   - haakjes zoals Ca(OH)2, Fe2(SO4)3
//   - hydraten met '.' zoals CuSO4.5H2O
//   - pijlen: ->, =>, →, =, <-
//   - plus-tekens: + of • (midden-punt) tussen deeltjes
//
// Niet ondersteund (bewust): ladingen (Na+), elektronen (e-), isotopen,
// aggregatietoestanden (s/l/g/aq). Dit is een tool voor het kloppend maken
// van vergelijkingen op atoomniveau.

export type Counts = Record<string, number>;

export interface ParsedSide {
  particles: { coefficient: number; formula: string; counts: Counts }[];
  totals: Counts;
}

export interface ParsedEquation {
  left: ParsedSide;
  right: ParsedSide;
  arrow: string;
  raw: string;
}

export class ParseError extends Error {}

const ARROW_RE = /->|=>|→|<-|=/;
const ELEMENT_RE = /^[A-Z][a-z]?$/;

// Elementaire namen uit het periodiek systeem (genoeg voor huiswerk).
const KNOWN_ELEMENTS = new Set<string>([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
  "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
  "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
  "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
  "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
  "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
  "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th",
  "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf",
]);

function addCounts(target: Counts, source: Counts, factor: number) {
  for (const [el, n] of Object.entries(source)) {
    target[el] = (target[el] ?? 0) + n * factor;
  }
}

// Parse een enkele formule (zonder coëfficiënt) naar een element-telling.
// Bijv. "H2O" -> { H: 2, O: 1 }, "Ca(OH)2" -> { Ca: 1, O: 2, H: 2 }
function parseFormula(formula: string): Counts {
  const counts: Counts = {};
  let i = 0;

  function parseGroup(depth: number): Counts {
    const local: Counts = {};
    while (i < formula.length) {
      const ch = formula[i];
      if (ch === "(") {
        i++;
        const inner = parseGroup(depth + 1);
        // na de groep volgt optioneel een getal
        const num = readNumber();
        addCounts(local, inner, num);
      } else if (ch === ")") {
        if (depth === 0) throw new ParseError(`Onverwachte ')' op positie ${i}.`);
        i++;
        return local;
      } else if (/[A-Z]/.test(ch)) {
        const element = readElement();
        if (!KNOWN_ELEMENTS.has(element)) {
          throw new ParseError(`Onbekend element: "${element}".`);
        }
        const num = readNumber();
        local[element] = (local[element] ?? 0) + num;
      } else if (ch === ".") {
        // hydraat-scheidingspunt, bijv. CuSO4.5H2O
        i++;
        // wat volgt is een coëfficiënt + formule
        const num = readNumber();
        const inner = parseGroup(depth);
        addCounts(local, inner, num);
      } else if (ch === " " || ch === "\t") {
        i++; // witruimte binnen formule negeren
      } else {
        throw new ParseError(
          `Onverwacht teken '${ch}' op positie ${i} in formule "${formula}".`
        );
      }
    }
    if (depth !== 0) throw new ParseError(`Niet gesloten '(' in "${formula}".`);
    return local;
  }

  function readElement(): string {
    let el = formula[i++];
    if (i < formula.length && /[a-z]/.test(formula[i])) {
      el += formula[i++];
    }
    return el;
  }

  function readNumber(): number {
    let s = "";
    while (i < formula.length && /[0-9]/.test(formula[i])) {
      s += formula[i++];
    }
    return s === "" ? 1 : parseInt(s, 10);
  }

  const result = parseGroup(0);
  if (Object.keys(result).length === 0) {
    throw new ParseError(`Lege formule: "${formula}".`);
  }
  return result;
}

// Splitst één kant (string) in losse deeltjes en telt op.
function parseSide(side: string): ParsedSide {
  const particles: ParsedSide["particles"] = [];
  const totals: Counts = {};

  // Splits op + (of midden-punt •). We moeten wel oppassen dat we niet
  // per ongeluk binnen formules splitsen — maar + of • komen daar niet voor.
  const tokens = side
    .split(/[+•]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (tokens.length === 0) {
    throw new ParseError("Eén kant van de vergelijking is leeg.");
  }

  for (const token of tokens) {
    // Coëfficiënt is een eventueel getal aan het begin.
    const m = token.match(/^(\d+)\s*(.*)$/);
    let coefficient = 1;
    let formula = token;
    if (m) {
      coefficient = parseInt(m[1], 10);
      formula = m[2].trim();
    }
    if (formula.length === 0) {
      throw new ParseError(`Ongeldig deeltje: "${token}".`);
    }
    const counts = parseFormula(formula);
    particles.push({ coefficient, formula, counts });
    addCounts(totals, counts, coefficient);
  }

  return { particles, totals };
}

export function parseEquation(input: string): ParsedEquation {
  const raw = input.trim();
  if (raw.length === 0) throw new ParseError("De vergelijking is leeg.");

  // Normaliseer pijl: vervang alle varianten door één herkenbaar patroon.
  const arrowMatch = raw.match(ARROW_RE);
  if (!arrowMatch) {
    throw new ParseError(
      "Geen pijl gevonden. Gebruik -> of => of → tussen de twee kanten."
    );
  }
  const arrow = arrowMatch[0];
  const [leftStr, rightStr] = raw.split(ARROW_RE, 2);
  if (!rightStr) throw new ParseError("Er staat niets rechts van de pijl.");

  const left = parseSide(leftStr);
  const right = parseSide(rightStr);

  return { left, right, arrow, raw };
}

// Vergelijk twee kanten en geef per element een status.
export interface ElementStatus {
  element: string;
  left: number;
  right: number;
  balanced: boolean;
  diff: number; // right - left
}

export function compareSides(parsed: ParsedEquation): ElementStatus[] {
  const elements = new Set<string>([
    ...Object.keys(parsed.left.totals),
    ...Object.keys(parsed.right.totals),
  ]);
  const result: ElementStatus[] = [];
  for (const el of [...elements].sort()) {
    const l = parsed.left.totals[el] ?? 0;
    const r = parsed.right.totals[el] ?? 0;
    result.push({
      element: el,
      left: l,
      right: r,
      balanced: l === r,
      diff: r - l,
    });
  }
  return result;
}

export function isBalanced(parsed: ParsedEquation): boolean {
  const statuses = compareSides(parsed);
  return statuses.every((s) => s.balanced);
}

// Zet een formule-string om in React-knooppunten met echte subscripts.
// "H2O" -> [H, <sub>2</sub>, O]
// We renderen dit in de component, hier geven we alleen stukjes terug.
export type FormulaPiece =
  | { type: "text"; value: string }
  | { type: "sub"; value: string };

export function tokenizeFormula(formula: string): FormulaPiece[] {
  const pieces: FormulaPiece[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (/[A-Z()]/.test(ch)) {
      // element of haakje-openen — als tekst
      let el = ch;
      i++;
      if (i < formula.length && /[a-z]/.test(formula[i])) {
        el += formula[i];
        i++;
      }
      pieces.push({ type: "text", value: el });
    } else if (/[a-z]/.test(ch)) {
      // tweede letter van element (alleen als losse letter, zou niet moeten)
      pieces.push({ type: "text", value: ch });
      i++;
    } else if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < formula.length && /[0-9]/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      pieces.push({ type: "sub", value: num });
    } else if (ch === ".") {
      pieces.push({ type: "text", value: "·" });
      i++;
    } else if (ch === ")") {
      pieces.push({ type: "text", value: ch });
      i++;
    } else {
      pieces.push({ type: "text", value: ch });
      i++;
    }
  }
  return pieces;
}

// Maak een platte-tekst-versie met Unicode-subscripts voor kopiëren.
const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

export function toUnicodeSubscript(formula: string): string {
  let out = "";
  for (const ch of formula) {
    if (/[0-9]/.test(ch)) out += SUBSCRIPT_MAP[ch];
    else if (ch === ".") out += "·";
    else out += ch;
  }
  return out;
}

export function equationToUnicode(parsed: ParsedEquation): string {
  const renderSide = (side: ParsedSide) =>
    side.particles
      .map((p) =>
        (p.coefficient === 1 ? "" : String(p.coefficient) + " ") +
        toUnicodeSubscript(p.formula)
      )
      .join(" + ");

  return `${renderSide(parsed.left)} → ${renderSide(parsed.right)}`;
}

// Maak een HTML-versie voor rich-text kopiëren (Word herkent dit).
export function equationToHtml(parsed: ParsedEquation): string {
  const renderSide = (side: ParsedSide) =>
    side.particles
      .map((p) => {
        const coef = p.coefficient === 1 ? "" : `${p.coefficient} `;
        const pieces = tokenizeFormula(p.formula)
          .map((piece) =>
            piece.type === "sub"
              ? `<sub>${piece.value}</sub>`
              : piece.value
          )
          .join("");
        return coef + pieces;
      })
      .join(" + ");

  return `${renderSide(parsed.left)} &rarr; ${renderSide(parsed.right)}`;
}
