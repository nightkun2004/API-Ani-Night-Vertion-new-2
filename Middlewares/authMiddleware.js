const jwt = require("jsonwebtoken")
const HttpError = require("../Models/ErrorModel")

const authMiddleware = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (authorizationHeader && authorizationHeader.startsWith("Bearer")) {
        const token = authorizationHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new HttpError("Unauthorized. Invalid token.", 403));
            }

            req.user = decoded;
            next();
        });
    } else {
        return next(new HttpError("Unauthorized. No token provided.", 401));
    }
};

module.exports = authMiddleware;