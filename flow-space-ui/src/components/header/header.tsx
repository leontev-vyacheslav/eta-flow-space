import Toolbar, { Item } from 'devextreme-react/toolbar';
import Button from 'devextreme-react/button';
import AppLogo from '../../assets/app-logo.svg?react';
import { AccountIcon, AdminIcon, ExitIcon, MenuIcon, SettingsIcon, UserIcon, WideScreenExitIcon, WideScreenIcon } from '../../constants/app-icons';
import type { HeaderProps } from '../../models/header-props';
import { MainMenu } from '../menu/main-menu/main-menu';
import { useSharedArea } from '../../contexts/shared-area';

import './header.scss';
import { userSettingsService } from '../dialogs/user-settings-dialog/user-settings-dialog';
import { selectIsAdmin, selectUser } from '../../contexts/auth-selectors';
import { useAuthStore } from '../../contexts/auth-store';
import { useFullScreen } from '../../helpers/use-fullscreen';

const Header = ({ title, menuToggleEnabled, toggleMenu }: HeaderProps) => {
    const user = useAuthStore(selectUser);
    const isAdmin = useAuthStore(selectIsAdmin);
    const { isFullScreen, toggleFullScreen } = useFullScreen();
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
                                        <div className={'menu-item profile'} style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', paddingBottom: 10 }}    >
                                            <div >
                                                {(isAdmin ? <AdminIcon size={24} /> : <UserIcon size={24} />)}
                                            </div>

                                            <span className={'dx-menu-item-text'} style={{ display: 'flex', flexDirection: 'column', gap: 7 }} >
                                                <span>{isAdmin ? 'Администратор' : 'Пользователь'}</span>
                                                <span style={{ fontSize: '0.8em', color: 'grey' }}>{user?.login}</span>
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    text: 'Полноэкранный режим',
                                    render: () => (
                                        <div className={'menu-item profile'} style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', paddingBottom: 10 }}    >
                                            <div >
                                                {(isFullScreen ? (<WideScreenExitIcon size={20} />) : (<WideScreenIcon size={20} />))}
                                            </div>
                                            <span>{isFullScreen ? 'Нормальный режим' : 'Полноэкранный режим'}</span>
                                        </div>
                                    ),
                                    onClick: () => {
                                        toggleFullScreen();
                                    },
                                },
                                {
                                    text: 'Настройки...',
                                    icon: () => (<SettingsIcon size={20} />),
                                    onClick: () => {
                                        userSettingsService.show();
                                    }
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
