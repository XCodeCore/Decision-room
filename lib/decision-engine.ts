import type { Analysis, Criterion, Decision, RankedOption, Scenario, ScenarioResult } from "./types";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function analyzeDecision(decision: Decision): Analysis {
  const weightTotal = decision.criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0) || 1;
  const ranges = Object.fromEntries(decision.criteria.map((criterion) => {
    const values = decision.options.map((option) => Number(option.values[criterion.id] ?? 0));
    return [criterion.id, { min: Math.min(...values), max: Math.max(...values) }];
  }));

  const ranked = decision.options.map((option) => {
    const contributions = decision.criteria.map((criterion) => {
      const value = Number(option.values[criterion.id] ?? 0);
      const { min, max } = ranges[criterion.id];
      const span = max - min;
      const normalized = span === 0 ? 1 : criterion.type === "benefit" ? (value - min) / span : (max - value) / span;
      return { criterionId: criterion.id, normalized: clamp(normalized), weighted: clamp(normalized) * Math.max(0, criterion.weight) / weightTotal };
    });
    return { ...option, score: contributions.reduce((sum, item) => sum + item.weighted, 0) * 100, contributions, rank: 0 };
  }).sort((a, b) => b.score - a.score).map((option, index) => ({ ...option, rank: index + 1 })) as RankedOption[];

  const winner = ranked[0];
  if (!winner) return { ranking: [], explanation: "Add options to calculate a recommendation." };
  const strengths = [...winner.contributions].sort((a, b) => b.weighted - a.weighted).slice(0, 2)
    .map((item) => decision.criteria.find((c) => c.id === item.criterionId)?.name).filter(Boolean);
  const margin = ranked[1] ? winner.score - ranked[1].score : winner.score;
  return { ranking: ranked, winner, explanation: `${winner.name} leads by ${margin.toFixed(1)} points, driven most by ${strengths.join(" and ")}.` };
}

export function applyScenario(decision: Decision, scenario: Scenario): Decision {
  const next = structuredClone(decision);
  for (const change of scenario.changes) {
    const criterion = next.criteria.find((c) => c.id === change.criterionId);
    if (criterion && change.weight !== undefined) criterion.weight = Math.max(0, change.weight);
    if (change.valueAdjustments) {
      for (const [optionId, adjustment] of Object.entries(change.valueAdjustments)) {
        const option = next.options.find((o) => o.id === optionId);
        if (option) option.values[change.criterionId] = (option.values[change.criterionId] ?? 0) + adjustment;
      }
    }
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function runScenario(decision: Decision, scenario: Scenario): ScenarioResult {
  const changed = applyScenario(decision, scenario);
  return { scenario, decision: changed, base: analyzeDecision(decision), result: analyzeDecision(changed) };
}

export function normalizedWeights(criteria: Criterion[]) {
  const total = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
  return Object.fromEntries(criteria.map((c) => [c.id, c.weight / total]));
}
