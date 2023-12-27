const jwt = require('jsonwebtoken');
const env = require('dotenv').config().parsed;
const secret = env.SECRET;

// Middleware to verify token
function verifyToken(req, res, next) {
    if (req.cookies.token === undefined) {
        res.redirect('/login');
        return;
    }
    
    const token = req.cookies.token;
    if (!token) return res.status(403).send('No token provided');

    jwt.verify(token, secret, (err, decoded) => {
        if (err) return res.status(500).send('Failed to authenticate token');
        req.userId = decoded.id;
        next();
    });
}

module.exports = verifyToken;