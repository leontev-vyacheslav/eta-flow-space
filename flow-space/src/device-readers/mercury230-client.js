function crc16modbus(buffer) {
    let crc = 0xFFFF;
    for (let pos = 0; pos < buffer.length; pos++) {
        crc ^= buffer[pos];
        for (let i = 0; i < 8; i++) {
            crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
        }
    }
    return Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF]);
}

function buildFrame(address, codeBytes) {
    const body = Buffer.concat([Buffer.from([address]), Buffer.from(codeBytes)]);
    return Buffer.concat([body, crc16modbus(body)]);
}

function decode3ByteValues(buf, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
        const o = i * 3;
        const b0 = buf[o], b1 = buf[o + 1], b2 = buf[o + 2];
        out.push(((b0 & 0x0F) << 16) | (b2 << 8) | b1);
    }
    return out;
}

function decode4ByteEnergy(buf, offset = 0) {
    const b0 = buf[offset], b1 = buf[offset + 1], b2 = buf[offset + 2], b3 = buf[offset + 3];
    if (b0 === 0xFF && b1 === 0xFF && b2 === 0xFF && b3 === 0xFF) return null;
    return (b1 << 24) | (b0 << 16) | (b3 << 8) | b2;
}

const INSTANT_FIELDS = [
    { name: 'Psum',    factor: 0.01 },
    { name: 'P1',      factor: 0.01 },
    { name: 'P2',      factor: 0.01 },
    { name: 'P3',      factor: 0.01 },
    { name: 'Qsum',    factor: 0.01 },
    { name: 'Q1',      factor: 0.01 },
    { name: 'Q2',      factor: 0.01 },
    { name: 'Q3',      factor: 0.01 },
    { name: 'Ssum',    factor: 0.01 },
    { name: 'S1',      factor: 0.01 },
    { name: 'S2',      factor: 0.01 },
    { name: 'S3',      factor: 0.01 },
    { name: 'U1',      factor: 0.01 },
    { name: 'U2',      factor: 0.01 },
    { name: 'U3',      factor: 0.01 },
    { name: 'Fab',     factor: 0.01 },
    { name: 'Fac',     factor: 0.01 },
    { name: 'Fbc',     factor: 0.01 },
    { name: 'I1',      factor: 0.01 },
    { name: 'I2',      factor: 0.01 },
    { name: 'I3',      factor: 0.01 },
    { name: 'cosFsum', factor: 0.001 },
    { name: 'cosF1',   factor: 0.001 },
    { name: 'cosF2',   factor: 0.001 },
    { name: 'cosF3',   factor: 0.001 },
    { name: 'Hz',      factor: 0.01 },
];

const ENERGY_READINGS = [
    { key: 'energyActiveTotal',      tariff: 0x00, energyType: 0x00 },
    { key: 'energyReactiveTotal',    tariff: 0x00, energyType: 0x02 },
    { key: 'energyActiveTariff1',    tariff: 0x01, energyType: 0x00 },
    { key: 'energyActiveTariff2',    tariff: 0x02, energyType: 0x00 },
    { key: 'energyActiveTariff3',    tariff: 0x03, energyType: 0x00 },
    { key: 'energyActiveTariff4',    tariff: 0x04, energyType: 0x00 },
    { key: 'energyReactiveTariff1',  tariff: 0x01, energyType: 0x02 },
    { key: 'energyReactiveTariff2',  tariff: 0x02, energyType: 0x02 },
    { key: 'energyReactiveTariff3',  tariff: 0x03, energyType: 0x02 },
    { key: 'energyReactiveTariff4',  tariff: 0x04, energyType: 0x02 },
];

class Mercury230Client {
    constructor(net, host, port, address, socketTimeout = 15000) {
        this.net = net;             // передаём модуль net явно (в Function node нет require)
        this.host = host;
        this.port = port;
        this.address = address;
        this.socketTimeout = socketTimeout;
        this.socket = null;
    }

    async connect() {
        this.socket = new this.net.Socket();
        this.socket.setTimeout(this.socketTimeout);
        await new Promise((resolve, reject) => {
            this.socket.once('error', reject);
            this.socket.connect(this.port, this.host, resolve);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket['destroy']();
            this.socket = null;
        }
    }

    sendCommand(codeBytes, timeoutMs = 5000) {
        const socket = this.socket;
        const frame = buildFrame(this.address, codeBytes);

        return new Promise((resolve, reject) => {
            let buffer = Buffer.alloc(0);
            let quietTimer = null;
            let overallTimer = null;

            const cleanup = () => {
                socket.removeListener('data', onData);
                if (quietTimer) clearTimeout(quietTimer);
                if (overallTimer) clearTimeout(overallTimer);
            };

            const finish = () => {
                cleanup();
                if (buffer.length < 3) { reject(new Error('Empty/short response')); return; }
                const received = buffer.slice(0, -2);
                const crcReceived = buffer.slice(-2);
                if (!crc16modbus(received).equals(crcReceived)) {
                    reject(new Error('CRC mismatch')); return;
                }
                resolve(received.slice(1));
            };

            const onData = (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                if (quietTimer) clearTimeout(quietTimer);
                quietTimer = setTimeout(finish, 300);
            };

            overallTimer = setTimeout(() => {
                cleanup();
                reject(new Error('No response (timeout)'));
            }, timeoutMs);

            socket.on('data', onData);
            socket.write(frame);
        });
    }

    openChannel() {
        return this.sendCommand([0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01]);
    }

    closeChannel() {
        return this.sendCommand([0x02]);
    }

    async readInstantaneous() {
        const raw = await this.sendCommand([0x08, 0x16, 0xA0]);
        const values = decode3ByteValues(raw, INSTANT_FIELDS.length);
        const result = {};
        INSTANT_FIELDS.forEach((field, i) => {
            result[field.name] = values[i] * field.factor;
        });
        return result;
    }

    async readEnergy(tariff, energyType) {
        const raw = await this.sendCommand([0x05, tariff, energyType]);
        const value = decode4ByteEnergy(raw, 0);
        return value !== null ? value / 1000 : null;
    }

    async readAllEnergy() {
        const result = {};
        for (const reading of ENERGY_READINGS) {
            result[reading.key] = await this.readEnergy(reading.tariff, reading.energyType);
        }
        return result;
    }

    async readFullState() {
        await this.openChannel();
        const instantData = await this.readInstantaneous();
        const energyData = await this.readAllEnergy();
        await this.closeChannel();
        return { ...instantData, ...energyData };
    }
}

module.exports = { Mercury230Client };