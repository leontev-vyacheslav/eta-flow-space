import { AxiosError } from 'axios';
import devices from 'devextreme/core/devices';
import notify from 'devextreme/ui/notify';
import type { MessageModel } from '../models/message-model';


export function proclaim(options: any) {
    const toastStack = document.querySelector('.dx-toast-stack');
    if(toastStack) {
        const toastsChangeHandlerElements = document.querySelectorAll('.dx-visibility-change-handler.dx-toast');

        if (toastsChangeHandlerElements) {
            Array.from(toastsChangeHandlerElements).forEach(element => {
                element.remove();
            })
        }
        toastStack.innerHTML = '';
    }

    notify({
        ...options,

        width: devices.current().phone ? '90%' : undefined,
        position: devices.current().phone ? 'bottom center' : {
            at: 'bottom right',
            my: 'bottom right',
            offset: '-20 -20'
        }
    }, {
        position: 'bottom center',
        direction: 'up-push'
    });
}

export async function  proclaimError_(error: unknown) {
    let errorMessage = (error as AxiosError).message;

    if ((error as AxiosError).response && (error as AxiosError).response?.data) {
        errorMessage = ((error as AxiosError).response?.data as MessageModel).message
        if (!errorMessage && (error as AxiosError).response?.data instanceof Blob) {
            const json = await ((error as AxiosError).response?.data as Blob).text();
            errorMessage = JSON.parse(json).message;
        }
    }

    errorMessage = !errorMessage ? (error as AxiosError).message : errorMessage;
    if (errorMessage === 'Network Error') {
        errorMessage = 'Сетевая ошибка. Отсутствует связь с сервером или сетевое соединение.'
    }
    proclaim({
        type: 'error',
        message: errorMessage,
    });
}

export async function proclaimError(error: unknown) {
    let errorMessage = (error as AxiosError).message;
    let severity: 'error' | 'warning' = 'error';

    if ((error as AxiosError).response?.data) {
        const data = (error as AxiosError).response?.data;

        let parsed: any;
        if (data instanceof Blob) {
            parsed = JSON.parse(await (data as Blob).text());
        } else {
            parsed = data;
        }

        const detail = parsed?.detail;

        if (typeof detail === 'string') {
            // raise HTTPException(detail="some string")
            errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
            // raise HTTPException(detail={"message": "...", "severity": "warning"})
            errorMessage = detail.message ?? parsed?.message ?? errorMessage;
            severity = detail.severity ?? 'error';
        } else {
            // fallback to .message field
            errorMessage = parsed?.message ?? errorMessage;
        }
    }

    if (errorMessage === 'Network Error') {
        errorMessage = 'Сетевая ошибка. Отсутствует связь с сервером или сетевое соединение.';
    }

    proclaim({
        type: severity,
        message: errorMessage,
    });
}