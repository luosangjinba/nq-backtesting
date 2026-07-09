# V6 Step 197.5 - UI Extraction Workflow Audit

## Purpose

Step 197.5 is an inserted UI process audit. It intentionally pauses Step 198
without changing replay, chart, pane, bar-data, or workstation runtime behavior.

The trigger was a review of `JCodesMore/ai-website-cloner-template`, a popular
MIT-licensed template for reverse-engineering websites with AI coding agents.
The goal is to decide whether its workflow can improve V6 UI quality without
importing an incompatible application stack.

## External Reference Reviewed

- Repository: https://github.com/JCodesMore/ai-website-cloner-template
- README: https://github.com/JCodesMore/ai-website-cloner-template/blob/master/README.md
- Agent instructions: https://github.com/JCodesMore/ai-website-cloner-template/blob/master/AGENTS.md
- Clone skill: https://github.com/JCodesMore/ai-website-cloner-template/blob/master/.claude/skills/clone-website/SKILL.md
- Package manifest: https://github.com/JCodesMore/ai-website-cloner-template/blob/master/package.json

Observed project shape:

- Next.js 16, React 19, TypeScript strict.
- shadcn/ui, Radix primitives, Tailwind CSS v4, oklch design tokens.
- A `/clone-website` agent workflow built around browser inspection,
  computed-style extraction, component specs, parallel builders, and visual QA.
- Multi-agent support files for Claude Code, Codex, Cursor, Gemini, Cline,
  Windsurf, OpenCode, Continue, and others.

## V6 Compatibility Decision

The project is useful as a **process reference**, not as a code or dependency
source for V6.

Accepted:

- Browser-based UI fact gathering.
- Full-page and section screenshots at desktop/tablet/mobile sizes.
- Explicit interaction-model classification before implementation.
- Computed-style extraction for exact colors, typography, spacing, borders,
  shadows, transitions, and responsive behavior.
- Stateful extraction for hover, active, click-driven, scroll-driven, and
  time-driven UI.
- Component-level spec files before UI implementation.
- Visual QA screenshots and regression notes after implementation.

Rejected for V6:

- Introducing Next.js, React, shadcn/ui, Tailwind, Radix, or their build chain.
- Pixel-perfect copying of third-party product UI.
- Asset scraping or logo/brand reuse outside permitted references.
- Multi-agent worktree builders as a default V6 implementation mechanism.
- Replacing V6 runtime ownership with React component state or framework-owned
  routing.

## V6-Specific UI Extraction Workflow

For any future V6 UI polish or parity task, use this lightweight workflow:

1. Define the target surface.
   - Examples: layout menu, pane action rail, transport controls, session
     dashboard rows, status readout, right rail.
   - Name the V6 owner: shell UI controller, chart surface, bridge, runtime,
     domain helper, or test harness.

2. Capture references.
   - Take current V6 screenshots at desktop and one narrower viewport.
   - If using an external UI reference such as FXReplay, take reference
     screenshots for comparison only.
   - Store generated test screenshots under existing test/tmp paths, not as
     unbounded product assets unless a step explicitly accepts them.

3. Classify interaction model before edits.
   - Static: visual only.
   - Click-driven: menu, tab, toggle, modal, dropdown.
   - Hover-driven: tooltip, hover reveal, button state.
   - Scroll-driven: sticky, scroll snapping, viewport-triggered transition.
   - Time-driven: animation, polling, auto-hide.

4. Extract exact UI facts.
   - Use `getComputedStyle()` for selected elements rather than visual guesses.
   - Record font size, line height, color, background, border, radius, padding,
     gap, dimensions, z-index, transform, transition, and pointer behavior.
   - Record every state separately; do not infer hover/active states from the
     default state.

5. Write a focused V6 spec before implementation.
   - Put it in `v6/docs/` for accepted process/audit work, or in
     `v6/docs/specs/` only for long-lived product contracts.
   - Keep the spec scoped to the owner boundary and expected tests.
   - Include non-goals so UI polish does not quietly add runtime behavior.

6. Implement through existing V6 ownership.
   - Shell-only UI stays in shell controller/surface modules.
   - Chart canvas controls stay chart-surface/chart-engine owned.
   - Runtime state changes go through commands/events.
   - Tests should verify behavior and visual invariants without relying on
     unrelated product chrome.

7. Run visual and boundary gates.
   - Add or reuse browser smoke coverage for the specific surface.
   - Include screenshot or canvas-pixel checks when visual regression risk is
     material.
   - Run relevant regression pack and `boundary-smoke` when shared surfaces are
     touched.

## Suggested Spec Template For Future UI Tasks

```markdown
# <Surface> UI Extraction Spec

## Owner Boundary
- Owner:
- Non-owners:
- Commands/events touched:
- Runtime state touched:

## Interaction Model
- Static/click/hover/scroll/time:
- Trigger:
- States:

## Current V6 Facts
- Screenshot:
- DOM owner:
- Computed styles:
- Responsive behavior:

## Reference Facts
- Reference source:
- Screenshot:
- Useful patterns:
- Rejected patterns:

## Implementation Notes
- Files expected:
- Non-goals:
- Tests:
```

## Impact On Step 198

Step 198 remains the next chart-data task. This inserted audit does not change
its implementation plan:

- Route HTF leftward-history prepends through the chart-data projection owner.
- Preserve delayed/coalesced/chunked history loading.
- Preserve visible K-line stability.
- Do not route auto-play or reset view yet.

## Acceptance

- The audit clearly separates reusable UI process from rejected framework/code
  adoption.
- A smoke test proves Step 197.5 remains documentation/process-only and does
  not introduce Next/React/Tailwind/shadcn dependencies into V6.
- `v6/TODO.md`, `v6/docs/INDEX.md`, and handoff docs keep Step 198 as the next
  executable implementation step.
