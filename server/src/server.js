const path = require('path');
const dotenv = require('dotenv');
const app = require('./app');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const configuredPort = Number.parseInt(process.env.PORT, 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;

app.listen(port, () => {
  console.log(`AccessAI API listening on port ${port}`);
});
