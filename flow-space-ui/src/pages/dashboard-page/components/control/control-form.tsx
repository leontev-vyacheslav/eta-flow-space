import 'devextreme-react/switch';
import Form, { GroupItem, SimpleItem } from 'devextreme-react/form';
import AppConstants from '../../../../constants/app-constants';
import { formatMessage } from 'devextreme/localization';
import { useMemo, useRef } from 'react';
import { useDashboardPage } from '../../dashboard-page-context';
import type { ControlFormProps } from '../../models/control-form-props';
import { getSchemaTypeInfo } from '../../../../helpers/data-helper';

import './control-form.scss';

export const ControlForm = ({ onFieldDataChanged }: ControlFormProps) => {
    const { deviceState, isValidDeviceState, dataschema, statePropertiesChainValuePairs,registryEnums } = useDashboardPage();
    const dxControlFormRef = useRef<Form>(null);

    const controlDefinitions = useMemo(() => {
        if (dataschema && statePropertiesChainValuePairs) {
            const groups = dataschema.ui?.groups;
            const grouped =
                statePropertiesChainValuePairs
                    .map(p => {
                        const typeInfo = getSchemaTypeInfo(p.propertiesChain, dataschema);
                        return { typeInfo: typeInfo, propertiesChainValuePair: p };
                    })
                    .filter(({ typeInfo }) => !!typeInfo && !!typeInfo.ui)
                    .map(({ typeInfo, propertiesChainValuePair }) => {

                        if (propertiesChainValuePair.arrayIndex !== undefined) {
                            typeInfo!.ui = {
                                ...typeInfo!.ui,
                                label: {
                                    ...typeInfo!.ui.label,
                                    text: `${typeInfo!.ui.label.text} ${propertiesChainValuePair.arrayIndex + 1}`
                                }
                            }
                        }
                        if (typeInfo?.isEnum) {
                            typeInfo!.ui = {
                                ...typeInfo!.ui,
                                editorOptions: {
                                    ...typeInfo!.ui.editorOptions,
                                    items: registryEnums[typeInfo.typeName]
                                }
                            }
                        }
                        return {
                            id: propertiesChainValuePair.propertiesChain,
                            dataField: propertiesChainValuePair.propertiesChain,
                            ui: typeInfo!.ui,
                            group: typeInfo!.ui.group,
                            isEnum: typeInfo!.isEnum
                        }
                    })
                    .reduce((acc, item) => {
                        const key = groups?.find((g: { id: number; }) => g.id === item.group)?.name || item.group;
                        acc[key] = acc[key] || [];
                        acc[key].push(item);

                        return acc;
                    }, {} as Record<string, any[]>);

            return grouped;
        }
    }, [dataschema, registryEnums, statePropertiesChainValuePairs]);

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
            {controlDefinitions && Object.keys(controlDefinitions).map((groupKey) => {
                const group = dataschema?.ui?.groups?.find((g: { name: string; }) => g.name === groupKey);

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