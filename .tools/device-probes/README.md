# Device probes

Read-only probes of field devices from the developer machine, used to check a meter or controller live before
(and while) its Node-RED reader or mapping is written. They only read: Modbus function 03/04, meter "read"
commands, or passive listening. Many devices share a gateway line with production polling (and sometimes with
another company's polling system), so keep probes short and spaced out.

Setup: `python3 -m venv venv && venv/bin/pip install -r requirements.txt` (pymodbus, for the Взлёт026 tester);
the other scripts use only the standard library.

| Script | Device | What it does |
|---|---|---|
| `modbus_register_scan.py HOST PORT [START-END ...] [--unit N] [--function 3]` | any Modbus TCP controller | Prints the non-zero registers of the ranges (function 3 holding, 4 input), or every bit (1 coils, 2 discrete inputs); skips late answers, logs refused connections. Run it with the equipment in two states and compare. |
| `spring1_modicons_tester.py` | Весна-1 Modicon controllers (boilers, pumps) | Reads registers 0–49 of both controllers as JSON, to compare with `.docs/spring-modicons-modbus-map.xlsx`. |
| `ek270_tester.py [host] [port] [step_timeout_s]` | EK270 (IEC 61107) | Polls like the reader but checks every frame (BCC, echoed address); logs other masters' frames as FOREIGN. |
| `mercury230_address_scan.py` | Меркурий 230 | Tries "open channel" on every address byte to find the meter's network address. |
| `mercury230_energy_probe.py` | Меркурий 230 | Diagnoses command 0x05 (accumulated energy) replies. |
| `mercury230_passive_listen.py <host> <port> [seconds]` | any RS-485 gateway | Listens without sending, to see whether another system polls the same line. |
| `vzljot026m_tester.py` | Взлёт ТСРВ-026М | Reads the measured values block with pymodbus (RTU over TCP). |

`statum-scan.log` is the 2026-10-05 scan of the Statum PLC (boiler 3 burner power investigation).

For meters, the device readers themselves are the first probe: `node flow-space/src/device-readers/<type>-client.js
<host> <port> <address>` prints every frame.
