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

        let start = new Date();
        let end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
        
        // get tasks between start and end
        let promise_1 = Task.find({dueDateTime: {$gte: start, $lte: end}, userID: req.userId}).sort({dueDateTime: 1});

        // get tasks that repeat
        let promise_2 = Task.find({repeats: true, userID: req.userId, dueDateTime: {$lte: end}}).then(tasks => {
            let repeatedTasks = [];
            tasks.forEach(task => {
                let repeatOptions = task.repeatOptions.toObject();
                repeatOptions.originalDueDateTime = task.dueDateTime;
                let firstDueDateTime = task.dueDateTime;
                let repeatEnd = new Date(repeatOptions.endDate);
                let startDate = new Date(start);
                let endDate = new Date(end);

                let multiplier;
                switch (repeatOptions.unit) {
                    case 'days':
                        multiplier = 1000 * 60 * 60 * 24;
                        break;
                    case 'weeks':
                        multiplier = 1000 * 60 * 60 * 24 * 7;
                        break;
                    case 'months':
                        multiplier = 1000 * 60 * 60 * 24 * 30;
                        break;
                    case 'years':
                        multiplier = 1000 * 60 * 60 * 24 * 365;
                        break;
                }

                let gapInMilliseconds = repeatOptions.number * multiplier;
                let nextDueDateTime = new Date(firstDueDateTime.getTime() + gapInMilliseconds);
                
                while (nextDueDateTime < startDate) {
                    nextDueDateTime = new Date(nextDueDateTime.getTime() + gapInMilliseconds);
                }

                
                while (nextDueDateTime <= repeatEnd && nextDueDateTime <= endDate) {
                    repeatedTasks.push({
                        name: task.name,
                        _id: task._id,
                        userID: task.userID,
                        dueDateTime: nextDueDateTime,
                        colorHex: task.colorHex,
                        groupID: task.groupID,
                        notes: task.notes,
                        repeats: task.repeats,
                        repeatOptions: repeatOptions
                    });
                    nextDueDateTime = new Date(nextDueDateTime.getTime() + gapInMilliseconds);
                }
                
            });
            return repeatedTasks;
        });

        // return all tasks
        Promise.all([promise_1, promise_2]).then(values => {
            let tasks = values[0].concat(values[1]);
            tasks = tasks.map(task => {
                let r = parseInt(task.colorHex.substr(1,2), 16);
                let g = parseInt(task.colorHex.substr(3,2), 16);
                let b = parseInt(task.colorHex.substr(5,2), 16);

                let fg = ((r*0.299 + g*0.587 + b*0.114) > 140) ? '#000000' : '#FFFFFF';

                let taskData = {
                    id: task._id,
                    name: task.name,
                    colorHex: task.colorHex,
                    colorFG: fg,
                    date: task.dueDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    time: task.dueDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' }),
                    notes: task.notes,
                    group: task.groupID,
                    completed: task.completed
                };

                return taskData;
            })
            .sort((a, b) => {
                let dateA = new Date(a.date + ' ' + a.time);
                let dateB = new Date(b.date + ' ' + b.time);
                return dateA - dateB;
            });
            
            res.render('home', { groups: groups, upcomingTasks: tasks, publicVapidKey: env.VAPID_PUBLIC });
        }).catch(error => {
            console.error('[ERROR] Error getting upcoming tasks: ' + error);
            res.status(500).send({ error: error });
        });
    }).catch(error => {
        console.error('[ERROR] Error getting groups: ' + error);
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
                const payload = JSON.stringify({
                    title: `${task.name} - ${task.dueDateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
                    body: task.notes,
                    icon: 'android-chrome-256x256.png',
                    id: task._id,
                });

                const notificationPromises = subscriptions.map(subscription => {
                    return webpush.sendNotification(subscription, payload).catch(error => {
                        if (error.statusCode === 410) {
                            console.log('Subscription has expired or is no longer valid: ' + subscription.endpoint)
                            NotificationSubscription.deleteOne({ endpoint: subscription.endpoint }).exec()
                            .catch(error => console.error('Failed to delete subscription: ' + error.stack));
                            throw error; // Throw the error to reject the promise
                        } else {
                            console.error(error.body);
                            console.error(error.stack);
                        }
                    });
                });

                return Promise.all(notificationPromises.filter(p => p !== undefined)) // Filter out undefined promises
                    .then(() => {
                        return Task.findOneAndUpdate({ _id: task._id }, { notified: true }, { new: true }); // Update the task after all notifications have been sent
                    }).catch(error => {
                        console.error('Error while notifying user: ' + error.stack);
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
// get the current amount of seconds passed in the minute
let seconds = 60 - new Date().getSeconds();
if (seconds < 3) seconds += 60;
setTimeout(() => {
    checkNotifications();
    setInterval(() => {
        checkNotifications();
    }, 1000 * 60);
}, 1000 * seconds);

// Start the server
const port = env.PORT;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});