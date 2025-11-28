const { HttpStatusCodes } = require('../constants');

function healthCheck(msg) {
    msg.statusCode = HttpStatusCodes.OK;
    msg.payload = {
        message: 'Пользователь аутентифицирован.'
    };

    return msg;
}

module.exports = {
    healthCheck
}