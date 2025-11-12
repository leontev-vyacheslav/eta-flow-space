import Popup, { type IPopupOptions } from 'devextreme-react/popup';
import { useScreenSize } from '../../../utils/media-query';
import { DialogConstants } from '../../../constants/app-dialog-constant';
import type { AppModalPopupProps } from '../../../models/app-modal-popup-props';

const AppModalPopup = (props: React.PropsWithChildren<IPopupOptions> & AppModalPopupProps) => {
    const { isXSmall, isSmall } = useScreenSize();
    return (
        <Popup className={ 'app-popup' }
               wrapperAttr={ { class: 'app-popup' } }
               dragEnabled={ true }
               visible={ true }
               showTitle={ true }
               showCloseButton={ true }
               onHiding={ () => props.callback({ modalResult: DialogConstants.ModalResults.Close, parametric: null }) }
               width={ isXSmall || isSmall ? '95%' : '40%' }
               height={ isXSmall || isSmall ? '95%' : '450' } { ...props }>
            {props.children}
        </Popup>
    );
}

export default  AppModalPopup;
