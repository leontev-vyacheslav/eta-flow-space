const jwt = require('jsonwebtoken');
const { createHash } = require('crypto');
const { UserDataModel } = require('../orm/models');
const { HttpStatusCodes } = require('../constants/http');

 async function signIn(msg) {
    const { login, password } = msg.payload;
    const hashedPassword = createHash('sha256').update(password).digest('base64');

    const user = await UserDataModel.findOne({
        where: {
            name: login,
            password: hashedPassword
        }
    });

    if (!user) {
        msg.statusCode = HttpStatusCodes.Unauthorized;
        msg.payload = { message: 'Пользователь не найден или указан невеный пароль.' }

        return msg;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        msg.statusCode = HttpStatusCodes.Forbiden;
        msg.payload = { message: 'JWT_SECRET не найден.' }

        return msg;
    }

    const token = jwt.sign(
        { userId: user.id, roleId: user.roleId },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    msg.statusCode = HttpStatusCodes.OK;
    msg.payload = {
        token,
        login: user.name,
        role: user.roleId

    };

    return msg;
}

module.exports = {
    signIn
}