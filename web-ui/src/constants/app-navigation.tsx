import { useMemo } from 'react';
import {
    AboutIcon,
    ExitIcon,
    HomeIcon,
    SettingsIcon,
    HelpIcon,
} from './app-icons';
import type { TreeViewItemModel } from '../models/tree-view-item';
import { useAuth } from '../contexts/auth';
import type { IconBaseProps } from 'react-icons';

export const useSideNavigationMenuItems = () => {
    const { isAdmin, isOperator } = useAuth();

    return useMemo<TreeViewItemModel[]>(() => {
        return [
            {
                id: 'home',
                text: 'Главная',
                iconRender: (props: IconBaseProps) => <HomeIcon size={ 22 } { ...props } />,
                path: '/',
            },
            {
                id: 'settings',
                text: 'Настройки',
                iconRender: (props: IconBaseProps) => <SettingsIcon size={ 22 } { ...props } />,
                items: [

                ],
                visible: isAdmin() || isOperator()
            },
            {
                id: 'about',
                text: 'О программе',
                iconRender: (props: IconBaseProps) => <AboutIcon size={ 22 } { ...props } />,
                path: '/about',
            },
            {
                id: 'help',
                text: ' Справка',
                iconRender: (props: IconBaseProps) => <HelpIcon size={ 22 } { ...props } />,
                command: 'help',
            },
            {
                id: 'exit',
                text: 'Выход',
                iconRender: (props: IconBaseProps) => <ExitIcon size={ 22 } { ...props } />,
                command: 'exit',
            },
        ] as TreeViewItemModel[];
    }, [isAdmin, isOperator]);
};
