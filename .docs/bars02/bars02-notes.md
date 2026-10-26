# БАРС-02

Collected 2026-10-26. Sources: the vendor passports in this folder; the old ETA engine
(`d:\Projects\Eta\EnergyTechAudit.PowerAccounting.Engine\`: `…DeviceReader.BarsModem`, `…DeviceReader.BarsDiscrete`,
`…DeviceReader.Engine\Dispatchers\BarsDispatcher.cs` + `ServerDispatcher.cs`, `…Engine\Types\GsmModemConnection.cs`,
`DeviceReaderTests\BarsModem\BarsModemTests.cs`); the vendor configurator «Конфигуратор БАРС» 4.2.5.2
(`GPRSSetupV2_4.2.5.2.exe` from promservis.ru, its strings only); the old system's table dumps of 2026-09
(`d:\Projects\Eta\*.ETA24 (2026-09-2x…).zip.zip`).

## What it is

«Блок автоматический регистрационно-связной» of the САДКО complex, АО «ПромСервис» (Димитровград,
support@promservis.ru, (84235) 4-35-86). It is not a meter: it sits next to the meters on RS-232 / RS-485
and carries their own protocols to the dispatch server over GPRS (Р) or Ethernet (П). It also has 2 discrete
inputs (fire, flood, door) whose events it logs and can send by SMS.

The old system's transport server models: 6 `Bars02` «БАРС-02, беспроводной», 11 `Bars02PXM` «БАРС-02-П-Х-М,
проводной», 13 `Bars02WXM` «БАРС-02-Р-X-M, беспроводной», 28 `Bars02_Old` «БАРС-02 (старая прошивка)».

## Connection model

**The unit is a TCP client.** After power-up it registers in GPRS and connects to up to two dispatch servers
(channels Ch1 and Ch2, each with a main and a reserve IP + port). It keeps the connection open, and the
server sends its requests over that connection. To poll it we must run a TCP **listener**; we can't connect to
the unit.

The old system's listeners (`Core.DynamicParameterValue` 45/46 of each BARS device reader):

| Database | Listen address | Ports (device reader) |
|---|---|---|
| ETA24 | 10.10.0.249 | 2787 (18), 2900 (19 «Alsou»), 2901 (21 «Lachyn»), 2907 (23) |
| ASD | 192.168.6.8 | 2790 (3), 2795 (11), 2801 (12), 2802 (13), 2803 (18) |

The listen addresses are LAN addresses behind the office router. ETA24's 10.10.0.249 is the old system's IIS server;
the flow-space Linux host is 10.10.0.246 in the same /24. Checked on 2026-10-26 (`Get-NetTCPConnection` there):
616 modems were connected (2787: 491, 2901: 100, 2907: 24, 2900: 1), all from mobile operators' public
addresses (178.176.x.x, 178.178.x.x, 85.26.x.x…). So the modems use the public internet and come in through
the router's port forwards to 10.10.0.249. The 10.135.x.x `NetAddress` values in the old access points are stale.

## Protocol (as the old ETA engine speaks it)

ASCII. Requests are `#<cmd>;<args>$`. Replies are `#Y…$` (ok/data) or `#N$` (refused). `~~~^^^~~~` is the
escape from the transparent channel back to command mode, like Hayes `+++`.

### Session

1. The modem connects and sends its **identifier** (cp1251 text, e.g. `Зарипова_5` or `033626`; 0x1F bytes
   are stripped). The server looks it up in `AccessPoint.Identifier`. If it is unknown, the server closes
   the socket.
2. The server answers `#Y$` (3 s write timeout), and the connection goes into the modem pool, keyed by access point.
3. While idle, on every queue tick (`QueuePollingInterval`, 45 s), the server sends `~~~^^^~~~` and reads
   5 bytes. A broken socket removes the modem from the pool. The vendor's own САДКО asks for service info
   every 3 min.
4. Polling one meter (`Device.cs` → `ConfigureBarsModem`, then the meter reader, then `BarsSendEndPolling`):
   1. `#R;E$`: the event (НС) list. If it parses, the server sends `#Y$` to acknowledge it, which clears the list.
   2. `~~~^^^~~~` → `#Y;<csq>$` (command mode; CSQ signal quality 0–31; 7 s, with retries).
   3. `#W;P<port>;<baud>\t<stop>\t<parity>$` → `#Y$`: selects the meter port. Skipped for `Bars02_Old`,
      which uses the port set in its configuration.
   4. `#S$` (no reply): the link is now **transparent** to that port. The ordinary meter reader runs over the same
      TCP socket (ВКТ-7, КМ-5, ТВ7, Меркурий-230, Взлёт Modbus…), exactly as through a Moxa.
   5. `~~~^^^~~~`: back to command mode. The socket stays open.

   Several meters on one modem are polled one after another (the modem is marked busy), each repeating steps 1–5
   with its own port settings.

### Commands

| Request | Reply | Meaning |
|---|---|---|
| `#Y$` | — | confirm the connection; acknowledge the event list |
| `~~~^^^~~~` | `#Y;<csq>$` | command mode + signal quality |
| `#W;P<p>;<baud>\t<s>\t<par>$` | `#Y$` | meter port: `p` 0 RS-232, 1 RS-232 with power, 2 RS-485; `baud` decimal; `s` 0 = 1 stop bit, 1 = 2; `par` 0 none, 1 even, 2 odd. `#W;P2;9600\t0\t0$` = RS-485 9600 8N1 |
| `#S$` | — | open the transparent channel |
| `#R;T;$` | `#Y;08-06-2020-07-39-21$` | clock, `dd-mm-yyyy-hh-mm-ss` |
| `#W;T; dd-mm-yyyy-hh-mm-ss$` | `#Y$` | set the clock (note the space; the old `BarsDiscrete` corrects drift > 180 s) |
| `#R;E$` | `#Y;21-05-2020-08-39\t253\r\n…$` | event list: `dd-mm-yyyy-hh-mm` TAB code (right-aligned to 3), CRLF-separated |
| `#R;CA0$` | `#Y;CSV=<firmware>\r\n<KEY>=<value>…` | read configuration block 0 |
| `#W;CA0;<config>$` | `#Y$` | write configuration block 0 (cp1251) |
| `#W;CR;$` | `#Y$` | reboot |

The configurator also uses `#R;C;$`, `#W;C;…`, the generic `#R;<key>;$` / `#W;<key>;<value>$` and blocks
`CA1`, `CA2` («ЗАПИСЬ 1/2/3 БЛОКА»).

**Event codes:** 100 (0x64) power on, 228 (0xE4) power off, 253 (0xFD) parameters changed, 254 (0xFE) flash
error, 255 (0xFF) battery discharged. Each discrete input has a configured code N, and N | 0x80 for the opposite
state (e.g. 1 / 129). The old `BarsDiscrete` device (model 88) turns them into input states 0/1.

**Firmware** (the `CSV` line): the old engine knows 2.2.1.0, 4.0.1 and 5.0.1 (all cp1251). The server port key is `CSP=` in
4.0.1 and `CSP0=` in 2.2.1.0 / 5.0.1. The old engine once moved modems from port 2787 to 2907 by reading `CA0`,
replacing the port, writing it back and rebooting (debug code in `BarsDispatcher.cs`). **So a modem's server can be
changed remotely over the dispatch link.** The passport also allows it by SMS: `CSINM <ip> <port> <password>`
(N = channel 1/2, M = 1 main / 2 reserve; `0.0.0.0` disables a channel).

### Configuration keys

As the modems on port 2907 return them (`#R;CA0$`, 2026-10-26; one `KEY=value` per CRLF line):

```
4.0.1: CSV=4.0.1 CHV=2.0.4.6 CBN=Строителей_53 CBI CBG CBM CBA CSI0=91.144.143.40 CSI1=0.0.0.0 CSI2=0.0.0.0
       CSP=2907 CGA=internet CGP=user CD0= CD1= CTS=700 CTT=200 CTW=1 CTU=00\t00 CTD=00\t00 CTC=2100
5.0.1: … CSI0=91.144.143.40 CSI1..CSI3=0.0.0.0 CSP0=2907 CSP1=2780 … CTC0=2100 CTC1=2100
```

`CSV` firmware, `CHV` hardware, `CBN` the identifier it sends, `CSI0` + `CSP`/`CSP0` the server of channel 1
(our public address 91.144.143.40, forwarded to 10.10.0.249), `CSI1`… other servers (all 0.0.0.0: **channel 2 is
free** on every modem read), `CGA`/`CGP` APN and user. `CBI`/`CBG`/`CBM`/`CBA` (Ethernet IP, gateway, mask, MAC) hold
garbage on GPRS units. `CD0`/`CD1`, `CTS`, `CTT`, `CTW`, `CTU`/`CTD` (a schedule), `CTC` are unmapped.

From the configurator: `CSV CHV CBN CGA CGP CSI0 CSP CTW CTT CD0 CD1 CTC CTU CTD CA1 CI CBI CBA CBM CBG CCRC CSI2
CSI1 CSI3 CSP0 CSP1 CTC0 CTC1 CA2 CRS CBS CGG CBR CTM BSN BCH0 BCH1 BTO BPP BPT BIE`. Fairly sure: `CSV`
firmware, `CSI0`–`CSI3` server IPs (two channels × main/reserve), `CSP`/`CSP0`/`CSP1` server ports (default 2780),
`CGA` APN (default `internet.beeline.ru`), `CGP` APN user/password (`beeline`). The rest are unmapped. The
configurator's fields: Идентификатор контроллера, Заводской номер, Точка доступа, Имя (пароль), Канал1/Канал2
IP адрес, Режим GPRS, Пауза переподключения (мин), Тайм-аут «прозрачного» канала (с), Время удержания канала
модемом (5–3599 с), Период сборки пакета (мс, multiple of 35), Приоритет для RS232, График работы, SMS «NO
CONNECT» / «CONNECT OK», Di event codes.

### Quirks in the old code

- The command-mode check accepts any reply (`signalQuality >= 0 || signalQuality <= 31`).
- `BarsModem` looks for `#W` at the start of the event list, but the recorded reply starts with `#Y;`. So that
  path never acknowledges the list; `BarsDiscrete` acknowledges it regardless.
- The clock read expects 26 bytes; the recorded reply has 23.
- Stop bits: only «One» maps to 0; every other setting gives 2 stop bits.

## Field test (2026-10-26, port 2907)

With the old reader 23 (`ETA$Bars2DeviceReader`) stopped, `.tools/device-probes/bars02_session.js` listened on
10.10.0.249:2907 for 20 minutes:

- 22 of the 30 modems connected, within seconds of the old listener going away (91.144.143.40:2907 → router →
  10.10.0.249). Firmware 4.0.1 (11), 3.0.1 (3), 5.0.1 (2).
- **Three ВКТ-7 read through their БАРС-02 with the unchanged `vkt7-client.js`, 12 reads out of 12**:
  Строителей_53 (141425) and Строителей_47а (128001) in 80–85 s each, 011276 (244295, Казань) in 32–39 s.
  Строителей_53 matched the old system's panel exactly (Q 4201.122 Gcal, M1 487311.89 t, M2 484636.09 t, V1
  497119.73 m³, ВНР 27671 h, t 61.3/53.8 °C, G 24 m³/h, pressures bad quality = ERR); its clock is ~26 min slow,
  so the hourly totals moved on (+23.65 t, +0.183 Gcal, ВНР 27672) only at 11:27.
