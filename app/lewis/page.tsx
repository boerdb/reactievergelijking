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

/** SVG-tekening van de Lewisstructuur. */
function LewisDiagram({ result }: { result: LewisResult }) {
  const central = result.atoms.find((a) => a.role === "central")!;
  const terminals = result.atoms.filter((a) => a.role === "terminal");
  const W = 360;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;
  const R = terminals.length <= 1 ? 0 : terminals.length === 2 ? 100 : 105;

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(central.id, { x: cx, y: cy });

  terminals.forEach((t, i) => {
    // Start bovenaan, met lichte rotatie zodat 2-atomen horizontaal staan.
    const base =
      terminals.length === 2
        ? -Math.PI / 2 + (i === 0 ? -Math.PI / 2 : Math.PI / 2)
        : -Math.PI / 2 + (i * 2 * Math.PI) / terminals.length;
    // Voor AX2E2 (H2O): plaats terminals iets omhoog i.p.v. exact tegenover.
    let angle = base;
    if (terminals.length === 2 && central.lonePairs >= 2) {
      angle = i === 0 ? -Math.PI * 0.72 : -Math.PI * 0.28;
    } else if (terminals.length === 2) {
      angle = i === 0 ? Math.PI : 0;
    } else if (terminals.length === 3 && central.lonePairs >= 1) {
      // NH3-achtig: driehoek onder het centrale atoom
      angle = Math.PI / 2 + ((i - 1) * (2 * Math.PI)) / 3.2;
    }
    positions.set(t.id, {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
    });
  });

  function lonePairDots(
    x: number,
    y: number,
    pairs: number,
    towardCentral?: { x: number; y: number }
  ) {
    if (pairs <= 0) return null;
    // Richting weg van centraal atoom (of omhoog als centraal zelf).
    let ux = 0;
    let uy = -1;
    if (towardCentral) {
      const dx = x - towardCentral.x;
      const dy = y - towardCentral.y;
      const len = Math.hypot(dx, dy) || 1;
      ux = dx / len;
      uy = dy / len;
    }
    const px = -uy;
    const py = ux;
    const dots: JSX.Element[] = [];
    const ring = 26;

    // Eindstandig: houd paren uit de bindingsrichting (halve cirkel aan de buitenkant).
    // Centraal: verdeel gelijkmatig rondom.
    const angles: number[] = [];
    if (towardCentral) {
      if (pairs === 1) angles.push(0);
      else if (pairs === 2) angles.push(-Math.PI * 0.55, Math.PI * 0.55);
      else if (pairs === 3)
        angles.push(-Math.PI * 0.7, 0, Math.PI * 0.7);
      else {
        for (let p = 0; p < pairs; p++) {
          angles.push(-Math.PI * 0.75 + (p * 1.5 * Math.PI) / (pairs - 1));
        }
      }
    } else {
      for (let p = 0; p < pairs; p++) {
        angles.push((p * 2 * Math.PI) / pairs - Math.PI / 2);
      }
    }

    for (let p = 0; p < pairs; p++) {
      const a = angles[p];
      const ox = Math.cos(a) * ux + Math.sin(a) * px;
      const oy = Math.cos(a) * uy + Math.sin(a) * py;
      const bx = x + ox * ring;
      const by = y + oy * ring;
      // Twee puntjes loodrecht op de radiale richting van dit paar.
      const tx = -oy;
      const ty = ox;
      dots.push(
        <g key={p}>
          <circle cx={bx - tx * 4} cy={by - ty * 4} r={2.6} fill="#0f172a" />
          <circle cx={bx + tx * 4} cy={by + ty * 4} r={2.6} fill="#0f172a" />
        </g>
      );
    }
    return <g>{dots}</g>;
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
      {result.bonds.map((b) => {
        const a = positions.get(b.from)!;
        const c = positions.get(b.to)!;
        return bondLines(a.x, a.y, c.x, c.y, b.order, `${b.from}-${b.to}`);
      })}
      {result.atoms.map((atom) => {
        const p = positions.get(atom.id)!;
        const toward =
          atom.role === "terminal"
            ? positions.get(central.id)
            : undefined;
        return (
          <g key={atom.id}>
            {lonePairDots(p.x, p.y, atom.lonePairs, toward)}
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-900"
              style={{
                fontSize: atom.role === "central" ? 28 : 24,
                fontWeight: 800,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {atom.symbol}
            </text>
            {atom.formalCharge !== 0 && (
              <text
                x={p.x + 14}
                y={p.y - 14}
                textAnchor="middle"
                className="fill-blue-700"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {atom.formalCharge > 0
                  ? `+${atom.formalCharge}`
                  : atom.formalCharge}
              </text>
            )}
          </g>
        );
      })}
      {result.charge !== 0 && (
        <text
          x={W - 16}
          y={24}
          textAnchor="end"
          className="fill-slate-500"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          lading {chargeLabel(result.charge)}
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
