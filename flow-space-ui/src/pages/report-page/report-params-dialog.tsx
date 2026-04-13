import { useCallback, useEffect, useMemo, useState } from 'react';
import Popup from 'devextreme-react/popup';
import Form, { Item, Label } from 'devextreme-react/form';
import { Button } from 'devextreme-react/button';
import { useAppData } from '../../contexts/app-data/app-data';

type ReportParamsDialogModel = {
    periodType: string;
    deviceId: number;
}

type ReportParamsDialogProps = {
    visible: boolean;
    initialPeriodType: string;
    initialDeviceId: number;
    onApply: (periodType: string, deviceId: number) => void;
    onClose: () => void;
}

const periodTypeOptions = [
    { value: 'day', text: 'Сутки' },
    { value: 'week', text: 'Неделя' },
    { value: 'month', text: 'Месяц' },
];

type DeviceOption = {
    id: number | undefined;
    name: string;
}

export const ReportParamsDialog = ({ visible, initialPeriodType, initialDeviceId, onApply, onClose }: ReportParamsDialogProps) => {
    const { getDeviceListAsync } = useAppData();
    const [deviceList, setDeviceList] = useState<DeviceOption[]>([]);
    const [formData, setFormData] = useState<ReportParamsDialogModel>({
        periodType: initialPeriodType,
        deviceId: initialDeviceId,
    });

    const handleShowing = useCallback(() => {
        setFormData({ periodType: initialPeriodType, deviceId: initialDeviceId });
    }, [initialPeriodType, initialDeviceId]);

    const handleApply = useCallback(() => {
        onApply(formData.periodType, formData.deviceId);
        onClose();
    }, [formData, onApply, onClose]);

    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    const periodTypeEditorOptions = useMemo(() => ({
        items: periodTypeOptions,
        valueExpr: 'value',
        displayExpr: 'text',
    }), []);

    useEffect(() => {
        (async () => {
            const devices = await getDeviceListAsync();
            if (devices) {
                setDeviceList([
                    { id: 0, name: 'Все устройства' },
                    ...devices.map(d => ({ id: d.id, name: d.name }))
                ]);
            }
        })();
    }, [getDeviceListAsync]);

    return (
        <Popup
            className="app-popup"
            wrapperAttr={{ class: "app-popup" }}
            dragEnabled={true}
            visible={visible}
            showTitle={true}
            showCloseButton={true}
            title="Параметры отчёта"
            onHiding={handleCancel}
            onShowing={handleShowing}
            width="400"
            height="auto"
        >
            <div style={{ padding: '20px', paddingTop: 0 }}>
                <Form
                    key={visible ? 'visible' : 'hidden'}
                    formData={formData}
                    onFieldDataChanged={(e) => {
                        setFormData({ ...formData, [e.dataField as string]: e.value });
                        console.log(formData);
                    }}
                >
                    <Item
                        dataField="periodType"
                        editorType="dxSelectBox"
                        editorOptions={periodTypeEditorOptions}
                    >
                        <Label text="Тип группировки" />
                    </Item>
                    <Item
                        dataField="deviceId"
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: deviceList,
                            valueExpr: 'id',
                            displayExpr: 'name',
                        }}
                    >
                        <Label text="Устройство" />
                    </Item>
                </Form>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <Button
                        text="Применить"
                        type="default"
                        onClick={handleApply}
                    />
                    <Button
                        text="Отмена"
                        onClick={handleCancel}
                    />
                </div>
            </div>
        </Popup>
    );
};
