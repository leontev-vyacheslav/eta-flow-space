import { Menu } from 'devextreme-react/menu';
import { menuItemRendering } from '../menu-item/menu-item-template';
import type { MenuItemModel } from '../../../models/menu-item-model';
import type { Item, SubmenuShownEvent } from 'devextreme/ui/menu';
import ContextMenu from 'devextreme/ui/context_menu';
import { forwardRef, useEffect, useRef, type LegacyRef } from 'react';

export type MainMenuProps = {
  className?: string;
  disabled?: boolean;
  items: MenuItemModel[];
  innerRef?: LegacyRef<Menu<any>> | undefined
};

const MainMenuInner = ({ items, innerRef, disabled, className }: MainMenuProps) => {
  const popupSource = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Reopen with fresh coordinates after resizing.
    const closePopup = () => {
      if (popupSource.current?.isConnected) {
        const popup = ContextMenu.getInstance(popupSource.current);
        if (popup instanceof ContextMenu) {
          void popup.hide();
        }
      }
    };
    window.addEventListener('resize', closePopup);
    return () => window.removeEventListener('resize', closePopup);
  }, []);

  const capturePopupSource = (event: SubmenuShownEvent) => {
    if (event.rootItem instanceof HTMLElement) {
      const source = event.rootItem.querySelector<HTMLElement>(':scope > .dx-context-menu');
      if (source) {
        popupSource.current = source;
      }
    }
  };

  return (
    <Menu
      ref={innerRef}
      className={className}
      cssClass="main-menu-popup"
      disabled={disabled}
      hideSubmenuOnMouseLeave
      items={items as unknown as Item[]}
      {...menuItemRendering}
      onSubmenuShown={capturePopupSource}
    />
  );
};

export const MainMenu = forwardRef<Menu<any>, MainMenuProps>((props, ref) =>
  <MainMenuInner {...props} className={`main-menu ${props.className}`} innerRef={ref} />
);
