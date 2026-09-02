"use client";

import { useEffect, useMemo, useState } from "react";
import { useDecisionRoom } from "@/hooks/use-decision-room";
import { makeReport, useWebMCP } from "@/hooks/use-webmcp";
import type { CriterionType } from "@/lib/types";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const fmt = (value: number, unit?: string) => unit === "₦" ? money.format(value) : `${value}${unit && unit !== "/10" ? ` ${unit}` : unit ?? ""}`;

export default function Home() {
  const room = useDecisionRoom(); useWebMCP(room);
  const [modal, setModal] = useState<"new-decision" | "option" | "criterion" | "report" | null>(null);
  const [scenarioCriterion, setScenarioCriterion] = useState("security");
  const [scenarioWeight, setScenarioWeight] = useState(40);
  const [webMCPAvailable, setWebMCPAvailable] = useState(false);
  useEffect(() => { setWebMCPAvailable(Boolean(document.modelContext)); }, []);
  const report = useMemo(() => makeReport(room.decision, room.scenarioResult), [room.decision, room.scenarioResult]);
  const selected = room.decision.options.find((o) => o.id === room.decision.selectedOptionId);

  return <main>
    <header className="topbar">
      <div className="brand"><span className="brandmark">DR</span><div><strong>Decision Room</strong><small>AI-assisted decisions, with humans in control</small></div></div>
      <div className="header-actions"><span className="webmcp" aria-live="polite"><i /> WebMCP {webMCPAvailable ? "connected" : "unavailable"}</span>
<button className="ghost" onClick={() => setModal("new-decision")}>New decision</button><button className="ghost" onClick={() => setModal("report")}>Export report</button><button className="primary" onClick={() => room.saveSelection()}>Save decision</button></div>
    </header>

    <section className="hero">
     <div><div className="eyebrow"><span>LIVE WORKSPACE</span><span>{room.decision.id === "apartment-demo" ? "APARTMENT SEARCH" : "CUSTOM DECISION"}</span></div><h1>{room.decision.title}</h1><p>Compare what matters, test your assumptions, and make a choice you can explain.</p></div>
     <div className="hero-status"><span>{room.decision.options.length} options evaluated</span><strong>{selected ? `Selected: ${selected.name}` : "Decision in progress"}</strong></div>
    </section>
    {room.decision.description && <div className="decision-brief"><strong>Decision brief</strong><p>{room.decision.description}</p></div>}     

    {room.decision.id === "apartment-demo" && <div className="notice">ⓘ All apartment names and values in this demonstration are fictional sample data.</div>}

    <div className="dashboard">
      <div className="main-column">
        <section className="winner-card">
          <div className="winner-icon">✦</div><div><span className="winner-label">RECOMMENDED OPTION</span><h2>{room.analysis.winner?.name}</h2><p>{room.analysis.explanation}</p></div>
          <div className="winner-score"><strong>{room.analysis.winner?.score.toFixed(1)}</strong><span>DECISION SCORE</span></div>
        </section>

        <section className="panel comparison">
          <div className="panel-heading"><div><span className="kicker">OPTIONS</span><h2>Side-by-side comparison</h2></div><button className="outline" onClick={() => setModal("option")}>＋ Add option</button></div>
          <div className="table-wrap"><table><thead><tr><th>Option</th>{room.decision.criteria.map((c) => <th key={c.id}>{c.name}<small>{c.type}</small></th>)}<th>Score</th></tr></thead>
          <tbody>{room.analysis.ranking.map((option) => <tr key={option.id} className={option.rank === 1 ? "leader" : ""}><td><b className="rank">{option.rank}</b><strong>{option.name}</strong>{option.rank === 1 && <span className="recommended">TOP MATCH</span>}</td>{room.decision.criteria.map((c) => <td key={c.id}>{fmt(option.values[c.id] ?? 0, c.unit)}</td>)}<td><strong className="score">{option.score.toFixed(1)}</strong></td></tr>)}</tbody></table></div>
          <div className="score-bars">{room.analysis.ranking.map((option) => <div className="score-row" key={option.id}><span>{option.name}</span><div><i style={{ width: `${option.score}%` }} /></div><b>{option.score.toFixed(1)}</b></div>)}</div>
        </section>

        <section className="panel scenario-panel">
          <div className="panel-heading"><div><span className="kicker">WHAT-IF LAB</span><h2>Challenge the recommendation</h2><p>Test a priority change without touching your base decision.</p></div><span className="temporary">TEMPORARY</span></div>
          <div className="scenario-controls"><label>Change priority<select value={scenarioCriterion} onChange={(e) => { setScenarioCriterion(e.target.value); setScenarioWeight(room.decision.criteria.find(c => c.id === e.target.value)?.weight ?? 0); }}>{room.decision.criteria.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>New importance <b>{scenarioWeight}%</b><input type="range" min="0" max="100" value={scenarioWeight} onChange={(e) => setScenarioWeight(+e.target.value)} /></label><button className="primary" onClick={() => room.scenario({ id: Date.now().toString(), name: `${room.decision.criteria.find(c => c.id === scenarioCriterion)?.name} at ${scenarioWeight}%`, createdAt: new Date().toISOString(), changes: [{ criterionId: scenarioCriterion, weight: scenarioWeight }] })}>Run scenario</button></div>
          {room.scenarioResult ? <div className="scenario-result"><div><span>BEFORE</span><strong>{room.scenarioResult.base.winner?.name}</strong><b>{room.scenarioResult.base.winner?.score.toFixed(1)}</b></div><em>→</em><div className="after"><span>AFTER</span><strong>{room.scenarioResult.result.winner?.name}</strong><b>{room.scenarioResult.result.winner?.score.toFixed(1)}</b></div><p>{room.scenarioResult.base.winner?.id === room.scenarioResult.result.winner?.id ? "Recommendation holds under this assumption." : "Recommendation changes under this assumption."}</p><button className="outline" onClick={() => room.applyCurrentScenario()}>Apply scenario</button></div> : <div className="scenario-empty">Adjust an importance above and run a scenario to see before-and-after rankings.</div>}
        </section>
      </div>

      <aside>
        <section className="panel priorities"><div className="panel-heading"><div><span className="kicker">CRITERIA</span><h2>Priorities</h2></div><button className="icon-button" aria-label="Add criterion" onClick={() => setModal("criterion")}>＋</button></div><p>Weights are normalized automatically.</p>
          {room.decision.criteria.map((c) => <label className="weight" key={c.id}><span><b>{c.name}</b><i className={c.type}>{c.type === "benefit" ? "↑ benefit" : "↓ cost"}</i></span><span><input aria-label={`${c.name} weight`} type="range" min="0" max="50" value={c.weight} onChange={(e) => room.setWeight(c.id, +e.target.value)} /><strong>{c.weight}%</strong></span></label>)}
          <button className="reset" onClick={room.reset}>↻ Reset demo</button>
        </section>
        <section className="panel activity"><div className="activity-head"><div><span className="live-dot" /><div><span className="kicker">LIVE</span><h2>Agent Activity</h2></div></div><span>{room.activities.filter(a => a.actor === "agent").length} calls</span></div>
          <div className="activity-list">{room.activities.length ? room.activities.map((a) => <div key={a.id} className={a.actor}><span>{a.actor === "agent" ? "✦" : "●"}</span><div><p>{a.message}</p><time>{new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · {a.actor}</time></div></div>) : <div className="activity-empty"><span>✦</span><p>Waiting for an agent</p><small>WebMCP tool calls will appear here in real time.</small></div>}</div>
          <div className="mcp-foot"><i /> Connected to page decision state</div>
        </section>
      </aside>
    </div>

    {modal === "new-decision" && <NewDecisionModal room={room} close={() => setModal(null)} />}
    {modal === "option" && <OptionModal room={room} close={() => setModal(null)} />}
    {modal === "criterion" && <CriterionModal room={room} close={() => setModal(null)} />}
    {modal === "report" && <div className="modal-backdrop"><div className="modal report-modal"><button className="close" onClick={() => setModal(null)}>×</button><span className="kicker">DECISION REPORT</span><h2>Ready to share</h2><textarea readOnly value={report} /><div className="modal-actions"><button className="outline" onClick={() => navigator.clipboard.writeText(report)}>Copy Markdown</button><button className="primary" onClick={() => setModal(null)}>Done</button></div></div></div>}
  </main>;
}

function OptionModal({ room, close }: { room: ReturnType<typeof useDecisionRoom>; close: () => void }) {
  const [name, setName] = useState(""); const [values, setValues] = useState<Record<string, number>>({});
  return <div className="modal-backdrop"><form className="modal" onSubmit={(e) => { e.preventDefault(); room.addOption({ id: `option-${Date.now()}`, name, values }); close(); }}><button type="button" className="close" onClick={close}>×</button><span className="kicker">NEW CANDIDATE</span><h2>Add an option</h2><label>Option name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Surulere Loft" /></label><div className="field-grid">{room.decision.criteria.map(c => <label key={c.id}>{c.name}<input required type="number" value={values[c.id] ?? ""} onChange={e => setValues(v => ({ ...v, [c.id]: +e.target.value }))} /></label>)}</div><div className="modal-actions"><button type="button" className="outline" onClick={close}>Cancel</button><button className="primary">Add option</button></div></form></div>;
}

function NewDecisionModal({ room, close }: { room: ReturnType<typeof useDecisionRoom>; close: () => void }) {
  const [title, setTitle] = useState("");
const [description, setDescription] = useState("");

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          room.startNewDecision(title, description);
          close();
        }}
      >
        <div className="eyebrow">NEW WORKSPACE</div>
        <h2>Start a new decision</h2>
        <p>Describe your decision, priorities, and constraints. Decision Room will help you structure and compare your choices.</p>

        <label>
          Decision title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Choose My Next Laptop"
          />
        </label>
<label>
  What are you trying to decide?
  <textarea
    required
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="e.g. I need a laptop for cybersecurity and programming. My budget is ₦800,000 and performance matters most."
    rows={4}
  />
</label>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit">Create decision</button>
        </div>
      </form>
    </div>
  );
}
function CriterionModal({ room, close }: { room: ReturnType<typeof useDecisionRoom>; close: () => void }) {
  const [name, setName] = useState(""); const [weight, setWeight] = useState(10); const [type, setType] = useState<CriterionType>("benefit");
  return <div className="modal-backdrop"><form className="modal" onSubmit={(e) => { e.preventDefault(); room.addCriterion({ id: `criterion-${Date.now()}`, name, weight, type }); close(); }}><button type="button" className="close" onClick={close}>×</button><span className="kicker">NEW FACTOR</span><h2>Add a criterion</h2><label>Criterion name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Noise level" /></label><label>Raw weight<input type="number" min="0" max="100" value={weight} onChange={e => setWeight(+e.target.value)} /></label><label>Optimization<select value={type} onChange={e => setType(e.target.value as CriterionType)}><option value="benefit">Benefit — higher is better</option><option value="cost">Cost — lower is better</option></select></label><div className="modal-actions"><button type="button" className="outline" onClick={close}>Cancel</button><button className="primary">Add criterion</button></div></form></div>;
}
