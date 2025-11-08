const jsonwebtoken = require('jsonwebtoken');
const { HttpStatusCodes } = require('../constants/http');

function authorize(req, res, next) {
    if (!req.path.startsWith('/api/')) {
        next();

        return;
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res
            .status(HttpStatusCodes.Unauthorized)
            .json({ error: 'The authorization token wasn\'t found.' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        return next();
    } catch (err) {
        return res
            .status(HttpStatusCodes.Unauthorized)
            .json({ error: 'The authorization token is invalid.' });
    }
}

module.exports = {
    authorize
}