# EtaModem

Collected 2026-10-28. Sources: the manual `eta-gsm-manual-re-165-001-160517-2018.pdf` (converted from the user's
«Протокол ETA modem.odt», last saved 21.03.2018); the old ETA engine
(`d:\Projects\Eta\EnergyTechAudit.PowerAccounting.Engine\`: `…DeviceReader.EtaModem` (`EtaModemServer.cs`,
`Commands.cs`, `Functions.cs`, `DataFormatDictionary.cs`), `…DeviceReader.Engine\Dispatchers\EtaGsmDispatcher.cs`,
`…DeviceReader.EtaDiscret`, `…Common.Logic\Device.cs`); the old system's table dumps of 2026-09; the old server
10.10.0.249, read only.

## What it is

«Модем сотовой связи GPRS-RS232/485 (GPRS-модем S800Based)», РЭ 165-001-160517-2018, made by ООО «ИЦ
ЭНЕРГОТЕХАУДИТ» itself: a SIM800 GSM module with a controller, RS-232 and RS-485, 3 discrete inputs (firmware
revision 100) or a time relay (revision 200), 5–12 V. The old system calls it transport server model 22 `EtaModem`
and polls it with the `EtaGsm` device readers (type 9). Like the [БАРС-02](../bars02/bars02-notes.md) it is a
**TCP client** that connects to the dispatch server and stays connected; it can also work as a TCP server
(`modemMode` 1, `listenPort` 5010), which the old system does not use.

## Connection

1. The modem connects to `addr_1:port_1` (up to 3 servers, `servCount`, tried in turn; the manual's defaults are
   91.144.143.40:2781–2783). The SIM800 runs in transparent mode (`AT+CIPMODE=1`), which allows one connection at
   a time, so a second server is a fallback, not a parallel channel as on the БАРС-02.
2. It sends three ASCII lines: the identifier (`myId`, up to 64 characters; in the fleet 4-digit numbers like
   `0458`, all unique), `CSQ: <rssi>,<ber>`, and its own Modbus address (default 254):

   ```
   0458\r\n
   CSQ: 28,0\r\n
   254\r\n
   ```

   The old dispatcher takes the first line as the identifier (cp1251) and closes unknown modems. **No reply is
   expected** (no `#Y$` as on the БАРС-02).
3. From then on the link is **transparent** to the serial port: the meter reader talks to the meter directly over
   the socket. There is no command mode, no port selection and no escape; after a poll the socket simply stays open.
4. The modem checks the link after `checkPeriod` (default 120 s) of silence, reconnects after `timeForReconnect`
   (10 s) and reboots every `rebootTime` minutes (default 1440 = 24 h).

## Controlling the modem in band

While connected, the modem takes a Modbus RTU frame as a command for itself when its address (254 unless
`modBusId` says otherwise), function (03, 04, 06, 0x10), register range and count (at most 20 registers) fit;
it then answers itself and drops whatever comes from the meter bus meanwhile. **Wait at least 1 s of silence
before such a frame**, so the modem sees it as a new message. The same commands work over USB / RS-232 (9600) after
`READY` + `CMD` at power-up; `+++` there gives AT commands (`AT+CIPFLT` sets an IP filter for server mode).

Register "addresses" are byte offsets into the settings structure: an int takes 2, so N registers read 2N bytes.

Settings (function 03 read, 0x10 write):

| Address | Name | Meaning (default) |
|---|---|---|
| 0x0000 | isSetting | write 0 to save the settings to EEPROM (reads 1) |
| 0x0002 | debug | 1: debug codes (`StepErr` + code) to the serial port |
| 0x0004 | modemMode | 0 TCP client, 1 TCP server |
| 0x0006 | modBusId | the modem's Modbus address (254) |
| 0x0008 | myId | identifier, char[64] ("new ip-modem") |
| 0x0048 | pin | SIM PIN (1234) |
| 0x004A, 0x006A, 0x007E | apn, login, password | APN (internet), user and password (megafon) |
| 0x0092 | listenPort | server-mode port (5010) |
| 0x0094 | servCount | servers to try in turn, 1–3 |
| 0x0096 / 0x00A6, 0x00A8 / 0x00B8, 0x00BA / 0x00CA | addr_1 / port_1 … addr_3 / port_3 | servers: IP char[16] / port |
| 0x00CC | selectSerial | 0 RS-232, 1 RS-485, 2 both |
| 0x00CE | baudeRate | 2 registers, low word first (9600) |
| 0x00D2 | dataFormat | 8N1 0x06, 8N2 0x0E, 8E1 0x26, 8E2 0x2E, 8O1 0x36, 8O2 0x3E, 7N1 0x04, 7E1 0x24 … |
| 0x00D4–0x00DE | nmRetry, waitTm, sendSz, rxMode, rxSize, rxTimer | IP packet retries (5), 200 ms waits before a packet (2), serial block size (1024), delays |
| 0x00E0, 0x00E2, 0x00E4 | checkPeriod, timeForReconnect, rebootTime | 120 s, 10 s, 1440 min |

State (function 04): 0x0000 `statusDI` (bits 0–2 inputs DI1–DI3, bits 8–10 their triggers, cleared by the read),
0x0002 `locIP` char[16], 0x0012 `signalStr` "XX,XX" (as `AT+CSQ`), 0x0018 `revision` (100 discrete inputs, 200
time relay). Commands (function 06, register 0): 1 reboot, 2 drop the connection.

## How the old engine uses it

- **Keep-alive** every queue tick (45 s) on an idle modem: read holding register 0x0006 at the modem's address
  (`FE 03 00 06 00 01` + CRC), 7-byte reply. An all-zero reply makes it send the reboot command (`FE 06 00 00 00 01`).
- **Line settings** only when the access point has `IsNeedToReconfigure` (249 of 1873 in ETA24): read the revision
  (input 0x0018), the baud rate (0x00CE) and the format (0x00D2), and write the ones that differ from the meter's
  settings; firmware other than 101 needs 2.5 s before and 20 s after a baud change. It never writes `isSetting` 0,
  so a change lives until the next reboot (24 h), and those access points are set again before every poll.
  Meters behind one modem share its single line setting (`selectSerial` 2 serves RS-232 and RS-485 at once).
- `EtaDiscrete` (device model) reads `statusDI` for the three discrete inputs.
- The modem's address can be set per access point (dynamic parameter `AccessPointNetworkAddress`); no access point
  sets it, so it is 254 everywhere.

## The fleet (dumps of 2026-09; old server checked 2026-10-28)

| Database | EtaModems | Connected in 2026-09 | Active meters (read in 2026-09) | Listener |
|---|---|---|---|---|
| ETA24 | 1873 | 1563 | 1778 (1300) | 10.10.0.249: 2784 (GSM), 2785 (GSM2), 2788 (GSM3), 2789 (GSM4) |
| ASD | 151 | 96 | 115 (79) | 192.168.6.8:3535 |
| HOUSE | 218 | 208 | 213 (195) | 94.180.242.18:2785 |
| CHELNY | 45 | 22 | 31 (4) | 192.168.1.38:2785 |

On 10.10.0.249 on 2026-10-28, 839 EtaModems were connected (2788: 410, 2789: 262, 2785: 151, 2784: 16), all from
mobile operators' public addresses (81.222.x.x, 217.118.x.x, 178.176.x.x…), through the router's forwards; the
services are `ETA$GSMDeviceReader`, `ETA$GSM2DeviceReader`, `ETA$GSM3DeviceReader`, `ETA$GSM4DeviceReader`.

ETA24, meters read in September: ВКТ-7 552, ТВ7 303, КМ-5 212, ТСРВ-033 62, ТСРВ-043 41, ТСРВ-026М 22, РМ-5 19,
ТСРВ-022 17, ECL 310 15, ТСРВ-024М 14, ТЭМ-104 9, СПТ-941 v20 9 and a few others. Mostly in Казань, then
Альметьевск and Нижнекамск. Lines: RS-485 9600 8N1 (1352), RS-232 with power 9600 8N1 (126), RS-485 4800 8N1
(120), RS-485 19200 8E1 (53), RS-485 4800 8N2 (47). Most modems carry one meter (1386); 138 carry two.

## Field test (2026-10-28, port 2784)

With `ETA$GSMDeviceReader` (reader 9) stopped and disabled by the user, `.tools/device-probes/eta_gsm_session.js`
listened on 10.10.0.249:2784 for 20 minutes, read-only (log: `.tools/device-probes/eta-gsm-session-2026-10-28.jsonl`):

- **271 modems** connected (360 connections). **188 meters read** with the project's readers over the transparent
  link, 252 reads in all: ВКТ-7 102, КМ-5/РМ-5 88, ТВ7 36, ТСРВ-034 20, ТСРВ-026М 5, ТСРВ-042 1 (3–112 s per read).
  172 of the 188 are meters the old system read in September; 16 it did not. 31 meters failed only (17 of them the
  old system did not read either). 32 were skipped because the modem's line differs from the meter's (run 2).
- **Hello** as in the manual: `<id>\r\nCSQ: r,b\r\n254\r\n` (339 of 360; 4 with bus bytes after it). 11 connections
  sent nothing in 15 s; one device streamed binary frames (`QRST…`, no hello) — not an ETA GSM hello, unknown.
- **In-band reads work** at address 254 (functions 03 and 04, 20-register chunks at any offset), but a reply can
  take **15–17 s** over GPRS: wait ~25 s and tolerate a late reply to the previous request.
- **Text in the registers is byte-swapped within each 16-bit word** (`91.144.143.40` reads as `19.141.434.04`);
  numbers are big-endian, the baud rate low word first. `myId` equals the hello identifier on all 274 modems read.
- All modems are **revision 100**. Settings found: server 1 = 91.144.143.40:2784 (servers 2–3 = 91.144.143.40:2781,
  94.180.162.90:2782, unused: `servCount` 1), client mode, APN `m2m.gt.msk` with login `vpn@etech` (a corporate M2M
  APN), `checkPeriod` 600 s, `rebootTime` 180 (135), 1440 (105) or 0 (29) min. Lines: 9600 8N1 (212), 4800 8N1 (25),
  4800 8N2 (10), 19200 8E1 (9)…; `selectSerial` 2 (RS-232 + RS-485) on nearly all.
- About 130 connections closed during the run; a modem that misses a keep-alive may drop the link and come back in
  ~10 min. Don't drop a modem for a missed keep-alive (the old engine never does).

### Run 2 (2026-10-28, port 2784, the gateway itself, line changes approved by the user)

`.tools/device-probes/gprs_session.js --protocols eta-gsm` with the project's gateway on 10.10.0.249:2784 for 20
minutes, line changes on (speed/format, not saved; log `.tools/device-probes/gprs-session-2026-10-28-eta-gsm-run2.jsonl`):

- **27 in-band line changes** (4800 8N1 ×14, 9600 8N1 ×10, 4800 8N2 ×2, 9600 8N2), each read back before the meter
  session. **16 of the 32 meters run 1 skipped now read.** 187 meters read in this run; 206 different meters over the
  two runs. Modems with meters on different lines are switched for each meter (0259: ТСРВ-034 at 4800 8N2, then ТВ7 at
  9600 8N1, read); the meters that failed there are dead in the old system too (last read 2017–2021, or placeholder
  numbers on `new ip-modem`).
- **Some modems never answer in band** (2002–2009, and 0150, 0235, 0246…) while their meters read fine on the line
  the modem already has (run 1: 2004's КМ-5 11 times). In run 2 the gateway gave up on them (24 failures); since then it
  reads the meter on the modem's line when the line read gets no reply, and does not ask that modem again on the
  connection. Tested against the emulator (`--no-in-band`), not yet in the field.
- 10 meters are listed on RS-485 while their modem serves RS-232 only (`selectSerial` 0): logged, not changed.
- Keep-alive misses: 221 logged, no modem dropped for them.

## Bringing EtaModems to flow-space

Done in the gateway (2026-10-28): `flow-space/src/device-readers/eta-gsm-protocol.js` beside `bars02-protocol.js`
behind the one listener `gprs-modem-gateway.js` (2910), which tells the two apart by the hello. Every reader subflow
reads through an ETA GSM when `GPRS_MODEM_ID` is its number (e.g. `0458`):

- the three hello lines give the identifier, the signal and the Modbus address; nothing is sent back;
- before a meter session the speed and format are set in band to the meter's `GPRS_LINE` when they differ (read
  `0x00CC` ×4 once per connection; write `0x00CE` low word first and `0x00D2`, then read back), never saved and never
  touching `selectSerial`; firmware other than 101 waits 2.5 s before and 20 s / 5 s after a write, as the old engine;
  the gateway option `lineChanges: false` turns writing off; a session ends with nothing sent (no escape);
- in-band frames go after 1.1 s of silence and wait 25 s for the reply; text registers are decoded word-swapped;
- keep-alive: the Modbus read of `0x0006` every 45 s when idle; a missed one is logged and the modem stays connected.

Tested against `.tools/device-probes/gprs_modem_emulator.js --modem eta-gsm` relaying to real meters (ВКТ-7, КМ-5, ТВ7,
Irvis; also through the subflows): the same fields as direct reads, a line change from 4800 8N2 to 9600 8N1, a
firmware-100 modem replying after 12 s (line set after 92 s, then the read), keep-alives without drops. Not yet
in the field: run 2 (line changes on the real modems) needs the user's OK for the writes.

Open questions:
- Moving a modem to flow-space takes it from the old system (one connection at a time). Point `addr_1` at
  flow-space and keep the old server as `addr_2`, or the other way round for a test?
- Does a write over the link (0x10 to 0x0096…, then `isSetting` 0 and reboot) work on the modems in the field?
  The old engine never wrote the server addresses.
- In-band capture: a meter frame to address 254 with function 03/04 would reach the modem instead of the meter. None
  of our readers sends to 254 (КМ-5 frames start with BCD bytes ≤ 0x99, EK270 with `/`, SOH or ACK).
