// Rekenschema-logica: alles loopt via mol.
//
// Eén gegeven (massa, deeltjes, gasvolume, molariteit of volume vloeistof)
// wordt eerst omgerekend naar mol; vanuit mol volgen alle andere grootheden.
// Deze module bevat alleen rekenwerk en opmaak van getallen — geen UI.

export const NA = 6.02214076e23;
export const NA_PRETTY = "6,022 × 10²³";

export type FId =
  | "gram"
  | "mol"
  | "deeltjes"
  | "gasvolume"
  | "molariteit"
  | "volume";

export type ParamId = "M" | "rho" | "Vm" | "Vopl";

export interface QuantityMeta {
  label: string;
  symbol: string;
  unit: string;
  hint: string;
}

export const Q: Record<FId, QuantityMeta> = {
  mol: {
    label: "Aantal mol",
    symbol: "n",
    unit: "mol",
    hint: "Het knooppunt. Alles gaat hier doorheen.",
  },
  gram: {
    label: "Massa",
    symbol: "m",
    unit: "g",
    hint: "Wat de weegschaal aangeeft.",
  },
  deeltjes: {
    label: "Aantal deeltjes",
    symbol: "N",
    unit: "deeltjes",
    hint: "Atomen, moleculen of ionen.",
  },
  gasvolume: {
    label: "Volume gas",
    symbol: "V",
    unit: "dm³",
    hint: "Alleen voor gassen, bij vaste T en p.",
  },
  molariteit: {
    label: "Molariteit",
    symbol: "c",
    unit: "mol/L",
    hint: "Concentratie van een oplossing.",
  },
  volume: {
    label: "Volume vloeistof",
    symbol: "V",
    unit: "mL",
    hint: "mL = cm³, loopt via de massa.",
  },
};

export const PARAM: Record<ParamId, { label: string; unit: string }> = {
  M: { label: "Molaire massa M", unit: "g/mol" },
  rho: { label: "Dichtheid ρ", unit: "g/mL" },
  Vm: { label: "Molair volume Vₘ", unit: "dm³/mol" },
  Vopl: { label: "Volume oplossing", unit: "mL" },
};

/* ------------------------------------------------------------------ */
/* Getallen lezen en schrijven (Nederlandse notatie)                   */
/* ------------------------------------------------------------------ */

