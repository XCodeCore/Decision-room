export type CriterionType = "benefit" | "cost";
export interface Criterion { id: string; name: string; weight: number; type: CriterionType; unit?: string }
export interface Option { id: string; name: string; values: Record<string, number> }
export interface Decision { id: string; title: string; description?: string; criteria: Criterion[]; options: Option[]; selectedOptionId?: string; updatedAt: string }
export interface Contribution { criterionId: string; normalized: number; weighted: number }
export interface RankedOption extends Option { score: number; rank: number; contributions: Contribution[] }
export interface Analysis { ranking: RankedOption[]; winner?: RankedOption; explanation: string }
export interface ScenarioChange { criterionId: string; weight?: number; valueAdjustments?: Record<string, number> }
export interface Scenario { id: string; name: string; changes: ScenarioChange[]; createdAt: string }
export interface ScenarioResult { scenario: Scenario; decision: Decision; base: Analysis; result: Analysis }
export interface Activity { id: string; at: string; actor: "agent" | "human"; message: string }
