export default {
    // production: the gateway serves the UI and the API on one address, so use the page's own (https://eta24.ru:3000)
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : window.location.origin,

    accountSignIn: '/sign-in',
    accountRefresh: '/refresh',
    accountSignOut: '/sign-out',

    healthCheck: '/health-check',

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows',

    devices: '/api/devices', //+
    deviceStates: '/api/device-states',
    dataschema: '/api/devices/:deviceId/data-schema',
    mnemoschemas: '/api/devices/:deviceId/mnemoschema',

    emergencyStates: '/api/emergency-states', //+

    reporting: '/api/reporting', //+

    users: '/api/users',
};
