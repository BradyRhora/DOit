const {Extension} = require("../../models/extension");

module.exports = function(app) {
    app.get("/api/extension", async (req, res) => {
        let extensions = await Extension.find()
        .then(extensions => res.send(extensions));
    });
};