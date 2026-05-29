import './menu-item.css';
import { type MenuItemProps } from '../../../models/menu-item-props';
import type React from 'react';
import { SubmenuIcon } from '../../../constants/app-icons';

export const MenuItem = ({ item }: MenuItemProps) => {
  return (item.render ? item.render(item) :
    <div className={'menu-item'}>
      {item.icon ? item.icon(item) : null}
      {item.text ? <span style={{ color: item.textColor, fontWeight: item.textFontWeight }} className={'dx-menu-item-text'}>{item.text}</span> : null}
    </div>
  );
};

export const MenuItemWithSubMenu = ({ icon, text, selected }: { icon: React.ReactNode, text: string, selected?: boolean }) => {
  return <div className={'menu-item'} style={{ display: 'flex', alignItems: 'center' }}>
    {icon}
    <span className={'dx-menu-item-text'} style={{ display: 'flex', alignItems: 'center' }} >
      <span style={{ flex: 1, fontWeight: selected ? 'bold' : 'normal' }}>{text}</span>
      <SubmenuIcon />
    </span>
  </div>;
}