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

БАРС-02 GPRS units connect to the server, not the other way round (`.docs/bars02/bars02-notes.md`), so their
tools listen:

| Script | Device | What it does |
|---|---|---|
| `bars02_session.js --listen PORT [--host ADDR] [--minutes N] [--query clock,config,events] [--targets FILE] [--vkt7 ID@ADDRESS] [--every MIN] [--trace]` | БАРС-02 and the meters behind it | Stands in for the dispatch server for a few minutes with `flow-space/src/device-readers/bars02-gateway.js`: confirms every modem, logs its identifier and signal quality, asks the read-only questions and reads the target meters through the modem with the project's readers (ВКТ-7 so far). JSON lines on stdout, bytes on stderr with `--trace`. Run it on the old system's server (10.10.0.249, Node 22) on the port of a БАРС device reader that is stopped meanwhile; it needs the repository layout (`.tools/device-probes/` + `flow-space/src/device-readers/`). Never writes the configuration, the clock or the event acknowledgement. |
| `bars02_emulator.js SERVER_HOST SERVER_PORT --id IDENT [--meter HOST:PORT] [--csq N] [--trace]` | — | A pretend БАРС-02 for testing the gateway: answers the command protocol and in transparent mode relays to a real meter behind a TCP-serial gateway (e.g. the Весна-2 ВКТ-7, `94.180.252.2:505`, address 1). |

`bars02-session-2026-10-26.jsonl` and `bars02-trace-2026-10-26.log` are the first field run of `bars02_session.js` on
the old server's port 2907 (22 modems, their configurations, 12 ВКТ-7 reads; every byte): real replies to compare with.

`statum-scan.log` is the 2026-10-05 scan of the Statum PLC (boiler 3 burner power investigation).

For meters, the device readers themselves are the first probe: `node flow-space/src/device-readers/<type>-client.js
<host> <port> <address>` prints every frame.
