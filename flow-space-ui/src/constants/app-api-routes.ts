export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : `http://${window.location.hostname}:3000`,

    accountSignIn: '/sign-in',
    accountSignOut: '/sign-out',

    healthCheck: '/health-check',

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows',
    devices: '/api/devices',
    deviceStates: '/api/states/device',
    dataschema: '/api/data-schemas/device',
    mnemoschemas: '/api/mnemoschemas/device',
    emergencyStates: '/api/states/emergency',
    emergencySummaryReport: '/api/reporting/emergency-summary',
};
