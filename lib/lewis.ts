// Lewisstructuur / elektronenformule voor 4 havo/vwo.
// Ondersteunt moleculen en ionen met één centraal atoom (+ diatomen),
// octetregel (duet voor H), en een duidelijke stapsgewijze uitleg.

import { parseFormula, ParseError } from "./parser";
import { getElement } from "./elements";

export class LewisError extends Error {}

/** Valentie-elektronen voor hoofdgroepelementen (groepnummer). */
const VALENCE: Record<string, number> = {
  H: 1,
  He: 2,
  Li: 1,
  Be: 2,
  B: 3,
  C: 4,
  N: 5,
  O: 6,
  F: 7,
  Ne: 8,
  Na: 1,
  Mg: 2,
  Al: 3,
  Si: 4,
  P: 5,
  S: 6,
  Cl: 7,
  Ar: 8,
  K: 1,
  Ca: 2,
  Ga: 3,
  Ge: 4,
  As: 5,
  Se: 6,
  Br: 7,
  Kr: 8,
  Rb: 1,
  Sr: 2,
  In: 3,
  Sn: 4,
  Sb: 5,
  Te: 6,
  I: 7,
  Xe: 8,
  Cs: 1,
  Ba: 2,
  Tl: 3,
  Pb: 4,
  Bi: 5,
  Po: 6,
  At: 7,
};

/** Pauling-elektronegativiteit (benadering) — lager = eerder centraal. */
const EN: Record<string, number> = {
  H: 2.2,
  Li: 0.98,
  Be: 1.57,
  B: 2.04,
  C: 2.55,
  N: 3.04,
  O: 3.44,
  F: 3.98,
  Na: 0.93,
  Mg: 1.31,
  Al: 1.61,
  Si: 1.9,
  P: 2.19,
  S: 2.58,
  Cl: 3.16,
  K: 0.82,
  Ca: 1.0,
  Ga: 1.81,
  Ge: 2.01,
  As: 2.18,
  Se: 2.55,
  Br: 2.96,
  Rb: 0.82,
  Sr: 0.95,
  In: 1.78,
  Sn: 1.96,
  Sb: 2.05,
  Te: 2.1,
  I: 2.66,
  Cs: 0.79,
  Ba: 0.89,
  Tl: 1.62,
  Pb: 2.33,
  Bi: 2.02,
};

export interface LewisAtomInfo {
  id: string;
  symbol: string;
  name: string;
  role: "central" | "terminal";
  valence: number;
  lonePairs: number;
  /** Som van bindingsordes rond dit atoom. */
  bondingPairs: number;
  formalCharge: number;
}

export interface LewisBondInfo {
  from: string;
  to: string;
  order: 1 | 2 | 3;
}

export interface LewisStep {
  n: number;
  title: string;
  body: string;
  calc?: string;
}

export interface LewisResult {
  formula: string;
  charge: number;
  totalValence: number;
  bondingElectrons: number;
  loneElectrons: number;
  atoms: LewisAtomInfo[];
  bonds: LewisBondInfo[];
  steps: LewisStep[];
  notes: string[];
  geometry: string;
  axen: string;
  ok: boolean;
}

function valenceOf(symbol: string): number {
  const v = VALENCE[symbol];
  if (v == null) {
    throw new LewisError(
      `${symbol} is een overgangsmetaal of niet ondersteund voor Lewisstructuren op dit niveau.`
    );
  }
  return v;
}

function enOf(symbol: string): number {
  return EN[symbol] ?? 2.5;
}

function wantedElectrons(symbol: string): number {
  return symbol === "H" ? 2 : 8;
}

function formalCharge(
  valence: number,
  lonePairs: number,
  bondingPairs: number
): number {
  // FC = valentie − niet-bindende e⁻ − ½ bindende e⁻
  return valence - 2 * lonePairs - bondingPairs;
}

function expandAtoms(counts: Record<string, number>): {
  symbol: string;
  name: string;
  valence: number;
}[] {
  const out: { symbol: string; name: string; valence: number }[] = [];
  for (const [symbol, n] of Object.entries(counts)) {
    const el = getElement(symbol);
    if (!el) throw new LewisError(`Onbekend element: "${symbol}".`);
    const v = valenceOf(symbol);
    for (let i = 0; i < n; i++) {
      out.push({ symbol, name: el.name, valence: v });
    }
  }
  return out;
}

