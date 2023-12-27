const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10;

const env = require('dotenv').config().parsed;
const secret = env.SECRET;

const User = require('../models/user');

module.exports = function(app) {
    app.get('/register', (req, res) => {
        res.render('register');
    });

    app.post('/register', async (req, res) => {
        const email = req.body.email;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        
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

    app.get('/login', (req, res) => {
        res.render('login');
    });

    app.post('/login', async (req, res) => {
        User.findOne({ email: req.body.email }).then(user => {
            bcrypt.compare(req.body.password, user.hash).then(passwordIsValid => {
                if (!passwordIsValid) return res.status(401).send('Invalid password');
            
                const token = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' });
                
                res.cookie('token', token, { httpOnly: true });
                res.redirect('/');
            });
        });
    });

    app.post('/logout', (req, res) => {
        res.clearCookie('token');
        res.sendStatus(200);
    });
};