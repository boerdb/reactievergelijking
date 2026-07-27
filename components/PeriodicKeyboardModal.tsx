"use client";

import { useEffect, useRef, useState } from "react";

// Periodiek systeem — hoofdgrid (rij, kolom) → element.
// Lege cellen worden als null opgeslagen; de twee rijen lanthaniden/actiniden
// staan apart onderaan.
type Cell = string | null;

const PERIODIC_GRID: Cell[][] = [
  // rij 1
  ["H", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "He"],
  // rij 2
  ["Li", "Be", null, null, null, null, null, null, null, null, null, null, "B", "C", "N", "O", "F", "Ne"],
  // rij 3
  ["Na", "Mg", null, null, null, null, null, null, null, null, null, null, "Al", "Si", "P", "S", "Cl", "Ar"],
  // rij 4
  ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
  // rij 5
  ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
  // rij 6 — La is placeholder (*), rest in lanthanide-rij
  ["Cs", "Ba", "*", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
  // rij 7 — Ac is placeholder (**), rest in actinide-rij
  ["Fr", "Ra", "**", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
];

const LANTHANIDES = ["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"];
const ACTINIDES = ["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"];

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

interface Props {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function PeriodicKeyboardModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      // Focus na render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initial]);

  // Sluit op Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function insert(text: string) {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    // Zet cursor direct na ingevoegde tekst
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function backspace() {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    if (start !== end) {
      // Verwijder selectie
      setValue(value.slice(0, start) + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      setValue(value.slice(0, start - 1) + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start - 1;
        el.setSelectionRange(pos, pos);
      });
    }
  }

  function clearAll() {
    setValue("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function save() {
    onSave(value);
    onClose();
  }

  const keyBtn =
    "rounded-md border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 hover:border-slate-500 active:bg-slate-900 select-none";
  const elemBtn =
    "rounded-md border border-slate-600 bg-slate-800 px-1 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-brand-600 hover:border-brand-400 active:bg-brand-700 select-none";
  const elemBtnSm =
    "rounded border border-slate-700 bg-slate-800/70 px-1 py-1 text-[10px] font-semibold text-slate-200 transition hover:bg-brand-600 hover:border-brand-400 active:bg-brand-700 select-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            ✕ Annuleren
          </button>
          <h2 className="text-sm font-semibold text-slate-300">
            Bouw de vergelijking
          </h2>
          <button
            onClick={save}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            ✓ Opslaan
          </button>
        </div>

        {/* Invoerveld */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="bijv. 2 H2 + O2 -> 2 H2O"
          className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 font-mono text-lg text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />

        {/* Cijferrits */}
        <div className="mb-2 grid grid-cols-10 gap-1">
          {NUMBERS.map((n) => (
            <button key={n} className={keyBtn} onClick={() => insert(n)}>
              {n}
            </button>
          ))}
        </div>

        {/* Symboolrij */}
        <div className="mb-3 grid grid-cols-6 gap-1 sm:grid-cols-7">
          <button className={keyBtn} onClick={() => insert("(")}>(</button>
          <button className={keyBtn} onClick={() => insert(")")}>)</button>
          <button className={keyBtn} onClick={() => insert(" + ")}>+</button>
          <button className={keyBtn} onClick={() => insert(" -> ")}>→</button>
          <button className={keyBtn} onClick={() => insert(".")}>·</button>
          <button className={keyBtn} onClick={backspace}>⌫</button>
          <button
            className={`${keyBtn} col-span-6 sm:col-span-1`}
            onClick={clearAll}
          >
            Wis
          </button>
        </div>

        {/* Periodiek systeem — hoofdgrid */}
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {PERIODIC_GRID.map((row, r) => (
              <div key={r} className="mb-1 grid grid-cols-18 gap-1">
                {row.map((cell, c) => {
                  if (cell === null) {
                    return <div key={c} />;
                  }
                  if (cell === "*" || cell === "**") {
                    return (
                      <div
                        key={c}
                        className="flex items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900 px-1 py-1.5 text-[10px] text-slate-500"
                      >
                        {cell}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={c}
                      className={elemBtn}
                      onClick={() => insert(cell)}
                      title={cell}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Lanthaniden / Actiniden */}
            <div className="mt-2 mb-1 grid grid-cols-15 gap-1">
              {LANTHANIDES.map((el) => (
                <button key={el} className={elemBtnSm} onClick={() => insert(el)}>
                  {el}
                </button>
              ))}
            </div>
            <div className="mb-1 grid grid-cols-15 gap-1">
              {ACTINIDES.map((el) => (
                <button key={el} className={elemBtnSm} onClick={() => insert(el)}>
                  {el}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Tip: typ ook gewoon zelf — of klik op een element om het toe te voegen.
          Druk op <kbd className="rounded bg-slate-800 px-1">Enter</kbd> om op te
          slaan, <kbd className="rounded bg-slate-800 px-1">Esc</kbd> om te
          annuleren.
        </p>
      </div>
    </div>
  );
}
