const verifyToken = require('../auth');
const Group = require('../models/group');

module.exports = (app) => {
    app.post('/api/group', verifyToken, (req, res) => {
        if (!req.body?.name || !req.body?.color) {
            res.sendStatus(400);
            return;
        }

        let groupData = req.body;
        let name = groupData.name;
        let color = groupData.color;

        var group = new Group({
            name: name,
            userID: req.userId,
            colorHex: color
        });
        
        group.save();
        res.status(200).send(group);
    });

    app.get('/api/groups', verifyToken, (req, res) => {
        Group.find({ userID: req.userId }).then(groups => {
            res.send(groups);
        });
    });

    app.delete('/api/group/:id', verifyToken, (req, res) => {
        if (!req.params.id) {
            res.sendStatus(400);
            return;
        }

        Group.findOneAndDelete({ _id: req.params.id, userID: req.userId }).then(() => {
            res.sendStatus(200);
        });
    });

    app.get('/api/group/:id', verifyToken, (req, res) => {
        Group.findOne({ _id: req.params.id, userID: req.userId }).then(group => {
            res.send(group);
        });
    });
};