import { withNavigationWatcher } from '../contexts/navigation';
import {  AboutPage, SignOutPage, DashboardPage, HomePage} from '../pages';

const routes = [
    {
        path: '/',
        component: HomePage,
    },
    {
        path: '/about',
        component: AboutPage,
    },
    {
        path: '/logout',
        component: SignOutPage,
    },
    {
        path: '/:flowCode/device/:deviceId',
        component: DashboardPage,
    }
];

export default routes.map((route) => {
    return {
        ...route,
        component: withNavigationWatcher(route.component, route.path),
    };
});
