const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const apiNotFound = require('./middleware/apiNotFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', apiNotFound);
app.use(errorHandler);

module.exports = app;
