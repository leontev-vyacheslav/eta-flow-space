import { renderToStaticMarkup } from 'react-dom/server';
import devices from 'devextreme/core/devices';
import type { MenuItemModel } from '../../../models/menu-item-model';
import { MenuItem } from './menu-item';

// Menu content is static; DevExtreme owns item actions. Rendering it synchronously lets the
// menu measure labels and icons before it positions a submenu, including its first opening.
export function menuItemTemplate(item: MenuItemModel) {
  return renderToStaticMarkup(<MenuItem item={item} />);
}

// Preserve the original renderer on mobile devices, including tablets and landscape mode.
// Choose once per browser so desktop window resizing does not switch template implementations.
export const menuItemRendering = devices.real().deviceType === 'desktop'
  ? { itemTemplate: menuItemTemplate }
  : { itemRender: (item: MenuItemModel) => <MenuItem item={item} /> };
