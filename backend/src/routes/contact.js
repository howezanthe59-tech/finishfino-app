const express = require('express');
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const BUSINESS_EMAIL = 'finishfinocleaningpro@gmail.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let sendGridConfigured = false;

// Basic anti-spam rate limit (per IP)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages. Please try again later.' }
});

function withTimeout(promise, ms, label) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}

function coerceString(value) {
  if (value == null) return '';
  return String(value);
}

function configureSendGrid() {
  if (sendGridConfigured) return true;

  // Prefer SENDGRID_API_KEY; fallback keeps older SMTP-based env files working.
  const apiKey = coerceString(process.env.SENDGRID_API_KEY || process.env.SMTP_PASS).trim();
  if (!apiKey) return false;

  sgMail.setApiKey(apiKey);
  sendGridConfigured = true;
  return true;
}

router.post('/', contactLimiter, async (req, res) => {
  const name = coerceString(req.body?.name).trim();
  const email = coerceString(req.body?.email).trim();
  const message = coerceString(req.body?.message).trim();
  const sendTimeoutMs = Number(process.env.CONTACT_SEND_TIMEOUT_MS || 20_000);

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required.' });
  }

  if (name.length > 150) {
    return res.status(400).json({ message: 'Name is too long.' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ message: 'Message is too long.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!configureSendGrid()) {
    console.error('Missing SendGrid key. Set SENDGRID_API_KEY (recommended) or SMTP_PASS.');
    return res.status(500).json({ message: 'Failed to send message' });
  }

  // Keep the sender fixed to the verified SendGrid identity.
  // Put the visitor address in replyTo so replies from your inbox go to the visitor.
  const emailPayload = {
    to: BUSINESS_EMAIL,
    from: BUSINESS_EMAIL,
    replyTo: email,
    subject: `New Contact Message from ${name}`,
    text: `Name: ${name}
Email: ${email}

Message:
${message}`
  };

  try {
    await withTimeout(sgMail.send(emailPayload), sendTimeoutMs, 'Contact email send');
    return res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact send error', err?.response?.body || err);
    return res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router;
