# Muslum-9 session decisions

These decisions describe the approved Muslum-9 diagram as of 2026-11-12. Preserve them when
working on this site unless the user changes them. For another site, establish its own state
contract before borrowing these choices. Consult the current
[device README](../../../../flow-space-statics/devices/muslum-9-boiler-room/README.md),
[SVG](../../../../flow-space-statics/devices/muslum-9-boiler-room/mnemo-schema.svg) and
[CSS](../../../../flow-space-statics/devices/muslum-9-boiler-room/mnemo-schema.css) for maintained details.

## Source and channel meaning

The device code is `muslum-9-boiler-room` (singular). Its collector is in
`flow-space-nodered-b/flows.json`; verify the current tab and converter chain before changing it.
`isConnected` comes from the API, while `timestamp` comes from the collector's `Date.now()`.

| Instrument | State property |
|---|---|
| TE11 / TE12 | `boilers[0].temperature` / `boilers[1].temperature` |
| TE1 | `tempOutNet` |
| TE21 / TE22 | `tempInNetCircuit1` / `tempInNetCircuit2` |
| TE2 | `tempInBoiler` |
| PE1 (P1) | `pressOutNet` |
| PE22 (P2, after network pumps) | `pressInBoiler` |
| PE21 (P3, before network pumps) | `pressInNet` |

The second boiler temperature's supply/return meaning remains uncertain; retain the neutral
`temperature` name. The association of PLC flags T1–T6 with the six diagram temperature instruments
is unconfirmed. The user chose to keep those flags in `Параметры` → `Датчики`, without assigning
their warning/fault colours to individual instruments. Outdoor-temperature and P1–P3 mappings
are established and have their own fault/warning outlines.

Pressures already have the converter's factor of ten and are in бар; do not scale them again.
`Boil*_norm` polarity remains uncertain: preserve `isAlarmInput` without inversion or independent
alarm colouring. This export has no pump-fault signals or separate boiler-temperature setpoint.
`tempOutNetTarget` is the supply target; `tempOutNetSetpoint` is shown as `По погоде`.

## Binding ownership and order

- `infoIcon`: `isConnected` first, `timestamp` second, even though both also appear elsewhere.
  Its remaining unique properties are currently `cascadeTempDeadband`,
  `cascadeMinTempRisePerMinute`, `cascadeTempRisePerMinute` and `isGasValveClosed`. Recompute this
  remainder after binding changes. Keep alarms, faults, warnings and other duplicates out of it.
- Connection status is bound on the information icon, `other-parameters-frame` and shared
  `timestamp` group. Date/time turn red when disconnected and black when connected. The icon's
  colour follows connection status only. The outer frame also retains its general-alarm indication.
  Other readings and equipment follow their own reported state properties.
- `boilerRoomState`, `controlMode` and `boilerRoomMode` each have their own matching header card.
- Both boiler bodies and burner click targets start with `isWorking`, `isLocked`, `temperature`,
  then command-feedback and PID fields. On the diagram, `isAlarmInput`, `isStartError` and `isAlarm`
  belong only to the emergency tiles, with no duplicate binding on bodies or status labels.
- Inside `network-pumps-alarm`, bind only the three `networkPumps[].isWorking` fields. Remove
  `networkPumps[].number` only from this summary group; individual pump symbols retain their number.
  A stopped pump does not imply an alarm.
- Boiler outlines are blue when running and black when stopped; locked bodies are amber.
  Running pumps have blue outlines. Flames follow their boiler's reported `isWorking`.
- SVG expressions intentionally omit missing-value guards and fallback text, per the user's
  complete-state display assumption. The schema still permits nulls; this is a diagram decision,
  not permission to change how collector nulls are stored.

## Spring-2 hover appearance

The implemented CSS scopes rules to `#muslum9-mnemoschema`:

- Bound elements: pointer cursor; fill/stroke transitions of `0.25s ease !important`.
- Bound text/tspan on hover: bold; `stroke-width: 2px !important`.
- Bound shapes on hover: `stroke: #ffeb3b !important`, `stroke-width: 2px !important`,
  `filter: drop-shadow(0 0 4px rgba(255, 235, 59, 0.5))`, `opacity: 0.9 !important`.
- Alarm-group rules also cover hovering the group over its bound rectangle. Normal state colours
  return on pointer leave. Decorative pump/flame artwork does not capture pointer events.

These values define this approved reference appearance; they do not mandate restyling unrelated
diagrams during a narrower binding task.
