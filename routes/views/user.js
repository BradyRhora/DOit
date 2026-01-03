module.exports = function(app) {
    app.get('/register', (req, res) => {
        res.render('register');
    });

    app.get('/login', (req, res) => {
        res.render('login');
    });

    app.post('/logout', (req, res) => {
        res.clearCookie('token');
        res.sendStatus(200);
    });
};