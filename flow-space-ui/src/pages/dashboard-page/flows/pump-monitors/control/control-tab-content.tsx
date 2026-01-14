import { useCallback } from "react";
import { ControlForm } from "../../../components/control/control-form";
import { showConfirmDialogEx } from "../../../../../utils/dialogs";
import { formatMessage } from "devextreme/localization";
import type { FieldDataChangedEvent } from "devextreme/ui/form_types";

const ControlTabContent = () => {
    const fieldDataChangedHandler = useCallback(async (e: FieldDataChangedEvent) => {
        if (!e.dataField /*|| !pumpingStationObject */) {
            return;
        }

        if (e.dataField === 'startStop') {
            // timerLockRef.current = true;
            showConfirmDialogEx({
                title: formatMessage('confirm-title'),
                iconName: 'WarningIcon',
                iconSize: 32,
                iconColor: 'darkred',
                textRender: () => {
                    return <>{formatMessage('confirm-dialog-system-start-stop', e.value ? 'запуск' : 'останов')} </>
                },
                callback: async (dialogResult) => {
                    try {
                        if (dialogResult) {
                            // await postPumpingStationStateValue(pumpingStationObject.id, {
                            //     propName: e.dataField!,
                            //     value: e.value
                            // });
                        }
                    } finally {
                        // await updatePumpingStationObjectStateAsync();
                        // timerLockRef.current = false;
                    }
                },
            });
        } else {
            // await postPumpingStationStateValue(pumpingStationObject.id, {
            //     propName: e.dataField,
            //     value: e.value
            // });
        }
    }, []);

    // useEffect(() => {
    //     if (flowCode) {
    //         console.log("ControlTabContent: ", flowCode);
    //     }
    // }, [flowCode]);

    return (
        <ControlForm onFieldDataChanged={fieldDataChangedHandler} />
    );
}

export default ControlTabContent;