"""
Read-only check of the Весна-2 PLC's network pump alarm words (holding 150–152) next to the pumps' state
words (90–92), decoded with the bits of the address map and with the same tests the Node-RED mapping uses
(isDryRun = word & 0b10, converter alarm = word & 0b1).

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


def bit_names(word, names):
    return [names.get(bit, f'бит {bit}') for bit in range(16) if word >> bit & 1] or ['—']


def describe(alarm_words, state_words):
    for pump, (alarm, state) in enumerate(zip(alarm_words, state_words), start=1):
        print(f'Сетевой насос {pump}: state {state} ({", ".join(bit_names(state, STATE_BITS))})')
        print(f'    alarm word {149 + pump} = {alarm} (0b{alarm:016b}): {", ".join(bit_names(alarm, ALARM_BITS))}')
        # exactly as in the proposed collect-device-state
        print(f'    isDryRun = {bool(alarm & 0b10)}, converter alarm = {bool(alarm & 0b1)}')


def self_test():
    describe([0, 0b10, 0b11], [64, 2, 512])


def main():
    if '--self-test' in sys.argv:
        self_test()
        return
    host = sys.argv[1] if len(sys.argv) > 1 else '94.180.252.2'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 503
    sock = socket.create_connection((host, port), timeout=TIMEOUT)
    sock.settimeout(TIMEOUT)
    try:
        alarm_words = read_holding_registers(sock, 1, 150, 3)
        state_words = read_holding_registers(sock, 2, 90, 3)
    finally:
        sock.close()
    describe(alarm_words, state_words)


if __name__ == '__main__':
    main()
