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
    
        // update existing task
        Task.findOneAndUpdate({_id: req.params.id}, {
            name: taskData.name,
            userID: req.userId,
            dueDateTime: new Date(taskData.date + " " + taskData.time),
            colorHex: taskData.color,
            completed: taskData.completed,
            notified: false,
            notes: taskData.notes,
            repeats: taskData.repeating,
            groupID: taskData.groupID,
            repeatOptions: {
                unit: taskData.repeatOptions?.unit,
                number: taskData.repeatOptions?.number,
                endDate: taskData.repeatOptions?.endDate
            }
        }, {new: true}).then(() => {
            res.sendStatus(200);
        });
            
    });
    
    app.get('/api/tasks', verifyToken, (req, res) => {
        let start = req.query.start;
        let end = req.query.end;

        // set time to 11:59
        start = new Date(start);
        end = new Date(end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    
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
                let taskData = {
                    _id: task._id,
                    name: task.name,
                    colorHex: task.colorHex,
                    dueDateTime: task.dueDateTime,
                    notes: task.notes,
                    group: task.groupID,
                    repeats: task.repeats,
                    completed: task.completed              
                };

                if (task.repeats) {
                    taskData.repeatOptions = task.repeatOptions;
                }

                return taskData;
            })
            .sort((a, b) => {
                return a.dueDateTime - b.dueDateTime;
            });

            res.send(tasks);
        });
    });
    
    app.post('/api/task', verifyToken, (req, res) => {
        try {
            let taskData = req.body;
            let repeatOptions = null;
            taskData.repeating = taskData.repeating === 'true';

            if (taskData.repeating) {
                repeatOptions = {
                    unit: taskData.repeatOptions.unit,
                    number: taskData.repeatOptions.number,
                    endDate: taskData.repeatOptions.endDate
                };
            }
    
            var task = new Task({
                name: taskData.name,
                userID: req.userId,
                dueDateTime: new Date(taskData.date + " " + taskData.time),
                colorHex: taskData.color,
                notes: taskData.notes,
                repeats: taskData.repeating,
                groupID: taskData.groupID,
                repeatOptions: repeatOptions
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