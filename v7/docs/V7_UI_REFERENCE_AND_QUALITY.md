# V7 UI Reference And Quality Standard

Status: binding presentation and review standard (2026-07-19)

## Product Goal

V7 should look deliberate and professional from its first visible slice. It is
not required to look identical to another product. References are decomposed
into reusable interaction, composition, density, and component-engineering
lessons; brands and product-specific decoration are not copied.

## Visual Product References

### FXReplay

User-provided reference captures:

- `tmp/2026-07-19_121225.png` — dark dashboard;
- `tmp/2026-07-19_121237.png` — light dashboard.

Absorb:

- calm application shell and strong page hierarchy;
- compact persistent navigation;
- consistent dark/light semantic tokens;
- readable metric cards and analytics density;
- clear primary actions without oversized marketing chrome;
- professional empty space, alignment, and grouping.

### TradeZella

User-provided public reference assets:

- `https://cdn.prod.website-files.com/630df394ff44d46a174df570/66b51ae53b7f47571233e3f6_Backtesting.webp`;
- `https://cdn.prod.website-files.com/630df394ff44d46a174df570/66bd25f2247c4a7876ef9ae3_Trade%20Replay-3-2.webp`.

Absorb:

- chart-first workstation composition;
- equivalent multi-chart chrome;
- compact top Replay/time controls;
- vertical drawing/tool rails;
- optional side panels for order, evidence, tags, and details;
- optional lower panels for positions/executions/data;
- clear pane boundaries and dense but legible financial data;
- overlays and controls that do not obscure the core chart task.

## GitHub Engineering References

Repository history records these user-selected references:

- `https://github.com/shadcn-ui/ui` — open-code component composition,
  semantic tokens, state variants, and accessible control behavior;
- `ui-ux-pro-max` — design-system and UI review aid; record the exact upstream
  URL/version before any code or generated artifact is adopted;
- `https://github.com/JCodesMore/ai-website-cloner-template` — browser fact
  gathering, computed-style extraction, component specs, and visual QA process.

V7 may choose a different frontend stack only through an explicit architecture
decision. These projects are references, not automatic dependencies. Their
useful patterns must be translated into V7-owned components, public UI module
contracts, tokens, accessibility semantics, and screenshot harnesses.

## Required UI Workflow

Before implementing a visible surface:

1. identify its UI owner and runtime ports;
2. capture/reference desktop states and interaction states;
3. write a small surface specification;
4. define tokens and reusable component variants before feature CSS spreads;
5. implement loading/empty/error/stale/ready states together;
6. verify keyboard, focus, contrast, overflow, layering, resize, and motion;
7. compare screenshots at fixed viewports;
8. conduct human review before the next roadmap step.

## Forbidden

- pixel-copying brand identity, logos, marketing callouts, or proprietary
  assets;
- letting visual components own Replay, Session, Bar Data, Chart, or Viewport;
- placeholder controls that imply unsupported behavior;
- raw colors/dimensions proliferating after a semantic token exists;
- desktop layouts that rely on one fixed screenshot resolution;
- debug/status internals in the normal customer reading path;
- adopting generated/reference code without ownership and license review.
