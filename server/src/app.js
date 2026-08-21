const express = require('express');

const app = express();

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'AccessAI API',
  });
});

app.use('/api', (_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found.',
    },
  });
});

app.use((error, _request, response, _next) => {
  const statusCode = Number.isInteger(error.status) ? error.status : 500;

  if (statusCode >= 500) {
    console.error('Unhandled API error');
  }

  response.status(statusCode).json({
    error: {
      code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message: statusCode >= 500 ? 'An unexpected error occurred.' : error.message,
    },
  });
});

module.exports = app;
