# Decision Room

[Live demo](https://decision-room-gray.vercel.app) · [GitHub repository](https://github.com/XCodeCore/Decision-room)

Decision Room is a collaborative decision-making workspace where people and browser-based AI agents evaluate options against weighted priorities, test what-if scenarios, and turn a comparison into an explainable recommendation. The included demo compares three apartments, while the underlying decision model is reusable for choices such as jobs, vendors, universities, projects, or products.

## Why it matters

Important decisions are often spread across notes, spreadsheets, and conversations, making priorities difficult to inspect and recommendations difficult to defend. Decision Room keeps the human-visible interface, agent tools, and scoring logic connected to one decision state. People remain in control while an agent can perform useful, structured work on the same data and make every tool interaction visible in the Agent Activity panel.

## Core features

- Weighted multi-criteria option ranking with benefit and cost criteria
- Adjustable priorities with immediate score and ranking updates
- Temporary what-if scenarios with before-and-after recommendations
- Add-option and add-criterion workflows
- Explicit final-decision saving
- Copy-friendly Markdown decision reports
- Browser `localStorage` persistence with no database required
- Live Agent Activity history for actual WebMCP tool calls
- Responsive dashboard with comparison tables and score bars

> **Demo data:** Lekki Heights, Yaba Central, Ikeja Gardens, and all associated apartment values are fictional sample data created solely for this demonstration.

## WebMCP integration

WebMCP is a core interaction layer, not a separate demo. The page registers tools once through the current imperative browser API, `document.modelContext.registerTool(...)`, with strict JSON input schemas. Tool handlers use the same shared React actions, decision state, and scoring engine as the human interface. State-changing calls update the visible UI and persist through the normal application state path; genuine tool executions are recorded in Agent Activity.

The application exposes exactly nine tools:

| Tool | Purpose |
| --- | --- |
| `get_decision` | Retrieve the live decision, criteria, options, weights, selection, and ranking. |
| `add_option` | Add a candidate with values for the current criteria. |
| `add_criterion` | Add a benefit or cost criterion and initial values for existing options. |
| `populate_decision` | Populate multiple researched criteria and real options in one atomic tool call. |
| `set_criterion_weight` | Change a base criterion weight and recalculate the visible ranking. |
| `compare_options` | Return normalized scores, criterion contributions, ranking, and explanation. |
| `run_scenario` | Test temporary weight or value changes without overwriting the base decision. |
| `save_decision` | Save the current winner or a specified option, optionally applying the active scenario. |
| `generate_report` | Produce a structured Markdown summary of the current decision and scenario. |

The header badge reports the browser's real WebMCP state: **WebMCP Connected** when `document.modelContext` exists and **WebMCP Unavailable** otherwise.

## Architecture and technology

- Next.js 15 App Router
- React 19 and TypeScript
- Plain responsive CSS
- Client-side React state with `localStorage` persistence
- Reusable framework-independent decision engine in `lib/decision-engine.ts`
- WebMCP registration and schemas in `hooks/use-webmcp.ts`
- No database, authentication service, or external AI API

## How scoring works

Each criterion is marked as either a **benefit** (higher is better) or **cost** (lower is better). For every criterion, option values are min-max normalized to a `0–1` scale, with cost criteria inverted. Non-negative criterion weights are normalized internally, each normalized value is multiplied by its normalized weight, and the contributions are summed into a score out of 100. Options are ranked by total score, and the explanation highlights the winner's largest weighted contributions. Scenario analysis runs against a cloned decision so the base state changes only when a scenario is explicitly applied.

## Run locally

Requirements: Node.js and npm.

```bash
git clone https://github.com/XCodeCore/Decision-room.git
cd Decision-room
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a production check:

```bash
npm run build
npm start
```

## Test WebMCP

1. Open the local app or [live demo](https://decision-room-gray.vercel.app) in a browser build that supports the imperative WebMCP API and provides `document.modelContext` in the page.
2. Confirm the header says **WebMCP Connected**. If it says **WebMCP Unavailable**, that browser session does not expose the API.
3. Use the browser's WebMCP-capable agent or inspection tooling to discover the nine registered tools.
4. Create a new decision and describe your priorities, constraints, and budget.
5. Ask the agent: `Read my decision brief, research suitable real options, populate Decision Room, and compare them.`
6. For multi-option research, the agent can use `populate_decision` once to add the criteria and candidates atomically instead of making many separate writes.
7. Verify the comparison and Agent Activity panel update from the real tool calls.
8. Try `run_scenario` to test a temporary priority change without overwriting the base decision.
9. Finish with `save_decision` and `generate_report` to verify selection and report output.

WebMCP is an evolving browser capability, so availability depends on the browser build and any required feature configuration. The app does not polyfill or simulate support.

## Why this is strong for the WebMCP Challenge

- **WebMCP Leverage:** Nine meaningful tools let an agent inspect, modify, compare, simulate, save, and report on the same live state used by the UI.
- **Execution:** Strict schemas, shared state actions, immutable updates, real activity logging, scenario isolation, persistence, and a production-ready responsive interface create a coherent end-to-end experience.
- **Potential Impact:** The generic decision engine can support many high-value personal and organizational choices beyond the apartment demonstration.
- **Creativity & Ambition:** Decision Room makes agent reasoning tangible: judges can watch structured agent actions immediately alter an explainable human-controlled decision workspace.

## License

Released under the [MIT License](LICENSE).
