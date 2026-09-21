// Ionen-database en ontleden van zoutformules (4 havo / vwo).
// Een neutraal zout = kation(en) + anion(en). Kristalwater (.nH2O) hoort
// bij de molaire massa, maar is geen ion in de ontbindingsvergelijking.

import { parseFormula, ParseError, toUnicodeSubscript } from "./parser";
import { calculate } from "./calc";

export interface IonDef {
  formula: string;
  charge: number; // positief = kation, negatief = anion
  name: string;
}

/** Veelvoorkomende ionen uit BINAS / lesboek — langste formules eerst matchen. */
export const POLYATOMIC_ANIONS: IonDef[] = [
  { formula: "Cr2O7", charge: -2, name: "dichromaat" },
  { formula: "S2O3", charge: -2, name: "thiosulfaat" },
  { formula: "MnO4", charge: -1, name: "permanganaat" },
  { formula: "ClO4", charge: -1, name: "perchloraat" },
  { formula: "ClO3", charge: -1, name: "chloraat" },
  { formula: "HCO3", charge: -1, name: "waterstofcarbonaat" },
  { formula: "HSO4", charge: -1, name: "waterstofsulfaat" },
  { formula: "HPO4", charge: -2, name: "waterstoffosfaat" },
  { formula: "CH3COO", charge: -1, name: "acetaat" },
  { formula: "SO4", charge: -2, name: "sulfaat" },
  { formula: "SO3", charge: -2, name: "sulfiet" },
  { formula: "CO3", charge: -2, name: "carbonaat" },
  { formula: "CrO4", charge: -2, name: "chromaat" },
  { formula: "NO3", charge: -1, name: "nitraat" },
  { formula: "NO2", charge: -1, name: "nitriet" },
  { formula: "PO4", charge: -3, name: "fosfaat" },
  { formula: "PO3", charge: -3, name: "fosfiet" },
  { formula: "OH", charge: -1, name: "hydroxide" },
  { formula: "CN", charge: -1, name: "cyanide" },
];

export const MONATOMIC_ANIONS: IonDef[] = [
  { formula: "F", charge: -1, name: "fluoride" },
  { formula: "Cl", charge: -1, name: "chloride" },
  { formula: "Br", charge: -1, name: "bromide" },
  { formula: "I", charge: -1, name: "jodide" },
  { formula: "O", charge: -2, name: "oxide" },
  { formula: "S", charge: -2, name: "sulfide" },
  { formula: "N", charge: -3, name: "nitride" },
];

export const FIXED_CATIONS: IonDef[] = [
  { formula: "NH4", charge: 1, name: "ammonium" },
  { formula: "H", charge: 1, name: "waterstof" },
  { formula: "Li", charge: 1, name: "lithium" },
  { formula: "Na", charge: 1, name: "natrium" },
  { formula: "K", charge: 1, name: "kalium" },
  { formula: "Rb", charge: 1, name: "rubidium" },
  { formula: "Cs", charge: 1, name: "cesium" },
  { formula: "Ag", charge: 1, name: "zilver" },
  { formula: "Mg", charge: 2, name: "magnesium" },
  { formula: "Ca", charge: 2, name: "calcium" },
  { formula: "Sr", charge: 2, name: "strontium" },
  { formula: "Ba", charge: 2, name: "barium" },
  { formula: "Zn", charge: 2, name: "zink" },
  { formula: "Cd", charge: 2, name: "cadmium" },
  { formula: "Al", charge: 3, name: "aluminium" },
];

/** Metalen waarvan de lading uit de formule volgt (Fe²⁺/Fe³⁺, Cu⁺/Cu²⁺, …). */
const VARIABLE_CATIONS = new Set([
  "Fe",
  "Cu",
  "Sn",
  "Pb",
  "Hg",
  "Co",
  "Ni",
  "Mn",
  "Cr",
  "Au",
  "Pt",
  "Ti",
  "V",
]);

const ALL_ANIONS = [...POLYATOMIC_ANIONS, ...MONATOMIC_ANIONS];

