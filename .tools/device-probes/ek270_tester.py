#!/usr/bin/env python3
"""
Polls an EK270 over IEC 61107 (same sequence as ek270-iec61107-client.js)
but checks every reply: complete STX..ETX+BCC frame, valid BCC, and the
echoed address matching the request ("2:302.0" -> "7-2:302.2"). Frames
that do not match (another master's traffic, NAK-triggered repeats) are
logged as FOREIGN and skipped.

Usage:
    python3 ek270_tester.py [host] [port] [step_timeout_s]

Example:
    python3 ek270_tester.py 94.180.248.157 5021 5
"""

import re
import socket
import sys
import time

SOH, STX, ETX, ACK, NAK = 0x01, 0x02, 0x03, 0x06, 0x15

PARAMETERS = {
    'factoryNumber': '1:180.0',
    'deviceTime': '1:400.0',
    'correctionCoefficient': '5:310.0',
    'standardVolumeFlow': '2:310.0',
    'workVolumeFlow': '4:310.0',
    'pressure': '7:310.0',
    'temperature': '6:310_1.0',
    'standardVolume': '2:300.0',
    'workVolume': '4:300.0',
    'disturbanceStandardVolume': '2:301.0',
    'fullStandardVolume': '2:302.0',
    'disturbanceWorkVolume': '4:301.0',
    'fullWorkVolume': '4:302.0',
    'firmware': '2:190.0',
    'reportingHour': '2:141.0',
    'archiveInterval': '4:150.0',
}

T0 = time.time()


def log(*args):
    print(f'[{time.time() - T0:7.3f}s]', *args, flush=True)


def bcc(data: bytes) -> int:
    x = 0
    for b in data:
        x ^= b
    return x


def frame(cmd: str, body: str) -> bytes:
    payload = f'{cmd}1'.encode() + bytes([STX]) + body.encode() + bytes([ETX])
    return bytes([SOH]) + payload + bytes([bcc(payload)])


def core_address(address: str) -> str:
    # "7-2:302.2" -> "2:302", "6:310_1.0" -> "6:310_1"
    m = re.match(r'^(?:\d+-)?(\d+:[0-9A-Za-z_]+)\.\d+$', address)
    return m.group(1) if m else address


class Link:
    def __init__(self, host, port):
        self.sock = socket.create_connection((host, port), timeout=10)
        self.sock.settimeout(0.2)
        self.buf = b''

    def send(self, data: bytes):
        log('TX', repr(data.decode('latin1')))
        self.sock.sendall(data)

    def _fill(self):
        try:
            chunk = self.sock.recv(4096)
            if chunk:
                self.buf += chunk
        except socket.timeout:
            pass

    def wait_for(self, predicate, timeout):
        end = time.time() + timeout
        while time.time() < end:
            result = predicate()
            if result is not None:
                return result
            self._fill()
        return predicate()

    def take_line(self):
        i = self.buf.find(b'\n')
        if i == -1:
            return None
        line, self.buf = self.buf[:i + 1], self.buf[i + 1:]
        return line

    def take_byte(self, value):
        i = self.buf.find(bytes([value]))
        if i == -1:
            return None
        if i:
            log('SKIP', repr(self.buf[:i].decode('latin1')))
        self.buf = self.buf[i + 1:]
        return True

    def take_frame(self):
        """Next complete STX/SOH..ETX+BCC frame as (text, bcc_ok), dropping noise before it."""
        while True:
            starts = [i for i in (self.buf.find(bytes([STX])), self.buf.find(bytes([SOH]))) if i != -1]
            if not starts:
                return None
            start = min(starts)
            etx = self.buf.find(bytes([ETX]), start)
            if etx == -1 or etx + 1 >= len(self.buf):
                return None
            if start:
                log('SKIP', repr(self.buf[:start].decode('latin1')))
            raw = self.buf[start:etx + 2]
            self.buf = self.buf[etx + 2:]
            ok = bcc(raw[1:-1]) == raw[-1]
            return raw, ok


def main():
    host = sys.argv[1] if len(sys.argv) > 1 else '94.180.248.157'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 5021
    step_timeout = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0

    link = Link(host, port)
    log('connected', host, port)

    link.send(b'/?!\r\n')
    ident = link.wait_for(link.take_line, step_timeout)
    log('ID', repr(ident))
    time.sleep(0.3)

    link.send(bytes([ACK]) + b'061\r\n')
    challenge = link.wait_for(link.take_frame, step_timeout)
    log('CHALLENGE', challenge)
    time.sleep(0.3)

    link.send(frame('W', '4:171.0(0)'))
    log('UNLOCK ACK', link.wait_for(lambda: link.take_byte(ACK), step_timeout))

    results, foreign = {}, 0
    for name, address in PARAMETERS.items():
        time.sleep(0.3)
        link.send(frame('R', f'{address}()'))
        end = time.time() + step_timeout
        value = None
        while time.time() < end:
            got = link.wait_for(link.take_frame, end - time.time())
            if got is None:
                break
            raw, ok = got
            text = raw.decode('latin1')
            m = re.search(r'\x02([^(]*)\(([^)]*)\)', text)
            if ok and m and core_address(m.group(1)) == core_address(address):
                value = m.group(2).split('*')[0]
                break
            foreign += 1
            log('FOREIGN', 'bcc_ok=' + str(ok), repr(text), 'while waiting for', address)
        results[name] = value
        log(f'{name:26} {address:10} -> {value}')

    link.sock.close()
    missing = [k for k, v in results.items() if v is None]
    log(f'done: {len(results) - len(missing)}/{len(results)} matched, {foreign} foreign frames, missing={missing}')


if __name__ == '__main__':
    main()
