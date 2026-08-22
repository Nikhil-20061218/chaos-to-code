const nodemailer = require('nodemailer');
const AppError = require('../utils/AppError');

function createMailTransport() {
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const { SMTP_HOST: host, SMTP_PORT: port, SMTP_USER: user, SMTP_PASSWORD: pass } = process.env;
  if (!host || !port || !user || !pass || !process.env.SMTP_FROM) {
    throw new AppError('Email service is not configured.', 500);
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

async function sendVerificationOtp(email, otp) {
  const transport = createMailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'accessai-test@example.test',
    to: email,
    subject: 'Your AccessAI verification code',
    text: `Your AccessAI verification code is ${otp}. It expires in 10 minutes.`,
  });
}

module.exports = { sendVerificationOtp };
