"use client";

import { useEffect } from "react";
import { analyzeDecision, normalizedWeights } from "@/lib/decision-engine";
import type { Criterion, Decision, Option, Scenario } from "@/lib/types";

type Tool = { name: string; title: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean }; execute: (input: any) => Promise<any> | any };
declare global { interface Document { modelContext?: { registerTool(tool: Tool, options?: { signal?: AbortSignal }): Promise<void> } } }
type Actions = ReturnType<typeof import("./use-decision-room").useDecisionRoom>;
const schema = (properties: object = {}, required: string[] = []) => ({ type: "object", additionalProperties: false, properties, required });

export function useWebMCP(room: Actions) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const current = () => room.stateRef.current;
    const agentLog = room.log;
    const serialize = (d: Decision) => ({ decision: d, normalizedWeights: normalizedWeights(d.criteria), ...analyzeDecision(d) });
    const register = (tool: Tool) => context.registerTool(tool, { signal: controller.signal }).catch((error) => console.warn(`WebMCP: ${tool.name}`, error));
    const tools: Tool[] = [
      { name: "get_decision", title: "Get decision", description: "Use first to inspect the live decision, options, criteria, weights, selected option, and ranking before making recommendations.", inputSchema: schema(), annotations: { readOnlyHint: true }, execute: () => { agentLog("Agent retrieved current decision", "agent"); return serialize(current()); } },
      { name: "add_option", title: "Add option", description: "Add a candidate option to the current decision. Supply a numeric value for every criterion ID returned by get_decision.", inputSchema: schema({ name: { type: "string", minLength: 1 }, values: { type: "object", additionalProperties: { type: "number" }, minProperties: 1 } }, ["name", "values"]), execute: ({ name, values }) => { const option: Option = { id: `option-${Date.now()}`, name, values }; room.addOption(option, "agent"); return { added: option, ...serialize(current()) }; } },
      { name: "add_criterion", title: "Add criterion", description: "Add a reusable evaluation criterion when an important factor is missing. Existing options receive the supplied initial values or zero.", inputSchema: schema({ name: { type: "string", minLength: 1 }, weight: { type: "number", minimum: 0, maximum: 100 }, type: { type: "string", enum: ["benefit", "cost"] }, unit: { type: "string" }, values: { type: "object", additionalProperties: { type: "number" } } }, ["name", "weight", "type"]), execute: ({ name, weight, type, unit, values = {} }) => { const criterion: Criterion = { id: `criterion-${Date.now()}`, name, weight, type, unit }; room.addCriterion(criterion, "agent", values); return { added: criterion, ...serialize(current()) }; } },
      { name: "populate_decision", title: "Populate decision", description: "Populate the current decision in one atomic operation with multiple researched criteria and real options. Provide option values in the same order as the criteria. Decision Room generates all internal IDs automatically.", inputSchema: schema({
        criteria: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1 },
              weight: { type: "number", minimum: 0, maximum: 100 },
              type: { type: "string", enum: ["benefit", "cost"] },
              unit: { type: "string" }
            },
            required: ["name", "weight", "type"]
          }
        },
        options: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1 },
              values: {
                type: "array",
                minItems: 1,
                items: { type: "number" }
              }
            },
            required: ["name", "values"]
          }
        }
      }, ["criteria", "options"]), execute: ({ criteria, options }) => {
        const stamp = Date.now();

        const builtCriteria: Criterion[] = criteria.map((criterion: Omit<Criterion, "id">, index: number) => ({
          ...criterion,
          id: `criterion-${stamp}-${index}`
        }));

        const builtOptions: Option[] = options.map((option: { name: string; values: number[] }, optionIndex: number) => {
          if (option.values.length !== builtCriteria.length) {
            throw new Error(`Option "${option.name}" has ${option.values.length} values but ${builtCriteria.length} criteria were provided.`);
          }

          return {
            id: `option-${stamp}-${optionIndex}`,
            name: option.name,
            values: Object.fromEntries(
              builtCriteria.map((criterion, criterionIndex) => [
                criterion.id,
                option.values[criterionIndex]
              ])
            )
          };
        });

        room.populateDecision(builtCriteria, builtOptions, "agent");
        return serialize(current());
      } },
      { name: "set_criterion_weight", title: "Set criterion weight", description: "Change one criterion's base importance and immediately recalculate the visible ranking. Use run_scenario instead if the change must remain temporary.", inputSchema: schema({ criterionId: { type: "string", minLength: 1 }, weight: { type: "number", minimum: 0, maximum: 100 } }, ["criterionId", "weight"]), execute: ({ criterionId, weight }) => { room.setWeight(criterionId, weight, "agent"); return serialize(current()); } },
      { name: "compare_options", title: "Compare options", description: "Calculate and explain the current normalized weighted ranking, including per-criterion contributions and trade-offs.", inputSchema: schema(), annotations: { readOnlyHint: true }, execute: () => { const result = serialize(current()); agentLog(`Agent recalculated ${current().options.length} option scores`, "agent"); return result; } },
      { name: "run_scenario", title: "Run what-if scenario", description: "Temporarily test changed criterion weights or per-option value adjustments without overwriting the base decision.", inputSchema: schema({ name: { type: "string", minLength: 1 }, changes: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, properties: { criterionId: { type: "string" }, weight: { type: "number", minimum: 0, maximum: 100 }, valueAdjustments: { type: "object", additionalProperties: { type: "number" } } }, required: ["criterionId"] } } }, ["name", "changes"]), execute: ({ name, changes }) => room.scenario({ id: `scenario-${Date.now()}`, name, changes, createdAt: new Date().toISOString() }, "agent") },
      { name: "save_decision", title: "Save decision", description: "Explicitly save an option as the final selected decision. Omit optionId to save the current winner.", inputSchema: schema({ optionId: { type: "string" }, applyScenario: { type: "boolean", default: false } }), execute: ({ optionId, applyScenario }) => { if (applyScenario) room.applyCurrentScenario("agent"); room.saveSelection(optionId, "agent"); return serialize(current()); } },
      { name: "generate_report", title: "Generate report", description: "Generate a structured, copy-friendly decision report with weights, rankings, winner reasoning, scenario findings, trade-offs, and final selection.", inputSchema: schema(), annotations: { readOnlyHint: true }, execute: () => { agentLog("Agent generated decision report", "agent"); return { markdown: makeReport(current(), room.scenarioRef.current), ...serialize(current()) }; } },
    ];
    tools.forEach(register);
    return () => controller.abort();
  }, []); // registered once; callbacks use refs for fresh decision state
}

