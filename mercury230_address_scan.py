#!/usr/bin/env python3
"""
Mercury230 address scanner.

Tries the "open channel" command (01 01 01 01 01 01 01 01) against every
possible address byte (0x00-0xFF) and reports which addresses give a
clean, CRC-valid response. A real device address should reply
consistently with a short frame like: [addr] [00] [crc_lo] [crc_hi]
(status 00 = success) or a specific error code -- but *always the same
few bytes every time*, with a correct CRC.

Addresses that give garbled/inconsistent bytes each time (like we saw
with broadcast 0x00 on a shared bus) should be treated with suspicion --
a real, uniquely-addressed device should answer the same way every time.

Usage:
    python3 mercury230_address_scan.py <host> <port> [start] [end] [delay]

Example:
    python3 mercury230_address_scan.py 78.138.175.183 5022 0 255 0.5
"""

import socket
import sys
import time


def crc16_modbus(data: bytes) -> bytes:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return bytes([crc & 0xFF, (crc >> 8) & 0xFF])


def build_open_frame(addr: int) -> bytes:
    body = bytes([addr, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01])
    return body + crc16_modbus(body)


def build_close_frame(addr: int) -> bytes:
    body = bytes([addr, 0x02])
    return body + crc16_modbus(body)


def try_address(host, port, addr, timeout=1.5):
    """Returns (raw_hex, crc_ok, note) or (None, False, 'no response') on timeout."""
    frame = build_open_frame(addr)
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            s.settimeout(timeout)
            s.sendall(frame)
            time.sleep(0.3)  # let the reply accumulate
            try:
                data = s.recv(4096)
            except socket.timeout:
                return None, False, "no response (timeout)"
            if not data:
                return None, False, "connection closed, no data"

            # try to politely close channel afterwards (best effort)
            try:
                s.sendall(build_close_frame(addr))
                time.sleep(0.1)
                s.recv(4096)
            except Exception:
                pass

            if len(data) < 3:
                return data.hex(), False, "too short"

            body = data[:-2]
            crc_recv = data[-2:]
            crc_calc = crc16_modbus(body)
            crc_ok = crc_calc == crc_recv
            return data.hex(), crc_ok, ("CRC OK" if crc_ok else "CRC mismatch")
    except (ConnectionRefusedError, OSError) as e:
        return None, False, f"connection error: {e}"


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2])
    start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    end = int(sys.argv[4]) if len(sys.argv) > 4 else 255
    delay = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5

    print(f"Scanning addresses {start}-{end} on {host}:{port} ...")
    print(f"{'Addr (hex)':<12}{'Response':<24}{'CRC':<12}Note")
    print("-" * 70)

    good_addrs = []

    for addr in range(start, end + 1):
        raw, crc_ok, note = try_address(host, port, addr)
        addr_hex = f"0x{addr:02X}"
        raw_str = raw if raw else "(none)"
        crc_str = "OK" if crc_ok else "FAIL"
        print(f"{addr_hex:<12}{raw_str:<24}{crc_str:<12}{note}")
        if crc_ok:
            good_addrs.append(addr)
        time.sleep(delay)

    print("-" * 70)
    if good_addrs:
        print("Addresses with a clean, CRC-valid response:")
        for a in good_addrs:
            print(f"  0x{a:02X} ({a})")
        print("\nRe-run this scan once or twice more to confirm these addresses")
        print("respond CONSISTENTLY (same result every time) -- that's the")
        print("strongest signal you've found the real device address.")
    else:
        print("No address gave a clean CRC-valid response.")
        print("Consider: wiring issue, wrong baud settings, or a device")
        print("that requires a different open-channel password.")


if __name__ == "__main__":
    main()
