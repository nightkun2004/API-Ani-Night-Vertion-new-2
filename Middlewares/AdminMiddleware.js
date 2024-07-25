const jwt = require('jsonwebtoken');
const HttpError = require('../Models/ErrorModel');

const authenticateToken = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (authorizationHeader && authorizationHeader.startsWith("Bearer")) {
        const token = authorizationHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET_ADMIN, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            req.user = decoded;
            next();
        });
    } else {
        next(new HttpError("Unauthorized. No token provided.", 401));
    }
};

module.exports = authenticateToken;
