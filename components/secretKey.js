const crypto = require("crypto");
const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString("hex");
    return secretKey;
};

const secretKey = generateSecretKey();

module.exports = generateSecretKey;
module.exports = secretKey;
