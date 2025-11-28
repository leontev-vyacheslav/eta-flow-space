
module.exports = {
    ...require('./sign-in'),
    ...require('./health-check'),

    ...require('./get-flows'),
    ...require('./get-devices'),
    ...require('./get-device'),
    ...require('./get-device-state'),
    ...require('./get-device-mnemoschema'),
    ...require('./get-device-states-by-dates'),

    ...require('./get-quick-helps'),
};