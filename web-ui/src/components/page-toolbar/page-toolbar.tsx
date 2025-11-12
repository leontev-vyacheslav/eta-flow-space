import type { CSSProperties } from 'react';
import type { MenuItemModel } from '../../models/menu-item-model';
import { MainMenu } from '../menu/main-menu/main-menu';

export const PageToolbar = ({ title,  menuItems, style }: { title?: string, menuItems: MenuItemModel[], style?: CSSProperties }) => {

  return (
    <div className='app-page-toolbar' style={ { ...{ display: 'flex', justifyContent: 'flex-end' }, ...style } }>
      <div style={ { flex: 1 } }>
        <label className='dx-field-item-label dx-field-item-label-location-top'>
          <span className='dx-field-item-label-content'>
            <span className='dx-field-item-label-text'>{title ? `${title}:` : null}</span>
          </span>
        </label>
      </div>
      <MainMenu items={ menuItems } />
    </div>
  );
};