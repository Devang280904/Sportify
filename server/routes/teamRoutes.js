const express = require('express');
const router = express.Router();
const {
  createTeam, getTeam, getTeams, addPlayer, removePlayer, deleteTeam
} = require('../controllers/teamController');
const { protect, authorize } = require('../middlewares/auth');

router.route('/')
  .get(protect, getTeams)
  .post(protect, authorize('organizer', 'admin'), createTeam);

router.route('/:id')
  .get(protect, getTeam)
  .delete(protect, authorize('organizer', 'admin'), deleteTeam);

router.route('/:id/players')
  .post(protect, authorize('organizer', 'admin'), addPlayer);

router.route('/:id/players/:playerId')
  .delete(protect, authorize('organizer', 'admin'), removePlayer);

module.exports = router;
