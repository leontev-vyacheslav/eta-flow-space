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

    // Читаем накопленную энергию (активную и реактивную) для заданного тарифа.
    // tariff: 0x00 = сумма по всем тарифам, 0x01..0x04 = тариф 1..4
    // Ответ содержит все 4 группы: A+ (актив. прямая), A- (актив. обратная, не используется),
    // R+ (реакт. прямая), R- (реакт. обратная, не используется) -- считываем их все за один запрос.
    async readEnergyBlock(tariff) {
        const raw = await this.sendCommand([0x05, 0x00, tariff]); // byte3=0x00 (текущий период, месяц не важен)
        const activeForward = decode4ByteEnergy(raw, 0);   // A+
        const reactiveForward = decode4ByteEnergy(raw, 8); // R+
        return {
            active: activeForward !== null ? activeForward / 1000 : null,     // кВт·ч
            reactive: reactiveForward !== null ? reactiveForward / 1000 : null, // кВАр·ч
        };
    }


    async readAllEnergy() {
        const sum = await this.readEnergyBlock(0x00);
        const t1 = await this.readEnergyBlock(0x01);
        const t2 = await this.readEnergyBlock(0x02);
        const t3 = await this.readEnergyBlock(0x03);
        const t4 = await this.readEnergyBlock(0x04);

        return {
            energyActiveTotal: sum.active,          // суммарная активная энергия (кВт·ч)
            energyReactiveTotal: sum.reactive,      // суммарная реактивная энергия (кВАр·ч)

            energyActiveTariff1: t1.active,         // активная энергия, тариф 1
            energyActiveTariff2: t2.active,         // активная энергия, тариф 2
            energyActiveTariff3: t3.active,         // активная энергия, тариф 3
            energyActiveTariff4: t4.active,         // активная энергия, тариф 4

            energyReactiveTariff1: t1.reactive,     // реактивная энергия, тариф 1
            energyReactiveTariff2: t2.reactive,     // реактивная энергия, тариф 2
            energyReactiveTariff3: t3.reactive,     // реактивная энергия, тариф 3
            energyReactiveTariff4: t4.reactive,     // реактивная энергия, тариф 4
        };
    }

    async readFullState() {
        await this.openChannel();
        const instantData = await this.readInstantaneous();
        const energyData = await this.readAllEnergy();
        await this.closeChannel();
        return { ...instantData, ...energyData };
    }
}


// ==================== очередь доступа к общему TCP-каналу ====================
// Гарантирует, что для одного и того же host:port (например, один WIZ108SR,
// обслуживающий несколько счетчиков на общей RS-485 шине) одновременно
// выполняется только одна операция подключения/опроса, даже если несколько
// экземпляров Mercury230Client пытаются подключиться одновременно.

const connectionLocks = new Map(); // key: "host:port" -> цепочка промисов

function withConnectionLock(host, port, fn) {
    const key = `${host}:${port}`;
    const previous = connectionLocks.get(key) || Promise.resolve();
    // Выполняем fn() только после завершения предыдущей операции на этом host:port,
    // независимо от того, успешно она завершилась или с ошибкой.
    const next = previous.catch(() => {}).then(fn);
    // Сохраняем цепочку, "гасим" возможную ошибку, чтобы не сломать очередь для следующих.
    connectionLocks.set(key, next.catch(() => {}));

    return next;
}

module.exports = { Mercury230Client, withConnectionLock };