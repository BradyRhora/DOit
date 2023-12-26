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
    notes: {
        type: String
    }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
