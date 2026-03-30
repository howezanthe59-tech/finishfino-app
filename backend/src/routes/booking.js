const express = require('express');
const router  = express.Router();

router.post('/', (req, res) => {
  const { fullName, email, phone, service, date, time, notes } = req.body;

  // Basic validation
  if (!fullName || !email || !service || !date) {
    return res.status(400).json({ error: 'Required fields missing.' });
  }

  // TODO: Save to database or send confirmation email
  console.log('New Booking:', { fullName, email, service, date });

  res.status(201).json({
    message: 'Booking received! We will confirm shortly.',
    booking: { fullName, email, service, date, time }
  });
});

module.exports = router;
