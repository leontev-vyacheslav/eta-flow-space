export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:1895' : `http://${window.location.hostname}:1895`,

    accountSignIn: '/sign-in',
    accountSignOut: '/sign-out',

    healthCheck: '/health-check',

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows',
    devices: '/api/devices',
    deviceStates: '/api/states/device',
    dataschema: '/api/data-schemas/device',
    mnemoschemas: '/api/mnemoschemas/device',
    emergencyStates: '/api/states/emergency/device',
};
