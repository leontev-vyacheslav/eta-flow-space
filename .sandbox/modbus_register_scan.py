"""
Read-only scan of Modbus holding registers on any controller. Prints the
non-zero registers of the given ranges, so a value can be found by running
it while the equipment is in a known state (e.g. a boiler is burning) and
comparing with a run while it is stopped.

Uses only Modbus function 3 (read holding registers) over Modbus TCP and
opens one short connection. No dependencies.

Usage:
    python3 modbus_register_scan.py HOST PORT [START-END ...] [--unit 1]

Example (Statum, burner power hunt):
    python3 modbus_register_scan.py 10.10.3.15 502 0-999
"""
import argparse
import socket
import struct
import time

BLOCK_SIZE = 100  # Modbus allows at most 125 registers per request


def receive(sock, size):
    data = b''
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise IOError('Connection closed by the controller')
        data += chunk
    return data


def read_holding_registers(sock, transaction_id, unit_id, address, quantity):
    sock.sendall(struct.pack('>HHHBBHH', transaction_id, 0, 6, unit_id, 3, address, quantity))
    while True:
        header = receive(sock, 7)
        body = receive(sock, struct.unpack('>H', header[4:6])[0] - 1)
        # Skip a late answer to an earlier request that already timed out.
        if struct.unpack('>H', header[0:2])[0] == transaction_id:
            break
    if body[0] & 0x80:
        raise IOError(f'Modbus exception code {body[1]}')
    return list(struct.unpack(f'>{quantity}H', body[2:2 + 2 * quantity]))


def parse_range(text):
    start, end = (int(part) for part in text.split('-'))
    return start, end


arguments = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
arguments.add_argument('host')
arguments.add_argument('port', type=int)
arguments.add_argument('ranges', nargs='*', type=parse_range, default=[(0, 999)])
arguments.add_argument('--unit', type=int, default=1)
arguments.add_argument('--timeout', type=float, default=5)
options = arguments.parse_args()

print(time.strftime('%Y-%m-%d %H:%M:%S'), f'{options.host}:{options.port} unit {options.unit}')
try:
    sock = socket.create_connection((options.host, options.port), timeout=options.timeout)
except OSError as error:
    # The controller may accept only a few connections at once (Node-RED holds one); just try again later.
    print(f'ERROR connect: {error}')
    raise SystemExit(1)
sock.settimeout(options.timeout)
try:
    transaction_id = 0
    for start, end in options.ranges:
        for address in range(start, end + 1, BLOCK_SIZE):
            quantity = min(BLOCK_SIZE, end + 1 - address)
            transaction_id += 1
            try:
                registers = read_holding_registers(sock, transaction_id, options.unit, address, quantity)
            except Exception as error:
                # Unmapped areas often answer with "illegal data address"; narrow the range to read around them.
                print(f'{address}-{address + quantity - 1}: ERROR {error}')
                continue
            for offset, value in enumerate(registers):
                if value:
                    signed = value - 0x10000 if value & 0x8000 else value
                    print(f'{address + offset}: {value} (signed {signed}, /100 = {signed / 100})')
            time.sleep(0.2)
finally:
    sock.close()
