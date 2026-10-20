#!/usr/bin/env python3
"""
Mercury230 diagnostic for command 0x05 (accumulated energy).

Per the official Incotex protocol description:
  Request:  [address] [0x05] [byte3] [byte4] [CRC lo] [CRC hi]
    byte3: high nibble = "array number" (энергия: 0=A+,1=A-,2=R+,3=R-) -- may
           actually be ignored/irrelevant since the meter seems to return
           ALL FOUR groups regardless (to be confirmed empirically below);
           low nibble = month (0x0 = current values)
    byte4: tariff number (0x00 = sum of all tariffs, 0x01-0x04 = tariff N,
           0x05 = technical losses)

  Response: [address] [16 bytes: A+ (4B), A- (4B), R+ (4B), R- (4B)] [CRC lo] [CRC hi]
    0xFFFFFFFF in any 4-byte group means "not tracked by this meter".

This script sends a few requests varying byte3/byte4 and dumps the full
decoded response, so we can see empirically:
  1. Whether varying byte3 changes anything (it may not, if the meter
     always returns all 4 groups regardless).
  2. Whether varying byte4 (tariff) actually returns different totals,
     confirming genuine per-tariff support.

Usage:
    python3 mercury230_energy_probe.py <host> <port> <address_hex>

Example:
    python3 mercury230_energy_probe.py 78.138.175.183 5022 0x05
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


def build_frame(address, code_bytes):
    body = bytes([address]) + bytes(code_bytes)
    return body + crc16_modbus(body)


def send_and_recv(sock, frame, timeout=3.0):
    sock.sendall(frame)
    time.sleep(0.3)
    try:
        return sock.recv(4096)
    except socket.timeout:
        return b""


def decode_group(buf, offset):
    b0, b1, b2, b3 = buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]
    if b0 == 0xFF and b1 == 0xFF and b2 == 0xFF and b3 == 0xFF:
        return None
    raw = (b1 << 24) | (b0 << 16) | (b3 << 8) | b2
    return raw / 1000.0


def probe(sock, address, byte3, byte4):
    frame = build_frame(address, [0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01])
    send_and_recv(sock, frame)  # open channel (ignore result, best-effort)

    frame = build_frame(address, [0x05, byte3, byte4])
    resp = send_and_recv(sock, frame)

    print(f"\n--- byte3=0x{byte3:02X}  byte4=0x{byte4:02X} ---")
    print(f"raw response ({len(resp)} bytes): {resp.hex()}")

    if len(resp) < 3:
        print("  (too short / no response)")
        return

    body = resp[1:-2]  # strip address + CRC
    crc_recv = resp[-2:]
    crc_calc = crc16_modbus(resp[:-2])
    print(f"  CRC: {'OK' if crc_calc == crc_recv else 'MISMATCH'}")

    if len(body) >= 16:
        labels = ["A+ (active fwd)", "A- (active rev)", "R+ (reactive fwd)", "R- (reactive rev)"]
        for i, label in enumerate(labels):
            val = decode_group(body, i * 4)
            print(f"  {label:20s}: {val if val is not None else 'not tracked (0xFFFFFFFF)'}")
    else:
        print(f"  (body only {len(body)} bytes, expected 16)")


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2])
    address = int(sys.argv[3], 16) if sys.argv[3].startswith("0x") else int(sys.argv[3])

    with socket.create_connection((host, port), timeout=5) as sock:
        sock.settimeout(3.0)

        print("=== Test 1: byte3=0x00, byte4=0x00 (current, sum of all tariffs) ===")
        probe(sock, address, 0x00, 0x00)

        print("\n=== Test 2: byte3=0x00, byte4=0x01 (current, tariff 1) ===")
        probe(sock, address, 0x00, 0x01)

        print("\n=== Test 3: byte3=0x00, byte4=0x02 (current, tariff 2) ===")
        probe(sock, address, 0x00, 0x02)

        print("\n=== Test 4: byte3=0x10, byte4=0x00 (testing byte3 high nibble = 1) ===")
        probe(sock, address, 0x10, 0x00)

        # close channel, best effort
        frame = build_frame(address, [0x02])
        send_and_recv(sock, frame)


if __name__ == "__main__":
    main()
