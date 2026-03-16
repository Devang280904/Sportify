const express = require('express');
const router = express.Router();
const {
  createTournament, getTournaments, getTournament,
  updateTournament, deleteTournament,
} = require('../controllers/tournamentController');
const { getPointsTable } = require('../controllers/scoreController');
const { protect, authorize } = require('../middlewares/auth');

router.route('/')
  .get(protect, getTournaments)
  .post(protect, authorize('organizer', 'admin'), createTournament);

router.route('/:id')
  .get(protect, getTournament)
  .put(protect, authorize('organizer', 'admin'), updateTournament)
  .delete(protect, authorize('organizer', 'admin'), deleteTournament);

router.get('/:id/points', protect, getPointsTable);

module.exports = router;