export function makeReport(decision: Decision, scenario: ReturnType<Actions["scenario"]> | null) {
  const analysis = analyzeDecision(decision); const weights = normalizedWeights(decision.criteria);
  const selected = decision.options.find((o) => o.id === decision.selectedOptionId);
  const rows = analysis.ranking.map((o) => `| ${o.rank} | ${o.name} | ${o.score.toFixed(1)} |`).join("\n");
  const criteria = decision.criteria.map((c) => `- ${c.name}: ${(weights[c.id] * 100).toFixed(1)}% (${c.type})`).join("\n");
  const scenarioText = scenario ? `${scenario.scenario.name}: ${scenario.base.winner?.name} → ${scenario.result.winner?.name}` : "No temporary scenario is currently open.";
  return `# Decision Report: ${decision.title}\n\n_Generated ${new Date().toLocaleString()} · Demo values are fictional._\n\n## Recommendation\n\n**${analysis.winner?.name ?? "No winner"}** — ${analysis.explanation}\n\n## Criteria\n\n${criteria}\n\n## Final ranking\n\n| Rank | Option | Score |\n|---:|---|---:|\n${rows}\n\n## Trade-offs\n\nScores use min–max normalization. The recommendation reflects the stated priorities; changing high-weight criteria can change the outcome.\n\n## Scenario analysis\n\n${scenarioText}\n\n## Final selected decision\n\n${selected?.name ?? "Not yet selected"}\n`;
}