function pickCentral(
  atoms: { symbol: string; valence: number }[]
): number {
  // Diatom: eerste niet-H, anders 0.
  if (atoms.length === 2) {
    const i = atoms.findIndex((a) => a.symbol !== "H");
    return i >= 0 ? i : 0;
  }

  // Preferentie: atoom dat 1× voorkomt, niet H, laagste EN.
  const counts: Record<string, number> = {};
  for (const a of atoms) counts[a.symbol] = (counts[a.symbol] ?? 0) + 1;

  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    if (a.symbol === "H") continue;
    // Lager = beter: EN, dan zeldzaamheid (1× = bonus), dan lager atoomnummer.
    const rarity = counts[a.symbol] === 1 ? 0 : 2;
    const score = enOf(a.symbol) * 10 + rarity * 100 + (getElement(a.symbol)?.z ?? 99);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best < 0) {
    throw new LewisError(
      "Geen geschikt centraal atoom gevonden. Waterstof alleen werkt niet als molecuul met meerdere atomen."
    );
  }
  return best;
}

function geometryLabel(
  terminals: number,
  loneOnCentral: number
): { axen: string; geometry: string } {
  const X = terminals;
  const E = loneOnCentral;
  const axen = E > 0 ? `AX${X}E${E}` : `AX${X}`;

  // VSEPR-hints (4 havo/vwo).
  let geometry = "zie bindingsparen + vrije elektronenparen";
  if (X === 1 && E === 0) geometry = "lineair (diatom)";
  else if (X === 2 && E === 0) geometry = "lineair";
  else if (X === 2 && E === 1) geometry = "hoekig (gebogen)";
  else if (X === 2 && E === 2) geometry = "hoekig (gebogen), zoals H₂O";
  else if (X === 2 && E === 3) geometry = "lineair";
  else if (X === 3 && E === 0) geometry = "vlak driehoekig";
  else if (X === 3 && E === 1) geometry = "trigonaal piramidaal, zoals NH₃";
  else if (X === 3 && E === 2) geometry = "T-vormig";
  else if (X === 4 && E === 0) geometry = "tetraëdrisch, zoals CH₄";
  else if (X === 4 && E === 1) geometry = "seesaw / wip";
  else if (X === 4 && E === 2) geometry = "vlak vierkant";
  else if (X === 5 && E === 0) geometry = "trigonaal bipiramidaal";
  else if (X === 6 && E === 0) geometry = "octaëdrisch";

  return { axen, geometry };
}

function chargeSup(charge: number): string {
  if (charge === 0) return "";
  if (charge === 1) return "⁺";
  if (charge === -1) return "⁻";
  const n = Math.abs(charge);
  const sign = charge > 0 ? "⁺" : "⁻";
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return (
    String(n)
      .split("")
      .map((d) => digits[Number(d)])
      .join("") + sign
  );
}

/**
 * Bouw een Lewisstructuur voor een formule + lading.
 */
