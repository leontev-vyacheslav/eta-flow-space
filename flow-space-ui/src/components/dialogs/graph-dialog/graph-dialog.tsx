
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import type { IPopupOptions } from 'devextreme-react/popup';
import { useScreenSize } from '../../../utils/media-query';

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
  propertiesChains: string[];
};

export const GraphDialog = (props: GraphDialogProps) => {
  const { isXSmall, isSmall } = useScreenSize();


  return (
    <AppModalPopup
      title='График'
      width={isXSmall || isSmall ? '95%' : undefined}
      height={isXSmall || isSmall ? '80%' : undefined}
      defaultWidth={400}
      defaultHeight={300}
      dragEnabled={!(isXSmall || isSmall)}
      resizeEnabled
      {...props}
      callback={(modalResult) => {
        if (props.callback) {
          props.callback(modalResult);
        }
      }}
    >
      This feature isn't yet implemented!
    </AppModalPopup>
  );
}