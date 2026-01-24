import 'devextreme-react/switch';
import Form, { GroupItem, SimpleItem, Tab, TabbedItem } from 'devextreme-react/form';
import AppConstants from '../../../../constants/app-constants';
import { formatMessage } from 'devextreme/localization';
import { useCallback, useMemo, useRef } from 'react';
import { useDashboardPage } from '../../dashboard-page-context';
import type { ControlFormProps } from '../../models/control-form-props';
import { useScreenSize } from '../../../../utils/media-query';

import './control-form.scss';

export const ControlForm = ({ onFieldDataChanged }: ControlFormProps) => {
    const { deviceState, isValidDeviceState, dataschema, registryEnums, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const dxControlFormRef = useRef<Form>(null);
    const { isXSmall } = useScreenSize();

    const controlDefinitions = useMemo(() => {
        if (dataschema && schemaTypeInfoPropertiesChain) {
            const groups = dataschema.ui?.groups;
            const grouped =
                schemaTypeInfoPropertiesChain
                    .filter(p => (!!p.typeInfo?.ui.editor))
                    .map(({ typeInfo, propertiesChainValuePair }) => {
                        const editor = { ...typeInfo!.ui.editor };
                        if (propertiesChainValuePair.arrayIndex !== undefined) {
                            editor.label = {
                                ...editor.label,
                                text: `${editor.label.text} ${propertiesChainValuePair.arrayIndex + 1}`
                            }
                        }
                        if (typeInfo!.isEnum) {
                            editor.editorOptions = {
                                ...editor.editorOptions,
                                items: registryEnums[typeInfo!.typeName]
                            }
                        }
                        if (typeInfo!.unit) {
                            editor.label = {
                                ...editor.label,
                                text: `${editor.label.text} (${typeInfo!.unit})`
                            }
                        }

                        return {
                            id: propertiesChainValuePair.propertiesChain,
                            dataField: propertiesChainValuePair.propertiesChain,
                            editor: editor,
                            group: typeInfo!.ui.group,
                            isEnum: typeInfo!.isEnum,
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

    const controlsRender = useCallback((groupKey: string) => {
        if (controlDefinitions) {
            return controlDefinitions[groupKey].map((item: any) => {
                return (
                    <SimpleItem
                        key={item.id}
                        dataField={item.dataField}
                        label={item.editor.label}
                        editorType={item.editor.editorType}
                        editorOptions={item.editor.editorOptions ? { ...item.editor.editorOptions } : {}}
                        // , width: item.editor.editorType != 'dxSwitch' ? "100%" : undefined
                        cssClass={item.editor.cssClass}
                    />
                );
            });
        }
    }, [controlDefinitions]);

    const groupsRender = useCallback(() => {
        if (controlDefinitions) {
            return Object.keys(controlDefinitions)
                .sort((a, b) => {
                    const groupA = dataschema.ui.groups.find((g: { id: number }) => g.id.toString() === a).order,
                        groupB = dataschema.ui.groups.find((g: { id: number }) => g.id.toString() === b).order;
                    return (groupA - groupB);
                })
                .map((groupKey) => {
                    const group = dataschema.ui.groups.find((g: { id: number, name: string; }) => g.id.toString() === groupKey);
                    const isWritable = (controlDefinitions[groupKey] as Array<any>).some((item: any) => (item.editor.editorOptions.readOnly === false));
                    return (dataschema.ui.useTabs ?
                        <Tab title={group.caption} key={groupKey} badge={isWritable === true ? 'W': undefined} >
                            {controlsRender(groupKey)}
                        </Tab>
                        :
                        <GroupItem caption={group.caption} key={groupKey} >
                            {controlsRender(groupKey)}
                        </GroupItem>
                    );
                })
        }

    }, [controlDefinitions, controlsRender, dataschema]);

    return (controlDefinitions && dataschema && deviceState && deviceState.state && Object.keys(deviceState.state).length > 0 ?
        <Form
            className='app-form control-form'
            height={AppConstants.formHeight}
            scrollingEnabled={true}
            colCount={1}
            formData={deviceState?.state}
            ref={dxControlFormRef}
            // disabled={!isValidDeviceState}
            onFieldDataChanged={onFieldDataChanged}
        // width={'100%'}
        >
            {dataschema.ui.useTabs
                ?
                <TabbedItem tabPanelOptions={{
                    // width: '100%'
                    scrollByContent: true,
                    showNavButtons: true,
                    // swipeEnabled: true,
                    // activeStateEnabled: true,
                    scrollingEnabled: true,
                    width: isXSmall ? '85vw' : '70vw',
                    deferRendering: true,
                }} >
                    {groupsRender()}
                </TabbedItem>
                : groupsRender()
            }
        </Form>
        :
        <div className='dx-nodata' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div>{formatMessage('noDataText')}</div></div>
    );
}