export function buildLewis(formula: string, charge: number = 0): LewisResult {
  const trimmed = formula.trim().replace(/\s+/g, "");
  if (!trimmed) throw new LewisError("Voer een formule in.");
  if (/[.\u00B7·]/.test(trimmed)) {
    throw new LewisError(
      "Hydraten (zoals CuSO₄·5H₂O) hebben geen enkele Lewisstructuur — teken de ionen apart."
    );
  }
  if (!Number.isInteger(charge) || Math.abs(charge) > 4) {
    throw new LewisError("Lading moet een geheel getal tussen −4 en +4 zijn.");
  }

  let counts: Record<string, number>;
  try {
    counts = parseFormula(trimmed);
  } catch (e) {
    if (e instanceof ParseError) throw new LewisError(e.message);
    throw e;
  }

  const rawAtoms = expandAtoms(counts);
  const totalAtoms = rawAtoms.length;
  if (totalAtoms < 1) throw new LewisError("Geen atomen in de formule.");
  if (totalAtoms > 7) {
    throw new LewisError(
      "Deze tool is bedoeld voor kleine moleculen/ionen (max. ~7 atomen), zoals op 4 havo/vwo."
    );
  }

  const steps: LewisStep[] = [];
  const notes: string[] = [];

  // Stap 1 — valentie-elektronen
  let totalValence = 0;
  const valenceLines: string[] = [];
  for (const [sym, n] of Object.entries(counts)) {
    const v = valenceOf(sym);
    totalValence += v * n;
    valenceLines.push(
      `${n}× ${sym}: ${n} × ${v} = ${n * v}`
    );
  }
  if (charge !== 0) {
    totalValence -= charge; // + lading = minder e⁻; − lading = meer e⁻
  }
  if (totalValence < 0 || totalValence % 2 !== 0) {
    throw new LewisError(
      `Totaal aantal valentie-elektronen is ${totalValence} — dat klopt niet (moet ≥ 0 en even zijn). Controleer formule en lading.`
    );
  }

  steps.push({
    n: 1,
    title: "Tel de valentie-elektronen",
    body:
      "Elk hoofdgroepelement levert evenveel valentie-elektronen als zijn groepnummer. Bij een ion: trek de lading af (positief = elektronen kwijt, negatief = elektronen erbij).",
    calc:
      valenceLines.join(" · ") +
      (charge !== 0
        ? ` · lading ${charge > 0 ? "+" : ""}${charge} → ${
            charge > 0 ? "−" : "+"
          }${Math.abs(charge)} e⁻`
        : "") +
      ` → totaal ${totalValence} e⁻`,
  });

  // Diatom of polyatomisch met één centraal atoom (stervorm).
  const centralIdx = pickCentral(rawAtoms);
  const centralSym = rawAtoms[centralIdx].symbol;

  // Ketens zoals C₂H₄: het centrale-element komt ≥2× voor én er is een ander element.
  // O₃ e.d. (alleen één elementsoort) blijven wel toegestaan.
  if ((counts[centralSym] ?? 0) >= 2 && totalAtoms > 2) {
    const distinct = Object.keys(counts).length;
    if (distinct > 1) {
      throw new LewisError(
        `Moleculen met een keten van meerdere ${centralSym}-atomen (zoals C₂H₄) ondersteunen we nog niet. Probeer stoffen met één centraal atoom: H₂O, NH₃, CO₂, SO₂, …`
      );
    }
  }

  const atomInfos: LewisAtomInfo[] = rawAtoms.map((a, i) => ({
    id: `a${i}`,
    symbol: a.symbol,
    name: a.name,
    role: i === centralIdx ? "central" : "terminal",
    valence: a.valence,
    lonePairs: 0,
    bondingPairs: 0,
    formalCharge: 0,
  }));

  const terminals = atomInfos.filter((a) => a.role === "terminal");
  const central = atomInfos[centralIdx];

  steps.push({
    n: 2,
    title: "Kies het centrale atoom",
    body:
      totalAtoms === 2
        ? "Bij twee atomen teken je ze naast elkaar; het minst elektronegatieve (behalve H) staat vaak ‘centraal’ in de uitleg."
        : "Het centrale atoom is meestal het minst elektronegatieve atoom (H is altijd eindstandig). Vaak is dat het atoom dat maar één keer voorkomt.",
    calc: `Centraal: ${central.symbol} (${central.name}). Eindstandig: ${
      terminals.map((t) => t.symbol).join(", ") || "—"
    }.`,
  });

  // Stap 3 — skelet met enkelvoudige bindingen
  const bonds: LewisBondInfo[] = terminals.map((t) => ({
    from: central.id,
    to: t.id,
    order: 1 as 1,
  }));
  let used = 2 * bonds.length; // elektronen in bindingen

  steps.push({
    n: 3,
    title: "Teken het skelet (enkelvoudige bindingen)",
    body: "Verbind elk eindstandig atoom met één gemeenschappelijk elektronenpaar aan het centrale atoom. Elke streep = 2 elektronen.",
    calc: `${bonds.length} binding(en) × 2 e⁻ = ${used} e⁻ gebruikt. Resterend: ${
      totalValence - used
    } e⁻.`,
  });

  // Stap 4 — vul octets van eindstandige atomen
  let remaining = totalValence - used;
  for (const t of terminals) {
    const already = 2; // één enkelvoudige binding
    const need = wantedElectrons(t.symbol) - already;
    const pairs = Math.max(0, need / 2);
    const electrons = pairs * 2;
    if (electrons > remaining) {
      throw new LewisError(
        `Niet genoeg elektronen om het octet/duet van ${t.symbol} te vullen. Controleer formule en lading.`
      );
    }
    t.lonePairs = pairs;
    remaining -= electrons;
  }

  steps.push({
    n: 4,
    title: "Vul de eindstandige atomen af",
    body: "Geef elk eindstandig atoom een octet (8 e⁻), behalve H (duet = 2 e⁻). Elektronen die niet in een binding zitten, teken je als vrije elektronenparen (punten).",
    calc:
      terminals
        .map((t) => {
          const n = t.lonePairs;
          const label =
            n === 1 ? "1 vrij paar" : n === 0 ? "geen vrij paar" : `${n} vrije paren`;
          return `${t.symbol}: ${label}`;
        })
        .join(" · ") + ` → nog ${remaining} e⁻ over.`,
  });

  // Stap 5 — rest op centraal atoom
  if (remaining < 0 || remaining % 2 !== 0) {
    throw new LewisError(
      "Er blijven een oneven of negatief aantal elektronen over — formule/lading klopt waarschijnlijk niet."
    );
  }
  central.lonePairs = remaining / 2;
  remaining = 0;

  steps.push({
    n: 5,
    title: "Plaats overgebleven elektronen op het centrale atoom",
    body: "Alles wat over is, komt als vrije elektronenparen op het centrale atoom.",
    calc: (() => {
      const n = central.lonePairs;
      const label =
        n === 1 ? "1 vrij paar" : n === 0 ? "geen vrij paar" : `${n} vrije paren`;
      return `${central.symbol}: ${label}.`;
    })(),
  });

  // Stap 6 — meervoudige bindingen als centraal octet tekort komt
  // Be en B mogen een onvolledig octet houden (klassiek op 4 havo/vwo).
  const allowIncomplete = central.symbol === "B" || central.symbol === "Be";

  function electronCount(a: LewisAtomInfo): number {
    const bondOrders = bonds
      .filter((b) => b.from === a.id || b.to === a.id)
      .reduce((s, b) => s + b.order, 0);
    return 2 * a.lonePairs + 2 * bondOrders;
  }

  let upgraded = 0;
  if (!allowIncomplete) {
    while (electronCount(central) < wantedElectrons(central.symbol)) {
      // Spreid meervoudige bindingen: kies eerst het eindstandige atoom
      // met de laagste bindingsorde (anders wordt CO₂ C≡O / C–O i.p.v. O=C=O).
      const candidates = terminals
        .filter((t) => t.lonePairs >= 1 && t.symbol !== "H")
        .filter((t) => {
          const bond = bonds.find((b) => b.to === t.id)!;
          return bond.order < 3;
        })
        .sort((a, b) => {
          const oa = bonds.find((x) => x.to === a.id)!.order;
          const ob = bonds.find((x) => x.to === b.id)!.order;
          return oa - ob;
        });
      const donor = candidates[0];
      if (!donor) break;
      const bond = bonds.find((b) => b.to === donor.id)!;
      donor.lonePairs -= 1;
      bond.order = (bond.order + 1) as 1 | 2 | 3;
      upgraded += 1;
    }
  }

  if (upgraded > 0) {
    steps.push({
      n: 6,
      title: "Maak meervoudige bindingen (indien nodig)",
      body: "Heeft het centrale atoom nog geen octet? Verplaats dan een vrij elektronenpaar van een eindstandig atoom naar een extra binding (dubbel of drievoudig).",
      calc: `${upgraded} extra bindingspaar${upgraded === 1 ? "" : "en"} gevormd. Bindingen: ${bonds
        .map((b) => {
          const t = atomInfos.find((a) => a.id === b.to)!;
          const label =
            b.order === 1 ? "enkel" : b.order === 2 ? "dubbel" : "drie";
          return `${central.symbol}–${t.symbol} (${label})`;
        })
        .join(", ")}.`,
    });
  } else {
    steps.push({
      n: 6,
      title: "Controleer het octet van het centrale atoom",
      body: allowIncomplete
        ? `${central.symbol} mag een onvolledig octet hebben — je hoeft geen extra bindingen te forceren.`
        : "Het centrale atoom heeft al genoeg elektronen, of kan geen extra binding meer maken. Ga door naar de formele ladingen.",
      calc: `${central.symbol} heeft ${electronCount(central)} elektronen rond zich.`,
    });
  }

  // Incomplete octet / expanded octet notes
  const centralElectrons = electronCount(central);
  if (centralElectrons < wantedElectrons(central.symbol)) {
    notes.push(
      `${central.symbol} heeft een onvolledig octet (${centralElectrons} e⁻). Dat komt voor bij o.a. Be en B (elektronendeficiënt).`
    );
  }
  if (centralElectrons > 8 && central.symbol !== "H") {
    notes.push(
      `${central.symbol} heeft een uitgebreid octet (${centralElectrons} e⁻). Atomen vanaf periode 3 (P, S, Cl, …) kunnen dat.`
    );
  }

  // Bonding / lone totals + formal charges
  for (const a of atomInfos) {
    const bondOrders = bonds
      .filter((b) => b.from === a.id || b.to === a.id)
      .reduce((s, b) => s + b.order, 0);
    a.bondingPairs = bondOrders;
    a.formalCharge = formalCharge(a.valence, a.lonePairs, bondOrders);
  }

  const bondingElectrons = bonds.reduce((s, b) => s + 2 * b.order, 0);
  const loneElectrons = atomInfos.reduce((s, a) => s + 2 * a.lonePairs, 0);

  steps.push({
    n: 7,
    title: "Formele ladingen controleren",
    body: "Formele lading = valentie-elektronen − vrije elektronen − ½ bindingselektronen. De som moet gelijk zijn aan de totale lading van het deeltje. Streef naar zo klein mogelijke formele ladingen.",
    calc: atomInfos
      .map((a) => {
        const fc =
          a.formalCharge === 0
            ? "0"
            : a.formalCharge > 0
            ? `+${a.formalCharge}`
            : `${a.formalCharge}`;
        return `${a.symbol}: ${fc}`;
      })
      .join(" · ") +
      ` (som = ${atomInfos.reduce((s, a) => s + a.formalCharge, 0)}, ionlading = ${charge}).`,
  });

  // Resonantie-hint bij meerdere equivalente dubbele bindingen mogelijk
  const doubleTerminals = bonds.filter((b) => b.order >= 2).map((b) => {
    return atomInfos.find((a) => a.id === b.to)!.symbol;
  });
  if (doubleTerminals.length === 1) {
    const sym = doubleTerminals[0];
    const same = terminals.filter((t) => t.symbol === sym);
    if (same.length >= 2) {
      notes.push(
        `Er zijn ${same.length} equivalente ${sym}-atomen: teken eventueel resonantiestructuren (de ‘echte’ structuur is een mengvorm).`
      );
    }
  }

  const { axen, geometry } = geometryLabel(
    terminals.length,
    central.lonePairs
  );

  steps.push({
    n: 8,
    title: "Vorm / VSEPR (extra)",
    body: "Het aantal bindingsparen (X) en vrije elektronenparen (E) op het centrale atoom bepaalt de ruimtelijke vorm.",
    calc: `${axen} → ${geometry}.`,
  });

  // Sanity: elektronenbalans
  if (bondingElectrons + loneElectrons !== totalValence) {
    throw new LewisError(
      `Interne fout: elektronen tellen niet op (${bondingElectrons} + ${loneElectrons} ≠ ${totalValence}).`
    );
  }

  const fcSum = atomInfos.reduce((s, a) => s + a.formalCharge, 0);
  if (fcSum !== charge) {
    notes.push(
      `Let op: som van formele ladingen (${fcSum}) wijkt af van de ionlading (${charge}). Controleer of een andere resonantievorm beter past.`
    );
  }

  return {
    formula: trimmed,
    charge,
    totalValence,
    bondingElectrons,
    loneElectrons,
    atoms: atomInfos,
    bonds,
    steps,
    notes,
    geometry,
    axen,
    ok: true,
  };
}

export function formulaWithCharge(formula: string, charge: number): string {
  return formula + chargeSup(charge);
}

export function bondLabel(order: number): string {
  if (order === 1) return "enkelvoudig";
  if (order === 2) return "dubbel";
  if (order === 3) return "drievoudig";
  return `${order}-voudig`;
}
