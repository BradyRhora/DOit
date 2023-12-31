const verifyToken = require('../auth')
const Task = require('../models/task');

module.exports = function (app) {
    app.get('/api/task/:id', verifyToken, (req, res) => {
        //get Task by id
        Task.findOne({_id: req.params.id, userID: req.userId}).then(task => {
            res.send(task);
        });
    });
    
    app.post('/api/task/:id', verifyToken, (req, res) => {
        let taskData = req.body;
        let name = taskData.name;
        let color = taskData.color;
        let date = taskData.date;
        let time = taskData.time;
        let notes = taskData.notes;
        let completed = taskData.completed;
    
        // update existing task
        Task.findOneAndUpdate({_id: req.params.id}, {
            name: name,
            userID: req.userId,
            dueDateTime: new Date(date + " " + time),
            colorHex: color,
            completed: completed,
            notified: false,
            notes: notes
        }, {new: true}).then(() => {
            res.sendStatus(200);
        });
            
    });
    
    app.get('/api/tasks', verifyToken, (req, res) => {
        let start = req.query.start;
        let end = req.query.end;
    
        Task.find({dueDateTime: {$gte: start, $lte: end}, userID: req.userId}).sort({dueDateTime: 1}).then(tasks => {
            res.send(tasks);
        });
    });
    
    app.post('/api/task', verifyToken, (req, res) => {
        try {
            let taskData = req.body;
            let name = taskData.name;
            let color = taskData.color;
            let date = taskData.date;
            let time = taskData.time;
            let notes = taskData.notes;
    
            var task = new Task({
                name: name,
                userID: req.userId,
                dueDateTime: new Date(date + " " + time),
                colorHex: color,
                notes: notes
            });
            
            task.save();
            res.sendStatus(201);
        } catch (error) {
            console.log(error);
            res.sendStatus(500);
        }
        
    });
    
    app.delete('/api/task/:id', verifyToken, (req, res) => {
        Task.deleteOne({_id: req.params.id, userID: req.userId}).then(() => {
            res.sendStatus(200);
        }).catch(err => {
            res.sendStatus(500);
        });
    });
}