- Replies: the escape gives `#Y;<csq>$` in command mode but a bare `#Y$` when it ends the transparent channel, and
  always on the «8_марта» units and Ленина_193. Event lists were empty (`#Y$`). Modem clocks are off by hours.
- Timing over GPRS: a command 1–2 s, a ВКТ-7 request 4–5 s, the first request after `#S$` is often lost; the
  readers need a step timeout of ~15 s (the first try with 3 s failed).
- Not every unit answers everything: 2 never answered the escape (Фахретдина_24, Шевченко_108а: dropped after two
  keep-alives, reconnected), a few skipped a clock query.
- `Stop-Service` can return before the old process frees the port (our second start got `EADDRINUSE`): wait until
  nothing listens on the port before taking it.

Second and third runs the same day (reader 23 stopped and disabled by the user; logs
`.tools/device-probes/bars02-session-2026-10-26-km5.jsonl`, `…-tv7.jsonl`):

- **РМ-5 / КМ-5** with `km5-client.js` (the old engine reads РМ-5 with its КМ-5 reader; address = factory number,
  RS-485 9600 8N1): the 8 РМ-5 the old system reads read every time (20 of 20, 24–34 s, firmware `02.30`, type `RM`).
  A ВКТ-7 (RS-232) and an РМ-5 (RS-485) behind one unit read one after the other (Строителей_15, Гафиатуллина_24).
  On Строителей_47 every reply lost its first 4 bytes, the network number, with the rest valid: `acceptLostAddress`
  accepts such a reply when the checksums are valid with our network number put back (then 61 s). The 4 meters
  that failed are not read by the old system either (Алм_ЖЭУ7_01 КМ-5 60818, К._Цеткин_49 319267, Строителей_53а,
  Строителей_53б); Фахретдина_24 never answers the escape.
