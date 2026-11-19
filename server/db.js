require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const models = require('./models');

let connection;
function connectDb() {
  if (!connection) {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in the server environment');
    connection = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'campusconnect',
      serverSelectionTimeoutMS: 10000,
    }).then(async () => {
      await Promise.all(Object.values(models).map((model) => model.init()));
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}
module.exports = connectDb;
