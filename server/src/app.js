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

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents', browserAutomationRoutes);
app.use('/api', apiNotFound);
app.use(errorHandler);

module.exports = app;
