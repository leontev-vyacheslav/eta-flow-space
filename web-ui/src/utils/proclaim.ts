import { AxiosError } from 'axios';
import devices from 'devextreme/core/devices';
import notify from 'devextreme/ui/notify';
import type { MessageModel } from '../models/message-model';


export function proclaim(options: any) {
    notify({
        width: devices.current().phone ? '100%' : undefined,
        position: devices.current().phone ? 'bottom center' : {
            at: 'bottom right',
            my: 'bottom right',
            offset: '-20 -20'
        },
        ...options,
    }, {
        position: 'bottom center',
        direction: 'up-push'
    });
}

export async function proclaimError(error: unknown) {
    let errorMessage = (error as AxiosError).message;

    if ((error as AxiosError).response && (error as AxiosError).response?.data) {
        errorMessage = ((error as AxiosError).response?.data as MessageModel).message

        if (!errorMessage && (error as AxiosError).response?.data instanceof Blob) {
            const json = await ((error as AxiosError).response?.data as Blob).text();
            errorMessage = JSON.parse(json).message;
        }
    }

    errorMessage = !errorMessage ? (error as AxiosError).message : errorMessage;

    proclaim({
        type: 'error',
        message: errorMessage,
        // displayTime: 30000000,
    });
}