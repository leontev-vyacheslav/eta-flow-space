import Form, { Item, Label } from "devextreme-react/form";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../../../contexts/app-data/app-data";

const periodTypeOptions = [
    { value: 'day', text: 'Сутки' },
    { value: 'week', text: 'Неделя' },
    { value: 'month', text: 'Месяц' },
];

type DeviceOption = {
    id: number | undefined;
    name: string;
}

type ReportParamsDialogModel = {
    periodType: string;
    deviceId: number | undefined;
}

export const EmergencySummaryReportParametric = ({ onParamsChange }: { onParamsChange: (params: ReportParamsDialogModel) => void }) => {
    const { getDeviceListAsync } = useAppData();
    const [formData, setFormData] = useState<ReportParamsDialogModel>({
        periodType: 'month',
        deviceId: 0,
    });
    const [deviceList, setDeviceList] = useState<DeviceOption[]>([]);

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
        <Form
            formData={formData}
            onFieldDataChanged={(e) => {
                setFormData((prev: ReportParamsDialogModel) => {
                    const formData = { ...prev, [e.dataField as keyof ReportParamsDialogModel]: e.value };
                    const params = { ...formData };
                    if (params.deviceId === 0) {
                        params.deviceId = undefined;
                    }
                    onParamsChange(params);

                    return formData;
                });
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
    );
}