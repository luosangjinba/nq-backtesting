# V7 Future Visual Primitive Requirements — Line Family, Circle, And Arc

Status: product-owner requirement captured on 2026-08-17; documentation-only;
not part of P1c.3/H120 and not authorized for implementation

## Line Family

One parametric line primitive family must eventually represent:

- a finite Segment;
- a one-direction Ray;
- a two-direction Infinite Line.

Each form must support horizontal, vertical, and arbitrary orientation through
parameters. Horizontal and vertical are constrained parameterizations of the
same coordinate model, not separate semantic plugins. A future contract must
make endpoints, origin/direction, coordinate space, clipping, hit testing, and
Replay/no-future behavior explicit before implementation.

## Circle

A Circle is generally not a primary market-geometry mark because its radius is
normally unrelated to price or elapsed time. Its intended role is a compact
screen-space reminder around a key point. A future design may anchor its center
to a market point, but radius and appearance remain screen-space presentation
parameters and must not imply a price/time measurement.

## Arc

An Arc is also screen-space presentation rather than price/time geometry. Its
intended role is to call attention to the visual shape of a selected market
move or pattern. Curvature must not be interpreted as a calculated market
value, duration, or forecast.

## Boundary

These requirements assign no semantic meaning such as FVG, Fib, BSL/SSL,
IFVG, OB, MA, MACD, or KDJ. Later semantic plugins may compose admitted visual
primitives through portable contracts, while the Chart owner remains the sole
native writer. A separate accepted specification, owner review, harness, and
implementation instruction are required. P1c.3 implements none of this family.
