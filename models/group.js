const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
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
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;