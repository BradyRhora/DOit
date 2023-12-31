const express = require('express');
const exphbs = require('express-handlebars');
const env = require('dotenv').config().parsed;
const verifyToken = require('./auth');

const Group = require('./models/group');
const Task = require('./models/task');


const mongoose = require('mongoose');
// Connect to the database
mongoose.connect(`mongodb+srv://${env.DB_USER}:${env.DB_PASS}@cluster0.cbbazzd.mongodb.net/?retryWrites=true&w=majority`)
    .then(() => console.log('Connected to MongoDB database'))
    .catch(error => console.error('Error connecting to the database:', error));

// Set up web push  
const webpush = require('web-push'); 
const NotificationSubscription = require('./models/notification_subscription');

webpush.setVapidDetails(
    'mailto:brady0423@gmail.com',
    env.VAPID_PUBLIC,
    env.VAPID_PRIVATE
);

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(require('cookie-parser')())

// Set up static files middleware
app.use(express.static('public'));


// Routes
require('./routes/user')(app);
require('./routes/task')(app);
require('./routes/group')(app);

app.post('/subscribe', verifyToken, (req, res) => {
    console.log("[DEBUG] User subscribing: " + req.userId);
    const subscription = req.body;
    NotificationSubscription.create({
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
        },
        user: req.userId
    }).then(() => {
        res.status(201).send();
    }).catch(error => {
        res.status(500).send({ error: error });
    });
});

app.get('/', verifyToken, (req, res) => {
    Group.find({ userID: req.userId }).then(groups => {
        groups = groups.map(group => {
            return {
                id: group._id,
                name: group.name,
                color: group.colorHex
            };
        });

        // get upcoming tasks (within 7 days)
        Task.find({ userID: req.userId, dueDateTime: { $lte: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) } })
        .lean().sort('dueDateTime')
        .then(tasks => {
            tasks = tasks.map(task => {                
                let r = parseInt(task.colorHex.substr(1,2), 16);
                let g = parseInt(task.colorHex.substr(3,2), 16);
                let b = parseInt(task.colorHex.substr(5,2), 16);

                let fg = ((r*0.299 + g*0.587 + b*0.114) > 140) ? '#000000' : '#FFFFFF';

                return {
                    id: task._id,
                    name: task.name,
                    colorHex: task.colorHex,
                    colorFG: fg,
                    date: task.dueDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    time: task.dueDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' }),
                    notes: task.notes,
                    group: task.groupID
                };
            });

            res.render('home', { groups: groups, upcomingTasks: tasks, publicVapidKey: env.VAPID_PUBLIC });
        });
    }).catch(error => {
        res.status(500).send({ error: error });
    });
});

function checkNotifications() {
    let utcDate = new Date();
    let futureDate = new Date(new Date().setTime(utcDate.getTime() + 1000 * 60 * 60)); // 1 hour from now
    Task.find({ $or: [{ notified: false }, { notified: { $exists: false } }], dueDateTime: { $gt: utcDate, $lte: futureDate } })
    .lean().sort('dueDateTime')
    .then(tasks => {
        tasks.forEach(task => {
            NotificationSubscription.find({ user: task.userID }).then(subscriptions => {
                subscriptions.forEach(subscription => {
                    const payload = JSON.stringify({
                        title: `${task.name} - ${task.dueDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
                        body: task.notes,
                        icon: 'android-chrome-256x256.png',
                        id: task._id,
                    });

                    webpush.sendNotification(subscription, payload).catch(error => {
                        if (error.statusCode === 410) {
                            NotificationSubscription.deleteOne({ endpoint: subscription.endpoint });
                        } else {
                            console.error(error.body);
                            console.error(error.stack);
                        }
                    }).then(() => {
                        Task.findOneAndUpdate({ _id: task._id }, { notified: true }, { new: true });
                    });
                });
            }).catch(error => {
                console.error(error.stack);
            });
        });
    }).catch(error => {
        console.error(error.stack);
    });
}

// Start task notifier
setTimeout(() => {
    checkNotifications();
    setInterval(() => {
        checkNotifications();
    }, 1000 * 60);
}, 1000 * 3);

// Start the server
const port = env.PORT;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});