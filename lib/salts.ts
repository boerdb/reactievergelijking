// Rekenen met zouten: gegeven hoeveelheid zout → mol / massa / molariteit
// van elk ion via de ontbindingsverhouding.
// Alleen rekenwerk en opmaak — geen UI.

import { decomposeSalt, SaltError, type DecomposedSalt, type SaltIon } from "./ions";
import { parseNL, toPlain, toPretty } from "./mol";

export type SaltQtyKind = "gram" | "mol" | "molariteit";
export type SaltTarget = "salt" | "cation" | "anion";

export interface SaltStep {
  id: string;
  phase: "ontbinden" | "naar" | "verhouding" | "vanuit" | "concentratie";
  title: string;
  formula: string;
  filled: string;
  answer: string;
  note: string;
}

export interface SaltInput {
  formula: string;
  givenKind: SaltQtyKind;
  givenRaw: string;
  /** Alleen bij molariteit: volume oplossing in mL. */
  volumeMlRaw: string;
  want: SaltTarget;
  sig: number;
}

export interface IonResult {
  ion: SaltIon;
  n: number;
  m: number;
  c: number | null; // mol/L als volume bekend
}

export interface SaltSolution {
  salt: DecomposedSalt | null;
  error: string | null;
  nSalt: number;
  mSalt: number;
  cSalt: number | null;
  VoplL: number;
  cation: IonResult | null;
  anion: IonResult | null;
  steps: SaltStep[];
  wantLabel: string;
  wantAnswer: string;
}

export function emptySaltSolution(
  extra: Partial<SaltSolution> = {}
): SaltSolution {
  return {
    salt: null,
    error: null,
    nSalt: NaN,
    mSalt: NaN,
    cSalt: null,
    VoplL: NaN,
    cation: null,
    anion: null,
    steps: [],
    wantLabel: "",
    wantAnswer: "",
    ...extra,
  };
}

function toLiters(L: number): string {
  if (!Number.isFinite(L)) return "";
  if (L === 0) return "0";
  if (Math.abs(L) >= 1e-4 && Math.abs(L) < 1e3) {
    return String(Number(L.toPrecision(6))).replace(".", ",");
  }
  return toPlain(L);
}

function ionResult(ion: SaltIon, nSalt: number, VoplL: number): IonResult {
  const n = nSalt * ion.count;
  const m = n * ion.M;
  const c =
    Number.isFinite(VoplL) && VoplL > 0 ? n / VoplL : null;
  return { ion, n, m, c };
}

/**
 * Los een zoutopgave op. Lege invoer → stille solution; echte fouten in `error`.
 */
