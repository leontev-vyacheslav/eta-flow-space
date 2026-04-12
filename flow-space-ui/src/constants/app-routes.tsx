import { withNavigationWatcher } from '../contexts/navigation';
import {  AboutPage, SignOutPage, DashboardPage, HomePage, MapPage, ReportPage} from '../pages';

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
    },
    {
        path: '/map/:flowCode/device/:deviceId',
        component: MapPage,
    },
    {
        path: '/map',
        component: MapPage,
    },
    {
        path: '/reports/:reportCode/:periodType',
        component: ReportPage,
    },

];

export default routes.map((route) => {
    return {
        ...route,
        component: withNavigationWatcher(route.component, route.path),
    };
});