export class SaltError extends Error {}

export interface SaltIon {
  formula: string;
  pretty: string;
  charge: number;
  count: number; // aantal per formule-eenheid zout
  name: string;
  M: number; // g/mol van één ion (zonder lading)
}

export interface DecomposedSalt {
  formula: string; // inclusief hydraat, zoals ingevoerd
  anhydrous: string;
  hydrateWater: number; // n in ·nH₂O
  pretty: string;
  M: number; // molaire massa van het (gehydrateerde) zout
  cation: SaltIon;
  anion: SaltIon;
  dissolution: string; // Unicode ontbindingsvergelijking
  dissolutionHtml: string;
}

function chargeSup(charge: number): string {
  if (charge === 0) return "";
  const abs = Math.abs(charge);
  const sign = charge > 0 ? "⁺" : "⁻";
  if (abs === 1) return sign;
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const n = String(abs)
    .split("")
    .map((d) => digits[Number(d)])
    .join("");
  return n + sign;
}

export function formatIon(formula: string, charge: number): string {
  return toUnicodeSubscript(formula) + chargeSup(charge);
}

function ionMass(formula: string): number {
  return calculate(formula).mass;
}

function lookUpAnion(formula: string): IonDef | undefined {
  return ALL_ANIONS.find((a) => a.formula === formula);
}

function lookUpFixedCation(formula: string): IonDef | undefined {
  return FIXED_CATIONS.find((c) => c.formula === formula);
}

/** Strip kristalwater: CuSO4.5H2O / CuSO4·5H2O → { anhydrous, water: 5 } */
export function splitHydrate(raw: string): {
  anhydrous: string;
  water: number;
} {
  const s = raw.trim().replace(/\s+/g, "").replace(/·/g, ".");
  const m = s.match(/^(.+?)\.(\d*)H2O$/i);
  if (!m) return { anhydrous: s, water: 0 };
  const n = m[2] === "" ? 1 : Number(m[2]);
  if (!Number.isFinite(n) || n < 0) {
    throw new SaltError("Ongeldig kristalwater in de formule.");
  }
  return { anhydrous: m[1], water: n };
}

interface Piece {
  formula: string;
  count: number;
}

/**
 * Ontleed een zoutformule in kation + anion.
 * Ondersteunt: NaCl, CaCl2, Na2SO4, Ca(OH)2, Al2(SO4)3, (NH4)2SO4, NH4NO3, CuSO4.5H2O.
 */
export function parseSaltParts(anhydrous: string): {
  cation: Piece;
  anion: Piece;
} {
  const f = anhydrous.trim().replace(/\s+/g, "");
  if (!f) throw new SaltError("Voer een zoutformule in.");

  // Patroon A: (KATION)n(ANION)m  of  (KATION)nANION  of  KATION(ANION)m
  // We zoeken eerst een anion-groep aan het eind.

  // 1) eindigt op (ANION)count
  const parenAnion = f.match(/^(.+)\(([A-Za-z0-9]+)\)(\d*)$/);
  if (parenAnion) {
    const anionFormula = parenAnion[2];
    if (lookUpAnion(anionFormula)) {
      const anionCount = parenAnion[3] === "" ? 1 : Number(parenAnion[3]);
      const cat = parseLeadingIon(parenAnion[1]);
      return {
        cation: cat,
        anion: { formula: anionFormula, count: anionCount },
      };
    }
  }

  // 2) begint met (KATION)count — rest is anion
  const parenCation = f.match(/^\(([A-Za-z0-9]+)\)(\d*)(.+)$/);
  if (parenCation) {
    const catFormula = parenCation[1];
    const catCount = parenCation[2] === "" ? 1 : Number(parenCation[2]);
    const rest = parenCation[3];
    const anion = parseTrailingAnion(rest);
    if (anion) {
      return {
        cation: { formula: catFormula, count: catCount },
        anion,
      };
    }
  }

  // 3) anion zonder haakjes aan het eind (langste match)
  const anion = parseTrailingAnion(f);
  if (!anion) {
    throw new SaltError(
      `Geen bekend anion herkend in "${f}". Probeer bijv. NaCl, CaCl2 of Na2SO4.`
    );
  }
  const catPart = f.slice(0, f.length - anion.matchedLength);
  if (!catPart) {
    throw new SaltError(`Geen kation gevonden vóór ${anion.formula}.`);
  }
  const cation = parseLeadingIon(catPart);
  return { cation, anion: { formula: anion.formula, count: anion.count } };
}

