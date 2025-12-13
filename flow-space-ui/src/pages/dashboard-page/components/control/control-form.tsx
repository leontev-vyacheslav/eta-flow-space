
import 'devextreme-react/switch';
import Form, { GroupItem, SimpleItem } from 'devextreme-react/form';
import type { FieldDataChangedEvent } from 'devextreme/ui/form';
import AppConstants from '../../../../constants/app-constants';
import { formatMessage } from 'devextreme/localization';
import { useAuth } from '../../../../contexts/auth';
import { useMemo, useRef } from 'react';
import { useDashboardPage } from '../../dashboard-page-context';

import './control-form.scss';

type EditorType = 'dxTextBox' | 'dxNumberBox' | 'dxSwitch' | 'dxCheckBox';
type ControlFormProps = {
    onFieldDataChanged?: ((e: FieldDataChangedEvent) => void) | undefined
};

export const ControlForm = ({ onFieldDataChanged }: ControlFormProps) => {
    const { deviceState, isValidDeviceState, dataschema } = useDashboardPage();

    const groupedControlDefinitions = useMemo(() => {
        if (dataschema) {
            const groups = dataschema.ui?.groups;

            const grouped = Object
                .keys(dataschema.properties)
                .filter((key) => !!dataschema.properties[key].ui)
                .map((key) => {
                    return {
                        id: key,
                        dataField: key,
                        ...dataschema.properties[key],
                        group: dataschema.properties[key].ui.group
                    }
                }).reduce((acc, item) => {
                    const key = groups?.find((g: { id: number; }) => g.id === item.group)?.name || item.group;
                    acc[key] = acc[key] || [];
                    acc[key].push(item);

                    return acc;
                }, {} as Record<string, any[]>);
            console.log(grouped);

            return grouped;
        }
    }, [dataschema]);

    const state = useMemo(() => {
        return deviceState?.state;
    }, [deviceState]);


    /* eslint-disable @typescript-eslint/no-unused-vars */
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
            onFieldDataChanged={onFieldDataChanged}
        >
            {groupedControlDefinitions && Object.keys(groupedControlDefinitions).map((groupKey) => {
                const group = dataschema?.ui?.groups?.find((g: { name: string; }) => g.name === groupKey);

                return (
                    <GroupItem key={group.id} caption={group.description}>
                        {groupedControlDefinitions[groupKey].map((item: any) => {
                            return (
                                <SimpleItem
                                    key={item.id}
                                    dataField={item.dataField}
                                    label={item.ui.label}
                                    editorType={item.ui.editorType as EditorType}
                                    editorOptions={item.ui.editorOptions ? { ...item.ui.editorOptions } : {}}
                                    cssClass={item.ui.cssClass} />
                            );
                        })}
                    </GroupItem>
                );
            })}
        </Form>
        : <div className='dx-nodata'><div>{formatMessage('noDataText')}</div></div>
    );
}