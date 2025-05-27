const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const env = require('dotenv').config().parsed;
const secret = env.SECRET;

// rate limit rule
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100,                // limit to 100 requests
    message: 'Too many requests, please try again later.'
  });

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000,                // limit to 1000 requests
    message: 'Too many API requests, please try again later.'
  });
  
// Middleware to verify token
function verifyToken(req, res, next) {
    if (req.cookies.token === undefined) {
        res.redirect('/login');
        return;
    }
    
    const token = req.cookies.token;
    if (!token) return res.status(403).send('No token provided');

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.redirect('/login');
        }
        req.userId = decoded.id;

        // Apply rate limits
        if (req.path.startsWith('/api/')) {
            apiLimiter(req, res, () => {
                next();
            });
        } else {
            limiter(req, res, () => {
                next();
            });
        }
    });
}

module.exports = verifyToken;