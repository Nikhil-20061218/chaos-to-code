const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const guestRoutes = require('./routes/guestRoutes');
const documentRoutes = require('./routes/documentRoutes');
const browserAutomationRoutes = require('./routes/browserAutomationRoutes');
const apiNotFound = require('./middleware/apiNotFound');
const errorHandler = require('./middleware/errorHandler');
const csrfProtection = require('./middleware/csrfProtection');

const app = express();

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(csrfProtection);

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents', browserAutomationRoutes);
app.use('/api', apiNotFound);
app.use(errorHandler);

module.exports = app;
