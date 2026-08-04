"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";
import {
  parseEquation,
  ParseError,
  compareSides,
  isBalanced,
  tokenizeFormula,
  equationToUnicode,
  equationToHtml,
  type ParsedEquation,
  type ElementStatus,
  type FormulaPiece,
} from "@/lib/parser";

const EXAMPLES = [
  "2 H2 + O2 -> 2 H2O",
  "CH4 + 2 O2 -> CO2 + 2 H2O",
  "Ca(OH)2 + 2 HCl -> CaCl2 + 2 H2O",
  "Fe + O2 -> Fe2O3",
  "CuSO4.5H2O -> CuSO4 + 5 H2O",
];

function FormulaView({ formula }: { formula: string }) {
  const pieces: FormulaPiece[] = useMemo(
    () => tokenizeFormula(formula),
    [formula]
  );
  return (
    <>
      {pieces.map((p, idx) =>
        p.type === "sub" ? (
          <sub key={idx}>{p.value}</sub>
        ) : (
          <span key={idx}>{p.value}</span>
        )
      )}
    </>
  );
}

function SideView({ parsed, side }: { parsed: ParsedEquation; side: "left" | "right" }) {
  const s = parsed[side];
  return (
    <span>
      {s.particles.map((p, i) => (
        <span key={i}>
          {i > 0 && " + "}
          {p.coefficient !== 1 && (
            <span className="font-semibold">{p.coefficient} </span>
          )}
          <FormulaView formula={p.formula} />
        </span>
      ))}
    </span>
  );
}

interface Feedback {
  ok: boolean;
  message: string;
  details?: string;
  statuses?: ElementStatus[];
}

