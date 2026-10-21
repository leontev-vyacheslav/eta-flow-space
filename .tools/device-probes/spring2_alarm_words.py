"""
Read-only check of the Весна-2 PLC's alarm and state words, decoded with the bits of the address map:
- network pumps: alarm words 150–152 next to the state words 90–92, with the same tests the Node-RED mapping
  uses (isDryRun = word & 0b10, converter alarm = word & 0b1);
- boilers: alarm words 146–149 next to the state words 86–89 and the raw contacts (discrete inputs 640–683),
  boiler pump contactor states 103–106 and outlet valve states 99–102.

The PLC's MB_SERVER serves one Modbus client at a time and production Node-RED holds that connection, so
this only gets an answer while Node-RED's polling of the spring2 tab is paused.

Usage:
    python3 spring2_alarm_words.py [host] [port]          # default 94.180.252.2 503
    python3 spring2_alarm_words.py --self-test             # decoding only, no network
"""
import socket
import struct
import sys

UNIT_ID = 1
TIMEOUT = 8

# address map (Карта_адресов_Modbus_котельная_Весна2.xlsx): alarm word bits of a network pump
ALARM_BITS = {
    0: 'Авария ПЧ',
    1: 'Сухой ход',
    2: 'превышено время запуска',
    3: 'превышено время останова',
    4: 'внешний запуск',
    5: 'внешний останов',
}
# state word bits of a network pump (registers 90–92)
STATE_BITS = {
    0: 'Ожидание готовности', 1: 'Готовность', 5: 'Запуск от ЧРП', 6: 'В работе от ЧРП',
    7: 'Останов от ЧРП', 9: 'Авария',
}
# alarm word bits of a boiler (registers 146–149)
BOILER_ALARM_BITS = {
    0: 'перегрев', 1: 'авария горелки', 2: 'мин. давление воды', 3: 'макс. давление воды', 4: 'внешний запуск',
    5: 'внешний останов', 6: 'превышено время запуска', 7: 'нет протока', 8: 'авария выходной задвижки',
    9: 'авария цирк. насосов',
}
# state word bits of a boiler (registers 86–89)
BOILER_STATE_BITS = {
    0: 'нет готовности', 1: 'отключен', 2: 'включается', 3: 'работа на 1 ступени', 4: 'работа на 2 ступени',
    5: 'в горячем резерве', 6: 'останавливается', 7: 'авария',
}
# state word bits of a boiler pump contactor (registers 103–106)
CONTACTOR_STATE_BITS = {
    0: 'нет питания/схема разобрана', 1: 'отключен', 2: 'включен', 3: 'отключается', 4: 'включается', 5: 'авария',
}
# state word bits of a boiler outlet valve (registers 99–102)
VALVE_STATE_BITS = {
    0: 'нет питания/схема разобрана', 1: 'промежуточное', 2: 'открыта', 3: 'закрыта', 4: 'открытие', 5: 'закрытие',
    6: 'авария',
}
# raw boiler inputs, offsets inside a boiler's group of 11 discrete inputs from 640
BOILER_INPUTS = [
    'авария горелки', 'работа', 'реле давления газа', 'насос: авария', 'насос: работа', 'мин. давление',
    'макс. давление', 'макс. температура', 'реле протока', 'задвижка открыта', 'задвижка закрыта',
]


def receive(sock, size):
    data = b''
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise IOError('Connection closed by the controller')
        data += chunk
    return data


def read_holding_registers(sock, transaction_id, address, quantity):
    sock.sendall(struct.pack('>HHHBBHH', transaction_id, 0, 6, UNIT_ID, 3, address, quantity))
    while True:
        header = receive(sock, 7)
        body = receive(sock, struct.unpack('>H', header[4:6])[0] - 1)
        if struct.unpack('>H', header[0:2])[0] == transaction_id:
            break
    if body[0] & 0x80:
        raise IOError(f'Modbus exception code {body[1]}')
    return list(struct.unpack(f'>{quantity}H', body[2:2 + 2 * quantity]))


