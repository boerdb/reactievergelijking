"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const NA = 6.022e23;

const SUBSTANCES = [
  { v: "", l: "Zelf invullen…", m: "", r: "" },
  { v: "H2O", l: "Water (H₂O)", m: "18,015", r: "1" },
  { v: "O2", l: "Zuurstof (O₂)", m: "31,998", r: "" },
  { v: "H2", l: "Waterstof (H₂)", m: "2,016", r: "" },
  { v: "N2", l: "Stikstof (N₂)", m: "28,014", r: "" },
  { v: "CO2", l: "Koolstofdioxide (CO₂)", m: "44,009", r: "" },
  { v: "CH4", l: "Methaan (CH₄)", m: "16,043", r: "" },
  { v: "NH3", l: "Ammoniak (NH₃)", m: "17,031", r: "" },
  { v: "NaCl", l: "Keukenzout (NaCl)", m: "58,443", r: "" },
  { v: "HCl", l: "Zoutzuur (HCl)", m: "36,461", r: "" },
  { v: "NaOH", l: "Natriumhydroxide (NaOH)", m: "39,997", r: "" },
  { v: "H2SO4", l: "Zwavelzuur (H₂SO₄)", m: "98,079", r: "" },
  { v: "C6H12O6", l: "Glucose (C₆H₁₂O₆)", m: "180,156", r: "" },
  { v: "C2H6O", l: "Ethanol (C₂H₆O)", m: "46,068", r: "0,789" },
  { v: "CaCO3", l: "Calciumcarbonaat (CaCO₃)", m: "100,086", r: "" },
  { v: "Fe", l: "IJzer (Fe)", m: "55,845", r: "" },
  { v: "Cu", l: "Koper (Cu)", m: "63,546", r: "" },
];

type FId = "mol" | "gram" | "deeltjes" | "molariteit" | "volume" | "gasvolume";

function pNL(v: string): number {
  const r = v.trim().replace(/\s+/g, "").replace(",", ".");
  return r ? Number(r) : NaN;
}
function fD(n: number, d = 4): string {
  if (!isFinite(n)) return "";
  const dd = Math.abs(n) >= 100 ? 2 : d;
  return n.toFixed(dd).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(".", ",");
}
function fS(n: number): string {
  if (!isFinite(n) || n === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(n)));
  return fD(n / Math.pow(10, e), 3) + " × 10" + tS(e);
}
function tS(e: number): string {
  const m: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(e).split("").map((c) => m[c] || c).join("");
}

