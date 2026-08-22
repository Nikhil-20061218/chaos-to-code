const path = require('path');
const dotenv = require('dotenv');
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { scheduleExpiredDocumentCleanup } = require('./services/documentService');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const configuredPort = Number.parseInt(process.env.PORT, 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;

async function startServer() {
  try {
    await connectDatabase();
    scheduleExpiredDocumentCleanup();

    app.listen(port, () => {
      console.log(`AccessAI API listening on port ${port}`);
    });
  } catch (_error) {
    console.error('AccessAI API did not start because MongoDB is unavailable.');
    process.exitCode = 1;
  }
}

startServer();
