import 'devextreme-react/switch';
import Form, { GroupItem, SimpleItem } from 'devextreme-react/form';
import type { FieldDataChangedEvent } from 'devextreme/ui/form';
import AppConstants from '../../../../../constants/app-constants';
import { formatMessage } from 'devextreme/localization';
import { showConfirmDialogEx } from '../../../../../utils/dialogs';
import { useAuth } from '../../../../../contexts/auth';
import { useMemo, useRef } from 'react';

import './control-form.scss';
import { useDashboardPage } from '../../../dashboard-page-context';

export const ControlForm = () => {
    const {deviceState, isValidDeviceState } = useDashboardPage();

    const state = useMemo(() => {
        return deviceState?.state;
    }, [deviceState]);


    // const { pumpingStationObjectState, dxPumpingStationStateFormRef, pumpingStationObject, timerLockRef, updatePumpingStationObjectStateAsync } = usePumpingStationPage();
    // const { postPumpingStationStateValue } = usePumpingStationsData();
    const { isOperator } = useAuth();
    const dxControlFormRef = useRef<Form>(null);
    return (state ?
        <Form
            className='app-form control-form'
            height={AppConstants.formHeight}
            scrollingEnabled={true}
            colCount={1}
            formData={state}
            ref={dxControlFormRef}
            disabled={!isValidDeviceState}

            onFieldDataChanged={async (e: FieldDataChangedEvent) => {
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
            }}
        >
            <GroupItem caption={'Управление'}>
                <SimpleItem
                    dataField='startStop'
                    label={{ location: 'top', showColon: true, text: 'Включение/выключение работы станции' }}
                    editorType='dxSwitch'
                    editorOptions={{ readOnly: isOperator() }}
                />
                <SimpleItem
                    dataField='resetFaultPump1'
                    label={{ location: 'top', showColon: true, text: 'Сброс ошибки насоса 1' }}
                    editorType='dxSwitch'
                    editorOptions={{ readOnly: isOperator() }}
                />

                <SimpleItem
                    dataField='resetFaultPump2'
                    label={{ location: 'top', showColon: true, text: 'Сброс ошибки насоса 2' }}
                    editorType='dxSwitch'
                    editorOptions={{ readOnly: isOperator() }}
                />

                <SimpleItem
                    dataField='resetOperatingTimePump1'
                    label={{ location: 'top', showColon: true, text: 'Сброс времени наработки насоса 1' }}
                    editorType='dxSwitch'
                    editorOptions={{ readOnly: isOperator() }}
                />

                <SimpleItem
                    dataField='resetOperatingTimePump2'
                    label={{ location: 'top', showColon: true, text: 'Сброс времени наработки насоса 2' }}
                    editorType='dxSwitch'
                    editorOptions={{ readOnly: isOperator() }}
                />
            </GroupItem>

            <GroupItem caption={'Состояния'}>
                <SimpleItem
                    dataField='lowLevel'
                    label={{ location: 'left', showColon: true, text: 'Нижний уровень' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='midLevel'
                    label={{ location: 'left', showColon: true, text: 'Средний уровень' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='hiLevel'
                    label={{ location: 'left', showColon: true, text: 'Верхний уровень' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='emergencyLevel'
                    label={{ location: 'left', showColon: true, text: 'Аварийный уровень' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='statePump1'
                    label={{ location: 'left', showColon: true, text: 'Состояние насоса 1' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='statePump2'
                    label={{ location: 'left', showColon: true, text: 'Состояние насоса 2' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass="form-check-box"
                />

                <SimpleItem
                    dataField='faultPump1'
                    label={{ location: 'left', showColon: true, text: 'Ошибка насоса 1' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='faultPump2'
                    label={{ location: 'left', showColon: true, text: 'Ошибка насоса 2' }}
                    editorType='dxCheckBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-check-box'
                />

                <SimpleItem
                    dataField='timePump1'
                    label={{ location: 'top', showColon: true, text: 'Время наработки насоса 1, час' }}
                    editorType='dxNumberBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-input-box'
                />

                <SimpleItem
                    dataField='timePump2'
                    label={{ location: 'top', showColon: true, text: 'Время наработки насоса 2, час' }}
                    editorType='dxNumberBox'
                    editorOptions={{ readOnly: true }}
                    cssClass='form-input-box'
                />
            </GroupItem>
        </Form>
        : <div className='dx-nodata'><div>{formatMessage('noDataText')}</div></div>
    );
}