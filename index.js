const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const env = require('dotenv').config().parsed;

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const secret = env.SECRET;

const User = require('./models/user');
const Task = require('./models/task');

// Connect to the database
mongoose.connect(`mongodb+srv://${env.DB_USER}:${env.DB_PASS}@cluster0.cbbazzd.mongodb.net/?retryWrites=true&w=majority`)
    .then(() => console.log('Connected to the database'))
    .catch(error => console.error('Error connecting to the database:', error));


const app = express();

// Set up Handlebars as the view engine
app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
    defaultLayout: 'main'
}));

// Set views directory
app.set('views', __dirname + '\\views');
app.set('view engine', '.hbs');

// Set up body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(require('cookie-parser')())

// Set up static files middleware
app.use(express.static('public'));


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

// Define routes
app.get('/', verifyToken, (req, res) => {
    res.render('home');
});

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


app.get('/task/:id', verifyToken, (req, res) => {
    //get Task by id
    Task.findOne({_id: req.params.id, userID: req.userId}).then(task => {
        res.send(task);
    });
});

app.post('/task/:id', verifyToken, (req, res) => {
    let taskData = req.body;
    let name = taskData.name;
    let color = taskData.color;
    let date = taskData.date;
    let time = taskData.time;
    let notes = taskData.notes;

    // update existing task
    Task.findOneAndUpdate({_id: req.params.id}, {
        name: name,
        userID: req.userId,
        dueDateTime: new Date(date + " " + time),
        colorHex: color,
        notes: notes
    }, {new: true}).then(() => {
        res.sendStatus(200);
    });
        
});

app.get('/tasks', verifyToken, (req, res) => {
    let start = req.query.start;
    let end = req.query.end;

    Task.find({dueDateTime: {$gte: start, $lte: end}, userID: req.userId}).sort({dueDateTime: 1}).then(tasks => {
        res.send(tasks);
    });
});

app.post('/task', verifyToken, (req, res) => {
    try {
        let taskData = req.body;
        let name = taskData.name;
        let color = taskData.color;
        let date = taskData.date;
        let time = taskData.time;
        let notes = taskData.notes;

        var task = new Task({
            name: name,
            userID: req.userId,
            dueDateTime: new Date(date + " " + time),
            colorHex: color,
            notes: notes
        });
        
        task.save();
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
    
});

app.delete('/task/:id', verifyToken, (req, res) => {
    Task.deleteOne({_id: req.params.id, userID: req.userId}).then(() => {
        res.sendStatus(200);
    }).catch(err => {
        res.sendStatus(500);
    });
});


// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
