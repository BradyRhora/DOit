const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const env = require('dotenv').config().parsed;
const verifyToken = require('./auth');

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
app.set('views', __dirname + '/views');
app.set('view engine', '.hbs');

// Set up body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(require('cookie-parser')())

// Set up static files middleware
app.use(express.static('public'));


// Routes
const userRoutes = require('./routes/user')(app);
const taskRoutes = require('./routes/task')(app);

// Define routes
app.get('/', verifyToken, (req, res) => {
    res.render('home');
});

// Start the server
const port = env.PORT;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
