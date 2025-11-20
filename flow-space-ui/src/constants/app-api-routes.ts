export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:1880' : `http://${window.location.hostname}:1880`,

    accountSignIn: '/sign-in',
    accountSignOut: '/sign-out',

    healthCheck: '/health-check',

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows',
    devices: '/api/devices',
    states: '/api/states/device',
    mnemoschemas: '/api/mnemoschemas/device'
};