function parseTrailingAnion(
  s: string
): (Piece & { matchedLength: number }) | null {
  // (ANION)n al afgehandeld; hier ANIONn
  for (const a of ALL_ANIONS) {
    if (s.endsWith(a.formula)) {
      // mag niet midden in een element eindigen — formule is exact suffix
      const before = s.slice(0, s.length - a.formula.length);
      // als er een cijfer direct vóór het anion staat dat bij het anion hoort:
      // Na2SO4 → SO4 zonder cijfer; CaCl2 → Cl + 2
      // We matchen eerst polyatomic zonder trailing digit op anion,
      // daarna monatomic mét optionele count.
      return {
        formula: a.formula,
        count: 1,
        matchedLength: a.formula.length,
      };
    }
    // anion + subscript: Cl2, SO4 is already exact; Br2 etc.
    const re = new RegExp(`(${escapeRe(a.formula)})(\\d+)$`);
    const m = s.match(re);
    if (m && s.endsWith(m[0])) {
      // Alleen monatomic anions krijgen een subscript > 1 typisch (Cl2).
      // Polyatomic: SO42 zou fout zijn — we staan count toe.
      return {
        formula: a.formula,
        count: Number(m[2]),
        matchedLength: m[0].length,
      };
    }
  }
  return null;
}

