---
name: requirements-researcher
description: "Feasibility and requirements clarification for software/infra/product work; use when asked what is possible, to assess constraints/tradeoffs, or to clarify user flows and turn ambiguous requests into actionable questions before handing off to spec-writer."
---

# Requirements Researcher

Assess feasibility, surface constraints, and ask clarifying questions (including user flow) so the request becomes spec‑ready.

## Defaults
- Scope: software/infra/product feasibility and user‑flow clarification.
- Output: structured notes + numbered clarifying questions.
- Research: use repo/docs first; use web search when feasibility depends on external/up‑to‑date facts.
- Handoff: end with a “Ready for spec-writer” summary.

## When to Use
Trigger on requests like:
- “What is possible / not possible here?”
- “Can we do X? What are the constraints?”
- “I want X, how can I get it done?”
- “Help me clarify the requirements/user flow.”

## Workflow
1) **Clarify intent**
   - Restate goal in one sentence.
   - Identify stakeholders and success criteria if implied.

2) **Feasibility scan**
   - List technical constraints, platform limits, and policy/security constraints.
   - Note dependency requirements (tools, APIs, secrets, accounts).
   - If facts are time‑sensitive or external (APIs, products, policies), use web search.

3) **User flow clarification**
   - Ask for the expected user journey, entry/exit points, edge cases, and error states.
   - Confirm UI/UX expectations if relevant (feedback, blocking, fallbacks).

4) **Tradeoffs + options**
   - Provide 2–3 viable approaches with pros/cons.
   - Call out risks, costs, and maintenance impact.

5) **Questions**
   - Ask only the smallest set of questions needed to remove ambiguity.
   - Prefer multiple‑choice when possible.

6) **Spec handoff**
   - Summarize the current understanding and decisions.
   - List unresolved questions.
   - State: “Ready for spec-writer” with what to include.

## Output Template
- **Goal (restated)**
- **What’s possible / constraints**
- **User flow questions**
- **Options + tradeoffs**
- **Open questions**
- **Ready for spec-writer** (bullet list of resolved items + required inputs)
