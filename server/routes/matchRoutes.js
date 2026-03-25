const express = require('express');
const router = express.Router();
const { createMatch, getMatches, getMatch, updateMatch, startMatch, deleteMatch } = require('../controllers/matchController');
const { getMatchSummary } = require('../controllers/scoreController');
const { protect, isMatchOwner } = require('../middlewares/auth');

router.route('/')
  .get(protect, getMatches)
  .post(protect, createMatch);

router.route('/:id')
  .get(protect, getMatch)
  .put(protect, isMatchOwner, updateMatch)
  .delete(protect, isMatchOwner, deleteMatch);

router.post('/:id/start', protect, startMatch);
router.get('/:id/summary', protect, getMatchSummary);

module.exports = router;
