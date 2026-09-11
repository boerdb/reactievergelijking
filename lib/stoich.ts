// Molverhouding: van stof A naar stof B via de coëfficiënten van de reactie.
// Optioneel daarna het massapercentage van de gevraagde stof in een mengsel.
// Alleen rekenwerk en opmaak — geen UI.

import { calculate } from "./calc";
import {
  parseEquation,
  isBalanced,
  toUnicodeSubscript,
  type ParsedEquation,
} from "./parser";
import { parseNL, toPlain, toPretty } from "./mol";

export type QtyKind = "gram" | "mol";
export type Side = "left" | "right";

export interface Species {
  id: string;
  side: Side;
  index: number;
  coefficient: number;
  formula: string;
  pretty: string;
  M: number;
}

export interface StoichStep {
  id: string;
  phase: "naar" | "verhouding" | "vanuit" | "mengsel";
  title: string;
  formula: string;
  filled: string;
  answer: string;
  note: string;
}

export interface SpeciesValues {
  id: string;
  n: number;
  m: number;
}

export interface StoichInput {
  equation: string;
  givenId: string | null;
  givenKind: QtyKind;
  givenRaw: string;
  wantId: string | null;
  mixtureRaw: string;
  sig: number;
}

export interface StoichSolution {
  parsed: ParsedEquation | null;
  balanced: boolean;
  species: Species[];
  error: string | null;
  warn: string | null;
  nGiven: number;
  nWant: number;
  mGiven: number;
  mWant: number;
  massPct: number | null;
  mixture: number;
  values: SpeciesValues[];
  steps: StoichStep[];
  given: Species | null;
  want: Species | null;
}

export function emptySolution(
  extra: Partial<StoichSolution> = {}
): StoichSolution {
  return {
    parsed: null,
    balanced: false,
    species: [],
    error: null,
    warn: null,
    nGiven: NaN,
    nWant: NaN,
    mGiven: NaN,
    mWant: NaN,
    massPct: null,
    mixture: NaN,
    values: [],
    steps: [],
    given: null,
    want: null,
    ...extra,
  };
}

export function listSpecies(parsed: ParsedEquation): Species[] {
  const out: Species[] = [];
  for (const side of ["left", "right"] as Side[]) {
    parsed[side].particles.forEach((p, index) => {
      const M = calculate(p.formula).mass;
      out.push({
        id: `${side === "left" ? "L" : "R"}${index}`,
        side,
        index,
        coefficient: p.coefficient,
        formula: p.formula,
        pretty: toUnicodeSubscript(p.formula),
        M,
      });
    });
  }
  return out;
}

function label(s: Species): string {
  return s.pretty;
}

/**
 * Los de molverhouding op. Lege of onvolledige invoer geeft een stille
 * solution terug; echte fouten (parser, onbekend element) komen in `error`.
 */
export function solveStoich(input: StoichInput): StoichSolution {
  const eq = input.equation.trim();
  if (!eq) return emptySolution();

  let parsed: ParsedEquation;
  let species: Species[];
  try {
    parsed = parseEquation(eq);
    species = listSpecies(parsed);
  } catch (e) {
    return emptySolution({
      error: e instanceof Error ? e.message : "Onleesbare vergelijking.",
    });
  }

  const balanced = isBalanced(parsed);
  const given = species.find((s) => s.id === input.givenId) ?? null;
  const want = species.find((s) => s.id === input.wantId) ?? null;
  const base = emptySolution({
    parsed,
    balanced,
    species,
    given,
    want,
    warn: balanced
      ? null
      : "De vergelijking is niet kloppend. De molverhouding volgt de coëfficiënten zoals je ze hebt ingevuld.",
  });

  if (!given || !want) return base;

  const x = parseNL(input.givenRaw);
  if (!Number.isFinite(x) || x <= 0) return base;

  const sig = input.sig;
  const p = (v: number) => toPretty(v, sig);
  const g = toPlain;
  const steps: StoichStep[] = [];

  let nGiven: number;
  let mGiven: number;

  if (input.givenKind === "mol") {
    nGiven = x;
    mGiven = nGiven * given.M;
    steps.push({
      id: "start-mol",
      phase: "naar",
      title: `Je kent al het aantal mol ${label(given)}`,
      formula: `n(${label(given)})`,
      filled: "",
      answer: `${p(nGiven)} mol`,
      note: "Vanaf mol kun je met de coëfficiënten naar elke andere stof.",
    });
  } else {
    nGiven = x / given.M;
    mGiven = x;
    steps.push({
      id: "gram-mol",
      phase: "naar",
      title: `Van massa ${label(given)} naar mol`,
      formula: `n = m ÷ M`,
      filled: `n(${label(given)}) = ${g(x)} ÷ ${g(given.M)}`,
      answer: `${p(nGiven)} mol`,
      note: "Je gaat naar mol toe, dus je deelt door de molaire massa.",
    });
  }

  const ratio = want.coefficient / given.coefficient;
  const nWant = nGiven * ratio;
  const mWant = nWant * want.M;

  const same = given.id === want.id;
  if (!same) {
    steps.push({
      id: "ratio",
      phase: "verhouding",
      title: "Molverhouding uit de coëfficiënten",
      formula: `${given.coefficient} ${label(given)} : ${want.coefficient} ${label(want)}`,
      filled: `n(${label(want)}) = ${p(nGiven)} × ${want.coefficient}/${given.coefficient}`,
      answer: `${p(nWant)} mol`,
      note: "De getallen vóór de formules vertellen hoeveel mol van de ene stof bij hoeveel mol van de andere hoort.",
    });

    steps.push({
      id: "mol-gram",
      phase: "vanuit",
      title: `Van mol ${label(want)} naar massa`,
      formula: "m = n × M",
      filled: `m(${label(want)}) = ${p(nWant)} × ${g(want.M)}`,
      answer: `${p(mWant)} g`,
      note: "Vanuit mol vermenigvuldig je met de molaire massa.",
    });
  } else if (input.givenKind === "mol") {
    steps.push({
      id: "mol-gram-same",
      phase: "vanuit",
      title: `Van mol ${label(want)} naar massa`,
      formula: "m = n × M",
      filled: `m(${label(want)}) = ${p(nWant)} × ${g(want.M)}`,
      answer: `${p(mWant)} g`,
      note: "Zelfde stof: alleen omrekenen, geen molverhouding nodig.",
    });
  }

  const values: SpeciesValues[] = species.map((s) => {
    const n = nGiven * (s.coefficient / given.coefficient);
    return { id: s.id, n, m: n * s.M };
  });

  let massPct: number | null = null;
  const mixture = parseNL(input.mixtureRaw);
  let warn = base.warn;

  if (Number.isFinite(mixture) && mixture > 0) {
    massPct = (mWant / mixture) * 100;
    steps.push({
      id: "pct",
      phase: "mengsel",
      title: `Massapercentage ${label(want)} in het mengsel`,
      formula: "mass% = m ÷ m(mengsel) × 100%",
      filled: `mass% = ${p(mWant)} ÷ ${g(mixture)} × 100%`,
      answer: `${p(massPct)}%`,
      note: "De andere stof in het mengsel hoeft niet in de reactie te staan — die reageert hier niet mee.",
    });
    if (mWant > mixture * 1.001) {
      warn = "Meer dan 100%: de berekende massa is groter dan het mengsel. Controleer de vergelijking en de ingevulde getallen.";
    }
  }

  return {
    parsed,
    balanced,
    species,
    error: null,
    warn,
    nGiven,
    nWant,
    mGiven,
    mWant,
    massPct,
    mixture,
    values,
    steps,
    given,
    want,
  };
}
