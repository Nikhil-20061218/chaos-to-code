const express = require('express');
const uploadOwner = require('../middleware/uploadOwner');
const uploadFile = require('../middleware/uploadFile');
const controller = require('../controllers/documentController');

const router = express.Router();

router.post('/upload', uploadOwner, uploadFile, controller.upload);
router.post('/:id/analyze', uploadOwner, controller.analyze);
router.get('/:id/form', uploadOwner, controller.getForm);
router.get('/:id/form/answers', uploadOwner, controller.getAnswers);
router.get('/:id/form/fields/:fieldId/listen-text', uploadOwner, controller.getTranslatedFieldText);
router.put('/:id/form/answers', uploadOwner, controller.saveAnswers);
router.get('/:id/review', uploadOwner, controller.getReview);
router.post('/:id/review/confirm', uploadOwner, controller.confirmReview);
router.post('/:id/pdf', uploadOwner, controller.generatePdf);
router.get('/:id/pdf', uploadOwner, controller.downloadPdf);
router.get('/:id', uploadOwner, controller.getDocument);

module.exports = router;