export function solveSalt(input: SaltInput): SaltSolution {
  const raw = input.formula.trim();
  if (!raw) return emptySaltSolution();

  let salt: DecomposedSalt;
  try {
    salt = decomposeSalt(raw);
  } catch (e) {
    return emptySaltSolution({
      error: e instanceof SaltError || e instanceof Error ? e.message : "Onleesbare formule.",
    });
  }

  const base = emptySaltSolution({ salt });
  const x = parseNL(input.givenRaw);
  if (!Number.isFinite(x) || x <= 0) return base;

  const sig = input.sig;
  const p = (v: number) => toPretty(v, sig);
  const g = toPlain;
  const steps: SaltStep[] = [];

  steps.push({
    id: "dissolution",
    phase: "ontbinden",
    title: "Ontbindingsvergelijking",
    formula: salt.dissolution,
    filled: "",
    answer: `${salt.cation.count} ${salt.cation.pretty} : ${salt.anion.count} ${salt.anion.pretty}`,
    note: "Uit één formule-eenheid zout komen zoveel ionen — dat is je molverhouding.",
  });

  let nSalt: number;
  let mSalt: number;
  let cSalt: number | null = null;
  let VoplL = NaN;

  const volMl = parseNL(input.volumeMlRaw);
  if (Number.isFinite(volMl) && volMl > 0) {
    VoplL = volMl / 1000;
  }

  if (input.givenKind === "mol") {
    nSalt = x;
    mSalt = nSalt * salt.M;
    steps.push({
      id: "start-mol",
      phase: "naar",
      title: `Je kent al het aantal mol ${salt.pretty}`,
      formula: `n(${salt.pretty})`,
      filled: "",
      answer: `${p(nSalt)} mol`,
      note: "Vanaf mol zout ga je met de verhouding naar de ionen.",
    });
  } else if (input.givenKind === "gram") {
    nSalt = x / salt.M;
    mSalt = x;
    steps.push({
      id: "gram-mol",
      phase: "naar",
      title: `Van massa ${salt.pretty} naar mol`,
      formula: "n = m ÷ M",
      filled: `n(${salt.pretty}) = ${g(x)} ÷ ${g(salt.M)}`,
      answer: `${p(nSalt)} mol`,
      note: "Je gaat naar mol toe, dus je deelt door de molaire massa van het zout.",
    });
  } else {
    // molariteit van het zout
    if (!Number.isFinite(VoplL) || VoplL <= 0) {
      return {
        ...base,
        error: null,
        steps: [
          ...steps,
          {
            id: "need-v",
            phase: "naar",
            title: "Volume nodig",
            formula: "n = c × V",
            filled: "",
            answer: "—",
            note: "Vul het volume van de oplossing in (mL). Molariteit zegt pas iets samen met een volume.",
          },
        ],
      };
    }
    cSalt = x;
    nSalt = x * VoplL;
    mSalt = nSalt * salt.M;
    steps.push({
      id: "c-mol",
      phase: "naar",
      title: `Van molariteit ${salt.pretty} naar mol`,
      formula: "n = c × V",
      filled: `n(${salt.pretty}) = ${g(x)} × ${toLiters(VoplL)}`,
      answer: `${p(nSalt)} mol`,
      note: "V in liter! 1000 mL = 1 L.",
    });
  }

  // Als volume bekend is maar c nog niet: vul cSalt in
  if (cSalt == null && Number.isFinite(VoplL) && VoplL > 0) {
    cSalt = nSalt / VoplL;
  }

  const cation = ionResult(salt.cation, nSalt, VoplL);
  const anion = ionResult(salt.anion, nSalt, VoplL);

  const targetIon =
    input.want === "cation"
      ? salt.cation
      : input.want === "anion"
      ? salt.anion
      : null;
  const targetRes =
    input.want === "cation" ? cation : input.want === "anion" ? anion : null;

  if (targetIon && targetRes) {
    steps.push({
      id: "ratio",
      phase: "verhouding",
      title: `Molverhouding zout → ${targetIon.pretty}`,
      formula: `1 ${salt.pretty} : ${targetIon.count} ${targetIon.pretty}`,
      filled: `n(${targetIon.pretty}) = ${p(nSalt)} × ${targetIon.count}`,
      answer: `${p(targetRes.n)} mol`,
      note: "Het getal vóór het ion in de ontbindingsvergelijking is de factor.",
    });

    steps.push({
      id: "mol-gram-ion",
      phase: "vanuit",
      title: `Van mol ${targetIon.pretty} naar massa`,
      formula: "m = n × M",
      filled: `m(${targetIon.pretty}) = ${p(targetRes.n)} × ${g(targetIon.M)}`,
      answer: `${p(targetRes.m)} g`,
      note: "M van het ion = som van de atoommassa's in de ionformule.",
    });

    if (targetRes.c != null) {
      steps.push({
        id: "ion-c",
        phase: "concentratie",
        title: `Molariteit van ${targetIon.pretty}`,
        formula: "c = n ÷ V",
        filled: `c(${targetIon.pretty}) = ${p(targetRes.n)} ÷ ${toLiters(VoplL)}`,
        answer: `${p(targetRes.c)} mol/L`,
        note: `Of sneller: c(ion) = c(zout) × ${targetIon.count}.`,
      });
    }
  } else {
    // overzicht beide ionen
    steps.push({
      id: "ratio-cat",
      phase: "verhouding",
      title: `Mol ${salt.cation.pretty}`,
      formula: `n = n(zout) × ${salt.cation.count}`,
      filled: `n(${salt.cation.pretty}) = ${p(nSalt)} × ${salt.cation.count}`,
      answer: `${p(cation.n)} mol`,
      note: `${salt.cation.count} ${salt.cation.pretty} per formule-eenheid.`,
    });
    steps.push({
      id: "ratio-an",
      phase: "verhouding",
      title: `Mol ${salt.anion.pretty}`,
      formula: `n = n(zout) × ${salt.anion.count}`,
      filled: `n(${salt.anion.pretty}) = ${p(nSalt)} × ${salt.anion.count}`,
      answer: `${p(anion.n)} mol`,
      note: `${salt.anion.count} ${salt.anion.pretty} per formule-eenheid.`,
    });

    if (cation.c != null && anion.c != null) {
      steps.push({
        id: "both-c",
        phase: "concentratie",
        title: "Molariteit van de ionen",
        formula: "c(ion) = c(zout) × aantal",
        filled: `c(${salt.cation.pretty}) = ${p(cation.c)} · c(${salt.anion.pretty}) = ${p(anion.c)}`,
        answer: `${p(cation.c)} / ${p(anion.c)} mol/L`,
        note: "Zelfde volume, andere factor uit de ontbindingsvergelijking.",
      });
    }
  }

  let wantLabel = "";
  let wantAnswer = "";
  if (input.want === "salt") {
    wantLabel = `Overzicht ionen uit ${salt.pretty}`;
    wantAnswer = `${p(cation.n)} mol ${salt.cation.pretty}, ${p(anion.n)} mol ${salt.anion.pretty}`;
  } else if (targetIon && targetRes) {
    wantLabel = targetIon.pretty;
    if (targetRes.c != null) {
      wantAnswer = `${p(targetRes.n)} mol · ${p(targetRes.m)} g · ${p(targetRes.c)} mol/L`;
    } else {
      wantAnswer = `${p(targetRes.n)} mol · ${p(targetRes.m)} g`;
    }
  }

  return {
    salt,
    error: null,
    nSalt,
    mSalt,
    cSalt,
    VoplL,
    cation,
    anion,
    steps,
    wantLabel,
    wantAnswer,
  };
}
