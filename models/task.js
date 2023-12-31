const mongoose = require('mongoose');

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
    }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
