import { Chart, Crosshair, ArgumentAxis, Grid, Title, ValueAxis, Font, CommonAxisSettings, Legend, Label, MinorGrid } from 'devextreme-react/chart';

import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import type { IPopupOptions } from 'devextreme-react/popup';
import { useScreenSize } from '../../../utils/media-query';
import { useAppData } from '../../../contexts/app-data/app-data';
import { useEffect, useRef, useState } from 'react';
import type { DeviceStatePropertiesModel } from '../../../models/flows/device-state-model';
import { startOfDay, endOfDay } from 'date-fns';
import { formatMessage } from 'devextreme/localization';
import type { SchemaTypeInfoPropertiesChainModel } from '../../../helpers/data-helper';

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
  deviceId: number;
  schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[]
};

export const GraphDialog = (props: GraphDialogProps) => {
  const chartRef = useRef<Chart>(null);
  const { getDeviceStatesByDatesAsync } = useAppData();
  const { isXSmall, isSmall } = useScreenSize();
  const [stateProperties, setStateProperties] = useState<DeviceStatePropertiesModel[] | undefined>();

  useEffect(() => {
    (async () => {
      const now = new Date();
      const beginDate = startOfDay(now);
      const endDate = endOfDay(now);
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
  }, [getDeviceStatesByDatesAsync, props.deviceId, props.schemaTypeInfos]);

  return (
    <AppModalPopup
      title='График'
      width={isXSmall || isSmall ? '95%' : 640}
      height={isXSmall || isSmall ? '80%' : 480}
      dragEnabled={!(isXSmall || isSmall)}
      resizeEnabled
      {...props}
      callback={(modalResult) => {
        if (props.callback) {
          props.callback(modalResult);
        }
      }}
    >
      <Chart
        ref={chartRef}
        dataSource={stateProperties}
        width='100%'
        height='100%'
        zoomAndPan={{ allowMouseWheel: true, argumentAxis: 'zoom', dragToZoom: true }}
        margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        tooltip={{
          enabled: true,
          arrowLength: 5,
          opacity: 1
        }}
        series={[
          {
            valueField: props.schemaTypeInfos[0].propertiesChainValuePair.propertiesChain,
            argumentField: "createdAt",
            type: 'spline',
            axis: 'commonAxis',
            point: {
              visible: true,
              size: 8
            },
            color: 'red'
          }
        ]}
      >
        <Crosshair
          enabled
          color='grey'
          dashStyle='dot'
          horizontalLine={false}
        />
        <CommonAxisSettings
          valueMarginsEnabled={true}
        />
        <ValueAxis
          name='commonAxis'
          position='left'
          visible
        >

          {/* <Tick length={4} shift={2} /> */}
          <Title text={formatMessage('app-temperatures')} >
            <Font size={12} />
          </Title>
        </ValueAxis>

        <ArgumentAxis>
          <Grid visible />
          <MinorGrid visible={false} />
          <Title text={formatMessage('app-measurement-time')} font={{ size: 12 }} />
          <Label rotationAngle={270} indentFromAxis={15} displayMode='rotate' format={'shortTime'} />
        </ArgumentAxis>

        <Legend
          position='inside'
          verticalAlignment='top'
          horizontalAlignment={'left'}
          itemTextPosition='right'
          columnCount={1}
          markerSize={10}
        />

      </Chart>
    </AppModalPopup >
  );
}