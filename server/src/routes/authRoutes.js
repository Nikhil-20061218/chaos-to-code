const express = require('express');
const authenticate = require('../middleware/authenticate');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/register', controller.register);
router.post('/verify-email', controller.verifyEmail);
router.post('/resend-otp', controller.resendOtp);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
