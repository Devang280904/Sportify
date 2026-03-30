const express = require('express');
const router = express.Router();
const {
  createTeam, getTeam, getTeams, addPlayer, removePlayer, deleteTeam, uploadPlayers,
  getMyTeams, cloneTeam
} = require('../controllers/teamController');
const { protect, isTeamOwner } = require('../middlewares/auth');

router.route('/')
  .get(protect, getTeams)
  .post(protect, createTeam);

// These must be BEFORE /:id to avoid route conflicts
router.get('/my-teams', protect, getMyTeams);
router.post('/clone', protect, cloneTeam);

router.route('/:id')
  .get(protect, getTeam)
  .delete(protect, isTeamOwner, deleteTeam);

router.route('/:id/players')
  .post(protect, isTeamOwner, addPlayer);

router.route('/:id/players/upload')
  .post(protect, isTeamOwner, uploadPlayers);

router.route('/:id/players/:playerId')
  .delete(protect, isTeamOwner, removePlayer);

module.exports = router;
