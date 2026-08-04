// Berekeningen voor molecuulmassa, protonen, neutronen en elektronen.
// Hergebruikt de parser om de element-telling uit een formule te halen.

import { parseFormula, ParseError } from "./parser";
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

export function calculate(
  formula: string,
  charge: number = 0
): CalcResult {
  const trimmed = formula.trim();
  if (trimmed.length === 0) throw new CalcError("Voer een formule in.");

  let counts: Record<string, number>;
  try {
    counts = parseFormula(trimmed);
  } catch (e) {
    if (e instanceof ParseError) throw new CalcError(e.message);
    throw e;
  }

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

// Massapercentage per element in de formule.
export function massPercentages(result: CalcResult): { symbol: string; name: string; pct: number }[] {
  return result.breakdown.map((b) => ({
    symbol: b.symbol,
    name: b.name,
    pct: result.mass > 0 ? (b.massTotal / result.mass) * 100 : 0,
  }));
}

// Mol-berekeningen.
// - molFromMass: gegeven massa (g) → aantal mol
// - massFromMol: gegeven aantal mol → massa (g)
// - particlesFromMol: gegeven mol → aantal deeltjes (met Avogadro)
// - molFromParticles: gegeven aantal deeltjes → mol
export const AVOGADRO = 6.02214076e23;

export function molFromMass(massGram: number, molarMass: number): number {
  if (molarMass <= 0) return 0;
  return massGram / molarMass;
}

export function massFromMol(mol: number, molarMass: number): number {
  return mol * molarMass;
}

export function particlesFromMol(mol: number): number {
  return mol * AVOGADRO;
}

export function molFromParticles(particles: number): number {
  return particles / AVOGADRO;
}
