const express = require('express');
const exphbs = require('express-handlebars');
const env = require('./scripts/env');

// Set up web push  
const webpush = require('web-push'); 

webpush.setVapidDetails(
    'mailto:brady0423@gmail.com',
    env.VAPID_PUBLIC,
    env.VAPID_PRIVATE
);


// Express
const app = express();

// Use Handlebars as the view engine
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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(require('cookie-parser')())

// Set static files middleware
app.use(express.static('public'));

// Routes
require('./routes/views')(app);
require('./routes/api')(app);


// Start the server
const port = env.PORT;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
}).on('error', (err) => {
    console.error(error);
});