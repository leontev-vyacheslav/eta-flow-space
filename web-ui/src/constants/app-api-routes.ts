export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:1880' : `http://${window.location.hostname}:1880`,

    accountSignIn: '/sign-in',
    accountSignOut: '/sign-out',
    accountAuthCheck: '/auth-check',

    quickHelpReference: '/api/quick-help-references',
};
