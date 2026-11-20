# Котельная Царёво-1 — mnemoschema

The SVG preserves the existing dispatch diagram and linked-meter displays.
The controller schema currently defines only connection metadata and timestamp;
`data-section` markers for process equipment are layout scaffolding, not state bindings.
Do not infer valve signals from the Spring-2 controller or its enum values.

## Unified ЗК1–ЗК4 — 20 November 2026

The four `returnValves[i]` sections now use the
[shared Nurlat-5 valve geometry](../../../.docs/mnemoschema-components.md#unified-valve-bodies-and-three-way-valves):
one **10 × 16** vertical bow-tie path, an **11-unit** stem to the left and a white
**8 × 8** square actuator. The former two polygons and enclosing rounded frame
are replaced by those three paths in one `.valve` group. Hovering either body
half, the stem or actuator highlights the whole assembly with yellow **1-unit**
outlines. Normal body/actuator outlines are **0.5**, and the stem is **1**.

The valves remain **static and grey**, without `data-state`, equipment commands or
property popovers. Hover is geometry feedback only. Hidden emergency-icon placeholders
remain unchanged; they do not establish a mapped alarm channel.

| Valve / group | Body centre | Actuator top-left | Caption end anchor |
|---|---|---|---|
| ЗК1 / `return-valve-1` | (221.8, 262) | (202.8, 258) | (197.8, 265.5) |
| ЗК2 / `return-valve-2` | (393.8, 262) | (374.8, 258) | (369.8, 265.5) |
| ЗК3 / `return-valve-3` | (533.8, 262) | (514.8, 258) | (509.8, 265.5) |
| ЗК4 / `return-valve-4` | (705.8, 262) | (686.8, 258) | (681.8, 265.5) |

Each caption remains upright at **10 px**, with its end anchor five units before
the actuator. Caption anchors move eight units left and half a unit up to clear
the new actuator; valve centres and pipes keep their original positions.
The root gains the `tsarevo1-mnemoschema` class for scoped valve hover rules.
All unrelated geometry, existing bindings, linked-meter displays, LF line endings
and the **`0 46 902.5 594.6`** viewBox are preserved.

See [before/after previews and verification](../../../.reports/2026-11-20-unified-valves/README.md).
These are local static-asset changes; production deployment is not established.
