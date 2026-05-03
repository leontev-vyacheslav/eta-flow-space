import Toolbar, { Item } from 'devextreme-react/toolbar';
import Button from 'devextreme-react/button';
import AppLogo from '../../assets/app-logo.svg?react';
import { AccountIcon, AdminIcon, ExitIcon, MenuIcon, UserIcon } from '../../constants/app-icons';
import type { HeaderProps } from '../../models/header-props';
import { useAuth } from '../../contexts/auth';
import { MainMenu } from '../menu/main-menu/main-menu';
import { useSharedArea } from '../../contexts/shared-area';

import './header.scss';

const Header = ({ title, menuToggleEnabled, toggleMenu }: HeaderProps) => {
    const { user, isAdmin } = useAuth();
    const { signOutWithConfirm } = useSharedArea();

    return (
        <header className={'header-component'}>
            <Toolbar className={'header-toolbar'}>
                <Item visible={menuToggleEnabled} location={'before'} widget={'dxButton'} cssClass={'menu-button'}>
                    <Button icon={'none'} onClick={toggleMenu}>
                        <MenuIcon size={30} />
                    </Button>
                </Item>
                <Item
                    location={'before'}
                    cssClass={'header-title'}
                    text={title}
                    visible={!!title}
                    render={() => {
                        return (
                            <div className={'header-title-logo-container'}>
                                <AppLogo width={60} />
                                <div>{title}</div>
                            </div>
                        );
                    }}
                />
                {
                    <Item location={'after'} locateInMenu={'auto'} >
                        <MainMenu className={'user-main-menu'} items={[{
                            icon: () => <AccountIcon size={24} />,
                            items: [
                                {
                                    render: () => (
                                        <div className={'menu-item profile'} style={{ display: 'flex' }}>
                                            <div >
                                                {(isAdmin() ? <AdminIcon size={24} /> : <UserIcon size={24} />)}
                                            </div>

                                            <span className={'dx-menu-item-text'} style={{ display: 'flex', flexDirection: 'column', gap: 7 }} >
                                                <span>{isAdmin() ? 'Администратор' : 'Пользователь'}</span>
                                                <span style={{ fontSize: '0.8em', color: 'grey' }}>{user?.login}</span>
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    text: 'Выход',
                                    icon: () => (<ExitIcon size={20} />),
                                    onClick: () => {
                                        signOutWithConfirm();
                                    }
                                }
                            ]
                        }]} />
                    </Item>
                }
            </Toolbar>
        </header>
    )
}

export default Header;
