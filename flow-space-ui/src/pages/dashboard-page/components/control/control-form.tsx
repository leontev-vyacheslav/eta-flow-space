import 'devextreme-react/switch';
import Form, { GroupItem, SimpleItem } from 'devextreme-react/form';
import AppConstants from '../../../../constants/app-constants';
import { formatMessage } from 'devextreme/localization';
import { useMemo, useRef } from 'react';
import { useDashboardPage } from '../../dashboard-page-context';
import type { ControlFormProps } from '../../models/control-form-props';

import './control-form.scss';

export const ControlForm = ({ onFieldDataChanged }: ControlFormProps) => {
    const { deviceState, isValidDeviceState, dataschema, registryEnums, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const dxControlFormRef = useRef<Form>(null);

    const controlDefinitions = useMemo(() => {
        if (dataschema && schemaTypeInfoPropertiesChain) {
            const groups = dataschema.ui?.groups;
            const grouped =
                schemaTypeInfoPropertiesChain
                    .map(({ typeInfo, propertiesChainValuePair }) => {
                        const ui = { ...typeInfo!.ui };
                        if (propertiesChainValuePair.arrayIndex !== undefined) {
                            ui.label = {
                                ...ui.label,
                                text: `${ui.label.text} ${propertiesChainValuePair.arrayIndex + 1}`
                            }
                        }
                        if (typeInfo?.isEnum) {
                            ui.editorOptions = {
                                ...ui.editorOptions,
                                items: registryEnums[typeInfo.typeName]
                            }
                        }

                        return {
                            id: propertiesChainValuePair.propertiesChain,
                            dataField: propertiesChainValuePair.propertiesChain,
                            ui: ui,
                            group: ui.group,
                            isEnum: ui.isEnum
                        }
                    })
                    .reduce((acc, item) => {
                        const key = groups?.find((g: { id: number; }) => g.id === item.group)?.id || item.group;
                        acc[key] = acc[key] || [];
                        acc[key].push(item);

                        return acc;
                    }, {} as Record<string, any[]>);

            return grouped;
        }
    }, [dataschema, registryEnums, schemaTypeInfoPropertiesChain]);

    return (deviceState?.state ?
        <Form
            className='app-form control-form'
            height={AppConstants.formHeight}
            scrollingEnabled={true}
            colCount={1}
            formData={deviceState?.state}
            ref={dxControlFormRef}
            disabled={!isValidDeviceState}
            onFieldDataChanged={onFieldDataChanged}
        >

            { controlDefinitions && Object.keys(controlDefinitions).map((groupKey) => {
                const group = dataschema?.ui?.groups?.find((g: {id: number, name: string; }) => g.id.toString() === groupKey);

                return (
                    <GroupItem key={group.id} caption={group.caption} >
                        {controlDefinitions[groupKey].map((item: any) => {
                            return (
                                <SimpleItem
                                    key={item.id}
                                    dataField={item.dataField}
                                    label={item.ui.label}
                                    editorType={item.ui.editorType}
                                    editorOptions={item.ui.editorOptions ? { ...item.ui.editorOptions } : {}}
                                    cssClass={item.ui.cssClass}
                                />
                            );
                        })}
                    </GroupItem>
                );
            })}
        </Form>
        : <div className='dx-nodata'><div>{formatMessage('noDataText')}</div></div>
    );
}