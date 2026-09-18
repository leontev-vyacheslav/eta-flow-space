from pymodbus.client import ModbusTcpClient
from pymodbus.framer import FramerType
import struct
import json

def read_floats(client, addr, count_floats, device_id=1):
    result = client.read_input_registers(addr, count=count_floats * 2, device_id=device_id)
    if result.isError() or not result.registers or len(result.registers) < count_floats * 2:
        raise IOError(f'Bad response at {hex(addr)}: {result}')
    regs = result.registers
    return [struct.unpack('>f', struct.pack('>HH', regs[i], regs[i + 1]))[0] for i in range(0, len(regs), 2)]

client = ModbusTcpClient(host='10.10.0.246', port=5011, framer=FramerType.RTU, timeout=3, retries=5)

try:
    if not client.connect():
        print(json.dumps({'error': 'Could not connect to gateway'}))
    else:
        pr1, pr2, pr3, pr4 = read_floats(client, 0xC01E, 4, device_id=1)
        print(json.dumps({'pr1': pr1, 'pr2': pr2, 'pr3': pr3, 'pr4': pr4}))
finally:
    client.close()