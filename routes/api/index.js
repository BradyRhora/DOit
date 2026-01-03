module.exports = (app) => {
    require('./user.js')(app);
    require('./task.js')(app);
    require('./group.js')(app);
    require('./extension.js')(app);
}