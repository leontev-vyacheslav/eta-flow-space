export type DisposedTimersStorageModel = {
    areas: DisposedTimersStorageAreaModel[]
}

export type DisposedTimerModel = {
    uuid: string;
    intervalTimer: ReturnType<typeof setInterval> | null;
    timeoutTimerCancellationToken: boolean;
}

export type DisposedTimersStorageAreaModel = {
    name: string;
    items: DisposedTimerModel[]
}