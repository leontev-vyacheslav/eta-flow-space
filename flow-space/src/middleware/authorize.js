const jsonwebtoken = require('jsonwebtoken');
const { HttpStatusCodes } = require('../constants/http');

function authorize(req, res, next) {
    if (!req.path.startsWith('/api/') || !req.path === '/health-check') {
        next();

        return;
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res
            .status(HttpStatusCodes.Unauthorized)
            .json({ message: 'Токен авторизации не указа в запросе.' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        return next();
    } catch (err) {
        return res
            .status(HttpStatusCodes.Unauthorized)
            .json({ message: 'Токен авторизации неверный.' });
    }
}

module.exports = {
    authorize
}