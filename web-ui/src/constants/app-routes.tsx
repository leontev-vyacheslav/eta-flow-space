import { withNavigationWatcher } from '../contexts/navigation';
import { HomePage, AboutPage, SignOutPage } from '../pages';

const routes = [
    {
        path: '/',
        component: HomePage,
    },
    {
        path: '/home',
        component: HomePage,
    },

    {
        path: '/about',
        component: AboutPage,
    },
    {
        path: '/logout',
        component: SignOutPage,
    }
];

export default routes.map((route) => {
    return {
        ...route,
        component: withNavigationWatcher(route.component, route.path),
    };
});
