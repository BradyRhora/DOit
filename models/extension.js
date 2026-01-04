const mongoose = require('mongoose');
const User = require('./user');

const extensionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    }
});

const userExtensionStateSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    extensionID: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Extensions',
        required: true
    },
    enabled: {
        type: Boolean,
        required: true,
        default: false
    }
})

const Extension = mongoose.model('Extension', extensionSchema);
const UserExtensionState = mongoose.model('UserExtensionState', userExtensionStateSchema);

async function ensureExtensionExists(extensionId) {
    const res = await Extension.findOne({_id:extensionId});
    return res != null;
}

async function createOrUpdateUserExtensionState(userId, extensionId, state) {
    const res = await UserExtensionState.updateOne({userID:userId, extensionID:extensionId},{$set: {enabled:state}}, {upsert: true});
    return res.acknowledged;
}

async function getUserExtensionStates(userId) {
    const res = await UserExtensionState.find({userID: new mongoose.Types.ObjectId(userId)}).lean();
    return res;
}

module.exports = {
    Extension,
    UserExtensionState,
    ensureExtensionExists,
    createOrUpdateUserExtensionState,
    getUserExtensionStates
};