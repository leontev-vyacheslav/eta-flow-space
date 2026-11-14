# Oven160 at 10.10.3.20:502: legacy reader protocol

Inspected 2026-11-14. **The old dispatching system is configured to use standard Modbus TCP,
unit ID 1, for this endpoint.** This conclusion comes from its C# source and the device-specific
configuration in the local **2026-11-01** ETA24 backup. No protocol request was sent to the PLC
as part of this investigation, and the current database settings were not queried.

## Device-specific configuration

The backup contains:

| Setting | Value |
|---|---|
| Access point | 809 — `Ethernet-Moxa5110-10.10.3.20:502` |
| Endpoint | `10.10.3.20:502` |
| Measurement device | 1766 — `Oven160-1` |
| Device model ID | 91 — `Oven160` |
| `ProtocolSubTypeId` | **1**, named `Empty` in the enum; selects **Modbus TCP** in this reader |
| `NetworkAddress` / Modbus unit ID | **1** |
| Register description | Dynamic parameter **115**, entity **1766** |
| Instantaneous read function | **03 — Read Holding Registers** |

The access-point description is a saved label. It does not establish the actual hardware model,
serial operating mode, or protocol behind that IP. The reader's configured framing is the useful
evidence here. The route may involve a gateway or reach the PLC directly; this inspection does
not distinguish those possibilities.

The extracted [configuration subset](reference/oven160-10.10.3.20-config-2026-11-01.json)
and [11 instantaneous read blocks](reference/oven160-10.10.3.20-read-registers-2026-11-01.json)
are preserved alongside this note. The read-block extract contains the original parameter
definitions and descriptions; omitted `RegisterType` values default to zero (`ReadOnly`) in C#.

## C# source evidence

The checkout is at `D:\Projects\Eta\EnergyTechAudit.PowerAccounting.Engine`, mounted locally
at `/mnt/d/Projects/Eta/EnergyTechAudit.PowerAccounting.Engine`. Paths below are relative to
that checkout.

| File and lines | Evidence |
|---|---|
| `EnergyTechAudit.PowerAccounting.DeviceReader.Engine/AccessPointBox.cs:60–71` | `Oven160DeviceCode` selects the shared `SiemensController` reader. The class name covers several PLC manufacturers. |
| `EnergyTechAudit.PowerAccounting.Engine.Common/Types/Proxy/ProtocolSubType.cs:5–7` | `Empty = 1`, `ModbusRtu = 2`, `ModbusAscii = 3`. |
| `EnergyTechAudit.PowerAccounting.DeviceReader.Siemens/Types/MeasurementDeviceInfo.cs:88–123` | Reads dynamic parameter `DeviceModbusRegistersDescription`, then the device's `ProtocolSubTypeId`. |
| `EnergyTechAudit.PowerAccounting.DeviceReader.Siemens/Types/SiemensReadOnlyRegisters.cs:130–164` | Subtype 1 builds a Modbus TCP MBAP header; subtype 2 uses the separate RTU package helper. |
| `EnergyTechAudit.PowerAccounting.DeviceReader.Siemens/SiemensController.cs:718–814` | Sends the prepared bytes over `NetworkStream`, matches the TCP transaction identifier, and parses data after the TCP header. RTU has a separate address/CRC branch. |

The TCP request builder emits:

```text
transaction-id[2]  00 00  00 06  unit-id  function  start-register[2]  count[2]
```

That is a 12-byte Modbus TCP read request, including its MBAP header. The TCP branch does
not append an RTU CRC or encode an ASCII frame. Register addresses and counts are big-endian.

For example, with transaction ID `0001`, the configured unit ID and first read block produce:

```text
00 01 00 00 00 06 01 03 00 00 00 01
                  ^^ ^^ ^^^^^ ^^^^^
                  ID FC start count
```

This reads one holding register at zero-based address 0. The expected successful response is
11 bytes: 7-byte MBAP header, function, byte count and two data bytes. This frame was derived
offline from the source and saved configuration; it was not transmitted.

## Instantaneous read blocks in the saved configuration

Addresses below are zero-based values passed directly to Modbus, rather than 4xxxx display
notation. Original Russian descriptions are retained in the JSON extract.

| Start | Count | Function | Expected TCP reply bytes | Saved description |
|---:|---:|---:|---:|---|
| 0 | 1 | 3 | 11 | Клапаны (регистр 0) |
| 92 | 84 | 3 | 177 | Мгновенные давления и температуры |
| 1 | 3 | 3 | 15 | Состояние насосов, стоп/работа (регистры 1-3) |
| 4 | 1 | 3 | 11 | Режимы работы котлов (регистр 4) |
| 5 | 2 | 3 | 13 | Управляющие сигналы клапанов + звуковая сигнализация (регистры 4-5) |
| 7 | 2 | 3 | 13 | Режимы работы котлов (регистры 7-8) |
| 7 | 4 | 3 | 17 | Тревоги (регистры 9-10-11-12) |
| 15 | 11 | 3 | 31 | Аварии (регистры 15-25) |
| 35 | 2 | 3 | 13 | Режим (регистры 35-36) |
| 56 | 4 | 3 | 17 | Температуры регулятора (регистры 56 и 58) |
| 66 | 2 | 3 | 13 | Температуры регулятора (регистр 66) |

Some descriptions disagree with their numeric start/count: the block starting at 7 with count 4
covers 7–10, although its description says 9–12. The block at 5/count 2 likewise covers 5–6,
although its description says 4–5. Preserve the actual configured addresses and resolve those
labels against the PLC project before assigning meanings to values.

For `Single` values, the TCP reader reconstructs each float with bytes `[b1,b0,b3,b2]` before
calling little-endian `BitConverter.ToSingle`: each register is big-endian and the low 16-bit word
comes first. This is specific to the legacy application mapping and must be preserved when
matching its readings.

## Verification and limits

- Traced the C# model selection, protocol enum, request construction and response parsing.
- Matched endpoint and device IDs in `Business.AccessPoint.json` and `Business.MeasurementDevice.json`
  from `ETA24 (2026-11-01#08-55-03).zip.zip`.
- Extracted only the instantaneous `ReadOnly` register descriptions from dynamic parameter 115
  for measurement device 1766.
- Confirmed every extracted block uses function 3 and the standard TCP response length `9 + 2 × count`.
- The archived configuration is dated 2026-11-01. Current device behavior and any intervening
  configuration changes remain unverified at the protocol level.

No decompilation was needed after locating the source checkout. Earlier in-place inspection
read assembly type/method metadata only; the reader assemblies were not executed or exported.

## Live confirmation during the Node-RED B integration

On 2026-11-14, the subsequent `nurlat-5-boiler-room` integration confirmed **Modbus TCP,
unit 1, function 03** through temporary forwarding from instance B on .246 via .249.
Seven read-only requests successfully retrieved the 74 register words needed for all
146 named `R` parameters in `.docs/.sources/Карта регистров Нурлат.xlsx`.

A complete stock-node Node-RED 4.1.3 polling chain also produced all 146 mapped parameters
at **19:42:19 Moscow time**. The workbook is the integration's register-map authority;
its alarm addresses supersede the inconsistent descriptions in the archived mapping above.
See the [site documentation](../../flow-space-statics/devices/nurlat-5-boiler-room/README.md)
and [live verification report](../../.reports/2026-11-14-nurlat-5-boiler-room/README.md).
