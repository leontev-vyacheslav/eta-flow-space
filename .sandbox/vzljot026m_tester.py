# from pymodbus.client import ModbusTcpClient
# import struct

# client = ModbusTcpClient(host="10.10.3.22", port=5010, timeout=2)
# client.connect()

# DEVICE_ID = 1
# ADDR = 0xC068

# result = client.read_input_registers(ADDR, count=4, device_id=DEVICE_ID)
# regs = result.registers

# long_part = struct.unpack('>i', struct.pack('>HH', regs[0], regs[1]))[0]
# float_part = struct.unpack('>f', struct.pack('>HH', regs[2], regs[3]))[0]

# total_heat = long_part + float_part
# print(f"Total thermal energy: {total_heat}")

# client.close()


# from pymodbus.client import ModbusTcpClient
# from pymodbus.framer import FramerType
# import struct

# client = ModbusTcpClient(
#     host="10.10.3.22",
#     port=5010,
#     framer=FramerType.RTU,
#     timeout=3
# )
# client.connect()

# DEVICE_ID = 1
# ADDR = 0xC068

# result = client.read_input_registers(ADDR, count=4, device_id=DEVICE_ID)

# if result.isError():
#     print("Modbus error:", result)
# else:
#     regs = result.registers
#     long_part = struct.unpack('>i', struct.pack('>HH', regs[0], regs[1]))[0]
#     float_part = struct.unpack('>f', struct.pack('>HH', regs[2], regs[3]))[0]
#     total_heat = long_part + float_part
#     print(f"Total thermal energy: {total_heat}")

# client.close()

# from pymodbus.client import ModbusTcpClient
# from pymodbus.framer import FramerType
# import struct
# import time

# def read_float(client, addr, device_id=1):
#     result = client.read_input_registers(addr, count=2, device_id=device_id)
#     print(f"  raw result @ {hex(addr)}: {result}, registers={getattr(result, 'registers', None)}")
#     if result.isError():
#         raise IOError(f"Modbus error at {hex(addr)}: {result}")
#     if not result.registers or len(result.registers) < 2:
#         raise IOError(f"Empty/short response at {hex(addr)}: {result.registers}")
#     regs = result.registers
#     return struct.unpack('>f', struct.pack('>HH', regs[0], regs[1]))[0]

# client = ModbusTcpClient(host="10.10.3.22", port=5010, framer=FramerType.RTU, timeout=3)
# client.connect()

# DEVICE_ID = 1

# flow_pr1 = read_float(client, 0xC01E, DEVICE_ID)
# time.sleep(0.3)
# flow_pr2 = read_float(client, 0xC020, DEVICE_ID)
# time.sleep(0.3)
# temp_pt1 = read_float(client, 0xC02A, DEVICE_ID)
# time.sleep(0.3)
# temp_pt2 = read_float(client, 0xC02C, DEVICE_ID)

# print(f"Flow ПР1: {flow_pr1} m3/h")
# print(f"Flow ПР2: {flow_pr2} m3/h")
# print(f"Temp ПТ1: {temp_pt1} °C")
# print(f"Temp ПТ2: {temp_pt2} °C")

# client.close()


from pymodbus.client import ModbusTcpClient
from pymodbus.framer import FramerType
import struct
import time


def read_floats(client, addr, count_floats, device_id=1):
    result = client.read_input_registers(addr, count=count_floats * 2, device_id=device_id)
    if result.isError() or not result.registers or len(result.registers) < count_floats * 2:
        raise IOError(f"Bad response at {hex(addr)}: {result}")
    regs = result.registers
    return [struct.unpack(">f", struct.pack(">HH", regs[i], regs[i + 1]))[0] for i in range(0, len(regs), 2)]


client = ModbusTcpClient(host="10.10.3.22", port=5010, framer=FramerType.RTU, timeout=3, retries=5, reconnect_delay=1)

try:
    if not client.connect():
        raise ConnectionError("Could not connect to gateway")

    DEVICE_ID = 1

    try:
        pr1, pr2, pr3, pr4 = read_floats(client, 0xC01E, 4, DEVICE_ID)
        print(f"ПР1: {pr1} m3/h")
        print(f"ПР2: {pr2} m3/h")
        print(f"ПР3: {pr3} m3/h")
        print(f"ПР4: {pr4} m3/h")
    except:
        pass


finally:
    client.close()
