# Гагарина device state

The `gagarin-boiler-room` tab (`75715e53e3de61dd`) lives in
[Node-RED B](../../../flow-space-nodered-b/flows.json). Collector
`bab9bdc5393b0459` maps all 118 decoded device parameters explicitly, then awaits
`storeDeviceStateToCacheAsync` with the device code and the tab ID from `node.path`
before assigning `msg.deviceState`.

The seven converters emit 119 fields including `Time_Rqst`. That polling metadata
is deliberately excluded: `timestamp` continues to use the collector's `Date.now()`.
The Web API supplies `isConnected`. Each scalar schema field documents its source
in `$comment`.

| State section | Contents |
|---|---|
| Measurements | Outdoor temperature; network supply/return temperatures and pressures |
| Room state | Room state, local/remote control, manual/automatic operation |
| Cascade | All 15 decoded setpoints, correction, limits, bands, integrals, delays and warm-up settings |
| Alarms and inputs | Existing alarm bits plus separate battery-low, door, CO, CH4, security and fire PLC inputs |
| `sensors` | All 17 decoded sensor-fault, warning and alarm flags |
| `pressureLimits` | Four network supply/return pressure limits |
| `pressureThresholds` | Eight supply/return pressure thresholds: HH, H, L, LL |
| `temperatureThresholds` | Eight supply/return temperature thresholds: HH, H, L, LL |
| `boilers[0..2]` | К1.1–К1.3: normal/locked/running states, minimum/maximum burning, four command-feedback bits, alarm, start error and start order |
| `networkPumps[0..1]` | Н1.1–Н1.2: running state, start/stop command feedback and start error; main pump number is `mainNetworkPumpNumber` |

The mapping expansion adds 68 parameters to the previous 50. Existing state paths,
values, array ordering and storage behavior are preserved. No history migration is
needed. Newly added schema properties remain optional for older snapshots; collected
scalar values allow null while retaining primitive types for the UI schema helper.
All editors are read-only, including settings and PLC command-feedback bits.

Pressures are already converted by `data_convert` from MPa to бар (×10); the
collector does not scale them again. Temperatures are °C. Real values retain the
existing seven-significant-digit convention. The exported flow does not establish
units for delays, warm-up time or cascade integrals; no unit is assumed.

Physical TE1 is outdoor air, TE2 is supply and TE3 is return. The threshold decoder
instead numbers supply/return as T1/T2. `t_inl`/`t_out` and `P_inl`/`P_out` likewise
mean network supply/return. Return HH/H threshold values are retained even though
the converters do not provide corresponding active alarm flags.

`tempBoilersSetpoint` retains its existing name and `tnet` source for history
compatibility. The converter describes `tnet` as the current network temperature
target. This expansion does not rename or reinterpret that historical field.

`isBatteryLow` remains the alarm-list bit `Batt_alarm`; the distinct raw input
`Battery_low` is `isBatteryInputLow`. The door, CO, CH4, security and fire inputs are
also independent of their alarm-list bits. `Battery_good = 1` means a fault and is
not inverted. Boolean inputs preserve null; the collector never derives PLC alarms
from displayed measurements.

Offline validation uses the existing [flow-chain runner](../../../.tools/flow-chain/README.md)
with `--flows flow-space-nodered-b/flows.json`. The complete source inventory,
synthetic register fixture, decoded function diff and verification results are in
the local [mapping report](../../../.reports/2026-11-gagarin-data-schema/README.md).
The expansion is a local source change; it does not deploy the flow or update live state.
