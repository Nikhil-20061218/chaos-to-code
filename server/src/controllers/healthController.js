const { getHealthStatus } = require('../services/healthService');

function getHealth(_request, response) {
  response.status(200).json(getHealthStatus());
}

module.exports = { getHealth };
