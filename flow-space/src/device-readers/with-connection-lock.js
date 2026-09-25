'use strict';
/**
 * ==================== очередь доступа к общему TCP-каналу ====================
 * Гарантирует, что для одного и того же host:port (например, один WIZ108SR,
 * обслуживающий несколько приборов на общей RS-485 шине — Mercury230, EK270,
 * Взлет026, Modicon) одновременно выполняется только одна операция
 * подключения/опроса, независимо от того, какой класс её инициировал.
 *
 * ВАЖНО: чтобы блокировка действительно работала между РАЗНЫМИ типами
 * приборов на одной шине, все клиентские классы (Mercury230Client,
 * Ek270Iec61107Client, Vzlet026Client, ModiconClient, ...) должны
 * импортировать withConnectionLock именно ИЗ ЭТОГО файла — а не определять
 * свою собственную копию connectionLocks. Node кеширует require() по
 * абсолютному пути к файлу, поэтому пока все клиенты требуют один и тот же
 * './connection-lock.js', они действительно разделяют один и тот же Map —
 * и, соответственно, одну и ту же очередь для общего host:port.
 */

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

module.exports = { withConnectionLock };