- **ТВ7** with `tv7-client.js`: the three ТВ7 the old system reads are firmware 1.00 / hardware 3.00 / model 01 and
  refuse the totals in one request (exception 16, «другая ошибка»). The client then reads them in the old engine's
  parts (each pipe, each heat input, the additional input, the totals clock) and leaves the device-wide block
  3513–3532 (operating times, input configuration, events, КСН, Qсум), which firmware 1.00 refuses, null: 20–59 s.
- **Old firmware 3.0.1** units («8_марта_15/17/25», model `Bars02_Old`): the escape always answers a bare `#Y$`
  and the old engine sends no port selection — `selectPort: false` in `createSocket()` — so the line stays where
  the unit's configuration sets it: 8_марта_25 serves its ВКТ-7 on RS-485, and its ТВ7 on RS-232 never answers
  (in the old system either).
- Readers over GPRS give an attempt up 2 s after bytes that are no valid reply (`frameGapMs`), instead of waiting the
  15 s step timeout, so a garbled reply is repeated at once.

## Our fleet (old system, dumps of 2026-09-23/24)

| Database | BARS access points | Last connected in 2026-09 | Active meters behind | Identifiers |
|---|---|---|---|---|
| ETA24 | 1048 (912 `Bars02`, 136 `Bars02_Old`) | 735 | 1238 | street_house (`Зарипова_5`) |
| ASD | 2354 | 2038 | 3017 | 6 digits (`033626`) |
| CHELNY | 3 (unused) | 0 | 0 | |
| HOUSE | 0 | | | |

