const express = require('express');
const router = express.Router();
const {
  createTournament, getTournaments, getTournament,
  updateTournament, deleteTournament, removeTeamFromTournament
} = require('../controllers/tournamentController');
const { getPointsTable } = require('../controllers/scoreController');
const { protect, isOwner } = require('../middlewares/auth');

router.route('/')
  .get(protect, getTournaments)
  .post(protect, createTournament);

router.route('/:id')
  .get(protect, getTournament)
  .put(protect, isOwner, updateTournament)
  .delete(protect, isOwner, deleteTournament);

router.route('/:id/teams/:teamId')
  .delete(protect, isOwner, removeTeamFromTournament);

router.get('/:id/points', protect, getPointsTable);

module.exports = router;
