import './menu-item.css';
import { type MenuItemProps } from '../../../models/menu-item-props';

export const MenuItem = ({ item }: MenuItemProps) => {
  return (
    <div className={ 'menu-item' }>
      {item.icon ? item.icon(item) : null}
      {item.text ? <span style={ { color: item.textColor } } className={ 'dx-menu-item-text' }>{item.text}</span> : null}
    </div>
  );
};
