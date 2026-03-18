const express = require('express');
const router = express.Router();
const { createMatch, getMatches, getMatch, startToss, makeTossDecision, deleteMatch } = require('../controllers/matchController');
const { protect, authorize } = require('../middlewares/auth');

router.route('/')
  .get(protect, getMatches)
  .post(protect, authorize('organizer', 'admin'), createMatch);

router.route('/:id')
  .get(protect, getMatch)
  .delete(protect, authorize('organizer', 'admin'), deleteMatch);

router.post('/:id/toss', protect, authorize('organizer', 'admin'), startToss);
router.post('/:id/toss-decision', protect, authorize('organizer', 'admin'), makeTossDecision);

module.exports = router;
