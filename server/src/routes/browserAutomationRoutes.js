const express = require('express');
const uploadOwner = require('../middleware/uploadOwner');
const controller = require('../controllers/browserAutomationController');

const router = express.Router();
router.post('/:id/automation/start', uploadOwner, controller.start);

module.exports = router;
