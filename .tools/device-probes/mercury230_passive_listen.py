#!/usr/bin/env python3
"""
Passively listens on the WIZ108SR TCP port WITHOUT sending anything,
to check whether there's already other traffic on this RS-485 line
(e.g. another polling system talking to other meters on the same bus).

Usage:
    python3 mercury230_passive_listen.py <host> <port> [seconds]

Example:
    python3 mercury230_passive_listen.py 78.138.175.183 5022 20
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


def main():
    host = sys.argv[1]
    port = int(sys.argv[2])
    duration = float(sys.argv[3]) if len(sys.argv) > 3 else 15.0

    print(f"Connecting to {host}:{port} and listening passively for {duration}s ...")
    print("(not sending anything -- just watching for existing bus traffic)\n")

    with socket.create_connection((host, port), timeout=5) as s:
        s.settimeout(0.5)
        start = time.time()
        chunks = []
        while time.time() - start < duration:
            try:
                data = s.recv(4096)
                if data:
                    ts = time.time() - start
                    print(f"[{ts:6.2f}s] RX ({len(data)} bytes): {data.hex()}")
                    chunks.append(data)
            except socket.timeout:
                continue

    if not chunks:
        print("\nNo data received at all during the listen window.")
        print("This suggests the line is quiet -- no other active polling system.")
    else:
        print(f"\nReceived {len(chunks)} chunk(s) total during passive listening.")
        print("This confirms there IS other traffic already on this line")
        print("(most likely another system polling meters on the same bus).")
        print("\nAttempting to identify sender addresses from any complete, CRC-valid frames:")
        for c in chunks:
            if len(c) >= 3:
                body = c[:-2]
                crc_recv = c[-2:]
                if crc16_modbus(body) == crc_recv:
                    print(f"  Valid frame, first byte (address) = 0x{c[0]:02X}  full={c.hex()}")


if __name__ == "__main__":
    main()
