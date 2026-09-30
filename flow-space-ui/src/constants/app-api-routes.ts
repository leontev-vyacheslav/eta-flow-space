// production: the gateway serves the UI and the API on one address, so use the page's own (https://eta24.ru:3000)
const host = process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : window.location.origin;

export default {
    host,

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

    // the report service, through the same gateway as the API (dev: the tunnel to production);
    // to work on reports against a local flow-space-reporting, put VITE_REPORTING_HOST=http://localhost:8000/api
    // into flow-space-ui/.env.development.local (not committed)
    reportingHost: import.meta.env.VITE_REPORTING_HOST || `${host}/api/reporting`,

    users: '/api/users',
};
