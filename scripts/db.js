const mongoose = require('mongoose');
const env = require('./env');

// Connect to the database
mongoose.connect(`mongodb+srv://${env.DB_USER}:${env.DB_PASS}@cluster0.cbbazzd.mongodb.net/?retryWrites=true&w=majority`)
    .then(() => console.log('Connected to MongoDB database'))
    .catch(error => console.error('Error connecting to the database:', error));

module.exports = mongoose;