def read_discrete_inputs(sock, transaction_id, address, quantity):
    sock.sendall(struct.pack('>HHHBBHH', transaction_id, 0, 6, UNIT_ID, 2, address, quantity))
    while True:
        header = receive(sock, 7)
        body = receive(sock, struct.unpack('>H', header[4:6])[0] - 1)
        if struct.unpack('>H', header[0:2])[0] == transaction_id:
            break
    if body[0] & 0x80:
        raise IOError(f'Modbus exception code {body[1]}')
    return [body[2 + i // 8] >> (i % 8) & 1 for i in range(quantity)]


def bit_names(word, names):
    return [names.get(bit, f'бит {bit}') for bit in range(16) if word >> bit & 1] or ['—']


def describe(alarm_words, state_words):
    for pump, (alarm, state) in enumerate(zip(alarm_words, state_words), start=1):
        print(f'Сетевой насос {pump}: state {state} ({", ".join(bit_names(state, STATE_BITS))})')
        print(f'    alarm word {149 + pump} = {alarm} (0b{alarm:016b}): {", ".join(bit_names(alarm, ALARM_BITS))}')
        # exactly as in the proposed collect-device-state
        print(f'    isDryRun = {bool(alarm & 0b10)}, converter alarm = {bool(alarm & 0b1)}')


def describe_boilers(alarm_words, state_words, contactor_words, valve_words, inputs):
    for boiler in range(4):
        alarm, state = alarm_words[boiler], state_words[boiler]
        raw = inputs[boiler * 11:boiler * 11 + 11]
        print(f'Котел {boiler + 1}: state {state} ({", ".join(bit_names(state, BOILER_STATE_BITS))})')
        print(f'    alarm word {146 + boiler} = {alarm} (0b{alarm:016b}): {", ".join(bit_names(alarm, BOILER_ALARM_BITS))}')
        # exactly as in the proposed collect-device-state
        print(f'    isMaxWaterTemperature = {bool(alarm & 1)}, isMinWaterPressure = {bool(alarm & 1 << 2)}, '
              f'isMaxWaterPressure = {bool(alarm & 1 << 3)}, isNoFlow = {bool(alarm & 1 << 7)}, '
              f'isOutputValveFailure = {bool(alarm & 1 << 8)}, isCirculationPumpFailure = {bool(alarm & 1 << 9)}')
        print(f'    raw inputs {640 + boiler * 11}–{650 + boiler * 11}: '
              + ', '.join(f'{name} {value}' for name, value in zip(BOILER_INPUTS, raw)))
        contactor, valve = contactor_words[boiler], valve_words[boiler]
        print(f'    pump contactor {103 + boiler} = {contactor} ({", ".join(bit_names(contactor, CONTACTOR_STATE_BITS))}), '
              f'outlet valve {99 + boiler} = {valve} ({", ".join(bit_names(valve, VALVE_STATE_BITS))})')


def self_test():
    describe([0, 0b10, 0b11], [64, 2, 512])
    describe_boilers([0, 0b1100, 0b10000000, 0b1000000000], [16, 32, 0, 1], [4, 2, 1, 32], [4, 8, 2, 64],
                     [0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0] * 4)


def main():
    if '--self-test' in sys.argv:
        self_test()
        return
    host = sys.argv[1] if len(sys.argv) > 1 else '94.180.252.2'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 503
    sock = socket.create_connection((host, port), timeout=TIMEOUT)
    sock.settimeout(TIMEOUT)
    try:
        alarm_words = read_holding_registers(sock, 1, 146, 7)    # boilers 146–149, network pumps 150–152
        state_words = read_holding_registers(sock, 2, 86, 21)    # boilers 86–89, pumps 90–92, valves 99–102, contactors 103–106
        inputs = read_discrete_inputs(sock, 3, 640, 44)          # boiler groups 640–683
    finally:
        sock.close()
    describe(alarm_words[4:], state_words[4:7])
    describe_boilers(alarm_words[:4], state_words[:4], state_words[17:21], state_words[13:17], inputs)


if __name__ == '__main__':
    main()
