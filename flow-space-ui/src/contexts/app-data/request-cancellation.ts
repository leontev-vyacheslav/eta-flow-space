import { CanceledError, type GenericAbortSignal } from 'axios';

// The timer covers the whole operation, including authentication and retries.
export function createRequestDeadline(timeoutMs: number, parent?: AbortSignal) {
    const controller = new AbortController();
    const abort = () => { controller.abort(); };
    const timer = setTimeout(abort, timeoutMs);
    parent?.addEventListener('abort', abort, { once: true });
    if (parent?.aborted) {
        abort();
    }

    return {
        signal: controller.signal,
        abort,
        dispose: () => {
            clearTimeout(timer);
            parent?.removeEventListener('abort', abort);
        },
    };
}

// A caller can stop waiting for a shared refresh without cancelling it for other callers.
export function waitForRequest<T>(promise: Promise<T>, signal?: GenericAbortSignal): Promise<T> {
    if (!signal) {
        return promise;
    }

    return new Promise<T>((resolve, reject) => {
        const abort = () => {
            dispose();
            reject(new CanceledError('Request cancelled'));
        };
        const dispose = () => { signal.removeEventListener?.('abort', abort); };
        signal.addEventListener?.('abort', abort, { once: true });
        if (signal.aborted) {
            abort();
        }
        // Both handlers stay attached after cancellation so a late rejection is still handled.
        promise.then(value => {
            dispose();
            resolve(value);
        }, error => {
            dispose();
            reject(error);
        });
    });
}