export default function Page() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedEquation | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  function handleCheck() {
    if (input.trim().length === 0) {
      setParsed(null);
      setFeedback({
        ok: false,
        message: "Voer eerst een vergelijking in.",
      });
      return;
    }
    try {
      const p = parseEquation(input);
      setParsed(p);
      const statuses = compareSides(p);
      const balanced = statuses.every((s) => s.balanced);
      if (balanced) {
        setFeedback({
          ok: true,
          message: "De vergelijking klopt! Alle atomen zijn in balans.",
          statuses,
        });
      } else {
        const wrong = statuses.filter((s) => !s.balanced);
        const detail = wrong
          .map(
            (s) =>
              `${s.element}: links ${s.left}, rechts ${s.right} (verschil ${
                s.diff > 0 ? "+" : ""
              }${s.diff})`
          )
          .join(" · ");
        setFeedback({
          ok: false,
          message: "De vergelijking klopt nog niet.",
          details: detail,
          statuses,
        });
      }
    } catch (e) {
      setParsed(null);
      const msg = e instanceof ParseError ? e.message : "Onverwachte fout bij het parsen.";
      setFeedback({ ok: false, message: msg });
    }
  }

  function handleClear() {
    setInput("");
    setParsed(null);
    setFeedback(null);
    setCopyState("idle");
  }

  async function copyToClipboard(text: string, html: string) {
    if (!parsed) return;
    try {
      // Probeer beide formats tegelijk te zetten (rich text + platte tekst).
      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopyState("ok");
    } catch {
      // Fallback: alleen platte tekst (Unicode-subscripts).
      try {
        await navigator.clipboard.writeText(text);
        setCopyState("ok");
      } catch {
        setCopyState("err");
      }
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function handleCopyWord() {
    if (!parsed) return;
    const text = equationToUnicode(parsed);
    const html = equationToHtml(parsed);
    copyToClipboard(text, html);
  }

  function handleCopyPlain() {
    if (!parsed) return;
    const text = equationToUnicode(parsed);
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyState("ok"))
      .catch(() => setCopyState("err"));
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function loadExample(eq: string) {
    setInput(eq);
    setParsed(null);
    setFeedback(null);
    setCopyState("idle");
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Reactievergelijkingen controle
            </h1>
            <Link
              href="/bereken"
              className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              🧮 Molecuulmassa
            </Link>
          </div>
          <p className="mt-2 text-slate-600">
            Voer een scheikundige reactievergelijking in, controleer of hij
            klopt, en kopieer hem naar Word voor je huiswerk.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label
            htmlFor="eq"
            className="block text-sm font-medium text-slate-700"
          >
            Jouw vergelijking
          </label>
          <input
            id="eq"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCheck();
            }}
            placeholder="bijv. 2 H2 + O2 -> 2 H2O"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            spellCheck={false}
            autoComplete="off"
          />

          <p className="mt-2 text-xs text-slate-500">
            Tip: gebruik <code>-&gt;</code> of <code>=&gt;</code> of <code>→</code> als
            pijl, en <code>+</code> tussen deeltjes. Haakjes en hydraten
            (zoals <code>Ca(OH)2</code> en <code>CuSO4.5H2O</code>) werken ook.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleCheck}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              Controleer
            </button>
            <button
              onClick={() => setKeyboardOpen(true)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
              title="Open het periodiek systeem als invoerhulp"
            >
              ⌨ Elementenkiezer
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Wissen
            </button>
            <button
              onClick={handleCopyWord}
              disabled={!parsed}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kopieer naar Word
            </button>
            <button
              onClick={handleCopyPlain}
              disabled={!parsed}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kopieer als tekst
            </button>
          </div>

          {copyState === "ok" && (
            <p className="mt-2 text-sm text-emerald-700">
              ✓ Gekopieerd! Plak in Word met Ctrl+V.
            </p>
          )}
          {copyState === "err" && (
            <p className="mt-2 text-sm text-red-700">
              ✗ Kon niet kopiëren. Gebruik handmatig selecteren en Ctrl+C.
            </p>
          )}
        </section>

        {/* Voorbeelden */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Voorbeelden</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((eq) => (
              <button
                key={eq}
                onClick={() => loadExample(eq)}
                className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700 transition hover:bg-slate-200"
              >
                {eq}
              </button>
            ))}
          </div>
        </section>

        {/* Weergave van de vergelijking met echte subscripts */}
        {parsed && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">
              Jouw vergelijking (met subscripts)
            </h2>
            <div className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-4 font-serif text-2xl">
              <SideView parsed={parsed} side="left" />
              <span className="mx-3 text-slate-500">→</span>
              <SideView parsed={parsed} side="right" />
            </div>
          </section>
        )}

        {/* Feedback */}
        {feedback && (
          <section
            className={`mt-6 rounded-2xl p-6 shadow-sm ring-1 ${
              feedback.ok
                ? "bg-emerald-50 ring-emerald-200"
                : "bg-red-50 ring-red-200"
            }`}
          >
            <h2
              className={`text-base font-semibold ${
                feedback.ok ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {feedback.ok ? "✓ Klopt!" : "✗ Niet kloppend"}
            </h2>
            <p
              className={`mt-1 text-sm ${
                feedback.ok ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {feedback.message}
            </p>
            {feedback.details && (
              <p className="mt-2 text-sm font-mono text-red-700">
                {feedback.details}
              </p>
            )}

            {/* Per-element tabel */}
            {feedback.statuses && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-1 pr-4">Element</th>
                      <th className="py-1 pr-4">Links</th>
                      <th className="py-1 pr-4">Rechts</th>
                      <th className="py-1 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.statuses.map((s) => (
                      <tr
                        key={s.element}
                        className={
                          s.balanced
                            ? "text-emerald-700"
                            : "text-red-700 font-semibold"
                        }
                      >
                        <td className="py-1 pr-4 font-mono">{s.element}</td>
                        <td className="py-1 pr-4">{s.left}</td>
                        <td className="py-1 pr-4">{s.right}</td>
                        <td className="py-1 pr-4">
                          {s.balanced
                            ? "✓ in balans"
                            : `✗ verschil ${s.diff > 0 ? "+" : ""}${s.diff}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 text-center text-xs text-slate-400">
          Gebouwd voor huiswerk — geen opgeslagen data, alles draait in je
          browser.
        </footer>
      </div>

      <PeriodicKeyboardModal
        open={keyboardOpen}
        initial={input}
        onClose={() => setKeyboardOpen(false)}
        onSave={(v) => {
          setInput(v);
          setParsed(null);
          setFeedback(null);
          setCopyState("idle");
        }}
      />
    </main>
  );
}
