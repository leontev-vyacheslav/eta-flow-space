import React, { forwardRef } from "react";
import Popup, { Popup as PopupRef, type IPopupOptions } from "devextreme-react/popup";
import { DialogConstants } from "../../../constants/app-dialog-constant";
import type { AppModalPopupProps } from "../../../models/app-modal-popup-props";
import { useScreenSize } from "../../../utils/media-query";

const AppModalPopup = forwardRef<
  PopupRef,
  React.PropsWithChildren<IPopupOptions> & AppModalPopupProps
>((props, ref) => {

  const { isXSmall, isSmall } = useScreenSize();

  return (
    <Popup
      ref={ref}
      className="app-popup"
      wrapperAttr={{ class: "app-popup" }}
      dragEnabled={true}
      visible={true}
      showTitle={true}
      showCloseButton={true}
      onHiding={() =>
        props.callback({
          modalResult: DialogConstants.ModalResults.Close,
          parametric: null
        })
      }
      width={isXSmall || isSmall ? "95%" : "40%"}
      height={isXSmall || isSmall ? "95%" : "450"}
      {...props}
    >
      {props.children}
    </Popup>
  );
});

export default AppModalPopup;
