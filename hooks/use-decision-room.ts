"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeDecision, runScenario } from "@/lib/decision-engine";
import { demoDecision } from "@/lib/demo";
import type { Activity, Criterion, Decision, Option, Scenario, ScenarioResult } from "@/lib/types";

const STORAGE_KEY = "decision-room:v1";
const uid = () => Math.random().toString(36).slice(2, 9);

export function useDecisionRoom() {
  const [decision, setDecision] = useState<Decision>(demoDecision);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(decision);
  const scenarioRef = useRef<ScenarioResult | null>(null);
  useEffect(() => { stateRef.current = decision; }, [decision]);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setDecision(JSON.parse(saved)); } catch { /* start fresh */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(decision)); }, [decision, ready]);

  const log = useCallback((message: string, actor: Activity["actor"] = "human") => {
    setActivities((items) => [{ id: uid(), at: new Date().toISOString(), actor, message }, ...items].slice(0, 40));
  }, []);
  const updateDecision = useCallback((updater: (current: Decision) => Decision) => {
    setDecision((current) => { const next = updater(current); stateRef.current = next; return { ...next, updatedAt: new Date().toISOString() }; });
  }, []);
  const setWeight = useCallback((id: string, weight: number, actor: Activity["actor"] = "human") => {
    const old = stateRef.current.criteria.find((c) => c.id === id);
    updateDecision((d) => ({ ...d, criteria: d.criteria.map((c) => c.id === id ? { ...c, weight } : c) }));
    log(`${actor === "agent" ? "Agent changed" : "Changed"} ${old?.name ?? id} weight from ${old?.weight ?? 0}% to ${weight}%`, actor);
  }, [log, updateDecision]);
  const addOption = useCallback((option: Option, actor: Activity["actor"] = "human") => {
    updateDecision((d) => ({ ...d, options: [...d.options, option] })); log(`${actor === "agent" ? "Agent added" : "Added"} option ${option.name}`, actor);
  }, [log, updateDecision]);
  const addCriterion = useCallback((criterion: Criterion, actor: Activity["actor"] = "human", initialValues: Record<string, number> = {}) => {
    updateDecision((d) => ({ ...d, criteria: [...d.criteria, criterion], options: d.options.map((o) => ({ ...o, values: { ...o.values, [criterion.id]: initialValues[o.id] ?? 0 } })) }));
    log(`${actor === "agent" ? "Agent added" : "Added"} criterion ${criterion.name}`, actor);
  }, [log, updateDecision]);
  const scenario = useCallback((value: Scenario, actor: Activity["actor"] = "human") => {
    const result = runScenario(stateRef.current, value); setScenarioResult(result); scenarioRef.current = result;
    log(`${actor === "agent" ? "Agent ran" : "Ran"} “${value.name}” scenario${result.base.winner?.id !== result.result.winner?.id ? ` — recommendation changed from ${result.base.winner?.name} to ${result.result.winner?.name}` : " — recommendation held"}`, actor);
    return result;
  }, [log]);
  const applyCurrentScenario = useCallback((actor: Activity["actor"] = "human") => {
    const active = scenarioRef.current; if (!active) return; setDecision(active.decision); stateRef.current = active.decision;
    log(`${actor === "agent" ? "Agent applied" : "Applied"} scenario “${active.scenario.name}” to the base decision`, actor); setScenarioResult(null); scenarioRef.current = null;
  }, [log]);
  const saveSelection = useCallback((optionId?: string, actor: Activity["actor"] = "human") => {
    const id = optionId ?? analyzeDecision(stateRef.current).winner?.id; if (!id) return;
    updateDecision((d) => ({ ...d, selectedOptionId: id })); const name = stateRef.current.options.find((o) => o.id === id)?.name;
    log(`${actor === "agent" ? "Agent saved" : "Saved"} ${name} as the final decision`, actor);
  }, [log, updateDecision]);
   const startNewDecision = useCallback((title: string) => {
    const fresh: Decision = {
      id: `decision-${Date.now()}`,
      title: title.trim(),
      criteria: [],
      options: [],
      updatedAt: new Date().toISOString(),
    };
    setDecision(fresh);
    stateRef.current = fresh;
    setScenarioResult(null);
    scenarioRef.current = null;
    setActivities([]);
    log(`Started new decision: ${fresh.title}`);
  }, [log]);
 const reset = useCallback(() => { const fresh = demoDecision(); setDecision(fresh); stateRef.current = fresh; setScenarioResult(null); scenarioRef.current = null; setActivities([]); log("Reset fictional apartment demo"); }, [log]);

  return { decision, startNewDecision, stateRef, scenarioRef, analysis: analyzeDecision(decision), activities, scenarioResult, log, setWeight, addOption, addCriterion, scenario, applyCurrentScenario, saveSelection, reset };
}
