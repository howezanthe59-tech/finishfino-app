const express = require('express');
const router  = express.Router();

router.all('/', (_req, res) => {
  return res.status(410).json({
    error: 'Legacy booking endpoint disabled. Use /api/v2/bookings.'
  });
});

module.exports = router;
