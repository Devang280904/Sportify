const express = require('express');
const router = express.Router();
const {
  getLiveMatches,
  getUpcomingMatches,
  getCompletedMatches,
  getMatchDetails
} = require('../controllers/realCricketController');

router.get('/live', getLiveMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/completed', getCompletedMatches);
router.get('/match/:id', getMatchDetails);

module.exports = router;
