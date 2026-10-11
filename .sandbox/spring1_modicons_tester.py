"""
Read-only probe of the two Modicon controllers of the Весна boiler room
(boilers and pumps). Prints the raw holding registers as JSON, to compare
with .docs/spring-modicons-modbus-map.xlsx and with the Node-RED flow.

Uses only Modbus function 3 (read holding registers) over Modbus TCP and
opens one short connection per controller. No dependencies.

Usage: python3 spring_modicons_tester.py
"""
import json
import socket
import struct
import time

HOST = '94.180.248.157'
UNIT_ID = 1
TIMEOUT = 6

# name -> (port, [(start register, quantity), ...])
CONTROLLERS = {
    'boilers': (5003, [(0, 10), (10, 30), (40, 10)]),
    'pumps': (5002, [(0, 10), (10, 30), (40, 10)]),
}


def receive(sock, size):
    data = b''
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise IOError('Connection closed by the gateway')
        data += chunk
    return data


def read_holding_registers(sock, transaction_id, address, quantity):
    sock.sendall(struct.pack('>HHHBBHH', transaction_id, 0, 6, UNIT_ID, 3, address, quantity))
    header = receive(sock, 7)
    body = receive(sock, struct.unpack('>H', header[4:6])[0] - 1)
    if body[0] & 0x80:
        raise IOError(f'Modbus exception code {body[1]}')
    return list(struct.unpack(f'>{quantity}H', body[2:2 + 2 * quantity]))


def read_controller(port, blocks):
    registers = {}
    sock = socket.create_connection((HOST, port), timeout=TIMEOUT)
    sock.settimeout(TIMEOUT)
    try:
        for index, (address, quantity) in enumerate(blocks):
            try:
                registers[address] = read_holding_registers(sock, index + 1, address, quantity)
            except Exception as error:
                registers[address] = f'ERROR: {error}'
            time.sleep(0.2)
    finally:
        sock.close()
    return registers


result = {'time': time.strftime('%Y-%m-%d %H:%M:%S')}
for name, (port, blocks) in CONTROLLERS.items():
    try:
        result[name] = read_controller(port, blocks)
    except Exception as error:
        result[name] = f'ERROR: {error!r}'

print(json.dumps(result))
