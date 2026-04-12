import { useCallback, useMemo, useState } from 'react';
import Popup from 'devextreme-react/popup';
import Form, { Item, Label } from 'devextreme-react/form';
import { Button } from 'devextreme-react/button';

type ReportParamsDialogModel = {
    periodType: string;
}

type ReportParamsDialogProps = {
    visible: boolean;
    initialPeriodType: string;
    onApply: (periodType: string) => void;
    onClose: () => void;
}

const periodTypeOptions = [
    { value: 'day', text: 'Сутки' },
    { value: 'week', text: 'Неделя' },
    { value: 'month', text: 'Месяц' },
];

export const ReportParamsDialog = ({ visible, initialPeriodType, onApply, onClose }: ReportParamsDialogProps) => {

    const [formData, setFormData] = useState<ReportParamsDialogModel>({
        periodType: initialPeriodType,
    });

    const handleShowing = useCallback(() => {
        setFormData({ periodType: initialPeriodType });
    }, [initialPeriodType]);

    const handleApply = useCallback(() => {
        onApply(formData.periodType);
        onClose();
    }, [formData.periodType, onApply, onClose]);

    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    const periodTypeEditorOptions = useMemo(() => ({
        items: periodTypeOptions,
        valueExpr: 'value',
        displayExpr: 'text',
    }), []);

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
            <div style={{ padding: '20px' }}>
                <Form
                    key={visible ? 'visible' : 'hidden'}
                    formData={formData}
                    onFieldDataChanged={(e) => setFormData({ ...formData, [e.dataField as string]: e.value })}
                >
                    <Item
                        dataField="periodType"
                        editorType="dxSelectBox"
                        editorOptions={periodTypeEditorOptions}
                    >
                        <Label text="Тип периода" />
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
