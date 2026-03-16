const express = require('express');
const router = express.Router();
const { createMatch, getMatches, getMatch } = require('../controllers/matchController');
const { protect, authorize } = require('../middlewares/auth');

router.route('/')
  .get(protect, getMatches)
  .post(protect, authorize('organizer', 'admin'), createMatch);

router.route('/:id')
  .get(protect, getMatch);

module.exports = router;
