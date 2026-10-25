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
| `spring2_alarm_words.py [host] [port]` / `--self-test` | Весна-2 PLC | Reads the network pumps' alarm words 150–152 and state words 90–92 and decodes them like the Node-RED mapping (dry run = bit 1); the boilers' alarm words 146–149 and state words 86–89 next to their raw contacts (DI 640–683), boiler pump contactor states 103–106 and outlet valve states 99–102. Answers only while Node-RED's spring2 polling is paused (the PLC serves one Modbus client). |
| `spring1_modicons_tester.py` | Весна-1 Modicon controllers (boilers, pumps) | Reads registers 0–49 of both controllers as JSON, to compare with `.docs/spring-modicons-modbus-map.xlsx`. |
| `ek270_tester.py [host] [port] [step_timeout_s]` | EK270 (IEC 61107) | Polls like the reader but checks every frame (BCC, echoed address); logs other masters' frames as FOREIGN. |
| `mercury230_address_scan.py` | Меркурий 230 | Tries "open channel" on every address byte to find the meter's network address. |
| `mercury230_energy_probe.py` | Меркурий 230 | Diagnoses command 0x05 (accumulated energy) replies. |
| `mercury230_passive_listen.py <host> <port> [seconds]` | any RS-485 gateway | Listens without sending, to see whether another system polls the same line. |
| `vzljot026m_tester.py` | Взлёт ТСРВ-026М | Reads the measured values block with pymodbus (RTU over TCP). |
| `modbus_rtu_dump.js HOST PORT [--address N] [--blocks READER.js] [--range START-END] [--trace]` | any Modbus RTU meter behind a TCP-serial gateway | First contact with a meter: listens for another master, reads function 0x11 (identity), then every block of a reader's `BLOCKS` (or the given ranges) with function 4 (or `--function 3`); a failed block is scanned register by register (pairs from 0x8000, long+float groups of four), so the JSON output names every hole and keeps the register words for decoding offline. `--find-address 1-247` looks for the address. No dependencies: runs from stdin in the Node-RED container — `docker exec -i eta-flow-space node - HOST PORT --blocks /data/src/device-readers/<type>-client.js < .tools/device-probes/modbus_rtu_dump.js` — for gateways only the production server reaches (10.10.3.x). |

`statum-scan.log` is the 2026-10-05 scan of the Statum PLC (boiler 3 burner power investigation).

For meters, the device readers themselves are the first probe: `node flow-space/src/device-readers/<type>-client.js
<host> <port> <address>` prints every frame.
