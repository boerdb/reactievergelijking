// Berekeningen voor molecuulmassa, protonen, neutronen en elektronen.
// Hergebruikt de parser om de element-telling uit een formule te halen.

import { parseEquation, ParseError, type ParsedEquation } from "./parser";
import { getElement } from "./elements";

export interface ElementBreakdown {
  symbol: string;
  name: string;
  z: number; // atoomnummer
  count: number; // aantal atomen in de formule
  massPerAtom: number;
  massTotal: number;
  neutronsPerAtom: number; // massgetal - Z
  neutronsTotal: number;
}

export interface CalcResult {
  formula: string;
  mass: number; // molecuulmassa in u
  protons: number; // totaal aantal protonen
  neutrons: number; // totaal aantal neutronen
  electrons: number; // totaal aantal elektronen (neutral = protons)
  charge: number; // lading (0 = neutraal)
  breakdown: ElementBreakdown[];
}

export class CalcError extends Error {}

// Parse één formule (geen pijl, geen +). Geeft element-telling.
function parseSingleFormula(formula: string): Record<string, number> {
  // Wikkel in een dummy-vergelijking "X -> formule" zodat de parser het snapt.
  // We gebruiken alleen de rechterkant.
  const dummy = `X -> ${formula}`;
  let parsed: ParsedEquation;
  try {
    parsed = parseEquation(dummy);
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message);
    throw e;
  }
  // De rechterkant kan meerdere deeltjes bevatten als er + in staat — dat is
  // voor een enkele formule niet de bedoeling. We tellen alles op.
  const totals = parsed.right.totals;
  // Verwijder het dummy-element X.
  delete totals["X"];
  return totals;
}

export function calculate(
  formula: string,
  charge: number = 0
): CalcResult {
  const trimmed = formula.trim();
  if (trimmed.length === 0) throw new CalcError("Voer een formule in.");

  const counts = parseSingleFormula(trimmed);

  const breakdown: ElementBreakdown[] = [];
  let mass = 0;
  let protons = 0;
  let neutrons = 0;

  for (const [symbol, count] of Object.entries(counts)) {
    const el = getElement(symbol);
    if (!el) throw new CalcError(`Onbekend element: "${symbol}".`);
    const massNumber = Math.round(el.mass); // massagetal A
    const neutronsPerAtom = massNumber - el.z;
    breakdown.push({
      symbol,
      name: el.name,
      z: el.z,
      count,
      massPerAtom: el.mass,
      massTotal: el.mass * count,
      neutronsPerAtom,
      neutronsTotal: neutronsPerAtom * count,
    });
    mass += el.mass * count;
    protons += el.z * count;
    neutrons += neutronsPerAtom * count;
  }

  // Sorteer op atoomnummer voor een logische volgorde.
  breakdown.sort((a, b) => a.z - b.z);

  // Elektronen: neutraal = protonen; positieve lading = minder elektronen.
  const electrons = protons - charge;

  return {
    formula: trimmed,
    mass,
    protons,
    neutrons,
    electrons,
    charge,
    breakdown,
  };
}

// Format een getal met maximaal 3 decimalen, zonder onnodige nullen.
export function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}
