const mongoose = require('mongoose');
const dns = require('node:dns');

function sanitizeErrorMessage(message) {
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, 'MongoDB connection string [redacted]');
}

function configureMongoDns() {
  const configuredServers = process.env.MONGODB_DNS_SERVERS;
  if (!configuredServers) return;

  const servers = configuredServers.split(',').map((server) => server.trim()).filter(Boolean);
  if (servers.length === 0) return;

  dns.setServers(servers);
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  try {
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not configured.');
    }

    configureMongoDns();
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection failed: ${sanitizeErrorMessage(error.message)}`);
    throw error;
  }
}

module.exports = { connectDatabase, configureMongoDns };
