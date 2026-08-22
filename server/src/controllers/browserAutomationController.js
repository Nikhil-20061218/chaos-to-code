const browserAutomationService = require('../services/browserAutomationService');
const asyncHandler = require('../utils/asyncHandler');

const start = asyncHandler(async (request, response) => {
  const automation = await browserAutomationService.startAutomation({
    documentId: request.params.id, owner: request.uploadOwner, targetUrl: request.body && request.body.targetUrl,
  });
  response.status(200).json({ automation });
});

module.exports = { start };
