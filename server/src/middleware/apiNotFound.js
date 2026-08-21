function apiNotFound(_request, response) {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found.',
    },
  });
}

module.exports = apiNotFound;
