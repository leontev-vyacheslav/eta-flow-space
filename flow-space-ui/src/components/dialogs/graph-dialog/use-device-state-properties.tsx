import { endOfDay, startOfDay } from "date-fns";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { useEffect, useState } from "react";
import { useAppData } from "../../../contexts/app-data/app-data";
import type { DeviceStatePropertiesModel } from "../../../models/flows/device-state-model";

export const useDeviceStateProperties = (props: GraphChartProps) => {
    const { getDeviceStatesByDatesAsync } = useAppData();
    const [stateProperties, setStateProperties] = useState<DeviceStatePropertiesModel[] | undefined>();

    useEffect(() => {
        (async () => {
            const now = new Date();
            const beginDate = props.beginDate ?? startOfDay(now);
            const endDate = props.endDate ??  endOfDay(now);
            let stateProperties = await getDeviceStatesByDatesAsync(
                props.deviceId,
                beginDate,
                endDate,
                props.schemaTypeInfos.map(t => (t.propertiesChainValuePair.propertiesChain))
            );

            if (stateProperties) {
                stateProperties = stateProperties.map(stateItem => {
                    props.schemaTypeInfos.forEach(t => {
                        const fieldName = t.propertiesChainValuePair.propertiesChain;
                        let typedValue = stateItem[fieldName];
                        if (['integer', 'number'].includes(t.typeInfo!.typeName)) {
                            typedValue = Number(stateItem[fieldName]);
                        }
                        stateItem[fieldName] = typedValue
                    });
                    return stateItem;
                });
            }

            setStateProperties(stateProperties);
        })();
    }, [getDeviceStatesByDatesAsync, props.beginDate, props.deviceId, props.endDate, props.schemaTypeInfos]);

    return stateProperties;
}