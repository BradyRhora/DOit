const { hash: _hash, compare } = require('bcrypt');
const { sign } = require('jsonwebtoken');
const saltRounds = 10;
const verifyToken = require('../../scripts/auth');

const env = require('dotenv').config().parsed;
const secret = env.SECRET;

const User = require('../../models/user');
const { ensureExtensionExists, createOrUpdateUserExtensionState, getUserExtensionStates } = require('../../models/extension');

module.exports = function(app) {
    app.post('/api/register', async (req, res) => {
        const email = req.body.email;
        const hashedPassword = await _hash(req.body.password, saltRounds);
        
        const user = new User({
            email: email,
            hash: hashedPassword
        });

        user.save().then(() => {
            res.sendStatus(201);
        }).catch(err => {        
            if (err.code === 11000) {
                res.status(409).send('Account with email already exists.');
            } else {
                console.log(err);
                res.sendStatus(500);
            }
        });
    });

    app.post('/api/login', async (req, res) => {
        User.findOne({ email: req.body.email }).then(user => {
            if (!user) return res.sendStatus(401);
            compare(req.body.password, user.hash).then(passwordIsValid => {
                if (!passwordIsValid) return res.sendStatus(401);
            
                const token = sign({ id: user.id }, secret, { expiresIn: '30d' });
                
                res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
                res.redirect('/');
            });
        });
    });

    app.get('/api/user/extensions', verifyToken, async (req, res) => {
        getUserExtensionStates(req.userId)
        .then(states => {
            res.send(states);
        })
    });

    app.post('/api/user/extension', verifyToken, async (req, res) => {
        var data = req.body;
        const extensionId = data.extensionId;
        const state = data.state;

        if (extensionId && state != null) {
            if (ensureExtensionExists(extensionId)) {
                var success = createOrUpdateUserExtensionState(req.userId, extensionId, state);
                if (success) res.sendStatus(200);
                else res.sendStatus(500);
            } else {
                res.sendStatus(400);
            }
        } else {
            res.sendStatus(400);
        }
    });
};