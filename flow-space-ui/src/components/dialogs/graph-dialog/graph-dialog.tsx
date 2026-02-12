
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import type { IPopupOptions } from 'devextreme-react/popup';
import { useScreenSize } from '../../../utils/media-query';
import { useAppData } from '../../../contexts/app-data/app-data';
import { useEffect, useState } from 'react';
import type { DeviceStatePropertiesModel } from '../../../models/flows/device-state-model';
import { startOfDay, endOfDay } from 'date-fns';

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
  deviceId: number;
  propertiesChains: string[];
};

export const GraphDialog = (props: GraphDialogProps) => {

  const { getDeviceStatesByDatesAsync } = useAppData();
  const { isXSmall, isSmall } = useScreenSize();
  const [stateProperties, setStateProperties] = useState<DeviceStatePropertiesModel[] | undefined>();

  useEffect(() => {
    (async () => {
      const now = new Date();
      const beginDate = startOfDay(now);
      const endDate = endOfDay(now);
      const stateProperties = await getDeviceStatesByDatesAsync(props.deviceId, beginDate, endDate, props.propertiesChains);
      setStateProperties(stateProperties);
    })();
  }, [getDeviceStatesByDatesAsync, props.deviceId, props.propertiesChains]);

  return (
    <AppModalPopup
      title='График'
      width={isXSmall || isSmall ? '95%' : undefined}
      height={isXSmall || isSmall ? '80%' : 150}
      defaultWidth={400}
      defaultHeight={500}
      dragEnabled={!(isXSmall || isSmall)}
      resizeEnabled
      {...props}
      callback={(modalResult) => {
        if (props.callback) {
          props.callback(modalResult);
        }
      }}
      contentRender={() => {
        return stateProperties && stateProperties.length > 0 ?
          <>
            <div>{'This feature isn\'t yet implemented!'}</div>
            <div> {`It has been received ${stateProperties?.length} values of ${props.propertiesChains[0]}.`}</div>
            <div>{'I\'m going to draw a chart soon!'}</div>
          </> : null
      }}
    >
    </AppModalPopup >
  );
}