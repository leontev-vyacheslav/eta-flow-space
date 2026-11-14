# OWEN PLC160 / ОВЕН ПЛК160

Focused programming and communication references, collected and curated **2026-11-14**.
The installed controller's hardware revision is unconfirmed, so this set retains the
operating and programming manuals for both the original PLC160 and **[M02]**.

The collection contains **14 PDFs**, the manufacturer troubleshooting FAQ and **three
local protocol/configuration files**, plus this index, source manifest and checksums.
Retained downloads total **35.0 MiB**. Most vendor documents
are Russian; a complete English CODESYS 2.3 programming reference is included.

## Start here

1. For our dispatching/Node-RED integration, read [PROTOCOL.md](PROTOCOL.md). Live checks
   confirmed **Modbus TCP, unit ID 1, function 03**, at `10.10.3.20:502`.
2. Use the controller-generation-specific manuals below for hardware details and
   CODESYS project configuration.
3. Use the general CODESYS reference for ST, IL, LD, FBD/SFC, types, function blocks
   and IDE behavior.

The current Nurlat register-map authority is
[`Карта регистров Нурлат.xlsx`](../.sources/Карта%20регистров%20Нурлат.xlsx).
The [Nurlat-5 site documentation](../../flow-space-statics/devices/nurlat-5-boiler-room/README.md)
and [workbook-to-state map](../../flow-space-statics/devices/nurlat-5-boiler-room/source-map.json)
describe the implemented read-only integration.

## Controller-specific manuals

| Document | PDF pages | Download source |
|---|---:|---|
| [Original PLC160 operating manual](manuals/plc160-legacy-operating-manual-2989.pdf) | 72 | [source](https://owen.ru/uploads/168/re_plk160_2989.pdf) |
| [Original PLC110/PLC160 programming manual v1.9](programming/plc110-160-programming-manual-v1.9.pdf) | 197 | [source](https://owen.ru/uploads/373/plc110_160_rp_v1.9.pdf) |
| [PLC160 [M02] operating manual v1.21, June 2026](manuals/plc160-m02-operating-manual-v1.21.pdf) | 40 | [source](https://owen.ru/downloads/re_plk160_m02.pdf) |
| [PLC1xx [M02] programming manual v1.34, September 2024](programming/plc1xx-m02-programming-manual-v1.34.pdf) | 170 | [source](https://owen.ru/uploads/467/rp_plk1hh_m02__1-ru-75044-1.34.pdf) |

## CODESYS 2.3 and engineering guides

| Document | PDF pages | Download source |
|---|---:|---|
| [First steps with CODESYS 2.3](programming/cds23_firststeps.pdf) | 9 | [source](https://owen.ru/uploads/373/cds23_firststeps.pdf) |
| [Complete CODESYS 2.3 reference v2.8 — Russian](programming/cds23_manual_v2.8.pdf) | 452 | [source](https://owen.ru/uploads/373/cds23_manual_v2.8.pdf) |
| [Complete CODESYS 2.3 reference v4.0 — English, ABB-hosted 3S edition](programming/codesys23-programming-and-visualization-manual-en-v4.0.pdf) | 568 | [source](https://library.e.abb.com/public/08057e49639db3dfc1257c210040dd77/2CDC125019M0202.pdf) |
| [I/O and communication configuration v2.0](programming/plc1xx_plcconfiguration_v2.0.pdf) | 108 | [source](https://owen.ru/uploads/373/plc1xx_plcconfiguration_v2.0.pdf) |
| [PLC-Browser diagnostics](programming/plc1xx_plcbrowser.pdf) | 9 | [source](https://owen.ru/uploads/373/plc1xx_plcbrowser.pdf) |
| [Application/source transfer](programming/plc1xx_applicationtransfer.pdf) | 4 | [source](https://owen.ru/uploads/373/plc1xx_applicationtransfer.pdf) |
| [RETAIN variables on PLC110/PLC160 [M02] v1.1](programming/plc1xxm02_retainmanual_v1.1.pdf) | 6 | [source](https://owen.ru/uploads/373/plc1xxm02_retainmanual_v1.1.pdf) |

The English document is a general 3S CODESYS language/IDE reference packaged by ABB.
Controller-specific settings come from the OWEN manuals. Its visualization supplement
is included within the same PDF.

## Communication programming references

| Document | PDF pages | Download source |
|---|---:|---|
| [SysLibSockets: TCP and UDP](libraries/cdsv2.3_sockets_v1.0.pdf) | 46 | [source](https://owen.ru/uploads/373/cdsv2.3_sockets_v1.0.pdf) |
| [OwenModbusSlave](libraries/owenmodbusslave.pdf) | 9 | [source](https://owen.ru/uploads/373/owenmodbusslave.pdf) |
| [Modbus master library](libraries/modbus.pdf) | 20 | [source](https://owen.ru/uploads/373/modbus.pdf) |

The master and slave documents describe CODESYS libraries used by PLC applications.
For the verified wire format of this installed endpoint, use [PROTOCOL.md](PROTOCOL.md).

## Troubleshooting and integration findings

- [Offline CODESYS 2.3 troubleshooting FAQ](web/codesys-faq.html)
- [Protocol investigation and live confirmation](PROTOCOL.md)
- [Legacy endpoint/configuration subset, November 1 snapshot](reference/oven160-10.10.3.20-config-2026-11-01.json)
- [Legacy instantaneous register map, November 1 snapshot](reference/oven160-10.10.3.20-read-registers-2026-11-01.json)

The legacy map is retained as historical evidence. The current workbook resolves some
of its inconsistent alarm descriptions; use the Nurlat workbook/source-map links above
for the new flow.

## Sources and integrity

The document tables link to the original download URLs. [manifest.json](manifest.json)
retains file sizes, SHA-256 hashes, PDF page counts, collection date, applicability and
alternate source URLs for every retained document.

Official locations for software and compatible target files:

- [PLC160 software and support](https://owen.ru/product/plk160/software)
- [CODESYS 2.3 software](https://owen.ru/product/codesys_v2)
- [Firmware, target files and USB drivers](https://owen.ru/product/codesys_v2/service_po)
- [Manufacturer documentation portal](https://docs.owen.ru/product/plk160m02)

Verify the local collection from this directory:

```sh
sha256sum -c SHA256SUMS
```
