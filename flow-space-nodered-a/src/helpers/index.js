module.exports = {
    ...require('./get-device-from-cache'),
    ...require('./get-weather-from-cache'),
    ...require('./store-device-state-to-cache'),
    ...require('./store-weather-to-cache'),
};
