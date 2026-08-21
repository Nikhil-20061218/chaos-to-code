function errorHandler(error, _request, response, _next) {
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
}

module.exports = errorHandler;
