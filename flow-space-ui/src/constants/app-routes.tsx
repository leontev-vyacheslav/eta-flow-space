import { lazy, Suspense } from 'react';
import { withNavigationWatcher } from '../contexts/navigation';
import {  AboutPage, SignOutPage, DashboardPage, HomePage, ReportPage} from '../pages';

// the map page and Leaflet are loaded when the map is first opened; one component for both map routes,
// so the map stays mounted when switching between them
const MapPageOnDemand = lazy(() => import('../pages/map-page/map-page').then(module => ({ default: module.MapPage })));
const MapPage = () => <Suspense fallback={null}><MapPageOnDemand /></Suspense>;

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
        path: '/reports/:reportId',
        component: ReportPage,
    },
];

export default routes.map((route) => {
    return {
        ...route,
        component: withNavigationWatcher(route.component, route.path),
    };
});
