# Step 308: Comparison Window Split-only Workflow Migration Plan

Date: 2026-06-22

## Background

Step 307 delivered the Comparison Window MVP and parity work for the main comparison workflow:

- cross-instrument and cross-timeframe loading;
- sliding/floating window behavior;
- comparison-source PDA/Segment/FVG creation;
- SMT rendering, selection, and locate path;
- replay progressive HTF behavior;
- workspace persistence and Replay History restore;
- browser verification and user documentation.

Step 307.13 concluded that old Split should not be removed yet. Comparison Window is the preferred replacement candidate, but several Split-only workflows remain.

## Product Boundary

Step 308 is a planning and migration track for Split-only workflows. It must not directly remove Split.

The removal rule is:

- migrate or explicitly drop Split-only workflows first;
- verify real trading-day workflows;
- only then open a dedicated Split removal plan.

## Split-only Gaps To Address

### 1. Inspector And Calendar Locate Routing

Current issue:

- Calendar, Time Reaction, Order Review reason, and Live Record locate paths still branch explicitly between primary and secondary viewport controllers.
- Comparison Window has its own context and chart manager, but these Inspector routes do not yet target it generically.

Goal:

- Introduce chart-context locate routing that can target primary, secondary, or comparison views.
- Preserve existing primary/secondary behavior.
- Add Comparison Window locate/flash where the source object belongs to the comparison view or the user requests it.

Acceptance checks:

- Calendar object locate can target primary, old secondary, and comparison when available.
- Time Reaction locate with chart target no longer hard-codes only primary/secondary.
- Order Review reason locate uses `sourceChartId` / chart context routing.
- Live Record locate uses the same routing.
- Browser or focused smoke covers at least one comparison locate path from Inspector.

### 2. Pick-preview Routing

Current issue:

- Order Setup edit pick and Segment actor pick preview have primary/secondary-specific implementations.
- Preview cursor, hover, and click routing do not yet use a generic chart context.

Goal:

- Route pick-preview workflows through chart context capabilities.
- Support comparison chart coordinate mapping and preview cursor behavior where the workflow is valid.

Acceptance checks:

- Existing primary and secondary pick workflows keep working.
- Comparison Window can participate in supported pick workflows without duplicate per-chart branches.
- Escape/cancel behavior clears the correct preview cursor.

### 3. Comparison Hit-test Link To Active Setup

Current issue:

- Old Split secondary context menu can hit-test existing PDA, Segment, and Composite Move objects and link them to active Order Setup.
- Comparison Window currently supports creating comparison-source objects and adding bar evidence, but existing-object hit-test link is not equivalent.

Goal:

- Add comparison-view hit-test for existing PDA/Segment/FVG/Composite evidence.
- Add Link To Active Setup actions where the hit object is valid for the comparison view.

Acceptance checks:

- Existing comparison PDA can be hit-tested and linked to active setup.
- Existing comparison Segment can be hit-tested and linked to active setup.
- Existing comparison FVG can be hit-tested and linked to active setup.
- Composite behavior is either implemented or explicitly deferred with a reason.

### 4. Advanced PDA Workflow Decision

Current issue:

- Secondary context menu supports advanced PDA workflows that Comparison Window does not yet support:
  - OB;
  - Breaker;
  - Fib;
  - Range PDA drafts;
  - EQH/EQL Point Sets.

Goal:

- Decide workflow-by-workflow whether each belongs in Comparison Window.
- Avoid blindly cloning all secondary menu complexity into the floating window.

Decision options for each workflow:

- migrate to Comparison Window;
- keep only on primary chart and old Split;
- drop from comparison scope because it is low-frequency or confusing in floating/sliding mode.

Acceptance checks:

- A table records each workflow, decision, rationale, and required implementation/test if migrated.
- If any advanced workflow remains Split-only, Split removal remains blocked.

### 5. Real-use Audit Checklist

Current issue:

- Browser smoke proves technical paths, but Split removal needs real workflow confidence.

Goal:

- Define a concrete real-use checklist for 1-2 trading days.

Checklist candidates:

- NQ primary + ES comparison SMT workflow.
- 1M primary + 1H/4H comparison replay workflow.
- Comparison PDA/Segment/FVG creation and later Inspector review.
- Active Order Setup evidence from comparison view.
- Calendar/object locate across primary and comparison views.
- Replay History restore with Comparison Window enabled.
- User preference review: floating/sliding window versus fixed Stack/Side Split.

Exit condition:

- Only after this checklist passes should a later task create a Split removal plan.

## Planned Steps

### Step 308.1: Freeze Removal Boundary

- Confirm Step 308 does not delete Split.
- Confirm migration work must preserve old primary/secondary behavior.
- Confirm Split removal requires a later dedicated plan.

### Step 308.2: Chart Context Locate Routing

- Audit current locate call sites.
- Design a chart-context locate API covering primary, secondary, and comparison.
- Plan focused/browser coverage for comparison locate from Inspector.

### Step 308.3: Pick-preview Routing

- Audit Order Setup edit pick and Segment actor pick code paths.
- Design chart-context preview cursor and click routing.
- Define supported comparison pick workflows and non-goals.

### Step 308.4: Comparison Hit-test Link

- Audit secondary hit-test link behavior.
- Map PDA, Segment, FVG, and Composite hit-test APIs to comparison chart context.
- Plan context-menu actions and active setup link tests.

### Step 308.5: Advanced PDA Workflow Decision

- Create the workflow decision table.
- Decide migrate/keep/drop for OB, Breaker, Fib, Range PDA drafts, and EQH/EQL Point Sets.
- Convert migrate decisions into implementation steps.

### Step 308.6: Real-use Audit Checklist

- Write the real-use audit checklist.
- Define pass/fail signals.
- Decide whether a later Split removal plan is allowed.

## Non-goals

- Do not remove Split in Step 308.
- Do not rewrite all chart managers into a full multi-window framework unless a workflow requires it.
- Do not duplicate advanced PDA menu complexity in Comparison Window without a usage reason.
- Do not change Review JSON schema solely for temporary UI window state.