Active meters behind BARS, both databases: ВКТ-7 1493, КМ-5 905, РМ-5 639, ТВ7 546, СПТ-941.10/11 181,
СПТ-943 176, ECL 310 149, ТСРВ-033 49, ТСРВ-043 25, Меркурий-230 17, ТСРВ-024(М) 14, СПТ-941 13, ЭЛЬФ 9,
Прамер-710 8, Пульсар 8, ТСРВ-026М 6, others ≤ 5 (4255 in all). Most modems carry one meter (1907); 720 carry
2, 189 carry 3, and a few carry up to 7 (one carries 37). Port settings are mostly 9600 8N1 on RS-232, RS-232
with power or RS-485, and the polling interval is 60 min.

flow-space already has readers for ВКТ-7, КМ-5, ТВ7, Меркурий-230 and Взлёт 023/024/026/034/042, about 3000 of
those meters. The КМ-5 reader isn't checked against РМ-5, and there are no readers for СПТ (Логика) or ECL 310.

## Bringing BARS to flow-space

1. **Listener:** a TCP server in the Node-RED container, published by docker-compose, plus one more port forward
   on the office router (public port → 10.10.0.246), like the existing 3000.
2. **Gateway** (`flow-space/src/device-readers/bars02-gateway.js`, 2026-10-26): accepts a connection, reads the
   identifier, answers `#Y$`, sends the keep-alive every 45 s, keeps a pool by identifier and serializes the work
   per modem (command mode → port → `#S$` → reader → escape). In Node-RED it is `global.get('bars02')`
   (settings.js); `getGateway(port)` keeps one listener per port across deploys. The "VKT7 Client", "KM5 Client"
   (КМ-5 and РМ-5) and "TV7 Client" subflows read through it when `BARS02_ID` is set (`BARS02_LISTEN_PORT` 2910,
   published by docker-compose; `BARS02_LINE` `rs232-powered 9600 8N1` for ВКТ-7 and ТВ7, `rs485 9600 8N1` for
   КМ-5/РМ-5, or `none` for old-firmware units); the testing-of-device-readers tab has `vkt7-141425` behind
   «Строителей_53».
3. **Readers over an existing socket:** a client gets `createSocket: () => gateway.createSocket({ identifier, port,
   baudRate, parity, stopBits })` and runs unchanged (the channel has the `net.Socket` methods the clients use).
   Done for `vkt7-client.js`; tested end to end with `.tools/device-probes/bars02_emulator.js` relaying to the
   Весна-2 ВКТ-7 (8 s read).
4. **Re-pointing modems:** channel 2 → flow-space while channel 1 stays with the old system, or move channel 1 modem by
   modem. Do it remotely via the old system's link (`#R;CA0$` → edit `CSI*`/`CSP*` → `#W;CA0;…$` → `#W;CR;$`),
   by SMS `CSINM`, or on site.

Open questions:
- Channel 2 is free (checked on 16 modems). If both channels are connected, does the unit arbitrate the meter port
  between two servers polling at once? (Compare the EK270 line shared with another master.) Test on one modem.
- The exact frame for writing the configuration (`#W;CA0;…$` with or without the `#Y;` and `$` of the read reply).
- What do the unmapped configuration keys mean? Ask ПромСервис, or decompile the configurator (a .NET assembly).
