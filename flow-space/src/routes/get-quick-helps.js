const { promises: fs, existsSync } = require('fs');
const path = require('path');
const { HttpStatusCodes } = require('../constants');

async function getQuickHelps(msg) {
    const referenceKeyEncoded = msg.req.params.referenceKey;
    const referenceKey = Buffer.from(referenceKeyEncoded, 'base64').toString('utf8');
    const quickHelpPath = `${path.join('/data/static', '/quick-help/content', referenceKey)}.md`;

    console.log(quickHelpPath)
    if (!existsSync(quickHelpPath)) {
        msg.statusCode = HttpStatusCodes.InternalServerError;
        msg.payload = { message: `Элемент справочной системы ${referenceKey} не найден.` }

        return msg;
    }

    let quickHelpContent;
    try {
        quickHelpContent = await fs.readFile(quickHelpPath, 'utf8');
    } catch (error) {
        msg.statusCode = HttpStatusCodes.InternalServerError;
        msg.payload = { message: error }

        return msg;
    }

    msg.payload = {
        key: referenceKey,
        content: quickHelpContent,
    };

    return msg;
}

module.exports = {
    getQuickHelps
}