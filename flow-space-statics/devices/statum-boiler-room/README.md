# Котельная Статум

The diagram copies the current **25 November 2026** Tsarevo-2 SVG, scoped CSS and SVG-driven
plugin, adapted to Statum's **three boilers and three ЩУК panels**. Node-RED A's
`statum-boiler-room` collector and the existing Statum state definitions remain authoritative.
Changes are prepared locally and are not deployed.

## Layout and three-boiler adaptation

The canvas remains **805 × 610**: the eight header cards and lower source-water/tank/makeup
circuit still need the reference width. Native equipment sizes, process translation
**(130,−40)**, header, weather position, emergency panel and lower circuit retain the latest
[Tsarevo-2 layout](../tsarevo2-boiler-room/README.md). Removing a boiler does not change
application fit, zoom or pan behavior.

- Boiler centers remain process-local **100 / 270 / 440**, with **65 × 70** bodies,
  **40 × 30** burners and **18 × 27** flames. Their circulation pumps НК1–НК3 and
  return valves ЗК1–ЗК3 retain their positions. Boiler 4, НК4, ЗК4, their warnings,
  captions and complete gas/supply/return branches are removed.
- The gas header ends at the third burner takeoff **(392,130)**. Supply and boiler-return
  headers end at boiler 3, **(440,155)** and **(440,370)**. These three former tee dots
  are removed because the new endpoints are two-segment elbows. Remaining tees,
  crossing bridges and the first-boiler return drop to the network manifold are preserved.
- **All four network pumps remain**, along with two source-water pumps, two makeup pumps,
  the discrete reserve-water tank and both auto/manual makeup valves.
- The latest straight left gas/В1 inlets, compact lower circuit, aligned supply/return
  instruments, widened filling-mode card and black hydraulic pipes are inherited.
  Gas pipes remain orange; tank water remains blue. No shared standard or unrelated
  diagram is changed.
- The two-column **«Аварийные события»** panel keeps ten tiles. The combined **«ЩУК»**
  tile at **(71,318)** lists only `boilerControlLinkStatuses[0..2].isActive`, in panel
  order. Any strictly false link makes it red; absent/null links do not infer an alarm.
  No fourth-panel reference remains in bindings or state expressions.

## State and interaction contract

All **101 unique displayed property paths** resolve against Statum's schema. The schema
retains exactly three boilers, three boiler valves and three ЩУК links, plus its existing
pump enum definitions. Statum's collector maps network-pump alarms directly to their own
indexes; Tsarevo-2's swapped first/second alarm-source wiring is not copied.

Boiler bodies/burners expose **status, mode, burner power**. Flames retain the confirmed
**status 2 / 3 / 4** predicate and Spring-2's three-second glow; burner backgrounds stay grey.
Boiler warnings expose **status, alarm**, and circulation-pump warnings use only the
confirmed boiler alarm **512**. No independent circulation-pump working signal is invented.
Network/source pumps preserve running/fault codes **64 / 512**, makeup pumps **8 / 32**.
Their original alarm and drive diagnostics remain available on the corresponding warnings.

ЗК1–ЗК3 retain Statum's position meanings: **1 closed grey**, **2 open white**, **0 intermediate
yellow**. White actuator squares have blue outlines only for confirmed open. Body, stem and
actuator share hover and property ownership. The two mode-only makeup valves stay neutral grey.

The reserve tank keeps four discrete switches and their original highest-active priority.
Its symbolic fill and separate **«Уровень»** instrument follow the reference; no analogue
percentage is inferred. The copied empty plugin leaves all state updates to SVG bindings,
replacing the old absolute-coordinate tank mutation. CSS and animation names are scoped to
`statum-mnemoschema`.

## Optional weather display

The reference's station artwork and header placement are retained: **27 × 27** hitbox at
canvas **(19,46)**, temperature at **(51,56)**, and **62 × 19** description box at **(51,59)**.
Temperature and two-line description use **8 px**. Popover order remains description,
temperature, pressure, humidity, wind speed, direction and gust.

Only optional `WeatherModel` / `WeatherWindModel` display definitions are added to Statum's
schema. Existing fields, required lists, units, enum values and array bounds are preserved.
The follow-up flow change adds `statum-weather` to Node-RED A and optional cached-weather
enrichment to the existing collector, matching Tsarevo-2. Its interval is **600 seconds** and
its location cache expires after **1800 seconds**. It uses registered coordinates and the
existing inherited provider credential; neither is embedded in this diagram or the flow export.
Controller `tempOutAir` remains independent, and missing/failed weather still permits PLC storage.
The station stays dimmed with blank readouts whenever no cached weather is available.
The flow change is prepared locally; live weather requires deployment and successful weather/PLC polls.
Existing collection fields and alarm rules are unchanged.

## Verification and status — 25 November 2026

See the [before/after previews and browser checks](../../../.reports/2026-11-25-statum-diagram/README.md).
The diagram change was committed separately. See the
[weather-flow follow-up and offline checks](../../../.reports/2026-11-25-statum-weather/README.md).
The weather-flow change is local; no production deployment or database migration was performed.