function parseLeadingIon(s: string): Piece {
  // (NH4) of NH4 of Na2 of Fe of Al2
  const paren = s.match(/^\(([A-Za-z0-9]+)\)(\d*)$/);
  if (paren) {
    return {
      formula: paren[1],
      count: paren[2] === "" ? 1 : Number(paren[2]),
    };
  }
  // NH4 zonder haakjes (alleen als exact of met count)
  if (s === "NH4" || s.startsWith("NH4")) {
    const m = s.match(/^NH4(\d*)$/);
    if (m) return { formula: "NH4", count: m[1] === "" ? 1 : Number(m[1]) };
  }
  // Element + optionele count: Na2, Ca, Fe, Al2
  const el = s.match(/^([A-Z][a-z]?)(\d*)$/);
  if (el) {
    return { formula: el[1], count: el[2] === "" ? 1 : Number(el[2]) };
  }
  throw new SaltError(`Kan kation niet lezen: "${s}".`);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveCharges(
  cationFormula: string,
  cationCount: number,
  anionFormula: string,
  anionCount: number
): { cationCharge: number; anionCharge: number; cationName: string; anionName: string } {
  const anionDef = lookUpAnion(anionFormula);
  if (!anionDef) {
    throw new SaltError(`Onbekend anion: ${anionFormula}.`);
  }
  const anionCharge = anionDef.charge;
  const anionName = anionDef.name;

  const fixed = lookUpFixedCation(cationFormula);
  if (fixed) {
    const totalCat = fixed.charge * cationCount;
    const totalAn = Math.abs(anionCharge) * anionCount;
    if (totalCat !== totalAn) {
      throw new SaltError(
        `Ladingen kloppen niet: ${cationCount}×${formatIon(cationFormula, fixed.charge)} en ${anionCount}×${formatIon(anionFormula, anionCharge)} geven geen neutraal zout.`
      );
    }
    return {
      cationCharge: fixed.charge,
      anionCharge,
      cationName: fixed.name,
      anionName,
    };
  }

  if (!VARIABLE_CATIONS.has(cationFormula) && cationFormula !== "H") {
    // Probeer of het een bekend element is — lading afleiden uit neutraliteit
    try {
      parseFormula(cationFormula);
    } catch (e) {
      if (e instanceof ParseError) throw new SaltError(e.message);
      throw e;
    }
  }

  // Lading kation afleiden: neutraal zout
  const totalAnion = Math.abs(anionCharge) * anionCount;
  if (cationCount <= 0 || totalAnion % cationCount !== 0) {
    throw new SaltError(
      `Kan de lading van ${cationFormula} niet bepalen uit deze formule.`
    );
  }
  const cationCharge = totalAnion / cationCount;
  if (cationCharge < 1 || cationCharge > 7) {
    throw new SaltError(
      `Ongeldige lading +${cationCharge} voor ${cationFormula}. Controleer de formule.`
    );
  }

  return {
    cationCharge,
    anionCharge,
    cationName: cationFormula,
    anionName,
  };
}

/** Volledige ontleding van een zoutformule. */
export function decomposeSalt(rawFormula: string): DecomposedSalt {
  const trimmed = rawFormula.trim();
  if (!trimmed) throw new SaltError("Voer een zoutformule in.");

  const { anhydrous, water } = splitHydrate(trimmed);
  const { cation: catPiece, anion: anPiece } = parseSaltParts(anhydrous);
  const charges = resolveCharges(
    catPiece.formula,
    catPiece.count,
    anPiece.formula,
    anPiece.count
  );

  // Valideer dat de formules parseerbaar zijn (elementen bestaan)
  try {
    parseFormula(anhydrous.replace(/\(/g, "").replace(/\)/g, ""));
  } catch {
    // detailvalidatie via calculate op stukken
  }
  try {
    calculate(catPiece.formula);
    calculate(anPiece.formula);
  } catch (e) {
    throw new SaltError(e instanceof Error ? e.message : "Onbekend element.");
  }

  const M_anhydrous = calculate(anhydrous).mass;
  const M_water = water > 0 ? calculate("H2O").mass * water : 0;
  const M = M_anhydrous + M_water;

  const cation: SaltIon = {
    formula: catPiece.formula,
    pretty: formatIon(catPiece.formula, charges.cationCharge),
    charge: charges.cationCharge,
    count: catPiece.count,
    name: charges.cationName,
    M: ionMass(catPiece.formula),
  };
  const anion: SaltIon = {
    formula: anPiece.formula,
    pretty: formatIon(anPiece.formula, charges.anionCharge),
    charge: charges.anionCharge,
    count: anPiece.count,
    name: charges.anionName,
    M: ionMass(anPiece.formula),
  };

  const saltPretty =
    toUnicodeSubscript(anhydrous) +
    (water > 0 ? `·${water === 1 ? "" : water}H₂O` : "");

  const left = saltPretty;
  const rightParts: string[] = [];
  if (cation.count !== 1) rightParts.push(`${cation.count} ${cation.pretty}`);
  else rightParts.push(cation.pretty);
  if (anion.count !== 1) rightParts.push(`${anion.count} ${anion.pretty}`);
  else rightParts.push(anion.pretty);
  if (water > 0) {
    rightParts.push(water === 1 ? "H₂O" : `${water} H₂O`);
  }
  const dissolution = `${left} → ${rightParts.join(" + ")}`;

  const dissolutionHtml = dissolution
    .replace(/→/g, "&rarr;")
    .replace(/₂/g, "<sub>2</sub>")
    .replace(/₃/g, "<sub>3</sub>")
    .replace(/₄/g, "<sub>4</sub>")
    .replace(/₅/g, "<sub>5</sub>")
    .replace(/₆/g, "<sub>6</sub>")
    .replace(/₇/g, "<sub>7</sub>")
    .replace(/₈/g, "<sub>8</sub>")
    .replace(/₉/g, "<sub>9</sub>")
    .replace(/₀/g, "<sub>0</sub>");

  return {
    formula: trimmed,
    anhydrous,
    hydrateWater: water,
    pretty: saltPretty,
    M,
    cation,
    anion,
    dissolution,
    dissolutionHtml,
  };
}
