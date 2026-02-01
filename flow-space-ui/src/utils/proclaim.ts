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

export async function  proclaimError(error: unknown) {
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