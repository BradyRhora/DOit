const mongoose = require('mongoose');

const notificationSubscriptionSchema = new mongoose.Schema({
    endpoint: {
        type: String,
        required: true,
    },
    keys: {
        p256dh: {
            type: String,
            required: true,
        },
        auth: {
            type: String,
            required: true,
        },
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

const NotificationSubscription = mongoose.model('NotificationSubscription', notificationSubscriptionSchema);

module.exports = NotificationSubscription;
