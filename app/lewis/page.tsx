"use client";

import { useMemo, useState } from "react";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";
import {
  AppPage,
  StepSection,
  btnDark,
  btnGhost,
  btnPrimary,
  chipExample,
  chipExampleActive,
  inputClass,
} from "@/components/AppShell";
import { tokenizeFormula } from "@/lib/parser";
import {
  buildLewis,
  bondLabel,
  formulaWithCharge,
  LewisError,
  type LewisResult,
} from "@/lib/lewis";

interface Example {
  formula: string;
  charge: number;
  label: string;
}

const EXAMPLES: Example[] = [
  { formula: "H2O", charge: 0, label: "H₂O" },
  { formula: "NH3", charge: 0, label: "NH₃" },
  { formula: "CH4", charge: 0, label: "CH₄" },
  { formula: "CO2", charge: 0, label: "CO₂" },
  { formula: "O2", charge: 0, label: "O₂" },
  { formula: "N2", charge: 0, label: "N₂" },
  { formula: "HF", charge: 0, label: "HF" },
  { formula: "OH", charge: -1, label: "OH⁻" },
  { formula: "NH4", charge: 1, label: "NH₄⁺" },
  { formula: "SO2", charge: 0, label: "SO₂" },
  { formula: "CO3", charge: -2, label: "CO₃²⁻" },
  { formula: "BF3", charge: 0, label: "BF₃" },
];

function FormulaView({ formula }: { formula: string }) {
  const pieces = useMemo(() => tokenizeFormula(formula), [formula]);
  return (
    <>
      {pieces.map((p, i) =>
        p.type === "sub" ? <sub key={i}>{p.value}</sub> : <span key={i}>{p.value}</span>
      )}
    </>
  );
}

function chargeLabel(charge: number): string {
  if (charge === 0) return "neutraal";
  return charge > 0 ? `+${charge}` : `${charge}`;
}

/** Officiële ionlading naast het haakje: ⁻, ⁺, ²⁻. */
function ionChargeMark(charge: number): string {
  const sign = charge > 0 ? "⁺" : "⁻";
  const n = Math.abs(charge);
  if (n === 1) return sign;
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return (
    String(n)
      .split("")
      .map((d) => digits[Number(d)] ?? "")
      .join("") + sign
  );
}