export default function RekenschemaPage() {
  const [stof, setStof] = useState("");
  const [M, setM] = useState("");
  const [rho, setRho] = useState("");
  const [Vm, setVm] = useState("22,4");
  const [volOpl, setVolOpl] = useState("");
  const [vals, setVals] = useState<Record<FId, string>>({ mol: "", gram: "", deeltjes: "", molariteit: "", volume: "", gasvolume: "" });
  const [source, setSource] = useState<FId | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [warn, setWarn] = useState("");
  const [rhoMass, setRhoMass] = useState("");
  const [rhoVol, setRhoVol] = useState("");
  const [rhoRes, setRhoRes] = useState("");
  const [vmMol, setVmMol] = useState("");
  const [vmVol, setVmVol] = useState("");
  const [vmRes, setVmRes] = useState("");

  const gM = useCallback(() => pNL(M), [M]);
  const gR = useCallback(() => pNL(rho), [rho]);
  const gVm = useCallback(() => { const v = pNL(Vm); return isFinite(v) ? v : 22.4; }, [Vm]);
  const gVop = useCallback(() => { const ml = pNL(volOpl); return isFinite(ml) ? ml / 1000 : NaN; }, [volOpl]);

  function recalc(src: FId | null) {
    if (!src) { setSteps([]); setWarn(""); return; }
    const ns: string[] = [];
    let n = NaN;
    const Mv = gM(), rV = gR(), Vmv = gVm(), Vop = gVop();
    const sv = pNL(vals[src]);
    if (src === "mol") { n = sv; if (isFinite(n)) ns.push(`Je start bij het knooppunt: <strong>n = ${fD(n)} mol</strong>.`); }
    else if (src === "gram") {
      const m = sv; if (!isFinite(m)) { setSteps([]); setWarn(""); return; }
      if (!isFinite(Mv) || Mv === 0) { setWarn("Vul de molaire massa M in. n = m / M."); ns.push(`Je vulde <strong>${fD(m)} g</strong> in. Vul <strong>M</strong> in.`); setSteps(ns); return; }
      n = m / Mv; ns.push(`Van gram naar mol: <strong>n = m / M = ${fD(m)} / ${fD(Mv, 3)} = ${fD(n)} mol</strong>.`);
    } else if (src === "deeltjes") {
      const N = sv; if (!isFinite(N)) { setSteps([]); setWarn(""); return; }
      n = N / NA; ns.push(`Van deeltjes naar mol: <strong>n = N / N<sub>A</sub> = ${fS(N)} / 6,022 × 10²³ = ${fD(n)} mol</strong>.`);
    } else if (src === "gasvolume") {
      const Vg = sv; if (!isFinite(Vg)) { setSteps([]); setWarn(""); return; }
      n = Vg / Vmv; ns.push(`Van gasvolume naar mol: <strong>n = V / V<sub>m</sub> = ${fD(Vg)} / ${fD(Vmv, 2)} = ${fD(n)} mol</strong>.`);
    } else if (src === "molariteit") {
      const c = sv; if (!isFinite(c)) { setSteps([]); setWarn(""); return; }
      if (!isFinite(Vop)) { setWarn("Vul het volume van de oplossing in (mL)."); ns.push(`Je vulde <strong>c = ${fD(c)} mol/L</strong> in. Zet er het volume bij.`); setSteps(ns); return; }
      n = c * Vop; ns.push(`Van molariteit naar mol: <strong>n = c × V = ${fD(c)} × ${fD(Vop)} L = ${fD(n)} mol</strong>.`);
    } else if (src === "volume") {
      const V = sv; if (!isFinite(V)) { setSteps([]); setWarn(""); return; }
      if (!isFinite(rV) || rV === 0) { setWarn("Vul de dichtheid ρ in."); setSteps(ns); return; }
      const m = V * rV; ns.push(`Van volume naar gram: <strong>m = V × ρ = ${fD(V)} × ${fD(rV, 3)} = ${fD(m)} g</strong>.`);
      if (!isFinite(Mv) || Mv === 0) { setWarn("Vul ook M in."); setVals((p) => ({ ...p, gram: fD(m) })); setSteps(ns); return; }
      n = m / Mv; ns.push(`Daarna naar mol: <strong>n = m / M = ${fD(m)} / ${fD(Mv, 3)} = ${fD(n)} mol</strong>.`);
    }
    if (!isFinite(n)) { setSteps([]); setWarn(""); return; }
    setWarn("");
    const nv: Record<FId, string> = { ...vals };
    if (src !== "mol") nv.mol = fD(n);
    if (src !== "deeltjes") { const N = n * NA; nv.deeltjes = N.toExponential(3).replace(".", ","); ns.push(`Van mol naar deeltjes: <strong>N = n × N<sub>A</sub> = ${fD(n)} × 6,022 × 10²³ = ${fS(N)}</strong>.`); }
    if (src !== "gasvolume") { const Vg = n * Vmv; nv.gasvolume = fD(Vg); ns.push(`Van mol naar gas: <strong>V = n × V<sub>m</sub> = ${fD(n)} × ${fD(Vmv, 2)} = ${fD(Vg, 3)} dm³</strong>.`); }
    if (isFinite(Mv) && Mv !== 0) {
      const m = n * Mv;
      if (src !== "gram") { nv.gram = fD(m); ns.push(`Van mol naar gram: <strong>m = n × M = ${fD(n)} × ${fD(Mv, 3)} = ${fD(m, 3)} g</strong>.`); }
      if (isFinite(rV) && rV !== 0 && src !== "volume") { const V = m / rV; nv.volume = fD(V); ns.push(`Van gram naar volume: <strong>V = m / ρ = ${fD(m, 3)} / ${fD(rV, 3)} = ${fD(V, 3)} cm³</strong>.`); }
    }
    if (isFinite(Vop) && Vop !== 0 && src !== "molariteit") { const c = n / Vop; nv.molariteit = fD(c); ns.push(`Van mol naar molariteit: <strong>c = n / V = ${fD(n)} / ${fD(Vop)} L = ${fD(c)} mol/L</strong>.`); }
    setVals(nv); setSteps(ns);
  }

  function onField(id: FId, v: string) {
    setVals((p) => ({ ...p, [id]: v }));
    const s = v.trim() ? id : null;
    setSource(s);
    if (s) { setVals((p) => { const n = { ...p }; (Object.keys(n) as FId[]).forEach((k) => { if (k !== s) n[k] = ""; }); return { ...n, [id]: v }; }); setTimeout(() => recalc(s), 0); }
    else { setSteps([]); setWarn(""); }
  }
  function onParam() { if (source) { setVals((p) => { const n = { ...p }; (Object.keys(n) as FId[]).forEach((k) => { if (k !== source) n[k] = ""; }); return n; }); setTimeout(() => recalc(source), 0); } }
  function clearAll() { setSource(null); setVals({ mol: "", gram: "", deeltjes: "", molariteit: "", volume: "", gasvolume: "" }); setM(""); setRho(""); setVm("22,4"); setVolOpl(""); setStof(""); setSteps([]); setWarn(""); }
  function loadEx(ex: string) { clearAll(); setTimeout(() => {
    if (ex === "water") { setStof("H2O"); setM("18"); setRho("1"); setSource("gram"); setVals((v) => ({ ...v, gram: "36" })); setTimeout(() => recalc("gram"), 0); }
    else if (ex === "zuurstof") { setStof("O2"); setM("31,998"); setSource("gasvolume"); setVals((v) => ({ ...v, gasvolume: "11,2" })); setTimeout(() => recalc("gasvolume"), 0); }
    else if (ex === "zoutzuur") { setStof("HCl"); setM("36,461"); setVolOpl("250"); setSource("molariteit"); setVals((v) => ({ ...v, molariteit: "0,10" })); setTimeout(() => recalc("molariteit"), 0); }
    else if (ex === "deeltjes") { setStof("H2O"); setM("18,015"); setRho("1"); setSource("deeltjes"); setVals((v) => ({ ...v, deeltjes: "6,022e23" })); setTimeout(() => recalc("deeltjes"), 0); }
  }, 50); }
  function onStof(v: string) { setStof(v); const o = SUBSTANCES.find((s) => s.v === v); if (o) { setM(o.m); setRho(o.r); } if (source) { setVals((p) => { const n = { ...p }; (Object.keys(n) as FId[]).forEach((k) => { if (k !== source) n[k] = ""; }); return n; }); setTimeout(() => recalc(source), 0); } }
  function updRho() { const m = pNL(rhoMass), V = pNL(rhoVol); if (!isFinite(m) || !isFinite(V)) { setRhoRes("Typ massa en volume → dan verschijnt ρ hier."); return; } if (V === 0) { setRhoRes("Volume mag niet 0 zijn."); return; } const r = m / V; setRhoRes(`<strong>ρ = m / V = ${fD(m)} / ${fD(V)} = ${fD(r, 3)} g/cm³</strong><br> = ${fD(r, 3)} g/mL`); }
  function updVm(src: "mol" | "vol") { const F = 22.4; if (src === "mol") { const n = pNL(vmMol); if (!isFinite(n)) { setVmRes(""); return; } const v = n * F; setVmVol(fD(v, 3)); setVmRes(`<strong>V = n × V<sub>m</sub> = ${fD(n)} × 22,4 = ${fD(v, 3)} dm³</strong>`); } else { const V = pNL(vmVol); if (!isFinite(V)) { setVmRes(""); return; } const n = V / F; setVmMol(fD(n)); setVmRes(`<strong>n = V / V<sub>m</sub> = ${fD(V)} / 22,4 = ${fD(n)} mol</strong>`); } }

  const iCls = "w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
  const lCls = "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1";
  const boxBase = "rounded-xl border-2 p-4 text-center";
  const boxNorm = `${boxBase} border-slate-200 bg-slate-50`;
  const boxMol = `${boxBase} border-blue-700 bg-gradient-to-b from-brand-500 to-blue-700 text-white shadow-lg`;
  const boxSrc = `${boxBase} border-green-500 bg-green-50 shadow-md`;
  const boxFill = `${boxBase} border-blue-300 bg-blue-50`;

  function boxClass(id: FId): string {
    if (source === id) return boxSrc;
    if (vals[id]) return boxFill;
    return boxNorm;
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <Link href="/" className="text-sm text-brand-600 hover:text-brand-700">← Terug naar vergelijkingen</Link>
          <div className="mt-1 inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">4 HAVO / VWO · chemisch rekenen</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">Rekenschema: alles loopt via mol</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">Dit is geen losse rekenmachine, maar het <strong>plattegrondje uit je les</strong>. Ken je één gegeven (gram, deeltjes, gasvolume of molariteit), dan reken je <strong>eerst naar mol</strong> en vanuit mol naar de rest.</p>
        </header>

        {/* Stofgegevens */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold mb-1">1. Stofgegevens</h2>
          <p className="text-sm text-slate-500 mb-3">Zonder M kun je niet van gram naar mol. Zonder volume van de oplossing kun je niet van molariteit naar mol.</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><label className={lCls}>Stof</label><select value={stof} onChange={(e) => onStof(e.target.value)} className={iCls}>{SUBSTANCES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
            <div><label className={lCls}>Molaire massa M (g/mol)</label><input value={M} onChange={(e) => { setM(e.target.value); onParam(); }} className={iCls} inputMode="decimal" placeholder="bijv. 18,02" /></div>
            <div><label className={lCls}>Dichtheid ρ (g/cm³)</label><input value={rho} onChange={(e) => { setRho(e.target.value); onParam(); }} className={iCls} inputMode="decimal" placeholder="vloeistof" /></div>
            <div><label className={lCls}>Molaire volume V<sub>m</sub></label><input value={Vm} onChange={(e) => { setVm(e.target.value); onParam(); }} className={iCls} inputMode="decimal" /></div>
          </div>
        </section>

        {/* Rekenschema */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold mb-1">2. Rekenschema</h2>
          <p className="text-sm text-slate-500 mb-3">Naar mol toe: delen. Van mol af: vermenigvuldigen. Vul één vakje in (groen) — de rest wordt berekend.</p>
          <div className="overflow-x-auto">
            <div
              className="schema-grid min-w-[720px] gap-2 p-1"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px,1fr) 90px minmax(180px,1.1fr) 90px minmax(160px,1fr)",
                gridTemplateRows: "auto 70px auto 70px auto",
                alignItems: "center",
              }}
            >
              {/* Rij 1: molariteit boven mol */}
              <div className={`${boxClass("molariteit")}`} style={{ gridColumn: 3, gridRow: 1 }}>
                {source === "molariteit" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Molairiteit</h3>
                <p className="mb-2 text-xs text-slate-500">c in mol/L — samen met volume van de oplossing</p>
                <input value={vals.molariteit} onChange={(e) => onField("molariteit", e.target.value)} className={iCls} inputMode="decimal" placeholder="mol/L" />
                <label className={`${lCls} mt-2`}>Volume oplossing (mL)</label>
                <input value={volOpl} onChange={(e) => { setVolOpl(e.target.value); onParam(); }} className={iCls} inputMode="decimal" placeholder="bijv. 250 mL" />
              </div>

              {/* Pijl molariteit ↔ mol */}
              <div className="flex flex-col items-center justify-center text-center text-xs font-bold text-brand-600" style={{ gridColumn: 3, gridRow: 2 }}>
                <div>× V &nbsp;:&nbsp; : V</div>
                <div className="text-2xl leading-none">↕</div>
                <div>V in liter</div>
              </div>

              {/* Rij 3: massa — mol — deeltjes */}
              <div className={boxClass("gram")} style={{ gridColumn: 1, gridRow: 3 }}>
                {source === "gram" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Massa</h3>
                <p className="mb-2 text-xs text-slate-500">m in gram</p>
                <input value={vals.gram} onChange={(e) => onField("gram", e.target.value)} className={iCls} inputMode="decimal" placeholder="g" />
              </div>
              <div className="flex flex-col items-center justify-center text-center text-xs font-bold text-brand-600" style={{ gridColumn: 2, gridRow: 3 }}>
                <div>: M &nbsp;↔&nbsp; × M</div>
                <div className="text-2xl leading-none">↔</div>
              </div>
              <div className={boxMol} style={{ gridColumn: 3, gridRow: 3 }}>
                {source === "mol" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Aantal mol</h3>
                <p className="mb-2 text-xs text-blue-100">n — het knooppunt</p>
                <input value={vals.mol} onChange={(e) => onField("mol", e.target.value)} className={`${iCls} font-bold`} inputMode="decimal" placeholder="mol" />
              </div>
              <div className="flex flex-col items-center justify-center text-center text-xs font-bold text-brand-600" style={{ gridColumn: 4, gridRow: 3 }}>
                <div>× N<sub>A</sub> &nbsp;↔&nbsp; : N<sub>A</sub></div>
                <div className="text-2xl leading-none">↔</div>
              </div>
              <div className={boxClass("deeltjes")} style={{ gridColumn: 5, gridRow: 3 }}>
                {source === "deeltjes" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Aantal deeltjes</h3>
                <p className="mb-2 text-xs text-slate-500">N (atomen, moleculen, ionen)</p>
                <input value={vals.deeltjes} onChange={(e) => onField("deeltjes", e.target.value)} className={iCls} inputMode="decimal" placeholder="bijv. 6,022e23" />
              </div>

              {/* Pijlen naar beneden */}
              <div className="flex flex-col items-center justify-center text-center text-xs font-bold text-brand-600" style={{ gridColumn: 1, gridRow: 4 }}>
                <div>: ρ &nbsp;↕&nbsp; × ρ</div>
                <div className="text-2xl leading-none">↕</div>
              </div>
              <div className="flex flex-col items-center justify-center text-center text-xs font-bold text-brand-600" style={{ gridColumn: 3, gridRow: 4 }}>
                <div>× V<sub>m</sub> &nbsp;↕&nbsp; : V<sub>m</sub></div>
                <div className="text-2xl leading-none">↕</div>
              </div>

              {/* Rij 5: volume stof onder massa, gasvolume onder mol */}
              <div className={boxClass("volume")} style={{ gridColumn: 1, gridRow: 5 }}>
                {source === "volume" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Volume stof</h3>
                <p className="mb-2 text-xs text-slate-500">cm³ of mL (via dichtheid)</p>
                <input value={vals.volume} onChange={(e) => onField("volume", e.target.value)} className={iCls} inputMode="decimal" placeholder="cm³" />
              </div>
              <div className={boxClass("gasvolume")} style={{ gridColumn: 3, gridRow: 5 }}>
                {source === "gasvolume" && <span className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-green-600">jouw gegeven</span>}
                <h3 className="font-bold">Volume gas</h3>
                <p className="mb-2 text-xs text-slate-500">dm³ bij STP (0 °C, 1 atm)</p>
                <input value={vals.gasvolume} onChange={(e) => onField("gasvolume", e.target.value)} className={iCls} inputMode="decimal" placeholder="dm³" />
              </div>
            </div>
          </div>
          {warn && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{warn}</div>}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <button onClick={clearAll} className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-200">Wis alles</button>
            <span className="text-sm text-slate-400">of probeer:</span>
            <button onClick={() => loadEx("water")} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700">36 g water</button>
            <button onClick={() => loadEx("zuurstof")} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-brand-600 hover:bg-blue-200">11,2 dm³ O₂</button>
            <button onClick={() => loadEx("zoutzuur")} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-brand-600 hover:bg-blue-200">250 mL 0,10 M HCl</button>
            <button onClick={() => loadEx("deeltjes")} className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-bold text-brand-600 hover:bg-blue-200">6,022 × 10²³ deeltjes</button>
          </div>
        </section>

        {/* Rekenroute */}
        {steps.length > 0 && (
          <section className="mb-4 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <h2 className="text-base font-bold text-amber-700 mb-2">3. Rekenroute</h2>
            <ol className="list-decimal pl-5 space-y-1">
              {steps.map((s, i) => <li key={i} className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: s }} />)}
            </ol>
          </section>
        )}

        {/* Formules */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold mb-3">Formules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              ["n = m / M", "mol = gram ÷ molaire massa"],
              ["m = n × M", "gram = mol × molaire massa"],
              ["n = N / N_A", "mol = deeltjes ÷ Avogadro"],
              ["N = n × N_A", "deeltjes = mol × Avogadro"],
              ["c = n / V", "molariteit = mol ÷ liter"],
              ["n = c × V", "mol = molariteit × liter"],
              ["V_gas = n × V_m", "dm³ gas = mol × 22,4"],
              ["V = m / ρ", "cm³ = gram ÷ dichtheid"],
              ["ρ = m / V", "dichtheid = gram ÷ cm³"],
            ].map(([f, d]) => (
              <div key={f} className="rounded-lg border-l-4 border-brand-500 bg-slate-50 p-3"><strong className="text-brand-600">{f}</strong><br /><span className="text-sm text-slate-500">{d}</span></div>
            ))}
          </div>
        </section>

        {/* Dichtheid-calculator */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold mb-2">Dichtheid ρ berekenen</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Massa m (g)</label><input value={rhoMass} onChange={(e) => { setRhoMass(e.target.value); setTimeout(updRho, 0); }} className={iCls} inputMode="decimal" placeholder="bijv. 39,5" /></div>
            <div><label className={lCls}>Volume V (cm³)</label><input value={rhoVol} onChange={(e) => { setRhoVol(e.target.value); setTimeout(updRho, 0); }} className={iCls} inputMode="decimal" placeholder="bijv. 50" /></div>
          </div>
          {rhoRes && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: rhoRes }} />}
        </section>

        {/* Vm-calculator */}
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold mb-2">Reken met V<sub>m</sub> = 22,4</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lCls}>Aantal mol n</label><input value={vmMol} onChange={(e) => { setVmMol(e.target.value); setTimeout(() => updVm("mol"), 0); }} className={iCls} inputMode="decimal" placeholder="bijv. 1,00" /></div>
            <div><label className={lCls}>Volume gas V (dm³)</label><input value={vmVol} onChange={(e) => { setVmVol(e.target.value); setTimeout(() => updVm("vol"), 0); }} className={iCls} inputMode="decimal" placeholder="bijv. 22,4" /></div>
          </div>
          {vmRes && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: vmRes }} />}
        </section>
      </div>
    </main>
  );
}
