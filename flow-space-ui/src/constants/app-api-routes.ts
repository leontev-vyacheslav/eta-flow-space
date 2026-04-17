export default {
    host: process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : `http://${window.location.hostname}:3000`,

    accountSignIn: '/sign-in', //+
    accountSignOut: '/sign-out',

    healthCheck: '/health-check', // +

    quickHelpReference: '/api/quick-helps',
    flows: '/api/flows', //+
    devices: '/api/devices', //+

    // deviceStates: '/api/states/device', //+-
    deviceStates: '/api/device-states',

    // dataschema: '/api/data-schemas/device',
    dataschema: '/api/devices/:deviceId/data-schema',

    // mnemoschemas: '/api/mnemoschemas/device',
    mnemoschemas: '/api/devices/:deviceId/mnemoschema',

    // emergencyStates: '/api/states/emergency', //+
    emergencyStates: '/api/emergency-states', //+

    emergencySummaryReport: '/api/reporting/emergency-summary', //+
};
