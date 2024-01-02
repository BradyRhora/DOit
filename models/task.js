const mongoose = require('mongoose');

const repeatOptionsSchema = new mongoose.Schema({
    unit: {
        type: String,
        enum: ['days', 'weeks', 'months', 'years'],
        required: true
    },
    number: {
        type: Number,
        required: true
    }, 
    endDate: {
        type: Date
    }
});

const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        required: true
    },
    colorHex: {
        type: String,
        required: true
    },
    dueDateTime: {
        type: Date,
        required: true
    },
    groupID: {
        type: String
    },
    notes: {
        type: String
    },
    notified: {
        type: Boolean,
        default: false
    },
    completed: {
        type: Boolean,
        default: false
    },
    repeats: {
        type: Boolean,
        default: false
    },
    repeatOptions: {
        type: repeatOptionsSchema
    }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