/** SVG-tekening van de Lewisstructuur. */
function LewisDiagram({ result }: { result: LewisResult }) {
  const central = result.atoms.find((a) => a.role === "central")!;
  const terminals = result.atoms.filter((a) => a.role === "terminal");
  const W = 480;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;

  const positions = new Map<string, { x: number; y: number }>();

  if (terminals.length === 0) {
    positions.set(central.id, { x: cx, y: cy });
  } else if (terminals.length === 1) {
    // Diatom (CN⁻, N₂, O₂, HF): naast elkaar, niet op elkaar.
    const gap = 86;
    positions.set(central.id, { x: cx - gap, y: cy });
    positions.set(terminals[0].id, { x: cx + gap, y: cy });
  } else if (terminals.length === 2 && central.lonePairs >= 1) {
    // Gebogen (H₂O, SO₂): bindingen naar beneden, vrije paren blijven boven.
    positions.set(central.id, { x: cx, y: cy - 18 });
    const spread = central.lonePairs >= 2 ? 0.52 : 0.58;
    terminals.forEach((t, i) => {
      const angle = Math.PI / 2 + (i === 0 ? -spread : spread);
      positions.set(t.id, {
        x: cx + 112 * Math.cos(angle),
        y: cy - 18 + 112 * Math.sin(angle),
      });
    });
  } else if (terminals.length === 2) {
    // Lineair (CO₂).
    positions.set(central.id, { x: cx, y: cy });
    positions.set(terminals[0].id, { x: cx - 118, y: cy });
    positions.set(terminals[1].id, { x: cx + 118, y: cy });
  } else if (terminals.length === 3 && central.lonePairs >= 1) {
    // NH₃: vrij paar boven, drie bindingen eronder.
    positions.set(central.id, { x: cx, y: cy - 24 });
    terminals.forEach((t, i) => {
      const angle = Math.PI / 2 + (i - 1) * 0.7;
      positions.set(t.id, {
        x: cx + 116 * Math.cos(angle),
        y: cy - 8 + 104 * Math.sin(angle),
      });
    });
  } else {
    positions.set(central.id, { x: cx, y: cy });
    const R = 116;
    terminals.forEach((t, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / terminals.length;
      positions.set(t.id, {
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
      });
    });
  }

  function pairLayout(
    x: number,
    y: number,
    pairs: number,
    awayFrom?: { x: number; y: number }
  ): { x: number; y: number }[] {
    if (pairs <= 0) return [];
    let ux = 0;
    let uy = -1;
    if (awayFrom) {
      const dx = x - awayFrom.x;
      const dy = y - awayFrom.y;
      const len = Math.hypot(dx, dy) || 1;
      ux = dx / len;
      uy = dy / len;
    }
    const px = -uy;
    const py = ux;
    const ring = 34;
    const angles: number[] = [];
    if (awayFrom) {
      if (pairs === 1) angles.push(0);
      else if (pairs === 2) angles.push(-0.42 * Math.PI, 0.42 * Math.PI);
      else if (pairs === 3) angles.push(-0.5 * Math.PI, 0, 0.5 * Math.PI);
      else {
        for (let p = 0; p < pairs; p++) {
          angles.push(-0.72 * Math.PI + (p * 1.44 * Math.PI) / (pairs - 1));
        }
      }
    } else {
      for (let p = 0; p < pairs; p++) {
        angles.push((p * 2 * Math.PI) / pairs - Math.PI / 2);
      }
    }
    return angles.map((a) => ({
      x: x + (Math.cos(a) * ux + Math.sin(a) * px) * ring,
      y: y + (Math.cos(a) * uy + Math.sin(a) * py) * ring,
    }));
  }

  function lonePairDots(
    x: number,
    y: number,
    pairs: number,
    awayFrom?: { x: number; y: number }
  ) {
    const centers = pairLayout(x, y, pairs, awayFrom);
    if (centers.length === 0) return null;
    return (
      <g>
        {centers.map((c, p) => {
          const ox = c.x - x;
          const oy = c.y - y;
          const len = Math.hypot(ox, oy) || 1;
          const tx = -oy / len;
          const ty = ox / len;
          const gap = 5;
          return (
            <g key={p}>
              <circle cx={c.x - tx * gap} cy={c.y - ty * gap} r={3.2} fill="#0f172a" />
              <circle cx={c.x + tx * gap} cy={c.y + ty * gap} r={3.2} fill="#0f172a" />
            </g>
          );
        })}
      </g>
    );
  }

  function chargeAnchor(
    x: number,
    y: number,
    pairs: number,
    awayFrom: { x: number; y: number } | undefined,
    bondTargets: { x: number; y: number }[]
  ) {
    const centers = pairLayout(x, y, pairs, awayFrom);
    let best = { x: x, y: y - 24, score: -1 };
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const cxp = x + Math.cos(a) * 24;
      const cyp = y + Math.sin(a) * 24;
      let minD = 80;
      for (const c of centers) {
        minD = Math.min(minD, Math.hypot(cxp - c.x, cyp - c.y));
      }
      for (const b of bondTargets) {
        const dx = b.x - x;
        const dy = b.y - y;
        const len = Math.hypot(dx, dy) || 1;
        minD = Math.min(
          minD,
          Math.hypot(cxp - (x + (dx / len) * 20), cyp - (y + (dy / len) * 20))
        );
      }
      // Liever boven het atoom, zolang dat vrij is.
      const score = minD + (y - cyp) * 0.12;
      if (score > best.score) best = { x: cxp, y: cyp, score };
    }
    return best;
  }

  function bondLines(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    order: number,
    key: string
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    // Kort in zodat lijnen niet door de letters lopen.
    const inset = 22;
    const sx = x1 + ux * inset;
    const sy = y1 + uy * inset;
    const ex = x2 - ux * inset;
    const ey = y2 - uy * inset;
    const offset = order === 1 ? [0] : order === 2 ? [-4.5, 4.5] : [-7, 0, 7];
    return (
      <g key={key}>
        {offset.map((o, i) => (
          <line
            key={i}
            x1={sx + px * o}
            y1={sy + py * o}
            x2={ex + px * o}
            y2={ey + py * o}
            stroke="#1e293b"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }

  const drawn = result.atoms.map((atom) => {
    const p = positions.get(atom.id)!;
    // Vrije paren wijzen weg van de binding. Bij een symmetrisch
    // molecuul (CO₂, CH₄) vallen de buren samen op het atoom zelf;
    // dan verdelen we de paren gelijkmatig.
    const neighbors =
      atom.role === "terminal"
        ? [positions.get(central.id)!]
        : terminals.map((t) => positions.get(t.id)!);
    const mx =
      neighbors.reduce((s, n) => s + n.x, 0) / (neighbors.length || 1);
    const my =
      neighbors.reduce((s, n) => s + n.y, 0) / (neighbors.length || 1);
    const awayFrom =
      neighbors.length > 0 && Math.hypot(mx - p.x, my - p.y) > 12
        ? { x: mx, y: my }
        : undefined;
    return {
      atom,
      p,
      awayFrom,
      formal: chargeAnchor(p.x, p.y, atom.lonePairs, awayFrom, neighbors),
      pairs: pairLayout(p.x, p.y, atom.lonePairs, awayFrom),
    };
  });

  // Haken alleen bij een ion (netto lading ≠ 0), om de hele structuur.
  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  function cover(x: number, y: number, r: number) {
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  }
  for (const d of drawn) {
    cover(d.p.x, d.p.y, 16);
    for (const c of d.pairs) cover(c.x, c.y, 9);
    if (d.atom.formalCharge !== 0) cover(d.formal.x, d.formal.y, 11);
  }
  const showBrackets = result.charge !== 0;
  const bracketPad = 20;
  const bx1 = minX - bracketPad;
  const by1 = minY - bracketPad;
  const bx2 = maxX + bracketPad;
  const by2 = maxY + bracketPad;
  const arm = 14;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto h-auto w-full max-w-md"
      role="img"
      aria-label={`Lewisstructuur van ${formulaWithCharge(
        result.formula,
        result.charge
      )}`}
    >
      <rect x="0" y="0" width={W} height={H} fill="#f8fafc" rx="16" />
      {showBrackets && (
        <g
          fill="none"
          stroke="#1e293b"
          strokeWidth={2.4}
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d={`M ${bx1 + arm} ${by1} H ${bx1} V ${by2} H ${bx1 + arm}`} />
          <path d={`M ${bx2 - arm} ${by1} H ${bx2} V ${by2} H ${bx2 - arm}`} />
        </g>
      )}
      {result.bonds.map((b) => {
        const a = positions.get(b.from)!;
        const c = positions.get(b.to)!;
        return bondLines(a.x, a.y, c.x, c.y, b.order, `${b.from}-${b.to}`);
      })}
      {drawn.map((d) => (
        <g key={d.atom.id}>
          {lonePairDots(d.p.x, d.p.y, d.atom.lonePairs, d.awayFrom)}
          <text
            x={d.p.x}
            y={d.p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-900"
            style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {d.atom.symbol}
          </text>
          {d.atom.formalCharge !== 0 && (
            <text
              x={d.formal.x}
              y={d.formal.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-blue-700"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              {d.atom.formalCharge > 0
                ? `+${d.atom.formalCharge}`
                : d.atom.formalCharge}
            </text>
          )}
        </g>
      ))}
      {showBrackets && (
        <text
          x={bx2 + 6}
          y={by1 + 2}
          textAnchor="start"
          className="fill-blue-700"
          style={{ fontSize: 20, fontWeight: 700 }}
        >
          {ionChargeMark(result.charge)}
        </text>
      )}
    </svg>
  );
}

export default function LewisPage() {
  const [formula, setFormula] = useState("");
  const [charge, setCharge] = useState(0);
  const [result, setResult] = useState<LewisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  function handleCalc() {
    try {
      const r = buildLewis(formula, charge);
      setResult(r);
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof LewisError ? e.message : "Onverwachte fout.");
    }
  }

  function handleClear() {
    setFormula("");
    setCharge(0);
    setResult(null);
    setError(null);
  }

  function loadExample(ex: Example) {
    setFormula(ex.formula);
    setCharge(ex.charge);
    try {
      setResult(buildLewis(ex.formula, ex.charge));
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof LewisError ? e.message : "Onverwachte fout.");
    }
  }

  return (
    <AppPage
      current="/lewis"
      title="Lewisstructuur &"
      titleHighlight="elektronenformule"
      description="Voer een molecuul of ion in — ik teken de Lewisstructuur en leg stap voor stap uit hoe je valentie-elektronen, bindingen en vrije elektronenparen telt."
      tips={[
        {
          kicker: "octet",
          body: (
            <>
              Streef naar <strong>8 elektronen</strong> rond elk atoom (H:
              duet van 2).
            </>
          ),
        },
        {
          kicker: "paren",
          body: (
            <>
              Een streep = <strong>bindingspaar</strong>, puntjes ={" "}
              <strong>vrij elektronenpaar</strong>.
            </>
          ),
        },
        {
          kicker: "ionen",
          body: (
            <>
              Zet de <strong>lading</strong> met +/− — die telt mee bij het
              totale aantal elektronen.
            </>
          ),
        },
      ]}
    >
      <StepSection
        step={1}
        first
        title="Welke stof?"
        description="Kleine moleculen/ionen met één centraal atoom, zoals op 4 havo/vwo."
      >
        <label className="sr-only" htmlFor="lewis-formula">
          Formule
        </label>
        <input
          id="lewis-formula"
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCalc();
          }}
          placeholder="bijv. H2O, NH3, CO2 of OH"
          className={inputClass}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Lading
            </label>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCharge((c) => Math.max(-4, c - 1))}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold hover:bg-slate-200"
              >
                −
              </button>
              <span className="w-14 text-center font-mono text-lg font-bold">
                {chargeLabel(charge)}
              </span>
              <button
                type="button"
                onClick={() => setCharge((c) => Math.min(4, c + 1))}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold hover:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleCalc} className={btnPrimary}>
            Teken structuur
          </button>
          <button
            type="button"
            onClick={() => setKeyboardOpen(true)}
            className={btnDark}
          >
            ⌨ Elementenkiezer
          </button>
          <button type="button" onClick={handleClear} className={btnGhost}>
            Wissen
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-400">Voorbeelden:</span>
          {EXAMPLES.map((ex) => {
            const active =
              formula.trim() === ex.formula && charge === ex.charge;
            return (
              <button
                key={ex.label}
                type="button"
                onClick={() => loadExample(ex)}
                className={active ? chipExampleActive : chipExample}
              >
                {ex.label}
              </button>
            );
          })}
        </div>
      </StepSection>

      {error && (
        <StepSection title="Lukt niet" description="">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        </StepSection>
      )}

      {result && (
        <>
          <StepSection
            step={2}
            title="Lewisstructuur"
            description={`${result.axen} · ${result.geometry}`}
          >
            <div className="mb-3 overflow-x-auto rounded-xl bg-slate-50 px-4 py-3 font-serif text-2xl ring-1 ring-slate-100">
              <FormulaView formula={result.formula} />
              {result.charge !== 0 && (
                <sup className="ml-0.5 font-sans text-lg font-bold">
                  {result.charge > 0 ? `+${result.charge}` : result.charge}
                </sup>
              )}
            </div>

            <LewisDiagram result={result} />

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Valentie-e⁻"
                value={String(result.totalValence)}
                accent
              />
              <Stat
                label="In bindingen"
                value={String(result.bondingElectrons)}
              />
              <Stat
                label="Vrije e⁻"
                value={String(result.loneElectrons)}
              />
              <Stat label="Vorm" value={result.axen} />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-3 font-bold">Atoom</th>
                    <th className="py-2 pr-3 font-bold">Rol</th>
                    <th className="py-2 pr-3 font-bold">Vrije paren</th>
                    <th className="py-2 pr-3 font-bold">Bindingen</th>
                    <th className="py-2 pr-3 font-bold">Formele lading</th>
                  </tr>
                </thead>
                <tbody>
                  {result.atoms.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-mono font-bold text-slate-900">
                        {a.symbol}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {a.role === "central" ? "centraal" : "eindstandig"}
                      </td>
                      <td className="py-2 pr-3 font-mono">{a.lonePairs}</td>
                      <td className="py-2 pr-3 font-mono">{a.bondingPairs}</td>
                      <td className="py-2 pr-3 font-mono font-semibold">
                        {a.formalCharge === 0
                          ? "0"
                          : a.formalCharge > 0
                          ? `+${a.formalCharge}`
                          : a.formalCharge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {result.bonds.map((b) => {
                const from = result.atoms.find((a) => a.id === b.from)!;
                const to = result.atoms.find((a) => a.id === b.to)!;
                return (
                  <li key={`${b.from}-${b.to}`}>
                    Binding {from.symbol}–{to.symbol}:{" "}
                    <span className="font-semibold">{bondLabel(b.order)}</span>{" "}
                    ({b.order * 2} e⁻)
                  </li>
                );
              })}
            </ul>

            {result.notes.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.notes.map((n) => (
                  <p
                    key={n}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                  >
                    {n}
                  </p>
                ))}
              </div>
            )}
          </StepSection>

          <StepSection
            step={3}
            title="Stapsgewijze uitleg"
            description="Zo bouw je de elektronenformule zelf op papier."
          >
            <ol className="relative space-y-4 border-l-2 border-blue-100 pl-6">
              {result.steps.map((s) => (
                <li key={s.n} className="relative">
                  <span className="absolute -left-[1.95rem] flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                    {s.n}
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                  {s.calc && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                      {s.calc}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </StepSection>

          <StepSection title="Onthouden" description="Korte checklist voor je toets.">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Tel valentie-elektronen (groepnummer) en pas de lading aan.",
                "Zet het minst elektronegatieve atoom in het midden (H nooit).",
                "Eerst enkelvoudige bindingen, dan octets van de einden vullen.",
                "Rest op het centrale atoom; tekort? → dubbele/drievoudige binding.",
                "Controleer: alle e⁻ gebruikt + formele ladingen someren tot de ionlading.",
                "Vrije elektronenparen op het centrale atoom beïnvloeden de vorm (VSEPR).",
              ].map((tip) => (
                <li
                  key={tip}
                  className="rounded-xl bg-blue-50 px-3 py-3 text-sm text-blue-900 ring-1 ring-blue-100"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </StepSection>
        </>
      )}

      {!result && !error && (
        <StepSection
          step={2}
          title="Uitkomst"
          description="Hier verschijnen tekening en uitleg."
        >
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
            <p className="font-bold text-slate-600">Nog geen structuur getekend.</p>
            <p className="mt-1 text-sm text-slate-500">
              Kies een voorbeeld of typ een formule, en tik Teken structuur.
            </p>
          </div>
        </StepSection>
      )}

      <PeriodicKeyboardModal
        open={keyboardOpen}
        initial={formula}
        onClose={() => setKeyboardOpen(false)}
        onSave={(v) => {
          setFormula(v);
          setResult(null);
          setError(null);
        }}
      />
    </AppPage>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-3 ring-1 ${
        accent
          ? "bg-blue-50 ring-blue-100"
          : "bg-slate-50 ring-slate-100"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-lg font-black ${
          accent ? "text-blue-800" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
