import './menu-item.css';
import { type MenuItemProps } from '../../../models/menu-item-props';

export const MenuItem = ({ item }: MenuItemProps) => {
  return ( item.render ? item.render(item) :
    <div className={ 'menu-item' }>
      {item.icon ? item.icon(item) : null}
      {item.text ? <span style={ { color: item.textColor, fontWeight: item.textFontWeight } } className={ 'dx-menu-item-text' }>{item.text}</span> : null}
    </div>
  );
};
