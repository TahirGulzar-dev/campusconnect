require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const models = require('./models');

let connection;

function connectDb() {
  if (!connection) {
    const uri = process.env.MONGODB_URI?.trim();

    if (!uri) {
      console.error('[MongoDB] MONGODB_URI is missing from this deployment');
      throw new Error('Set MONGODB_URI in the server environment');
    }

    connection = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'campusconnect',
      serverSelectionTimeoutMS: 10000,
    })
      .then(async () => {
        await Promise.all(
          Object.values(models).map((model) => model.init())
        );
      })
      .catch((error) => {
        console.error('[MongoDB] Connection or initialization failed', {
          name: error.name,
          code: error.code,
          causeCode: error.cause?.code,
        });

        connection = undefined;
        throw error;
      });
  }

  return connection;
}

module.exports = connectDb;