export function parseNL(value: string): number {
  const s = value
    .trim()
    .replace(/\s/g, "")
    .replace(/×10\^?/i, "e")
    .replace(",", ".");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const SUP: Record<string, string> = {
  "-": "⁻",
  "+": "",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function sup(exp: number): string {
  return String(exp)
    .split("")
    .map((c) => SUP[c] ?? c)
    .join("");
}

function nl(s: string): string {
  return s.replace(".", ",");
}

function isBig(n: number): boolean {
  const a = Math.abs(n);
  return a >= 1e5 || a < 1e-3;
}

/** Aantal decimalen dat hoort bij een gegeven aantal significante cijfers. */
function decimalsFor(n: number, sig: number): number {
  const e = Math.floor(Math.log10(Math.abs(n)));
  return Math.min(20, Math.max(0, sig - 1 - e));
}

/**
 * Uitkomst met exact `sig` significante cijfers, inclusief nullen achteraan
 * (1,9978 op 2 cijfers wordt 2,0 — zo hoort het in de scheikunde).
 */
export function toMachine(n: number, sig: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  if (isBig(n)) return nl(n.toExponential(sig - 1));
  return nl(n.toFixed(decimalsFor(n, sig)));
}

/** Zelfde getal, maar zoals je het in je schrift schrijft: 1,203 × 10²⁴. */
export function toPretty(n: number, sig: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  if (!isBig(n)) return nl(n.toFixed(decimalsFor(n, sig)));
  const [mant, exp] = n.toExponential(sig - 1).split("e");
  return `${nl(mant)} × 10${sup(Number(exp))}`;
}

/**
 * Getal zoals het is ingevoerd: geen nullen erbij verzinnen. Voor jouw eigen
 * gegeven en voor constanten als M en ρ.
 */
export function toPlain(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  const r = Number(n.toPrecision(6));
  if (isBig(r)) {
    const [mant, exp] = r.toExponential().split("e");
    return `${nl(mant)} × 10${sup(Number(exp))}`;
  }
  return nl(String(r));
}

/* ------------------------------------------------------------------ */
/* Oplossen                                                            */
/* ------------------------------------------------------------------ */

export interface Step {
  id: string;
  phase: "naar" | "vanuit" | "zij";
  from: FId;
  to: FId;
  title: string;
  formula: string;
  filled: string;
  answer: string;
  note: string;
}

export interface Missing {
  text: string;
  param: ParamId;
}

export interface SolveInput {
  source: FId | null;
  raw: string;
  M: number;
  rho: number;
  Vm: number;
  Vopl: number; // in liter
  sig: number;
}

export interface Solution {
  n: number;
  values: Partial<Record<FId, string>>;
  pretty: Partial<Record<FId, string>>;
  steps: Step[];
  blocked: Partial<Record<FId, Missing>>;
  warn: Missing | null;
  used: ParamId[];
}

export function solve(input: SolveInput): Solution {
  const { source, raw, M, rho, Vm, Vopl, sig } = input;
  const sol: Solution = {
    n: NaN,
    values: {},
    pretty: {},
    steps: [],
    blocked: {},
    warn: null,
    used: [],
  };

  if (!source) return sol;
  const x = parseNL(raw);
  if (!Number.isFinite(x)) return sol;

  const p = (v: number) => toPretty(v, sig);
  const g = toPlain; // gegevens en constanten: zoals ingevoerd
  const ok = (v: number) => Number.isFinite(v) && v > 0;
  const use = (id: ParamId) => {
    if (!sol.used.includes(id)) sol.used.push(id);
  };
  const set = (id: FId, v: number) => {
    sol.values[id] = toMachine(v, sig);
    sol.pretty[id] = `${p(v)} ${Q[id].unit}`;
  };

  let n = NaN;
  // massa in gram, ook als de gebruiker die zelf heeft ingevuld
  let massa = source === "gram" ? x : NaN;

  /* --- stap 1: van jouw gegeven naar mol --- */

  if (source === "mol") {
    n = x;
    sol.steps.push({
      id: "start",
      phase: "naar",
      from: "mol",
      to: "mol",
      title: "Je begint al in het knooppunt",
      formula: "n",
      filled: "",
      answer: `${p(n)} mol`,
      note: "Vanaf mol kun je alle kanten op.",
    });
  } else if (source === "gram") {
    if (!ok(M)) {
      sol.warn = {
        text: "Zonder molaire massa M kun je niet van gram naar mol.",
        param: "M",
      };
      return sol;
    }
    use("M");
    n = x / M;
    sol.steps.push({
      id: "gram-mol",
      phase: "naar",
      from: "gram",
      to: "mol",
      title: "Van massa naar mol",
      formula: "n = m ÷ M",
      filled: `n = ${g(x)} ÷ ${g(M)}`,
      answer: `${p(n)} mol`,
      note: "Je gaat naar mol toe, dus je deelt.",
    });
  } else if (source === "deeltjes") {
    n = x / NA;
    sol.steps.push({
      id: "deeltjes-mol",
      phase: "naar",
      from: "deeltjes",
      to: "mol",
      title: "Van deeltjes naar mol",
      formula: "n = N ÷ Nₐ",
      filled: `n = ${g(x)} ÷ ${NA_PRETTY}`,
      answer: `${p(n)} mol`,
      note: "Eén mol is altijd 6,022 × 10²³ deeltjes.",
    });
  } else if (source === "gasvolume") {
    if (!ok(Vm)) {
      sol.warn = {
        text: "Vul het molair volume Vₘ in (22,4 bij 0 °C).",
        param: "Vm",
      };
      return sol;
    }
    use("Vm");
    n = x / Vm;
    sol.steps.push({
      id: "gas-mol",
      phase: "naar",
      from: "gasvolume",
      to: "mol",
      title: "Van gasvolume naar mol",
      formula: "n = V ÷ Vₘ",
      filled: `n = ${g(x)} ÷ ${g(Vm)}`,
      answer: `${p(n)} mol`,
      note: "Elk gas neemt per mol hetzelfde volume in.",
    });
  } else if (source === "molariteit") {
    if (!ok(Vopl)) {
      sol.warn = {
        text: "Vul het volume van de oplossing in — c zegt pas iets samen met een volume.",
        param: "Vopl",
      };
      return sol;
    }
    use("Vopl");
    n = x * Vopl;
    sol.steps.push({
      id: "c-mol",
      phase: "naar",
      from: "molariteit",
      to: "mol",
      title: "Van molariteit naar mol",
      formula: "n = c × V",
      filled: `n = ${g(x)} × ${g(Vopl)}`,
      answer: `${p(n)} mol`,
      note: "Let op: hier vermenigvuldig je, ook al ga je naar mol toe. V in liter!",
    });
  } else if (source === "volume") {
    if (!ok(rho)) {
      sol.warn = {
        text: "Zonder dichtheid ρ kun je een volume vloeistof niet omrekenen naar massa.",
        param: "rho",
      };
      return sol;
    }
    use("rho");
    massa = x * rho;
    set("gram", massa);
    sol.steps.push({
      id: "vol-gram",
      phase: "zij",
      from: "volume",
      to: "gram",
      title: "Eerst van volume naar massa",
      formula: "m = V × ρ",
      filled: `m = ${g(x)} × ${g(rho)}`,
      answer: `${p(massa)} g`,
      note: "Volume vloeistof hangt aan de massa, niet direct aan mol.",
    });
    if (!ok(M)) {
      sol.warn = {
        text: "Je hebt nu de massa. Vul M in om verder te gaan naar mol.",
        param: "M",
      };
      return sol;
    }
    use("M");
    n = massa / M;
    sol.steps.push({
      id: "gram-mol2",
      phase: "naar",
      from: "gram",
      to: "mol",
      title: "En dan van massa naar mol",
      formula: "n = m ÷ M",
      filled: `n = ${p(massa)} ÷ ${g(M)}`,
      answer: `${p(n)} mol`,
      note: "Je gaat naar mol toe, dus je deelt.",
    });
  }

  if (!Number.isFinite(n)) return sol;

  sol.n = n;
  set("mol", n);

  /* --- stap 2: vanuit mol naar alle andere grootheden --- */

  if (source !== "deeltjes") {
    const N = n * NA;
    set("deeltjes", N);
    sol.steps.push({
      id: "mol-deeltjes",
      phase: "vanuit",
      from: "mol",
      to: "deeltjes",
      title: "Van mol naar deeltjes",
      formula: "N = n × Nₐ",
      filled: `N = ${p(n)} × ${NA_PRETTY}`,
      answer: `${p(N)} deeltjes`,
      note: "Vanuit mol vermenigvuldig je.",
    });
  }

  if (source !== "gram" && !Number.isFinite(massa)) {
    if (ok(M)) {
      use("M");
      massa = n * M;
      set("gram", massa);
      sol.steps.push({
        id: "mol-gram",
        phase: "vanuit",
        from: "mol",
        to: "gram",
        title: "Van mol naar massa",
        formula: "m = n × M",
        filled: `m = ${p(n)} × ${g(M)}`,
        answer: `${p(massa)} g`,
        note: "Vanuit mol vermenigvuldig je.",
      });
    } else {
      sol.blocked.gram = { text: "Vul M in", param: "M" };
    }
  }

  if (source !== "volume") {
    if (Number.isFinite(massa) && ok(rho)) {
      use("rho");
      const V = massa / rho;
      set("volume", V);
      sol.steps.push({
        id: "gram-vol",
        phase: "zij",
        from: "gram",
        to: "volume",
        title: "Van massa naar volume vloeistof",
        formula: "V = m ÷ ρ",
        filled: `V = ${source === "gram" ? g(massa) : p(massa)} ÷ ${g(rho)}`,
        answer: `${p(V)} mL`,
        note: "Deze tak vertrekt vanaf de massa, niet vanaf mol.",
      });
    } else if (!ok(rho)) {
      sol.blocked.volume = { text: "Vul ρ in", param: "rho" };
    } else {
      sol.blocked.volume = { text: "Vul M in", param: "M" };
    }
  }

  if (source !== "gasvolume") {
    if (ok(Vm)) {
      use("Vm");
      const V = n * Vm;
      set("gasvolume", V);
      sol.steps.push({
        id: "mol-gas",
        phase: "vanuit",
        from: "mol",
        to: "gasvolume",
        title: "Van mol naar gasvolume",
        formula: "V = n × Vₘ",
        filled: `V = ${p(n)} × ${g(Vm)}`,
        answer: `${p(V)} dm³`,
        note: "Geldt alleen als de stof een gas is.",
      });
    } else {
      sol.blocked.gasvolume = { text: "Vul Vₘ in", param: "Vm" };
    }
  }

  if (source !== "molariteit") {
    if (ok(Vopl)) {
      use("Vopl");
      const c = n / Vopl;
      set("molariteit", c);
      sol.steps.push({
        id: "mol-c",
        phase: "vanuit",
        from: "mol",
        to: "molariteit",
        title: "Van mol naar molariteit",
        formula: "c = n ÷ V",
        filled: `c = ${p(n)} ÷ ${g(Vopl)}`,
        answer: `${p(c)} mol/L`,
        note: "Let op: hier deel je juist, terwijl je van mol af gaat.",
      });
    } else {
      sol.blocked.molariteit = {
        text: "Vul het volume van de oplossing in",
        param: "Vopl",
      };
    }
  }

  return sol;
}
