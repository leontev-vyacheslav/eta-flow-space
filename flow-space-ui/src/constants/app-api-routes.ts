export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:3005' : `http://${window.location.hostname}:3000`,

    accountSignIn: '/sign-in', //+
    accountSignOut: '/sign-out',

    healthCheck: '/health-check', // +

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows', //+
    devices: '/api/devices', //+

    deviceStates: '/api/device-states',

    dataschema: '/api/devices/:deviceId/data-schema',

    mnemoschemas: '/api/devices/:deviceId/mnemoschema',

    emergencyStates: '/api/emergency-states', //+

    reporting: '/api/reporting', //+
};
